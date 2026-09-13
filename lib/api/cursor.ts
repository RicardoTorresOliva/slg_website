/**
 * cursor.ts — Paginación por **cursor opaco**, no por `offset`
 * (`api_contracts` §2.7).
 *
 * POR QUÉ NO `offset`. Las colecciones se ordenan por `created_at DESC` y
 * reciben inserciones constantes: con `offset`, una captura nueva desplaza la
 * página y el agente **lee dos veces el mismo elemento o se salta uno**. No es
 * un caso raro — es lo que pasa siempre que algo se inserta mientras alguien
 * pagina, que en una API de agentes es todo el rato.
 *
 * EL CURSOR ES OPACO Y LLEVA SU COLECCIÓN. Codifica `(created_at, id)` del
 * último elemento **y el nombre de la colección**: así, un cursor de `captures`
 * pegado en `organizations` se detecta y se responde 400 en vez de devolver una
 * página que no significa nada. Opaco, además, quiere decir que un agente no
 * debe derivar nada de su forma: hoy es base64url de un JSON y mañana puede no
 * serlo sin romper a nadie.
 *
 * **No va firmado, y es correcto**: un cursor manipulado solo puede pedir otra
 * posición de **su propia colección**, y el alcance de lo que esa colección
 * devuelve ya lo acota la política de fila con el contexto de la clave. Firmarlo
 * protegería contra un ataque que no existe.
 */
import { ErrorDeApi } from "./errores.ts";

export type Posicion = { readonly createdAt: Date; readonly id: string };

export function codificarCursor(coleccion: string, posicion: Posicion): string {
  const crudo = JSON.stringify({ k: coleccion, c: posicion.createdAt.toISOString(), i: posicion.id });
  return Buffer.from(crudo, "utf8").toString("base64url");
}

export function decodificarCursor(coleccion: string, valor: string): Posicion {
  const malo = () => new ErrorDeApi(400, `cursor ilegible o de otra colección en ${coleccion}`);
  let objeto: unknown;
  try {
    objeto = JSON.parse(Buffer.from(valor, "base64url").toString("utf8"));
  } catch {
    throw malo();
  }
  if (typeof objeto !== "object" || objeto === null) throw malo();
  const { k, c, i } = objeto as { k?: unknown; c?: unknown; i?: unknown };
  if (k !== coleccion || typeof c !== "string" || typeof i !== "string") throw malo();
  const fecha = new Date(c);
  if (Number.isNaN(fecha.getTime())) throw malo();
  return { createdAt: fecha, id: i };
}

export const LIMITE_POR_DEFECTO = 50;
export const LIMITE_MAXIMO = 200;

export type Pagina = {
  readonly limit: number;
  readonly next_cursor: string | null;
  readonly has_more: boolean;
};

/**
 * Envuelve una colección. **Se pide un elemento de más** y se descarta: es la
 * única forma de saber si hay página siguiente sin contar la tabla entera, y
 * contar la tabla entera en cada página es cómo una API se vuelve lenta sin que
 * nadie sepa por qué.
 */
export function paginar<T>(
  coleccion: string,
  filas: readonly T[],
  limit: number,
  posicionDe: (fila: T) => Posicion,
): { readonly data: T[]; readonly page: Pagina } {
  const hayMas = filas.length > limit;
  const data = hayMas ? filas.slice(0, limit) : [...filas];
  const ultimo = data.at(-1);
  return {
    data,
    page: {
      limit,
      next_cursor: hayMas && ultimo ? codificarCursor(coleccion, posicionDe(ultimo)) : null,
      has_more: hayMas,
    },
  };
}
