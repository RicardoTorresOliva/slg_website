import Link from "next/link";

import { articulos } from "@/lib/content/blog";
import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { DESCARGAS, DOCTRINA, EJES, PAGINA_DE_SERVICIOS, RAMAS, SERVICIOS } from "@/lib/content/rutas";
import { secciones } from "@/lib/content/secciones";
import { sitio, type BloqueDeServicios } from "@/lib/sitio";

import { Markdown, MarkdownEnLinea } from "./Markdown";
import { Reveal } from "./Reveal";
import { HeroTipografico, TarjetaDeArticulo, TarjetaDeServicio } from "./piezas";

/**
 * Servicios — **los bloques de RF-09, en orden fijo**. Fue la portada hasta el
 * 2026-09-18; desde entonces vive en `/servicios` y la portada es el mapa
 * («Empieza aquí»). Decisión de Ricardo: la casa comercial es Servicios, y la
 * entrada es un mapa poco invasivo.
 *
 * Qué bloques y en qué orden lo dice la ficha (`sitio.bloquesDeServicios`); en
 * SLG son estos:
 *
 *   1. Hero tipográfico, una idea — siempre, y siempre el primero
 *   2. `puertas`: los ejes de la Agencia y sus servicios sueltos
 *   3. `lineas`: las tarjetas de las líneas
 *   4. `Holdings by SLG`, un servicio suelto desarrollado debajo de los ejes
 *   5. `doctrina`: franja con pull-quote y enlace
 *   6. `articulos`: últimos artículos
 *   7. `descarga`: tres documentos y el enlace a la biblioteca
 *   8. Pie *(lo pone `ArmazonPublico`, que es de DU-02)*
 *
 * **El texto de cada bloque no lo decide este archivo: lo decide el `.md`.** El
 * hero es la primera sección del registro `servicios` de `content/pages`, y el
 * bloque N de la ficha toma la sección N+1. Si alguien reordena la página, la
 * reordena editando la ficha y el registro a la vez, que es exactamente lo que
 * RF-27 promete.
 *
 * Cero cadena de negocio escrita aquí (RF-16). Lo vigila `check:cadenas`.
 */
export function Portada({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const home = loadCollection("page", lang).find((p) => p.slug === (lang === "en" ? "services" : "servicios"));
  const [hero, ...resto] = secciones(home?.body ?? "");

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
      {/* 1 · Hero: una idea por viewport (RNF-44). Sin fotografía. */}
      <HeroTipografico
        titular={primeraLinea(hero?.cuerpo ?? "")}
        apoyo={restoDeLineas(hero?.cuerpo ?? "")}
      />

      {sitio.bloquesDeServicios.map((b, i) => (
        <Bloque key={idDelBloque(b)} bloque={b} seccion={resto[i]} lang={lang} t={t} />
      ))}
    </div>
  );
}

type Seccion = { titulo: string; cuerpo: string } | undefined;

/** El ancla de un bloque: su nombre, o el `id` que la ficha le da a un suelto. */
export const idDelBloque = (b: BloqueDeServicios) => (typeof b === "string" ? b : b.id);

