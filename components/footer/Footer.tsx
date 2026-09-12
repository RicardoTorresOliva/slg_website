/**
 * Footer — componente #7 de C.5, "el pie" (`design_docs/ui_wireframes.md`
 * §2.1): segundo camino a Descargas, Contacto y Legal, que no están en el
 * menú principal de 5 destinos (RF-01) — sin él, esas rutas solo serían
 * alcanzables desde dentro del cuerpo de otra página.
 *
 * `ramas`, las rutas y `locale`/`switchLangHref` llegan por props (RF-16,
 * mismo patrón que `NavBar`): este componente es armazón, sin una sola
 * cadena de negocio propia. El texto genérico (etiquetas legales, "SLG
 * Agency Inc.", el aviso de jurisdicción pendiente) viene de `content/ui`.
 */

import { Wordmark } from "../Wordmark.tsx";

export type FooterNavItem = { href: string; label: string };

export type FooterProps = {
  ramas: readonly FooterNavItem[];
  downloadsHref: string;
  contactHref: string;
  privacyHref: string;
  termsHref: string;
  rssHref: string;
  locale: "es" | "en";
  switchLangHref: string | null;
  strings: Record<string, string>;
};

export function Footer({
  ramas,
  downloadsHref,
  contactHref,
  privacyHref,
  termsHref,
  rssHref,
  locale,
  switchLangHref,
  strings: t,
}: FooterProps) {
  const destino = locale === "es" ? "EN" : "ES";

  return (
    <footer className="superficie-suave border-t border-line bg-paper-2">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-ink-2">
        <Wordmark className="-ml-[0.72em]" />

        <nav aria-label="Ramas" className="flex flex-wrap gap-x-4 gap-y-1">
          {ramas.map((item, i) => (
            <span key={item.href} className="flex items-center gap-4">
              <a href={item.href} className="no-underline">
                {item.label}
              </a>
              {i < ramas.length - 1 && <span aria-hidden="true">·</span>}
            </span>
          ))}
        </nav>

        <nav aria-label="Recursos" className="flex flex-wrap gap-x-4 gap-y-1">
          <a href={downloadsHref} className="no-underline">
            {t["footer.downloads"]}
          </a>
          <span aria-hidden="true">·</span>
          <a href={contactHref} className="no-underline">
            {t["footer.contact"]}
          </a>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={privacyHref} className="no-underline">
              {t["footer.legalPrivacy"]}
            </a>
            <span aria-hidden="true">·</span>
            <a href={termsHref} className="no-underline">
              {t["footer.legalTerms"]}
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {switchLangHref ? (
              <a href={switchLangHref} lang={locale === "es" ? "en" : "es"} className="no-underline">
                {destino}
              </a>
            ) : (
              <span aria-disabled="true" title={t["nav.langSwitchNoPair"]}>
                {destino}
              </span>
            )}
            <a href={rssHref} className="no-underline">
              {t["footer.rss"]} ↗
            </a>
          </div>
        </div>

        <p>
          © {t["footer.rights"]} · {t["footer.jurisdictionPending"]}
        </p>
      </div>
    </footer>
  );
}
