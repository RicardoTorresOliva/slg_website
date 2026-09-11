import type { Metadata } from "next";

import { loadUiStrings } from "@/lib/content/loader.ts";
import { NavBar } from "@/components/nav/NavBar.tsx";
import { PrototipoFormularioDeDescarga } from "./formulario-de-descarga.tsx";

/**
 * `/prototipos` — vitrina de los nueve componentes de C.5 (FU-10).
 *
 * NO es una página pública: sirve para que cada componente sea "real,
 * navegable con teclado y con gesto" (criterio 1) y quede accesible después
 * para cualquiera que necesite revisarlo — no una imagen, no un archivo
 * externo. `noindex` explícito: no es contenido para visitantes.
 */
export const metadata: Metadata = {
  title: "Prototipos — FU-10",
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: "#", label: "SLG_AI", activo: true },
  { href: "#", label: "SLG_Holdings" },
  { href: "#", label: "Doctrina" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Nosotros" },
] as const;

export default function Prototipos() {
  const es = loadUiStrings().es;

  return (
    <>
      <NavBar
        logoHref="#"
        items={NAV_ITEMS}
        signInLabel={es["nav.signin"]}
        signInHref="#"
        locale="es"
        switchLangHref="#"
        strings={es}
      />

      <main id="contenido" className="mx-auto flex max-w-2xl flex-col gap-16 px-6 py-16">
        <header>
          <h1 className="text-2xl font-bold text-blue-deep">Prototipos — FU-10</h1>
          <p className="text-ink-2">
            Componentes de C.5, en el orden de construcción (RF-134: formulario de descarga primero).
          </p>
        </header>

        <section aria-labelledby="h-descarga" className="flex flex-col gap-4">
          <h2 id="h-descarga" className="text-lg font-semibold text-blue-primary">
            1. Formulario de descarga — completo
          </h2>
          <PrototipoFormularioDeDescarga strings={es} variante="completo" />
        </section>

        <section aria-labelledby="h-descarga-proximamente" className="flex flex-col gap-4">
          <h2 id="h-descarga-proximamente" className="text-lg font-semibold text-blue-primary">
            1b. Formulario de descarga — «disponible próximamente»
          </h2>
          <PrototipoFormularioDeDescarga strings={es} variante="proximamente" />
        </section>

        <section aria-labelledby="h-nav" className="flex flex-col gap-4">
          <h2 id="h-nav" className="text-lg font-semibold text-blue-primary">
            2. Barra de navegación + sheet móvil
          </h2>
          <p className="text-ink-2">
            Arriba de esta página. Reduce el viewport a móvil para ver el botón de menú y el sheet
            arrastrable.
          </p>
        </section>
      </main>
    </>
  );
}
