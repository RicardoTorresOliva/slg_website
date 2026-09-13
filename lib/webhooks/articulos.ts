/**
 * `post.published` — el único de los nueve eventos que **no tiene un momento**.
 *
 * Los otros ocho ocurren cuando alguien hace algo: se envía un formulario, se
 * entrega una captura al CRM, se manda una invitación. Un artículo, en cambio,
 * se publica **cambiando un archivo del repositorio** (`status: published`,
 * RF-138): en tiempo de ejecución no hay ninguna llamada que interceptar.
 *
 * Por eso el disparo se hace al arrancar el servidor y es **idempotente por
 * construcción**: se emite el evento de los artículos publicados que todavía no
 * tienen registro en `webhook_delivery`. Cada despliegue lo comprueba; el que
 * ya se anunció no se vuelve a anunciar, ni aunque el proceso reinicie diez
 * veces. La idempotencia NO se apoya en un archivo de marca ni en una fecha:
 * se apoya en la misma tabla que ya guarda la traza, que es la única fuente que
 * sobrevive al contenedor.
 *
 * Consecuencia buscada: **el primer arranque con artículos ya publicados no
 * inunda al suscriptor de eventos falsos**… porque sí lo haría. Ver
 * `WEBHOOK_ANNOUNCE_POSTS`: el anuncio está apagado salvo que se encienda a
 * propósito, justo para que encender un suscriptor por primera vez no dispare
 * el histórico entero.
 */
import { sql } from "drizzle-orm";

import { articulos, prefijo } from "../content/blog.ts";
import { baseDelSitio } from "../content/seo.ts";
import type { Lang } from "../content/schema.ts";
import { withSystemScope } from "../db/scope.ts";

import { emitir } from "./cola.ts";

const IDIOMAS: readonly Lang[] = ["es", "en"];

/** El canónico del artículo en SU idioma (RF-145), no un identificador. */
export function urlDelArticulo(lang: Lang, slug: string): string {
  return `${baseDelSitio()}${prefijo(lang)}/blog/${slug}`;
}

/** Qué artículos ya tienen su `post.published` registrado. */
async function yaAnunciados(): Promise<Set<string>> {
  return withSystemScope(
    "DU-12 · un artículo del repositorio no pertenece a ninguna empresa cliente.",
    async (db) => {
      const filas = (await db.execute(sql`
        SELECT payload->>'slug' AS slug, payload->>'locale' AS locale
          FROM webhook_delivery
         WHERE event = 'post.published'
      `)) as unknown as { slug: string | null; locale: string | null }[];
      return new Set(filas.map((f) => `${f.locale}/${f.slug}`));
    },
  );
}

/**
 * Emite `post.published` de lo publicado y no anunciado. Devuelve cuántos.
 * **Nunca lanza**: el arranque del servidor no puede depender de esto.
 */
export async function anunciarArticulosPublicados(): Promise<number> {
  try {
    const hechos = await yaAnunciados();
    let emitidos = 0;
    for (const lang of IDIOMAS) {
      for (const a of articulos(lang)) {
        if (hechos.has(`${lang}/${a.slug}`)) continue;
        await emitir("post.published", {
          slug: a.slug,
          locale: lang,
          title: a.titulo,
          url: urlDelArticulo(lang, a.slug),
          tags: a.etiquetas,
          social: a.social,
        });
        emitidos += 1;
      }
    }
    return emitidos;
  } catch {
    return 0;
  }
}
