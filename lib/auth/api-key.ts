/**
 * api-key.ts — Verificación de claves de `/api/v1`, en el orden exacto de
 * `architecture` §2.5.
 *
 * EL ORDEN NO ES ESTÉTICO. El límite (429) se comprueba **antes** que el
 * alcance (403) por D-39: si el 403 fuera primero, una clave podría martillear
 * endpoints prohibidos sin consumir cuota, y el límite dejaría de ser un límite.
 *
 * NO USA EL PLUGIN `apiKey` DE BETTER AUTH (D-52). Su esquema exige
 * `referenceId` obligatorio —lo que impediría las claves de SLG, que no tienen
 * empresa— y guarda los permisos como cadena opaca. `data_model` §3.6 fija los
 * seis alcances en una columna `jsonb` con un CHECK de contención que impide
 * guardar un alcance inventado: esa garantía vive en la base de datos y no se
 * cambia por comodidad de librería.
 */

import { createHash, timingSafeEqual } from "node:crypto";

import { contextoDeClaveApi, type AuthContext } from "../db/context.ts";
import { API_SCOPES, type ApiScope } from "../db/schema.ts";
import { conexionDeAuth } from "./db.ts";

export type FalloDeClave = {
  readonly status: 401 | 403 | 429;
  /** Lo único que sale por HTTP. Deliberadamente inútil para quien sondea. */
  readonly mensajePublico: string;
  /** Para `audit_log` y registros. Nunca se serializa. */
  readonly motivoInterno: string;
  /** Solo en 429: segundos hasta que vuelve a admitir (RF-99). */
  readonly reintentarEn?: number;
};

export type ResultadoDeClave =
  | { readonly ok: true; readonly ctx: AuthContext; readonly claveId: string }
  | { readonly ok: false; readonly fallo: FalloDeClave };

/**
 * Las claves se guardan **hasheadas**. Un volcado de la tabla no da claves
 * utilizables, solo hashes. SHA-256 y no bcrypt a propósito: una clave de API
 * es un secreto de 256 bits generado por nosotros, no una contraseña elegida
 * por una persona, así que no hay diccionario contra el que defenderse y sí un
 * coste por petición que evitar.
 */
export function hashDeClave(clave: string): string {
  return createHash("sha256").update(clave, "utf8").digest("hex");
}

function igualEnTiempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Contador del límite por clave, en memoria del proceso.
 *
 * Coherente con D-40 y con §6.7: hoy corre una sola réplica. Si algún día hay
 * más, el contador se mueve a tabla o a un almacén compartido; está aislado
 * aquí justamente para que ese cambio sea local.
 *
 * Ventana deslizante por marcas de tiempo, no por cubos: con cubos, una clave
 * puede enviar el doble del límite a caballo entre dos ventanas.
 */
const golpes = new Map<string, number[]>();

function dentroDelLimite(
  claveId: string,
  max: number,
  ventanaSegundos: number,
): { ok: true } | { ok: false; reintentarEn: number } {
  const ahora = Date.now();
  const desde = ahora - ventanaSegundos * 1000;
  const previos = (golpes.get(claveId) ?? []).filter((t) => t > desde);

  if (previos.length >= max) {
    const masAntiguo = previos[0];
    golpes.set(claveId, previos);
    return { ok: false, reintentarEn: Math.max(1, Math.ceil((masAntiguo + ventanaSegundos * 1000 - ahora) / 1000)) };
  }

  previos.push(ahora);
  golpes.set(claveId, previos);
  return { ok: true };
}

/** Solo para pruebas: reinicia el contador del proceso. */
export function reiniciarContadorDeLimite(): void {
  golpes.clear();
}

/**
 * Normaliza y filtra los alcances.
 *
 * Llegan como array desde una tabla y pueden llegar como cadena JSON desde un
 * `SELECT *` sobre una función: el conductor no siempre resuelve el tipo del
 * registro. Y se FILTRA aunque la base ya lo restrinja (migración 0007): las
 * dos capas comprueban lo mismo a propósito, porque la del código protege a
 * este proceso de una fila escrita antes de que la restricción existiera.
 */
