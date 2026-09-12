import { BranchCard } from "@/components/branch-card/BranchCard";
import { cargarOverview, type SlugDeOverview } from "@/lib/content/overview";
import { loadUiStrings } from "@/lib/content/loader";
import { localizarRuta, type Locale } from "@/lib/routes/map";

/**
 * Overview de rama (DU-04) — `/ai` y las tres líneas.
 *
 * Estas cuatro **no** son páginas de servicio: no tienen descarga, así que no
 * hay CTA rojo en ninguna (`ui_wireframes` §2.3). Son índices: una idea de qué
 * resuelve la rama, y las tarjetas de sus hijos directos.
 */

export function Overview({ slug, locale }: { slug: SlugDeOverview; locale: Locale }) {
  const overview = cargarOverview(slug, locale === "es" ? "es" : "en");
  const t = loadUiStrings()[locale];

  return (
    <>
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-12">
        <h1 className="text-4xl font-bold text-blue-deep text-balance">{overview.titulo}</h1>
        <p className="mt-6 text-lg text-ink-2">{overview.intro}</p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 md:grid-cols-2 lg:grid-cols-3">
        <h2 className="sr-only">{t["overview.indexHeading"]}</h2>
        {overview.entradas.map((entrada) => (
          <BranchCard
            key={entrada.href}
            name={entrada.nombre}
            description={entrada.descripcion}
            href={localizarRuta(entrada.href, locale)}
          />
        ))}
      </section>

      {/*
        Criterio 3 · RF-13 · frontera (e) de `scope.md`: Phoenix Academy queda
        FUERA de alcance. Solo se enlaza, y el enlace tiene que decir que sale
        del sitio — sin integración, sin sesión compartida, sin nada embebido.
        `rel="noopener"` no es adorno: sin él la pestaña destino puede
        manipular la de origen por `window.opener`.
      */}
      {slug === "slg-academy" && (
        <section className="superficie-suave border-t border-line bg-paper-2">
          <div className="mx-auto max-w-3xl px-6 py-12 text-center">
            <a
              href="https://academy.softlandingglobal.com"
              target="_blank"
              rel="noopener noreferrer external"
            >
              {t["overview.phoenixAcademy"]}{" "}
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> ({t["overview.opensExternal"]})</span>
            </a>
          </div>
        </section>
      )}
    </>
  );
}
