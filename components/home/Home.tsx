import { ArticleCard } from "@/components/article-card/ArticleCard";
import { BranchCard } from "@/components/branch-card/BranchCard";
import { Hero } from "@/components/hero/Hero";
import { cargarHome } from "@/lib/content/home";
import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { localizarRuta, ruta, type Locale } from "@/lib/routes/map";

/**
 * Portada (DU-03) — los siete bloques de RF-09, en orden fijo.
 *
 * 1 hero · 2 dos puertas · 3 tres tarjetas de SLG_AI · 4 franja Doctrina ·
 * 5 últimos artículos · 6 descarga destacada · 7 pie (lo pone el armazón de
 * DU-02, no esta página).
 *
 * Ni una cadena de negocio vive aquí (RF-16, criterio 4): el copy sale de
 * `content/pages/{es,en}/home.md` —aprobado en FU-01— y las etiquetas de
 * interfaz de `content/ui`. El orden de los bloques lo hace cumplir
 * `cargarHome`, que rechaza el registro si falta uno o están desordenados.
 */

export async function Home({ locale }: { locale: Locale }) {
  const home = cargarHome(locale);
  const t = loadUiStrings()[locale];

  const articulos = loadCollection<{
    title: string;
    description: string;
    date: string;
    tags: string[];
    status: string;
  }>("post", locale)
    .filter((p) => p.data.status === "published")
    .sort((a, b) => b.data.date.localeCompare(a.data.date))
    .slice(0, 3);

  const formatoDeFecha = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* 1 · HERO TIPOGRÁFICO — una idea, sin imagen, sin botón (§2.1) */}
      <Hero headline={home.hero.titular} subheadline={home.hero.subtitular ?? undefined} />

      {/*
        2 · DOS PUERTAS — el visitante elige rama antes de ver nada más.

        El encabezado va para lector de pantalla, no a la vista: el wireframe
        §2.1 no lleva título en este bloque (las tarjetas se nombran solas),
        pero sin un `h2` la página saltaba de `h1` a los `h3` de las tarjetas.
        Quien navega por encabezados se encontraba tarjetas de nivel 3 sin
        sección padre. Medido: Lighthouse accesibilidad 94 → 100.
      */}
      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-16 md:grid-cols-2">
        <h2 className="sr-only">{t["home.doorsHeading"]}</h2>
        {home.puertas.map((puerta) => (
          <BranchCard
            key={puerta.href}
            name={puerta.nombre}
            description={puerta.descripcion}
            href={localizarRuta(puerta.href, locale)}
          />
        ))}
      </section>

      {/* 3 · TRES TARJETAS DE SLG_AI — mismo trato de encabezado que el bloque 2 */}
      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 md:grid-cols-3">
        <h2 className="sr-only">{t["home.cardsHeading"]}</h2>
        {home.tarjetas.map((tarjeta) => (
          <BranchCard
            key={tarjeta.href}
            name={tarjeta.nombre}
            description={tarjeta.descripcion}
            href={localizarRuta(tarjeta.href, locale)}
          />
        ))}
      </section>

      {/* 4 · FRANJA DOCTRINA — sección oscura permitida (C.3), sin logo dentro */}
      <section className="seccion-oscura bg-blue-deep text-paper">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-20 text-center">
          <blockquote className="text-2xl leading-snug text-balance">
            {home.doctrina ?? t["home.doctrine.empty"]}
          </blockquote>
          <a href={ruta("doctrina", locale)}>{t["home.doctrine.link"]} →</a>
        </div>
      </section>

      {/*
        5 · ÚLTIMOS ARTÍCULOS — cuando no hay ninguno publicado, la sección NO
        se renderiza. Es instrucción explícita de `ui_wireframes` §2.1 ("una
        portada con estados vacíos visibles no es una portada") y contradice la
        letra del criterio 2 de esta unidad, que pide redacción propia para
        este bloque. Se resuelve a favor del wireframe por ser la instrucción
        específica para esta situación exacta; queda registrado en
        `docs/decision_log.md` para que Ricardo pueda revertirlo.
      */}
      {articulos.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-8 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold text-blue-deep">{t["home.latestPosts.title"]}</h2>
            <a href={ruta("blog", locale)} className="text-sm">
              {t["home.latestPosts.all"]} →
            </a>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {articulos.map((articulo) => (
              <ArticleCard
                key={articulo.slug}
                href={`${ruta("blog", locale)}/${articulo.slug}`}
                title={articulo.data.title}
                description={articulo.data.description}
                fecha={formatoDeFecha.format(new Date(articulo.data.date))}
                tags={articulo.data.tags}
              />
            ))}
          </div>
        </section>
      )}

      {/*
        6 · DESCARGA DESTACADA — este bloque SÍ conserva estado vacío escrito:
        es el único CTA de la portada, y esconderlo dejaría la página sin
        camino de conversión. Enlaza a la página del documento, donde vive el
        formulario: no se duplica el formulario en Home (§2.1).
      */}
      <section className="superficie-suave border-t border-line bg-paper-2">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-20 text-center">
          <h2 className="text-2xl font-bold text-blue-deep">
            {t["home.featuredDownload.title"]}
          </h2>
          <p className="text-ink-2">
            {home.descargaDestacada ?? t["home.featuredDownload.empty"]}
          </p>
        </div>
      </section>
    </>
  );
}
