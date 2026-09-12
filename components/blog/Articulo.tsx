import { notFound } from "next/navigation";

import { buscarArticulo } from "@/lib/content/blog";
import { textoPlano } from "@/lib/content/inline";
import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { ruta, type Locale } from "@/lib/routes/map";

/**
 * Artículo del blog (DU-11).
 *
 * El cuerpo se renderiza como párrafos y encabezados simples. No se monta un
 * renderizador de markdown completo: los artículos de v1 son prosa con
 * encabezados, y meter una dependencia que interprete HTML arbitrario dentro
 * del contenido abriría una vía de inyección en la única superficie donde el
 * contenido se escribe a mano (frontera (h) de `scope.md`: cero scripts de
 * terceros en la capa pública).
 */
export function Articulo({ slug, locale }: { slug: string; locale: Locale }) {
  const articulo = buscarArticulo(slug, locale);
  if (!articulo) notFound();

  const t = loadUiStrings()[locale];
  const registro = loadCollection("post", locale).find((r) => r.slug === slug)!;

  const formato = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-bold tracking-[0.09em] text-blue-primary uppercase">
        {formato.format(new Date(articulo.fecha))} · {articulo.autor}
      </p>
      <h1 className="mt-2 text-4xl font-bold text-blue-deep text-balance">{articulo.titulo}</h1>
      <p className="mt-4 text-lg text-ink-2">{articulo.descripcion}</p>

      {articulo.etiquetas.length > 0 && (
        <nav aria-label={t["blog.tagsNavLabel"]} className="mt-6 flex flex-wrap gap-2">
          {articulo.etiquetas.map((e) => (
            <a
              key={e}
              href={`${ruta("blogEtiqueta", locale)}/${encodeURIComponent(e)}`}
              className="rounded-md border border-line px-3 py-1 text-sm no-underline"
            >
              {e}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-10 flex flex-col gap-4">
        {bloquesDe(registro.body).map((bloque, i) =>
          bloque.tipo === "encabezado" ? (
            <h2 key={i} className="mt-6 text-2xl font-bold text-blue-primary">
              {bloque.texto}
            </h2>
          ) : (
            <p key={i} className="text-ink">
              {bloque.texto}
            </p>
          ),
        )}
      </div>

      <p className="mt-12">
        <a href={ruta("blog", locale)}>← {t["blog.backToIndex"]}</a>
      </p>
    </article>
  );
}

type Bloque = { tipo: "encabezado" | "parrafo"; texto: string };

function bloquesDe(cuerpo: string): Bloque[] {
  return cuerpo
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) =>
      b.startsWith("## ")
        ? { tipo: "encabezado" as const, texto: textoPlano(b.slice(3).trim()) }
        : { tipo: "parrafo" as const, texto: textoPlano(b.replace(/\s+/g, " ")) },
    );
}
