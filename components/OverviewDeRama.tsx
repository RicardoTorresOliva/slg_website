import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { RAMAS, SERVICIOS, rutaEnDeServicio, slugEnDeServicio } from "@/lib/content/rutas";
import { secciones } from "@/lib/content/secciones";

import { Markdown } from "./Markdown";
import { HeroTipografico, TarjetaDeServicio } from "./piezas";

/**
 * Overview de una línea de `SLG_AI` — el índice de sus servicios (DU-04).
 *
 * **Enlaza a TODOS sus servicios y a ninguno que no le corresponda** (criterio
 * 2): la lista sale de `SERVICIOS` filtrando por rama, así que añadir un
 * servicio a una línea es añadir su fila a la tabla de rutas y su `.md`. No hay
 * una segunda lista que se pueda desincronizar de la primera.
 *
 * **El servicio cuyo registro de contenido aún no exista NO rompe el índice**
 * (criterio 5): se salta, y el resto de la página se sirve igual.
 */
export function OverviewDeRama({ slug, lang }: { slug: string; lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const rama = RAMAS.find((r) => r.slug === slug);
  const registroSlug = lang === "en" ? rama?.slugEn : rama?.slug;
  const pagina = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === registroSlug,
  );
  const bloques = secciones(pagina?.body ?? "");

  const servicios = SERVICIOS.filter((s) => s.rama === slug);
  const registros = loadCollection<{ name: string }>("service", lang);

  const tarjetas = servicios
    .map((s) => {
      const buscado = lang === "en" ? slugEnDeServicio(s) : s.slug;
      const registro = registros.find((r) => r.slug === buscado);
      // Criterio 5: sin registro, no hay tarjeta — y el índice sigue en pie.
      if (!registro) return null;
      const primeraSeccion = secciones(registro.body)[0];
      return {
        nombre: registro.data.name,
        resumen: primeraSeccion?.cuerpo.split("\n")[0] ?? "",
        href: lang === "en" ? rutaEnDeServicio(s) : s.es,
      };
    })
    .filter((x): x is { nombre: string; resumen: string; href: string } => x !== null);

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
      <HeroTipografico
        titular={pagina?.data.title ?? ""}
        apoyo={pagina?.data.description ?? ""}
      />

      {bloques.length === 0 ? <Markdown texto={pagina?.body ?? ""} /> : null}

      <section aria-labelledby="servicios" style={{ padding: "2rem 0 4rem" }}>
        <h2 id="servicios" style={titulo}>
          {t["overview.services"]}
        </h2>
        <ul style={rejilla}>
          {tarjetas.map((s) => (
            <li key={s.href} style={{ listStyle: "none" }}>
              <TarjetaDeServicio nombre={s.nombre} resumen={s.resumen} href={s.href} />
            </li>
          ))}
        </ul>

        {/* Criterio 3 · `Phoenix Academy` está FUERA de alcance (§10-7,
            frontera (e)): se enlaza y se señala como externo. Sin integración,
            sin sesión compartida y sin contenido embebido. `rel="noopener"`
            porque `target="_blank"` sin él deja al destino manipular esta
            pestaña. */}
        {slug === "slg-academy" ? (
          <p style={{ paddingTop: "1.5rem" }}>
            <a
              href="https://academy.softlandingglobal.com"
              target="_blank"
              rel="noopener noreferrer external"
              style={enlaceExterno}
            >
              {t["overview.phoenixAcademy"]}
              <span aria-hidden="true"> ↗</span>
              <span style={visualmenteOculto}>{t["overview.opensExternal"]}</span>
            </a>
          </p>
        ) : null}
      </section>
    </div>
  );
}

const titulo: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: "clamp(1.375rem, 3vw, 1.75rem)",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const rejilla: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(17rem, 1fr))",
  gap: "1.25rem",
  margin: 0,
  padding: 0,
};

const enlaceExterno: React.CSSProperties = {
  color: "var(--slg-link)",
  fontSize: "0.9375rem",
  textDecoration: "none",
  borderBottom: "1px solid currentColor",
};

/** Visible para un lector de pantalla, invisible en pantalla. */
const visualmenteOculto: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
