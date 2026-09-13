/**
 * validador.ts — **Toda entrada externa se valida contra el catálogo antes de
 * usarse** (RNF-33 · criterio 9 de DU-22 · criterio 4 de DU-23).
 *
 * «Toda» incluye los parámetros de consulta y los de ruta, que es donde esta
 * regla se incumple siempre: el cuerpo de un `POST` lo valida todo el mundo y un
 * `?limit=` se lee con un `Number()` y a correr. Aquí no hay atajo, y sobre todo
 * **no hay una segunda descripción de la entrada**: las reglas son las de
 * `catalogo.ts`, las mismas que describe `GET /openapi.json`. Una validación que
 * no cuadre con la especificación es imposible porque no hay dos textos.
 *
 * SE ACUMULAN LOS FALLOS, NO SE PARA EN EL PRIMERO. Un agente que manda tres
 * campos mal tiene que enterarse de los tres en una respuesta; devolverle uno
 * cada vez lo obliga a tres viajes para arreglar una llamada.
 *
 * **`details` dice DÓNDE y POR QUÉ, nunca QUÉ SE RECIBIÓ** (§2.5): repetir el
 * valor es repetir el dato, y un `?email=` mal escrito acabaría en el registro de
 * errores del agente (RNF-26).
 */
import type { Declaracion, RutaDeApi } from "./catalogo.ts";
import { ErrorDeApi, type DetalleDeValidacion } from "./errores.ts";

class Acumulador {
  readonly fallos: DetalleDeValidacion[] = [];
  marcar(field: string, code: string): void {
    this.fallos.push({ field, code });
  }
  cerrar(donde: string): void {
    if (this.fallos.length === 0) return;
    throw new ErrorDeApi(
      422,
      `${donde} inválido: ${this.fallos.map((f) => `${f.field}/${f.code}`).join(", ")}`,
      this.fallos,
    );
  }
}

/** Aplica UNA declaración a un valor ya presente. Devuelve el valor normalizado. */
function aplicar(
  d: Declaracion,
  valor: unknown,
  ruta: string,
  acumulador: Acumulador,
): unknown {
  switch (d.tipo) {
    case "enum": {
      if (typeof valor !== "string" || !d.valores.includes(valor)) {
        acumulador.marcar(ruta, "not_in_vocabulary");
        return undefined;
      }
      return valor;
    }
    case "datetime": {
      if (typeof valor !== "string") {
        acumulador.marcar(ruta, "not_a_datetime");
        return undefined;
      }
      const fecha = new Date(valor);
      if (Number.isNaN(fecha.getTime())) {
        acumulador.marcar(ruta, "not_a_datetime");
        return undefined;
      }
      return fecha;
    }
    case "boolean": {
      if (typeof valor === "boolean") return valor;
      if (valor === "true" || valor === "false") return valor === "true";
      acumulador.marcar(ruta, "not_a_boolean");
      return undefined;
    }
    case "integer": {
      const n = typeof valor === "number" ? valor : typeof valor === "string" && /^\d{1,12}$/.test(valor) ? Number(valor) : NaN;
      if (!Number.isInteger(n)) {
        acumulador.marcar(ruta, "not_an_integer");
        return undefined;
      }
      if (n < d.minimo || n > d.maximo) {
        acumulador.marcar(ruta, "out_of_range");
        return undefined;
      }
      return n;
    }
    case "string": {
      if (typeof valor !== "string") {
        acumulador.marcar(ruta, "not_a_string");
        return undefined;
      }
      const limpio = valor.trim();
      if (limpio.length < (d.minimo ?? 0)) {
        acumulador.marcar(ruta, "too_short");
        return undefined;
      }
      if (limpio.length > d.maximo) {
        acumulador.marcar(ruta, "too_long");
        return undefined;
      }
      if (d.forma && !d.forma.test(limpio)) {
        acumulador.marcar(ruta, "malformed");
        return undefined;
      }
      return limpio;
    }
    case "objeto": {
      if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
        acumulador.marcar(ruta, "not_an_object");
        return undefined;
      }
      // `campos` vacío = objeto libre (el `payload` de un evento, RF-146): se
      // exige que sea un objeto y nada más. La forma del contenido la valida
      // quien conoce su `kind`, no este archivo.
      if (d.campos.length === 0) return valor;
      return recorrer(d.campos, valor as Record<string, unknown>, `${ruta}.`, acumulador);
    }
    case "opaco":
      return typeof valor === "string" ? valor : undefined;
  }
}

function recorrer(
  declaraciones: readonly Declaracion[],
  entrada: Record<string, unknown>,
  prefijo: string,
  acumulador: Acumulador,
): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  const conocidos = new Set(declaraciones.map((d) => d.nombre));

  for (const d of declaraciones) {
    const presente = entrada[d.nombre];
    const vacio = presente === undefined || presente === null || presente === "";
    if (vacio) {
      if (d.obligatorio) acumulador.marcar(`${prefijo}${d.nombre}`, "required");
      else if ("defecto" in d && d.defecto !== undefined) salida[d.nombre] = d.defecto;
      continue;
    }
    const valor = aplicar(d, presente, `${prefijo}${d.nombre}`, acumulador);
    if (valor !== undefined) salida[d.nombre] = valor;
  }

  /**
   * **Un campo no declarado es un 422**, no algo que se ignore en silencio:
   * quien escribió `?limite=10` en vez de `?limit=10` tiene que enterarse, y no
   * recibiendo un 200 con doscientos elementos.
   */
  for (const nombre of Object.keys(entrada)) {
    if (!conocidos.has(nombre)) acumulador.marcar(`${prefijo}${nombre}`, "unknown_parameter");
  }
  return salida;
}

export function validarQuery(url: URL, ruta: RutaDeApi): Record<string, unknown> {
  const acumulador = new Acumulador();
  const crudos: Record<string, unknown> = {};
  for (const [k, v] of url.searchParams) crudos[k] = v;
  const salida = recorrer(ruta.query ?? [], crudos, "", acumulador);
  acumulador.cerrar("parámetros");
  return salida;
}

export function validarCuerpo(cuerpo: unknown, ruta: RutaDeApi): Record<string, unknown> {
  const acumulador = new Acumulador();
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) {
    throw new ErrorDeApi(422, "el cuerpo no es un objeto JSON", [{ field: "", code: "not_an_object" }]);
  }
  const salida = recorrer(ruta.cuerpo ?? [], cuerpo as Record<string, unknown>, "", acumulador);
  acumulador.cerrar("cuerpo");
  return salida;
}

/** Marca un fallo que la ruta descubre por su cuenta (`since` > `until`). */
export function rechazar(field: string, code: string): never {
  throw new ErrorDeApi(422, `${field}/${code}`, [{ field, code }]);
}

/**
 * Un identificador de ruta. **No se usa para consultar**: se comprueba su forma
 * y después el recurso se resuelve con el contexto de la clave (§2.6). Aceptar
 * cualquier cadena aquí no sería inseguro —no entra en ningún `WHERE` sin
 * política de fila— pero deja pasar a la base basura que nunca casará.
 */
export function identificadorDeRuta(valor: string): string {
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(valor)) {
    throw new ErrorDeApi(404, "identificador de ruta con forma imposible");
  }
  return valor;
}