function alcancesValidos(valor: unknown): ApiScope[] {
  let lista: unknown = valor;
  if (typeof lista === "string") {
    try {
      lista = JSON.parse(lista);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(lista)) return [];
  return lista.filter((s): s is ApiScope => (API_SCOPES as readonly string[]).includes(s));
}

/**
 * Pasos 1 a 3 de §2.5. El paso 4 —el alcance— lo aplica `exigir()` sobre la
 * matriz B.3, para que haya UNA sola tabla de permisos y no dos.
 */
export async function verificarClave(cabeceras: Headers): Promise<ResultadoDeClave> {
  // Paso 1 — presencia y forma.
  const autorizacion = cabeceras.get("authorization");
  if (!autorizacion?.startsWith("Bearer ")) {
    return {
      ok: false,
      fallo: {
        status: 401,
        mensajePublico: "No autenticado",
        motivoInterno: "sin cabecera Authorization: Bearer",
      },
    };
  }

  const presentada = autorizacion.slice(7).trim();
  if (presentada.length === 0) {
    return {
      ok: false,
      fallo: { status: 401, mensajePublico: "No autenticado", motivoInterno: "Bearer vacío" },
    };
  }

  // Paso 2 — existe, no revocada, no caducada. Las TRES dan el mismo 401 y el
  // mismo texto: distinguirlas le diría a quien sondea si acertó la clave.
  const hash = hashDeClave(presentada);
  const [fila] = await conexionDeAuth<
    {
      id: string;
      name: string;
      organization_id: string | null;
      scopes: unknown;
      rate_limit_max: number;
      rate_limit_window_seconds: number;
      /**
       * Llegan como `Date` desde una tabla y como cadena desde un `SELECT *`
       * sobre una función: el conductor no siempre resuelve los tipos del
       * registro devuelto. Se normaliza en vez de confiar — lo encontró la
       * prueba contra PostgreSQL real, no el compilador.
       */
      expires_at: Date | string | null;
      revoked_at: Date | string | null;
    }[]
  >`select * from app_clave_api_por_hash(${hash})`;

  const enMilisegundos = (v: Date | string | null): number | null =>
    v === null ? null : (v instanceof Date ? v : new Date(v)).getTime();

  const noAutenticado = (motivoInterno: string): ResultadoDeClave => ({
    ok: false,
    fallo: { status: 401, mensajePublico: "No autenticado", motivoInterno },
  });

  if (!fila) return noAutenticado("ninguna clave con ese hash");
  // La consulta ya fue por igualdad exacta; esta comprobación existe para que
  // la comparación de secretos del módulo sea siempre en tiempo constante,
  // también si mañana la búsqueda cambia de forma.
  if (!igualEnTiempoConstante(hashDeClave(presentada), hash)) {
    return noAutenticado("hash incoherente");
  }
  if (fila.revoked_at !== null) return noAutenticado(`clave ${fila.id} revocada`);
  const caduca = enMilisegundos(fila.expires_at);
  if (caduca !== null && caduca <= Date.now()) {
    return noAutenticado(`clave ${fila.id} caducada`);
  }

  // Paso 3 — límite, ANTES del alcance (D-39).
  const limite = dentroDelLimite(fila.id, fila.rate_limit_max, fila.rate_limit_window_seconds);
  if (!limite.ok) {
    return {
      ok: false,
      fallo: {
        status: 429,
        mensajePublico: "Demasiadas peticiones",
        motivoInterno: `clave ${fila.id} sobre su límite (${fila.rate_limit_max}/${fila.rate_limit_window_seconds}s)`,
        reintentarEn: limite.reintentarEn,
      },
    };
  }

  // Marca de uso: útil en HQ para ver claves muertas. Un fallo aquí no debe
  // tumbar una petición autenticada.
  void conexionDeAuth`select app_registrar_uso_de_clave(${fila.id})`.catch(() => {});

  return {
    ok: true,
    claveId: fila.id,
    ctx: contextoDeClaveApi({
      apiKeyId: fila.id,
      name: fila.name,
      organizationId: fila.organization_id,
      scopes: alcancesValidos(fila.scopes),
    }),
  };
}

/** Convierte un fallo en respuesta. Es lo único que puede salir por HTTP. */
export function respuestaDeFallo(fallo: FalloDeClave): Response {
  const cabeceras: Record<string, string> = { "content-type": "application/json" };
  if (fallo.status === 429 && fallo.reintentarEn !== undefined) {
    cabeceras["retry-after"] = String(fallo.reintentarEn);
  }
  if (fallo.status === 401) cabeceras["www-authenticate"] = "Bearer";

  const code =
    fallo.status === 401 ? "unauthorized" : fallo.status === 429 ? "rate_limited" : "forbidden";

  return new Response(JSON.stringify({ error: { code, message: fallo.mensajePublico } }), {
    status: fallo.status,
    headers: cabeceras,
  });
}