function Bloque({
  bloque,
  seccion,
  lang,
  t,
}: {
  bloque: BloqueDeServicios;
  seccion: Seccion;
  lang: "es" | "en";
  t: Record<string, string>;
}) {
  const idx = lang === "en" ? "en" : "es";

  if (typeof bloque !== "string") {
    // Un servicio suelto, desarrollado: el otro eje ya no es solo un nombre.
    const suelto = SERVICIOS.find((s) => s.slug === bloque.suelto);
    return (
      <Reveal>
        <section aria-labelledby={bloque.id} style={seccionEstilo}>
          <h2 id={bloque.id} style={tituloDeSeccion}>
            {seccion?.titulo}
          </h2>
          <div style={{ maxWidth: "42rem" }}>
            <Markdown texto={seccion?.cuerpo ?? ""} />
          </div>
          <Link href={suelto?.[idx] ?? PAGINA_DE_SERVICIOS[idx]} style={enlaceDeSeccion}>
            {t[bloque.etiqueta]}
          </Link>
        </section>
      </Reveal>
    );
  }

  switch (bloque) {
    case "puertas": {
      // Los ejes y los servicios sueltos traen sus propios subtítulos (`###`):
      // se parten aquí para no repetir los nombres en el componente. La
      // tarjeta N enlaza a la puerta N: primero los ejes, luego los sueltos.
      const puertas = [...EJES.map((e) => e[idx]), ...SERVICIOS.filter((s) => s.rama === null).map((s) => s[idx])];
      return (
        <Reveal>
          <section aria-labelledby="puertas" style={seccionEstilo}>
            <h2 id="puertas" style={tituloDeSeccion}>
              {seccion?.titulo}
            </h2>
            <p style={apoyoDeSeccion}>
              <MarkdownEnLinea texto={seccion?.cuerpo.split("\n")[0] ?? ""} />
            </p>
            <div style={rejillaDos}>
              {subsecciones(seccion?.cuerpo ?? "").map((s, i) => (
                <TarjetaDeServicio
                  key={s.titulo}
                  nombre={s.titulo}
                  resumen={s.cuerpo}
                  href={puertas[i] ?? PAGINA_DE_SERVICIOS[idx]}
                />
              ))}
            </div>
          </section>
        </Reveal>
      );
    }

    case "lineas":
      return (
        <Reveal>
          <section aria-labelledby="lineas" style={seccionEstilo}>
            <h2 id="lineas" style={tituloDeSeccion}>
              {seccion?.titulo}
            </h2>
            <p style={apoyoDeSeccion}>
              <MarkdownEnLinea texto={seccion?.cuerpo.split("\n")[0] ?? ""} />
            </p>
            <div style={rejillaTres}>
              {subsecciones(seccion?.cuerpo ?? "").map((s, i) => (
                <TarjetaDeServicio
                  key={s.titulo}
                  nombre={s.titulo}
                  resumen={s.cuerpo}
                  rama={`${SERVICIOS.filter((x) => x.rama === RAMAS[i]?.slug).length} ${t["home.services"]}`}
                  href={RAMAS[i]?.[idx] ?? EJES[0]?.[idx] ?? PAGINA_DE_SERVICIOS[idx]}
                />
              ))}
            </div>
          </section>
        </Reveal>
      );

    case "doctrina":
      // Franja Doctrina: pull-quote y enlace, no un bloque de texto.
      return (
        <Reveal>
          <section aria-labelledby="doctrina" style={franja}>
            <h2 id="doctrina" style={{ ...tituloDeSeccion, color: "var(--slg-paper)" }}>
              {seccion?.titulo}
            </h2>
            <blockquote style={cita}>{sinMarca(primeraLinea(seccion?.cuerpo ?? ""))}</blockquote>
            <p style={{ ...apoyoDeSeccion, color: "var(--slg-paper)", opacity: 0.9 }}>
              <MarkdownEnLinea texto={restoDeLineas(seccion?.cuerpo ?? "")} />
            </p>
            <Link href={DOCTRINA[idx]} style={enlaceClaro}>
              {t["home.readDoctrine"]}
            </Link>
          </section>
        </Reveal>
      );

    case "articulos": {
      // Últimos artículos, con su estado vacío redactado (criterio 2).
      const ultimos = articulos(lang).slice(0, 3);
      return (
        <Reveal>
          <section aria-labelledby="articulos" style={seccionEstilo}>
            <h2 id="articulos" style={tituloDeSeccion}>
              {seccion?.titulo}
            </h2>
            {ultimos.length === 0 ? (
              <Markdown texto={seccion?.cuerpo ?? ""} />
            ) : (
              <>
                <p style={apoyoDeSeccion}>
                  <MarkdownEnLinea texto={seccion?.cuerpo.split("\n")[0] ?? ""} />
                </p>
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
      );
    }

    case "descarga": {
      // Descargas destacadas: tres documentos publicados y la biblioteca
      // entera (criterio 2 para el vacío).
      const destacadas = loadCollection<{ title: string; audience: string; status: string }>(
        "download",
        lang,
      )
        .filter((d) => d.data.status === "published")
        .slice(0, 3);
      return (
        <Reveal>
          <section aria-labelledby="descarga" style={seccionEstilo}>
            <h2 id="descarga" style={tituloDeSeccion}>
              {seccion?.titulo}
            </h2>
            {destacadas.length === 0 ? (
              <Markdown texto={seccion?.cuerpo ?? ""} />
            ) : (
              <>
                <p style={apoyoDeSeccion}>
                  <MarkdownEnLinea texto={seccion?.cuerpo.split("\n")[0] ?? ""} />
                </p>
                <div style={rejillaTres}>
                  {destacadas.map((d) => (
                    <TarjetaDeServicio
                      key={d.slug}
                      nombre={d.data.title}
                      resumen={d.data.audience}
                      rama={t["home.download"]}
                      href={`${DESCARGAS[idx]}/${d.slug}`}
                    />
                  ))}
                </div>
                <Link href={DESCARGAS[idx]} style={enlaceDeSeccion}>
                  {t["home.allDownloads"]}
                </Link>
              </>
            )}
          </section>
        </Reveal>
      );
    }
  }
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

const seccionEstilo: React.CSSProperties = { padding: "3.5rem 0" };

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

const enlaceDeSeccion: React.CSSProperties = {
  display: "inline-block",
  marginTop: "1.5rem",
  color: "var(--slg-link)",
  fontSize: "0.9375rem",
  textDecoration: "none",
  borderBottom: "1px solid currentColor",
};

const enlaceClaro: React.CSSProperties = {
  color: "var(--slg-cyan)",
  fontSize: "0.9375rem",
  textDecoration: "none",
  borderBottom: "1px solid currentColor",
};
