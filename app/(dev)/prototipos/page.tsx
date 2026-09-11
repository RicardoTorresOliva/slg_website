import type { Metadata } from "next";

import { loadUiStrings } from "@/lib/content/loader.ts";
import { NavBar } from "@/components/nav/NavBar.tsx";
import { Hero } from "@/components/hero/Hero.tsx";
import { BranchCard } from "@/components/branch-card/BranchCard.tsx";
import { QueIncluye } from "@/components/que-incluye/QueIncluye.tsx";
import { ArticleCard } from "@/components/article-card/ArticleCard.tsx";
import { Footer } from "@/components/footer/Footer.tsx";
import { PrototipoAppShell } from "./app-shell-demo.tsx";
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

        <section aria-labelledby="h-hero" className="flex flex-col gap-4">
          <h2 id="h-hero" className="text-lg font-semibold text-blue-primary">
            3. Hero tipográfico
          </h2>
          <div className="rounded-lg border border-line">
            <Hero
              eyebrow="SLG_AI"
              headline="Automatización con criterio, no con humo"
              subheadline="Diagnóstico, hoja de ruta y ejecución — sin venderte lo que no necesitas."
              ctaLabel="Descargar el diagnóstico"
              ctaHref="#"
            />
          </div>
        </section>

        <section aria-labelledby="h-branch-card" className="flex flex-col gap-4">
          <h2 id="h-branch-card" className="text-lg font-semibold text-blue-primary">
            4. Tarjeta de rama/servicio
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <BranchCard name="SLG_AI" description="Automatización e IA aplicada, de diagnóstico a ejecución." href="/ai" />
            <BranchCard
              name="SLG_Holdings"
              description="Participaciones y estructura de negocio a largo plazo."
              href="/holdings"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <BranchCard
              name="Academy"
              description="Formación aplicada para equipos que van a operar la automatización."
              href="/ai/academy"
              downloadLabel="Incluye: temario descargable"
            />
            <BranchCard
              name="Enterprise"
              description="Automatización a medida para procesos ya en marcha."
              href="/ai/enterprise"
              downloadLabel="Incluye: caso de estudio descargable"
            />
            <BranchCard
              name="Factory"
              description="Productos de IA propios, listos para integrar."
              href="/ai/factory"
              downloadLabel="Incluye: ficha técnica descargable"
            />
          </div>
        </section>

        <section aria-labelledby="h-que-incluye" className="flex flex-col gap-4">
          <h2 id="h-que-incluye" className="text-lg font-semibold text-blue-primary">
            5. Bloque «Qué incluye»
          </h2>
          <QueIncluye
            items={[
              { figura: "11", texto: "dimensiones evaluadas de SLG_Readiness" },
              { figura: "3", texto: "sesiones de trabajo con el equipo directivo" },
              { figura: "1", texto: "hoja de ruta priorizada, lista para ejecutar" },
            ]}
          />
        </section>

        <section aria-labelledby="h-article-card" className="flex flex-col gap-4">
          <h2 id="h-article-card" className="text-lg font-semibold text-blue-primary">
            6. Tarjeta de artículo
          </h2>
          <ArticleCard
            href="/blog/ejemplo"
            title="Por qué la mayoría de proyectos de automatización fracasan en el primer mes"
            description="No es un problema de herramientas. Es un problema de diagnóstico: automatizar el proceso equivocado, más rápido, sigue siendo el proceso equivocado."
            fecha="10 de septiembre de 2026"
            tags={["Automatización", "Diagnóstico"]}
            coverSrc="/file.svg"
            coverAlt=""
          />
        </section>

        <section aria-labelledby="h-footer" className="flex flex-col gap-4">
          <h2 id="h-footer" className="text-lg font-semibold text-blue-primary">
            7. Pie
          </h2>
          <div className="rounded-lg border border-line">
            <Footer
              ramas={NAV_ITEMS}
              downloadsHref="/descargas"
              contactHref="/contacto"
              privacyHref="/legal/privacidad"
              termsHref="/legal/terminos"
              rssHref="/blog/rss.xml"
              locale="es"
              switchLangHref="#"
              strings={es}
            />
          </div>
        </section>

        <section aria-labelledby="h-app-shell" className="flex flex-col gap-4">
          <h2 id="h-app-shell" className="text-lg font-semibold text-blue-primary">
            8. Shell de app (barra lateral, tabla, ficha, panel lateral, estados)
          </h2>
          <PrototipoAppShell />
        </section>
      </main>
    </>
  );
}
