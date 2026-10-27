/**
 * comun.ts — Lo que las tres entidades de la Academy comparten (DU-30 · RF-156).
 *
 * **EL APUNTE DE DOMINIO SE OMITE CUANDO QUIEN ESCRIBE ES UNA CLAVE DE API**, y
 * no es un agujero: es D-140. Un contexto de clave solo lo construye
 * `verificarClave`, y a `verificarClave` solo la llama el manejador de
 * `/api/v1`, que apunta **toda** llamada —también las que acaban en 403, 404 o
 * 422— con la ruta, el método, el código y el identificador que viaja de vuelta
 * como `request_id`. Apuntar además aquí escribía dos filas por acto con la
 * misma acción y el mismo actor, y el `request_id` de la respuesta señalaba solo
 * a una: un registro que se lee peor y que miente por duplicado. Lo encontró la
 * prueba de DU-23, que exige que todo apunte de una clave lleve su ruta.
 *
 * Cuando quien escribe es una persona —HQ, portal— no hay manejador que apunte
 * por ella, y `conAuditoria` apunta el éxito **y el rechazo** (RF-156; criterio
 * 1 de DU-29 y de DU-27: los intentos fuera de lo permitido se auditan como
 * `.denied`).
 */
import { conAuditoria, type Apunte } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";

export async function conApunte<T>(ctx: AuthContext, apunte: Apunte, fn: () => Promise<T>): Promise<T> {
  if (ctx.actorType === "api_key") return fn();
  return conAuditoria(ctx, apunte, fn);
}

/** Un título cabe en una línea; un texto Markdown, en lo que cabe un aviso. */
export const MAXIMO_TITULO = 200;
export const MAXIMO_TEXTO = 20_000;
export const MAXIMO_URL = 2000;

/**
 * Una fecha que llega como texto (formulario de HQ) o como `Date` (el validador
 * de la API ya la convirtió). Inválida → `null`, y quien valida decide.
 */
export function fecha(valor: string | Date | null | undefined): Date | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Solo http(s). La fuente de una noticia es un enlace que un cliente abre desde
 * su portal: un `javascript:` ahí es un enlace que se ejecuta, no que se lee.
 */
export function esUrlHttp(valor: string): boolean {
  try {
    const protocolo = new URL(valor).protocol;
    return protocolo === "http:" || protocolo === "https:";
  } catch {
    return false;
  }
}
