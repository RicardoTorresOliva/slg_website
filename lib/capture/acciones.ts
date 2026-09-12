"use server";

import { headers } from "next/headers";

import { buscarDocumento } from "../content/downloads.ts";
import { localeDeRuta, ruta } from "../routes/map.ts";
import { capturar, type DatosDeCaptura } from "./capturar.ts";

/**
 * Server Action del formulario de captura (DU-08).
 *
 * Es la **única** puerta del formulario hacia el servidor. El componente
 * `DownloadForm` (FU-10) se construyó contra este contrato antes de que
 * existiera el servidor, así que aquí no se inventa nada: se cumple.
 *
 * Todo lo que decide el resultado se resuelve **en el servidor** a partir del
 * slug: el estado del documento y su clave de archivo no llegan desde el
 * cliente. Si llegaran, bastaría con enviar `claveDeArchivo` a mano para
 * pedir una URL firmada de cualquier objeto del bucket.
 */

export type ResultadoDeAccion =
  | { estado: "exito"; hayArchivo: boolean; destino: string }
  | { estado: "limite" }
  | { estado: "dominio_gratuito" }
  | { estado: "error_servidor" };

/**
 * La IP del visitante, para el límite de peticiones.
 *
 * Detrás de Traefik la conexión viene del propio proxy, así que la IP real
 * está en `x-forwarded-for`. Se toma **el primer** elemento: los siguientes
 * los puede escribir quien envía la petición.
 */
async function ipDelVisitante(): Promise<string> {
  const h = await headers();
  const reenviada = h.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "desconocida";
}

function utmDe(busqueda: string | null): Record<string, string> | null {
  if (!busqueda) return null;
  const params = new URLSearchParams(busqueda);
  const utm: Record<string, string> = {};
  for (const [k, v] of params) if (k.startsWith("utm_")) utm[k] = v;
  return Object.keys(utm).length ? utm : null;
}

/**
 * Los tres orígenes de captura (RF-43, RF-44).
 *
 * Una sola máquina con tres puertas, no tres máquinas: las tres recorren la
 * misma validación, la misma persistencia y la misma cola de entrega al CRM.
 * Tres caminos separados serían tres sitios donde arreglar el mismo fallo.
 */
export type OrigenDeCaptura = "download" | "contact" | "doctrine-request";

export async function enviarCaptura(
  origen: OrigenDeCaptura,
  slugDeDescarga: string | null,
  rutaDePagina: string,
  busqueda: string | null,
  datos: DatosDeCaptura,
): Promise<ResultadoDeAccion> {
  const locale = localeDeRuta(rutaDePagina);

  // Solo una descarga tiene documento detrás. Contacto y solicitud de Doctrina
  // capturan igual y no entregan archivo — el mismo trato que un documento en
  // «próximamente» (RF-40, RF-44).
  const documento = origen === "download" && slugDeDescarga
    ? buscarDocumento(slugDeDescarga, locale)
    : null;
  if (origen === "download" && !documento) return { estado: "error_servidor" };

  const resultado = await capturar(datos, {
    origen,
    slugDeDescarga,
    claveDeArchivo: documento?.claveDeArchivo ?? null,
    rutaDePagina,
    locale,
    utm: utmDe(busqueda),
    ip: await ipDelVisitante(),
  });

  if (resultado.estado !== "exito") return resultado;

  // `/gracias` recibe el identificador del EVENTO, nunca la URL firmada: una
  // URL firmada en la barra de direcciones acaba en el historial, en el
  // `Referer` y en cualquier captura de pantalla (RF-42, `architecture` §4).
  const gracias = ruta("gracias", locale);
  if (resultado.hayArchivo) {
    return { estado: "exito", hayArchivo: true, destino: `${gracias}?e=${resultado.eventoId}` };
  }
  // `v` distingue las tres variantes de `/gracias` (§3.6): sin ella, quien
  // escribe a contacto vería el texto de «te avisamos cuando el documento esté».
  return { estado: "exito", hayArchivo: false, destino: `${gracias}?v=${origen}` };
}
