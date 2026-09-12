import { ArticleCard } from "@/components/article-card/ArticleCard";
import { articulosDeEtiqueta, listarArticulos, listarEtiquetas } from "@/lib/content/blog";
import { loadUiStrings } from "@/lib/content/loader";
import { ruta, type Locale } from "@/lib/routes/map";

/**
 * Índice del blog y índice por etiqueta (DU-11).
 *
 * Los dos comparten página porque son la misma lista con distinto filtro; lo
 * único que cambia es el titular y el estado vacío, que **no** son el mismo
 * mensaje: «todavía no hemos publicado» y «no hay nada con esta etiqueta» le
 * dicen cosas distintas al visitante (criterio 7).
 */
export function Blog({ locale, etiqueta }: { locale: Locale; etiqueta?: string }) {
  const t = loadUiStrings()[locale];
  const articulos = etiqueta ? articulosDeEtiqueta(etiqueta, locale) : listarArticulos(locale);
  const etiquetas = listarEtiquetas(locale);

  const formato = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-bold text-blue-deep">
        {etiqueta ? `${t["blog.tagTitle"]} ${decodeURIComponent(etiqueta)}` : t["blog.title"]}
      </h1>

      {etiquetas.length > 0 && (
        <nav aria-label={t["blog.tagsNavLabel"]} className="mt-6 flex flex-wrap gap-3">
          {etiquetas.map(({ etiqueta: e, cuantos }) => (
            <a
              key={e}
              href={`${ruta("blogEtiqueta", locale)}/${encodeURIComponent(e)}`}
              className="rounded-md border border-line px-3 py-1 text-sm no-underline"
            >
              {e} <span className="text-ink-2">({cuantos})</span>
            </a>
          ))}
        </nav>
      )}

      {articulos.length === 0 ? (
        <p className="mt-12 text-ink-2">
          {etiqueta ? t["blog.emptyTag"] : t["blog.empty"]}
        </p>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {articulos.map((a) => (
            <ArticleCard
              key={a.slug}
              href={`${ruta("blog", locale)}/${a.slug}`}
              title={a.titulo}
              description={a.descripcion}
              fecha={formato.format(new Date(a.fecha))}
              tags={a.etiquetas}
              coverSrc={a.portada ?? undefined}
              coverAlt=""
            />
          ))}
        </div>
      )}

      <p className="mt-12">
        <a href={ruta("blogRss", locale)}>{t["footer.rss"]} ↗</a>
      </p>
    </div>
  );
}
