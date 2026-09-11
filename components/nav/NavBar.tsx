"use client";

import { useState } from "react";

import { MobileSheet } from "./MobileSheet.tsx";
import { TAP_FEEDBACK } from "../shared/interaction.ts";

/**
 * NavBar — componente #2 de C.5 (barra de navegación translúcida + sheet
 * móvil arrastrable). Exactamente 5 destinos + 1 botón — sin desplegables,
 * que convertirían 5 en más (RF-01).
 *
 * Traducción del contenido: NO vive aquí. `items`/`switchLangHref` llegan por
 * props desde quien renderice la página real (DU-02) — este componente es
 * puro armazón de interacción, sin una sola cadena de negocio (RF-16).
 */

export type NavItem = { href: string; label: string; activo?: boolean };

export type NavBarProps = {
  logoHref: string;
  items: readonly NavItem[];
  signInLabel: string;
  signInHref: string;
  locale: "es" | "en";
  /** `null` cuando el `post` actual no tiene par (única excepción de paridad, RF-26). */
  switchLangHref: string | null;
  strings: Record<string, string>;
};

export function NavBar({ logoHref, items, signInLabel, signInHref, locale, switchLangHref, strings: t }: NavBarProps) {
  const [sheetAbierto, setSheetAbierto] = useState(false);

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2 focus:text-ink"
      >
        {t["nav.skipToContent"]}
      </a>

      <header
        className="sticky top-0 z-40 border-b border-transparent bg-paper/70 backdrop-blur-xl backdrop-saturate-150"
        style={{ backdropFilter: "var(--slg-blur)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <a href={logoHref} className="no-underline font-bold text-blue-deep">
            SLG Agency
          </a>

          <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={item.activo ? "page" : undefined}
                className={item.activo ? "underline decoration-2 underline-offset-4" : "no-underline"}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <LanguageSwitch locale={locale} href={switchLangHref} noPairLabel={t["nav.langSwitchNoPair"]} />
            <a
              href={signInHref}
              className={`rounded-md border border-line px-3 py-1.5 text-sm no-underline ${TAP_FEEDBACK}`}
            >
              {signInLabel}
            </a>
          </div>

          <button
            type="button"
            className={`rounded-md border border-line p-2 md:hidden ${TAP_FEEDBACK}`}
            aria-label={t["nav.openMenu"]}
            aria-expanded={sheetAbierto}
            onClick={() => setSheetAbierto(true)}
          >
            <HamburgerIcon />
          </button>
        </div>
      </header>

      <MobileSheet
        abierto={sheetAbierto}
        onCerrar={() => setSheetAbierto(false)}
        cerrarLabel={t["nav.closeMenu"]}
      >
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.activo ? "page" : undefined}
              className="rounded-md px-3 py-3 no-underline hover:bg-paper-2"
              onClick={() => setSheetAbierto(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <hr className="my-3 border-line" />
        <a
          href={signInHref}
          className="rounded-md px-3 py-3 no-underline hover:bg-paper-2"
          onClick={() => setSheetAbierto(false)}
        >
          {signInLabel}
        </a>
        <div className="mt-3 px-3">
          <LanguageSwitch locale={locale} href={switchLangHref} noPairLabel={t["nav.langSwitchNoPair"]} />
        </div>
      </MobileSheet>
    </>
  );
}

function LanguageSwitch({
  locale,
  href,
  noPairLabel,
}: {
  locale: "es" | "en";
  href: string | null;
  noPairLabel: string;
}) {
  const destino = locale === "es" ? "EN" : "ES";
  if (!href) {
    return (
      <span className="text-sm text-ink-2" title={noPairLabel} aria-disabled="true">
        {destino}
      </span>
    );
  }
  return (
    <a href={href} lang={locale === "es" ? "en" : "es"} className="text-sm no-underline">
      {destino}
    </a>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
