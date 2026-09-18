import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { RAMAS, SERVICIOS } from "@/lib/content/rutas";
import { secciones } from "@/lib/content/secciones";

import { Markdown } from "./Markdown";
import { HeroTipografico, TarjetaDeServicio } from "./piezas";

/**
 * `VoltAi by SLG` — el overview de la rama, que es **la puerta a las tres líneas**
 * (DU-04, criterio 2).
 *
 * Enlaza a las tres y a ninguna más. La cuenta de servicios de cada tarjeta
 * sale de la tabla de rutas, no de un número escrito a mano: si mañana entra un
 * servicio nuevo, la cuenta cambia sola.
 */
export function PuertaDeAI({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const idx = lang === "en" ? "en" : "es";
  const slug = lang === "en" ? "ai" : "ai";
  const pagina = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === slug,
  );
  const cuerpo = pagina?.body ?? "";
  const bloques = secciones(cuerpo);
  // La entrada es lo que va ANTES del primer `##`: se pinta siempre. Antes solo
  // se pintaba el cuerpo cuando no había ninguna sección, así que añadir una
  // («Por qué VoltAi») hizo desaparecer también el párrafo de entrada. Las
  // secciones van después de las tres líneas: primero la oferta, luego el
  // nombre y su historia.
  const entrada = cuerpo.split(/\n##\s+/)[0]?.trim() ?? "";

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
      <HeroTipografico titular={pagina?.data.title ?? ""} apoyo={pagina?.data.description ?? ""} />

      {entrada ? (
        <div style={{ maxWidth: "44rem" }}>
          <Markdown texto={entrada} />
        </div>
      ) : null}

      <section aria-labelledby="lineas" style={{ padding: "2.5rem 0 4rem" }}>
        <h2 id="lineas" style={titulo}>
          {t["overview.lines"]}
        </h2>
        <ul style={rejilla}>
          {RAMAS.map((r) => {
            const registro = loadCollection<{ title: string; description: string }>(
              "page",
              lang,
            ).find((p) => p.slug === (lang === "en" ? r.slugEn : r.slug));
            if (!registro) return null;
            const total = SERVICIOS.filter((s) => s.rama === r.slug).length;
            return (
              <li key={r.slug} style={{ listStyle: "none" }}>
                <TarjetaDeServicio
                  nombre={registro.data.title}
                  resumen={registro.data.description}
                  rama={`${total} ${t["home.services"]}`}
                  href={r[idx]}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {bloques.map((b) => (
        <section key={b.titulo} aria-label={b.titulo} style={{ maxWidth: "44rem", padding: "0 0 4rem" }}>
          <h2 style={titulo}>{b.titulo}</h2>
          <Markdown texto={b.cuerpo} />
        </section>
      ))}
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
