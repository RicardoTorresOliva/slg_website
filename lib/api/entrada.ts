/**
 * entrada.ts — **Toda entrada externa se valida contra esquema antes de usarse**
 * (RNF-33, criterio 9 de DU-22).
 *
 * «Toda» incluye los parámetros de consulta y los de ruta, que es donde esta
 * regla se incumple siempre: el cuerpo de un `POST` lo valida todo el mundo y
 * un `?limit=` se lee con un `Number()` y a correr. Aquí no hay atajo — un
 * parámetro que no esté declarado en el esquema **ni siquiera se lee**.
 *
 * SE ACUMULAN LOS FALLOS, NO SE PARA EN EL PRIMERO. Un agente que manda tres
 * parámetros mal tiene que enterarse de los tres en una respuesta; devolverle
 * uno cada vez lo obliga a tres viajes para arreglar una llamada.
 *
 * **`details` dice DÓNDE y POR QUÉ, nunca QUÉ SE RECIBIÓ** (§2.5): repetir el
 * valor en la respuesta es repetir el dato, y un `?email=` mal escrito acabaría
 * en el registro de errores del agente (RNF-26).
 */
import { LIMITE_MAXIMO, LIMITE_POR_DEFECTO } from "./cursor.ts";
import { ErrorDeApi, type DetalleDeValidacion } from "./errores.ts";

export class Lector {
  private readonly params: URLSearchParams;
  private readonly fallos: DetalleDeValidacion[] = [];
  /** Los nombres que este esquema admite. Lo demás sobra y se denuncia. */
  private readonly conocidos = new Set<string>(["limit", "cursor"]);

  constructor(url: URL) {
    this.params = url.searchParams;
  }

  private declarar(nombre: string): string | null {
    this.conocidos.add(nombre);
    const crudo = this.params.get(nombre);
    if (crudo === null) return null;
    const limpio = crudo.trim();
    return limpio.length === 0 ? null : limpio;
  }

  /** Un valor de un vocabulario cerrado. Fuera de vocabulario → 422. */
  enumerado<T extends string>(nombre: string, admitidos: readonly T[]): T | null {
    const valor = this.declarar(nombre);
    if (valor === null) return null;
    if (!(admitidos as readonly string[]).includes(valor)) {
      this.fallos.push({ field: nombre, code: "not_in_vocabulary" });
      return null;
    }
    return valor as T;
  }

  /** Una fecha-hora RFC 3339. Cualquier otra cosa → 422. */
  fechaHora(nombre: string): Date | null {
    const valor = this.declarar(nombre);
    if (valor === null) return null;
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      this.fallos.push({ field: nombre, code: "not_a_datetime" });
      return null;
    }
    return fecha;
  }

  booleano(nombre: string): boolean | null {
    const valor = this.declarar(nombre);
    if (valor === null) return null;
    if (valor !== "true" && valor !== "false") {
      this.fallos.push({ field: nombre, code: "not_a_boolean" });
      return null;
    }
    return valor === "true";
  }

  /** Texto de vocabulario abierto pero acotado: longitud y forma. */
  texto(nombre: string, maximo: number, forma?: RegExp): string | null {
    const valor = this.declarar(nombre);
    if (valor === null) return null;
    if (valor.length > maximo) {
      this.fallos.push({ field: nombre, code: "too_long" });
      return null;
    }
    if (forma && !forma.test(valor)) {
      this.fallos.push({ field: nombre, code: "malformed" });
      return null;
    }
    return valor;
  }

  /** El `limit` de §2.7: entero, defecto 50, máximo 200. Por encima → 422. */
  limite(): number {
    const valor = this.declarar("limit");
    if (valor === null) return LIMITE_POR_DEFECTO;
    if (!/^\d{1,4}$/.test(valor)) {
      this.fallos.push({ field: "limit", code: "not_an_integer" });
      return LIMITE_POR_DEFECTO;
    }
    const n = Number(valor);
    if (n < 1 || n > LIMITE_MAXIMO) {
      this.fallos.push({ field: "limit", code: "out_of_range" });
      return LIMITE_POR_DEFECTO;
    }
    return n;
  }

  cursor(): string | null {
    return this.declarar("cursor");
  }

  /** Marca un fallo que la ruta descubre por su cuenta (`since` > `until`). */
  invalido(field: string, code: string): void {
    this.fallos.push({ field, code });
  }

  /**
   * Cierra el esquema. **Un parámetro no declarado es un 422**, no algo que se
   * ignore en silencio: quien escribió `?limite=10` en vez de `?limit=10` tiene
   * que enterarse, y no recibiendo 200 con doscientos elementos.
   */
  exigirValido(): void {
    for (const nombre of this.params.keys()) {
      if (!this.conocidos.has(nombre)) this.fallos.push({ field: nombre, code: "unknown_parameter" });
    }
    if (this.fallos.length > 0) {
      throw new ErrorDeApi(422, `parámetros inválidos: ${this.fallos.map((f) => f.field).join(", ")}`, this.fallos);
    }
  }
}

/**
 * Un identificador de ruta. **No se usa para consultar**: se comprueba su forma
 * y después el recurso se resuelve con el contexto de la clave (§2.6).
 * Aceptar cualquier cadena aquí no sería inseguro —no entra en ningún `WHERE`
 * sin política de fila— pero deja pasar a la base basura que nunca casará.
 */
export function identificadorDeRuta(valor: string): string {
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(valor)) {
    throw new ErrorDeApi(404, "identificador de ruta con forma imposible");
  }
  return valor;
}
