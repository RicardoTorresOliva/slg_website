import { QueIncluye } from "@/components/que-incluye/QueIncluye";
import { loadUiStrings } from "@/lib/content/loader";
import { cargarServicio } from "@/lib/content/service";
import { localizarRuta, ruta, type Locale } from "@/lib/routes/map";

/**
 * Página de servicio — el contrato A.3 (DU-05), seis secciones en orden fijo.
 *
 * ① para quién y qué problema · ② qué es · ③ qué incluye · ④ cómo trabajamos ·
 * ⑤ descarga · ⑥ siguiente paso.
 *
 * **La sección ⑤ es el único llamado a la acción de la página** (RF-07,
 * §10-8): no hay segundo CTA, ni agenda embebida, ni formulario de contacto.
 * La sección ⑥ enlaza a `/contacto` con texto sin venta y sin incrustar
 * calendario ni widget de terceros (RF-08). Ninguna página ofrece «Sesión
 * Cero» (RF-96) — no está escrito en ningún sitio de este componente, y el
 * copy aprobado tampoco lo dice.
 *
 * La **máquina** de la descarga (formulario, entrega firmada, captura) llega
 * en DU-08. En M1 la sección ⑤ presenta el documento y lleva a su página.
 */
export function ServicePage({ slug, locale }: { slug: string; locale: Locale }) {
  const t = loadUiStrings()[locale];
  const servicio = cargarServicio(slug, locale, ruta("descargas", locale));

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      {/* Eyebrow de rama: dónde estoy, y vuelta al overview. Sustituye a una
          miga de tres niveles, que en móvil ocupa una línea entera (§2.2). */}
      {servicio.overviewHref && (
        <a
          href={localizarRuta(servicio.overviewHref, locale)}
          className="text-xs font-bold tracking-[0.09em] text-blue-primary uppercase no-underline"
        >
          {servicio.rama} ›
        </a>
      )}
      <h1 className="mt-2 text-4xl font-bold text-blue-deep text-balance">{servicio.nombre}</h1>

      {/* ① PARA QUIÉN Y QUÉ PROBLEMA */}
      <Seccion titulo={t["service.whoFor"]} vacio={t["service.sectionPending"]}>
        {servicio.paraQuien}
      </Seccion>

      {/* ② QUÉ ES */}
      <Seccion titulo={t["service.whatItIs"]} vacio={t["service.sectionPending"]}>
        {servicio.queEs}
      </Seccion>

      {/* ③ QUÉ INCLUYE — la cifra grande como elemento gráfico (C.2) */}
      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-bold text-blue-primary">{t["service.whatIncludes"]}</h2>
        {servicio.queIncluye.length > 0 ? (
          <QueIncluye
            items={servicio.queIncluye.map((texto, i) => ({
              figura: String(i + 1).padStart(2, "0"),
              texto,
            }))}
          />
        ) : (
          <p className="text-ink-2">{t["service.includesPending"]}</p>
        )}
      </section>

      {/* ④ CÓMO TRABAJAMOS */}
      <Seccion titulo={t["service.howWeWork"]} vacio={t["service.sectionPending"]}>
        {servicio.comoTrabajamos}
      </Seccion>

      {/* ⑤ DESCARGA — ÚNICO CTA DE LA PÁGINA (RF-07) */}
      <section className="mt-12 rounded-lg border border-line bg-paper-2 p-6">
        <h2 className="text-2xl font-bold text-blue-deep">{t["service.download"]}</h2>
        {servicio.documento ? (
          <>
            {servicio.documento.titulo && (
              <p className="mt-3 text-lg font-bold text-ink">{servicio.documento.titulo}</p>
            )}
            {servicio.documento.publico && (
              <p className="mt-1 text-sm text-ink-2">{servicio.documento.publico}</p>
            )}
            {servicio.documento.aprende.length > 0 && (
              <ul className="mt-4 flex list-disc flex-col gap-1 pl-5 text-ink-2">
                {servicio.documento.aprende.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
            )}
            <p className="mt-6">
              <a href={servicio.documento.href}>
                {servicio.documento.estado === "published"
                  ? t["download.cta"]
                  : t["download.comingSoon"]}{" "}
                →
              </a>
            </p>
          </>
        ) : (
          // Criterio 7: un servicio sin registro de descarga no puede quedarse
          // sin sección ⑤ — es el único CTA, y sin ella la página no tiene salida.
          <p className="mt-3 text-ink-2">{t["service.downloadPending"]}</p>
        )}
      </section>

      {/* ⑥ SIGUIENTE PASO — sin venta, sin agenda embebida, sin widget (RF-08) */}
      <section className="mt-10">
        <h2 className="mb-2 text-2xl font-bold text-blue-primary">{t["service.nextStep"]}</h2>
        <p className="text-ink-2">
          {servicio.siguientePaso}{" "}
          <a href={ruta("contacto", locale)}>{t["service.contactLink"]}</a>
        </p>
      </section>
    </article>
  );
}

function Seccion({
  titulo,
  vacio,
  children,
}: {
  titulo: string;
  vacio: string;
  children: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-2 text-2xl font-bold text-blue-primary">{titulo}</h2>
      <p className="text-ink-2">{children || vacio}</p>
    </section>
  );
}
