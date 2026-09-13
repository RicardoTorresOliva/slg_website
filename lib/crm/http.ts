/**
 * El cliente HTTP del CRM. Uno, compartido por los dos modos y por el tablero.
 *
 * **DOS CLAVES, NUNCA UNA** (RF-56, RNF-40). La de **captura** escribe
 * contactos y actividades; la del **tablero** solo lee. Son dos porque el
 * alcance mínimo es por integración: si el tablero usara la clave de captura,
 * una pantalla de lectura llevaría permiso de escritura sobre el CRM, y
 * revocarla el día que haga falta apagaría también la captura de leads.
 *
 * **Ninguna de las dos sale de aquí.** Ni en un error, ni en una traza, ni en
 * la fila de `crm_delivery`: `sanear()` borra **las dos** de cualquier texto
 * antes de que salga de este archivo. Un mensaje de error acaba en una pantalla
 * de HQ, y una pantalla de HQ se comparte en una captura de pantalla.
 */
export type RespuestaCrm = {
  ok: boolean;
  codigo: number | null;
  cuerpo: string | null;
  error: string | null;
};

function baseDelCrm(): string {
  const v = process.env.CRM_BASE_URL;
  if (!v) throw new Error("Falta CRM_BASE_URL. Los nombres están en .env.example.");
  return v.replace(/\/$/, "");
}

/** Cuál de las dos integraciones llama: la que escribe o la que lee. */
export type Uso = "captura" | "tablero";

const VARIABLE_DE: Readonly<Record<Uso, string>> = {
  captura: "CRM_API_KEY_CAPTURE",
  tablero: "CRM_API_KEY_READ",
};

function clave(uso: Uso): string {
  const nombre = VARIABLE_DE[uso];
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta ${nombre}. Los nombres están en .env.example.`);
  return v;
}

/**
 * Quita de un texto cualquier rastro de **las dos** credenciales.
 *
 * Las dos y no solo la que se acaba de usar: un error del tablero se registra
 * por el mismo camino que uno de captura, y borrar solo una deja la otra
 * entera en el sitio donde nadie la busca.
 */
export function sanear(texto: string): string {
  let salida = texto;
  for (const nombre of Object.values(VARIABLE_DE)) {
    const k = process.env[nombre];
    if (k && k.length > 4) salida = salida.split(k).join("«clave oculta»");
  }
  return salida.replace(/(authorization|api[-_]?key)\s*[:=]\s*\S+/gi, "$1: «clave oculta»").slice(0, 500);
}

export async function llamar(
  metodo: "GET" | "POST",
  ruta: string,
  cuerpo?: Record<string, unknown>,
  uso: Uso = "captura",
): Promise<RespuestaCrm> {
  const url = `${baseDelCrm()}${ruta}`;
  const tiempoLimite = Number(process.env.CRM_TIMEOUT_MS ?? 10_000);
  const corte = AbortSignal.timeout(tiempoLimite);

  try {
    const r = await fetch(url, {
      method: metodo,
      headers: {
        authorization: `Bearer ${clave(uso)}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: corte,
    });
    const texto = await r.text();
    return {
      ok: r.ok,
      codigo: r.status,
      cuerpo: texto.slice(0, 2_000),
      error: r.ok ? null : sanear(`HTTP ${r.status}: ${texto.slice(0, 200)}`),
    };
  } catch (e) {
    // Un timeout o una caída de red NO son un fallo del lead: son un fallo del
    // intento, y el intento se repite. Por eso vuelve como `ok: false` con
    // error, y no como una excepción que pararía el barrido entero.
    return { ok: false, codigo: null, cuerpo: null, error: sanear((e as Error).message) };
  }
}
