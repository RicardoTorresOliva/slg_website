import Link from "next/link";

import { articulos } from "@/lib/content/blog";
import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { DESTINOS, RAMAS, SERVICIOS } from "@/lib/content/rutas";
import { secciones } from "@/lib/content/secciones";

import { Markdown } from "./Markdown";
import { Reveal } from "./Reveal";
import { HeroTipografico, TarjetaDeArticulo, TarjetaDeServicio } from "./piezas";

/**
 * La portada — **los siete bloques de RF-09, en orden fijo**.
 *
 *   1. Hero tipográfico, una idea
 *   2. Las dos ramas como dos puertas
 *   3. Las tres tarjetas de `SLG_AI`
 *   4. Franja Doctrina con pull-quote y enlace
 *   5. Últimos artículos
 *   6. Descarga destacada
 *   7. Pie *(lo pone `ArmazonPublico`, que es de DU-02)*
 *
 * **El orden no lo decide este archivo: lo decide el `.md`.** Los bloques se
 * piden por POSICIÓN a `secciones()`, y esa posición es la del contenido. Si
 * alguien reordena la portada, la reordena editando el registro `home` de
 * `content/pages`, que es exactamente lo que RF-27 promete.
 *
 * Cero cadena de negocio escrita aquí (RF-16). Lo vigila `check:cadenas`.
 */
