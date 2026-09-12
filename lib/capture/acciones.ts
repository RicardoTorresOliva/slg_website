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

export async function enviarCaptura(
  slugDeDescarga: string,
  rutaDePagina: string,
  busqueda: string | null,
  datos: DatosDeCaptura,
): Promise<ResultadoDeAccion> {
  const locale = localeDeRuta(rutaDePagina);
  const documento = buscarDocumento(slugDeDescarga, locale);
  if (!documento) return { estado: "error_servidor" };

  const resultado = await capturar(datos, {
    origen: "download",
    slugDeDescarga,
    claveDeArchivo: documento.claveDeArchivo,
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
  return {
    estado: "exito",
    hayArchivo: resultado.hayArchivo,
    destino: resultado.hayArchivo ? `${gracias}?e=${resultado.eventoId}` : `${gracias}?p=1`,
  };
}
