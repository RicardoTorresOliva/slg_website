import { notFound } from "next/navigation";

import { bloquesDe } from "@/lib/content/bloques";
import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import type { Locale } from "@/lib/routes/map";

/**
 * Página de texto largo — legales y Nosotros (DU-06).
 *
 * Sin navegación lateral y **con fecha de última actualización visible**
 * (`ui_wireframes` §2.9): en un documento legal, saber qué versión estás
 * leyendo es parte del documento, no un adorno.
 *
 * Estas páginas son **públicas y sin autenticación** a propósito: las
 * pantallas de consentimiento de Google y Microsoft exigen poder abrirlas sin
 * sesión (RF-12, criterio 3). Vivir bajo `(public)` ya lo garantiza — no hay
 * compuerta que atravesar.
 */
export function PaginaDeTexto({
  slugEs,
  locale,
}: {
  /** Slug del registro ESPAÑOL; el inglés se resuelve por `pair`. */
  slugEs: string;
  locale: Locale;
}) {
  const registros = loadCollection<{ title: string; updated: string; pair: string | null }>(
    "page",
    locale,
  );
  const registro =
    locale === "es"
      ? registros.find((p) => p.slug === slugEs)
      : registros.find((p) => p.data.pair === slugEs);
  if (!registro) notFound();

  const t = loadUiStrings()[locale];
  const fecha = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(registro.data.updated));

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold text-blue-deep text-balance">{registro.data.title}</h1>
      <p className="mt-3 text-sm text-ink-2">
        {t["legal.lastUpdated"]}: {fecha}
      </p>

      <div className="mt-10 flex flex-col gap-4">
        {bloquesDe(registro.body).map((bloque, i) => {
          if (bloque.tipo === "encabezado") {
            return (
              <h2 key={i} className="mt-6 text-2xl font-bold text-blue-primary">
                {bloque.texto}
              </h2>
            );
          }
          if (bloque.tipo === "lista") {
            return (
              <ul key={i} className="flex list-disc flex-col gap-1 pl-5 text-ink">
                {bloque.elementos.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-ink">
              {bloque.texto}
            </p>
          );
        })}
      </div>
    </article>
  );
}