export function Portada({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const home = loadCollection("page", lang).find((p) => p.slug === "home");
  const bloques = secciones(home?.body ?? "");

  const [hero, puertas, lineas, doctrina, articulosBloque, descarga] = bloques;
  const idx = lang === "en" ? "en" : "es";

  // Las dos puertas y las tres líneas traen sus propios subtítulos (`###`):
  // se parten aquí para no repetir los nombres en el componente.
  const puertasSub = subsecciones(puertas?.cuerpo ?? "");
  const lineasSub = subsecciones(lineas?.cuerpo ?? "");

  const ultimos = articulos(lang).slice(0, 3);
  const destacada = loadCollection<{ title: string; audience: string; status: string }>(
    "download",
    lang,
  ).find((d) => d.data.status === "available");

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
      {/* 1 · Hero: una idea por viewport (RNF-44). Sin fotografía. */}
      <HeroTipografico
        titular={primeraLinea(hero?.cuerpo ?? "")}
        apoyo={restoDeLineas(hero?.cuerpo ?? "")}
      />

      {/* 2 · Las dos puertas. El visitante elige rama antes de ver nada más. */}
      <Reveal>
        <section aria-labelledby="puertas" style={seccion}>
          <h2 id="puertas" style={tituloDeSeccion}>
            {puertas?.titulo}
          </h2>
          <p style={apoyoDeSeccion}>{puertas?.cuerpo.split("\n")[0]}</p>
          <div style={rejillaDos}>
            {puertasSub.map((s, i) => (
              <TarjetaDeServicio
                key={s.titulo}
                nombre={s.titulo}
                resumen={s.cuerpo}
                href={i === 0 ? DESTINOS[0][idx] : DESTINOS[1][idx]}
              />
            ))}
          </div>
        </section>
      </Reveal>

      {/* 3 · Las tres líneas de SLG_AI. */}
      <Reveal>
        <section aria-labelledby="lineas" style={seccion}>
          <h2 id="lineas" style={tituloDeSeccion}>
            {lineas?.titulo}
          </h2>
          <p style={apoyoDeSeccion}>{lineas?.cuerpo.split("\n")[0]}</p>
          <div style={rejillaTres}>
            {lineasSub.map((s, i) => (
              <TarjetaDeServicio
                key={s.titulo}
                nombre={s.titulo}
                resumen={s.cuerpo}
                rama={`${SERVICIOS.filter((x) => x.rama === RAMAS[i]?.slug).length} ${t["home.services"]}`}
                href={RAMAS[i]?.[idx] ?? DESTINOS[0][idx]}
              />
            ))}
          </div>
        </section>
      </Reveal>

      {/* 4 · Franja Doctrina: pull-quote y enlace, no un bloque de texto. */}
      <Reveal>
        <section aria-labelledby="doctrina" style={franja}>
          <h2 id="doctrina" style={{ ...tituloDeSeccion, color: "var(--slg-paper)" }}>
            {doctrina?.titulo}
          </h2>
          <blockquote style={cita}>{sinMarca(primeraLinea(doctrina?.cuerpo ?? ""))}</blockquote>
          <p style={{ ...apoyoDeSeccion, color: "var(--slg-paper)", opacity: 0.9 }}>
            {restoDeLineas(doctrina?.cuerpo ?? "")}
          </p>
          <Link href={DESTINOS[2][idx]} style={enlaceClaro}>
            {t["home.readDoctrine"]}
          </Link>
        </section>
      </Reveal>

      {/* 5 · Últimos artículos, con su estado vacío redactado (criterio 2). */}
      <Reveal>
        <section aria-labelledby="articulos" style={seccion}>
          <h2 id="articulos" style={tituloDeSeccion}>
            {articulosBloque?.titulo}
          </h2>
          {ultimos.length === 0 ? (
            <Markdown texto={articulosBloque?.cuerpo ?? ""} />
          ) : (
            <>
              <p style={apoyoDeSeccion}>{articulosBloque?.cuerpo.split("\n")[0]}</p>
              <ul style={rejillaTres}>
                {ultimos.map((a) => (
                  <li key={a.slug} style={{ listStyle: "none" }}>
                    <TarjetaDeArticulo
                      titulo={a.titulo}
                      resumen={a.descripcion}
                      fecha={a.fecha}
                      href={`${lang === "en" ? "/en" : ""}/blog/${a.slug}`}
                      etiquetas={a.etiquetas}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </Reveal>

      {/* 6 · Descarga destacada, con su estado vacío redactado (criterio 2). */}
      <Reveal>
        <section aria-labelledby="descarga" style={seccion}>
          <h2 id="descarga" style={tituloDeSeccion}>
            {descarga?.titulo}
          </h2>
          {destacada ? (
            <>
              <p style={apoyoDeSeccion}>{destacada.data.title}</p>
              <p style={{ color: "var(--slg-ink-2)" }}>{destacada.data.audience}</p>
            </>
          ) : (
            <Markdown texto={descarga?.cuerpo ?? ""} />
          )}
        </section>
      </Reveal>
    </div>
  );
}

/** Los `###` de un bloque, que son sus tarjetas. */
function subsecciones(cuerpo: string): { titulo: string; cuerpo: string }[] {
  const out: { titulo: string; cuerpo: string }[] = [];
  let actual: { titulo: string; cuerpo: string } | null = null;
  for (const linea of cuerpo.split("\n")) {
    const m = /^###\s+(.+?)\s*$/.exec(linea);
    if (m) {
      if (actual) out.push({ ...actual, cuerpo: actual.cuerpo.trim() });
      actual = { titulo: m[1], cuerpo: "" };
      continue;
    }
    if (actual) actual.cuerpo += `${linea}\n`;
  }
  if (actual) out.push({ ...actual, cuerpo: actual.cuerpo.trim() });
  return out;
}

const primeraLinea = (texto: string) => texto.split("\n").filter(Boolean)[0] ?? "";
const restoDeLineas = (texto: string) =>
  texto.split("\n").filter(Boolean).slice(1).join(" ");
/** Quita la marca de cita del pull-quote: el `<blockquote>` ya lo dice. */
const sinMarca = (texto: string) => texto.replace(/^>\s*/, "");

const seccion: React.CSSProperties = { padding: "3.5rem 0" };

const tituloDeSeccion: React.CSSProperties = {
  margin: "0 0 0.75rem",
  fontSize: "clamp(1.5rem, 3.5vw, 2.125rem)",
  lineHeight: 1.15,
  letterSpacing: "-0.015em",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const apoyoDeSeccion: React.CSSProperties = {
  margin: "0 0 2rem",
  fontSize: "1.0625rem",
  color: "var(--slg-ink-2)",
  maxWidth: "42rem",
};

const rejillaDos: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
  gap: "1.25rem",
};

const rejillaTres: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
  gap: "1.25rem",
  listStyle: "none",
  margin: 0,
  padding: 0,
};

/** La franja oscura del §7.1: fondo `--blue-deep`, texto blanco (11,9:1). */
const franja: React.CSSProperties = {
  background: "var(--slg-blue-deep)",
  color: "var(--slg-paper)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "3rem 2rem",
  margin: "2rem 0",
};

const cita: React.CSSProperties = {
  margin: "0 0 1.5rem",
  padding: 0,
  border: "none",
  fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
  lineHeight: 1.3,
  color: "var(--slg-paper)",
  fontWeight: 600,
  maxWidth: "36rem",
};

const enlaceClaro: React.CSSProperties = {
  color: "var(--slg-cyan)",
  fontSize: "0.9375rem",
  textDecoration: "none",
  borderBottom: "1px solid currentColor",
};
