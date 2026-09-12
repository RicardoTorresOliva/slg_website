import { notFound } from "next/navigation";

import { buscarDocumento } from "@/lib/content/downloads";
import { loadUiStrings } from "@/lib/content/loader";
import { ruta, type Locale } from "@/lib/routes/map";
import { FormularioDeCaptura } from "./FormularioDeCaptura";

/**
 * Ficha de un documento — `/descargas/[slug]` (DU-08).
 *
 * Aquí vive el formulario de captura, y **solo aquí**: la portada y las
 * páginas de servicio enlazan a esta página en vez de duplicar el formulario,
 * porque un mismo formulario en dos sitios son dos comportamientos que
 * divergen (`ui_wireframes` §2.1).
 *
 * Un documento sin archivo se sirve igual, con la variante «próximamente»:
 * captura el correo, no emite URL firmada y no registra descarga (RF-40,
 * criterio 7). Ese estado no es un fallo — es lo que permite lanzar la
 * campaña antes de que existan los PDFs.
 */
export function FichaDeDocumento({ slug, locale }: { slug: string; locale: Locale }) {
  const documento = buscarDocumento(slug, locale);
  if (!documento) notFound();

  const t = loadUiStrings()[locale];
  const hayArchivo = documento.claveDeArchivo !== null;
  const rutaDePagina = `${ruta("descargas", locale)}/${slug}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-bold tracking-[0.09em] text-blue-primary uppercase">
        {hayArchivo ? t["downloads.statusAvailable"] : t["download.comingSoon"]}
      </p>
      <h1 className="mt-2 text-4xl font-bold text-blue-deep text-balance">
        {documento.titulo || t["downloads.untitled"]}
      </h1>

      {documento.publico && (
        <p className="mt-6">
          <span className="font-bold text-ink">{t["downloads.forWhom"]}: </span>
          <span className="text-ink-2">{documento.publico}</span>
        </p>
      )}

      {documento.aprende.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-blue-primary">{t["downloads.whatYouLearn"]}</h2>
          <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-ink-2">
            {documento.aprende.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="superficie-suave mt-10 rounded-lg border border-line bg-paper-2 p-6">
        {!hayArchivo && <p className="mb-4 text-ink-2">{t["download.comingSoonBody"]}</p>}
        <FormularioDeCaptura
          slug={slug}
          rutaDePagina={rutaDePagina}
          strings={t}
          variante={hayArchivo ? "completo" : "proximamente"}
          privacyHref={ruta("legalPrivacidad", locale)}
        />
      </section>
    </div>
  );
}
