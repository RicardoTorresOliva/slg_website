import { textoPlano } from "./inline.ts";
import { loadCollection } from "./loader.ts";
import type { Lang } from "./schema.ts";

/**
 * Lectura de la colección `download` (DU-08).
 *
 * Un documento tiene tres estados y los tres significan cosas distintas
 * (RF-29):
 * - `published` — hay archivo en el bucket privado; se entrega por URL firmada.
 * - `coming-soon` — no hay archivo todavía; **se captura el correo igual**
 *   (RF-40) y se avisa cuando exista.
 * - `draft` — no se lista en ninguna parte. No existe para el visitante.
 */

export type Documento = {
  slug: string;
  titulo: string;
  publico: string;
  aprende: string[];
  estado: "published" | "coming-soon" | "draft";
  /** Clave en el bucket privado. `null` mientras el archivo no exista. */
  claveDeArchivo: string | null;
  /** Slug del servicio al que pertenece. */
  servicio: string;
  /** `true` cuando falta el dato en la fuente: lo resuelve el estado vacío. */
  sinRedactar: boolean;
};

type FrontmatterDeDescarga = {
  title: string;
  audience: string;
  learns: string[];
  file_key?: string;
  status: Documento["estado"];
  service: string;
};

function aDocumento(slug: string, d: FrontmatterDeDescarga): Documento {
  const pendiente = (v: string) => v.includes("[PENDIENTE");
  return {
    slug,
    titulo: pendiente(d.title) ? "" : textoPlano(d.title),
    publico: pendiente(d.audience) ? "" : textoPlano(d.audience),
    aprende: (d.learns ?? []).filter((l) => !pendiente(l)).map(textoPlano),
    estado: d.status,
    // Un `file_key` sin archivo real detrás no se distingue aquí: lo que
    // decide es `status`. Emitir una firma para una clave inexistente daría al
    // visitante una URL válida hacia un 404 del almacenamiento.
    claveDeArchivo: d.status === "published" && d.file_key ? d.file_key : null,
    servicio: d.service,
    sinRedactar: pendiente(d.title),
  };
}

/** Los documentos visibles en la biblioteca: `draft` NO se lista (RF-29, criterio 2). */
export function listarDocumentos(lang: Lang): Documento[] {
  return loadCollection<FrontmatterDeDescarga>("download", lang)
    .map((r) => aDocumento(r.slug, r.data))
    .filter((d) => d.estado !== "draft");
}

/** Un documento por su slug. `null` si no existe o es `draft` (no debe ser alcanzable). */
export function buscarDocumento(slug: string, lang: Lang): Documento | null {
  const registro = loadCollection<FrontmatterDeDescarga>("download", lang).find(
    (r) => r.slug === slug,
  );
  if (!registro) return null;
  const doc = aDocumento(registro.slug, registro.data);
  return doc.estado === "draft" ? null : doc;
}
