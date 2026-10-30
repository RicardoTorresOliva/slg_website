import Link from "next/link";

import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { SERVICIOS, rutaEnDeServicio, slugEnDeServicio } from "@/lib/content/rutas";
import { secciones } from "@/lib/content/secciones";
import { moduloActivo } from "@/lib/sitio";
import { PAGINAS_DEL_MOTOR, paginaDelMotorActiva } from "@/lib/sitio/motor";

import { Markdown, MarkdownEnLinea } from "./Markdown";
import { Reveal } from "./Reveal";

/**
 * La portada — **la propuesta de valor, en el orden en que se decide**
 * (reingeniería del 2026-10-27, `planning/reingenieria/03_plan_contenidos.md` §2).
 *
 *   1. Hero: para quién, qué problema, qué resultado y UN siguiente paso
 *   2. Tres situaciones: el comprador se reconoce antes de ver la oferta
 *   3. Lo que cambia: antes y después, como tabla quieta
 *   4. El método: cuatro fases numeradas, la compuerta y la línea que las ejecuta
 *   5. Por dónde empezar: el diagnóstico, con la MISMA acción del hero
 *   6. Cuatro reglas: la independencia es la prueba (franja oscura, la única)
 *   7. Cuándo no conviene comprar IA (todavía)
 *   8. Quién responde
 *   9. Doctrina y el cierre con la misma acción
 *
 * **EL TEXTO NO VIVE AQUÍ** (RF-16, `check:cadenas`): cada bloque es la sección
 * N del registro `inicio` / `home` de `content/pages`, pedida por POSICIÓN,
 * así el encabezado se traduce sin que el orden dependa del idioma.
 *
 * **MOVIMIENTO MÍNIMO, A PROPÓSITO** (plan visual §4.1). El hero no anima nunca:
 * es el LCP y la primera lectura. Cada sección aparece una vez con el reveal
 * que ya existe. La única secuencia escalonada es la de las cuatro fases,
 * porque ahí el orden ES el contenido —y está a 0 ms mientras un prototipo no
 * demuestre que ayuda (DD-7)—. Sin contadores, carruseles ni
 * parallax: nada se mueve solo y nada queda detrás de una interacción (P7).
 *
 * **UNA SOLA ACCIÓN PRIMARIA** — descargar el documento del diagnóstico—, que
 * aparece en el hero, en «Por dónde empezar» y en el cierre: tres botones para
 * la misma acción, nunca dos en el mismo viewport (el rojo, 1–2 por viewport).
 * Todo lo demás son enlaces de texto.
 *
 * Es un componente de servidor: no añade un byte de JavaScript de cliente.
 */
export function Propuesta({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const M = PAGINAS_DEL_MOTOR;
  const registro = loadCollection("page", lang).find((p) => p.slug === M.inicio.registro[lang]);
  const [hero, situaciones, cambia, metodo, entrada, reglas, cuandoNo, quien, doctrina, cierre] =
    secciones(registro?.body ?? "");

  const [antetitulo, titular, apoyo, etiquetaCta, notaCta] = parrafos(hero?.cuerpo ?? "");
  // El servicio de entrada lo nombra el registro —el enlace de «Por dónde
  // empezar»—, no este archivo: cambiar la puerta es editar el `.md`.
  const accion = accionPrimaria(lang, enlaceDe(entrada?.cuerpo ?? ""), etiquetaCta ?? t["download.cta"]);

  const contacto = moduloActivo("contacto") ? M.contacto.ruta[lang] : null;

  return (
    <div style={contenedor}>
      {/* 1 · Hero. Una idea, fija, sin rotación ni foto (P1, RNF-44). */}
      <section aria-labelledby="propuesta" style={heroEstilo}>
        <p style={eyebrow}>{antetitulo}</p>
        <h1 id="propuesta" className="slg-display" style={display}>
          {titular}
        </h1>
        <p style={lead}>{apoyo}</p>
        <Accion accion={accion} nota={notaCta} />
      </section>

      {/* 2 · Tres situaciones. El problema antes que la oferta (P2). */}
      {situaciones ? (
        <Reveal>
          <section aria-labelledby="situaciones" style={{ ...seccion, ...banda }}>
            <h2 id="situaciones" style={h2}>
              {situaciones.titulo}
            </h2>
            <p style={apoyoDeSeccion}>{introduccion(situaciones.cuerpo)}</p>
            <ListaTipografica elementos={subsecciones(situaciones.cuerpo)} />
          </section>
        </Reveal>
      ) : null}

      {/* 3 · Lo que cambia. Una tabla quieta, no un deslizador (P7). */}
      {cambia ? (
        <Reveal>
          <section aria-labelledby="cambia" style={seccion}>
            <h2 id="cambia" style={h2}>
              {cambia.titulo}
            </h2>
            <AntesYDespues cuerpo={cambia.cuerpo} />
          </section>
        </Reveal>
      ) : null}

      {/* 4 · El método. Ordena la oferta: cada fase dice qué línea la ejecuta (P4). */}
      {metodo ? (
        <Reveal>
          <section aria-labelledby="metodo" style={seccion}>
            <h2 id="metodo" style={h2}>
              {metodo.titulo}
            </h2>
            <p style={apoyoDeSeccion}>{introduccion(metodo.cuerpo)}</p>
            <Metodo fases={subsecciones(metodo.cuerpo)} />
          </section>
        </Reveal>
      ) : null}

      {/* 5 · Por dónde empezar. La cifra hace de imagen (guía §4.3). */}
      {entrada ? (
        <Reveal>
          <section aria-labelledby="entrada" style={seccion}>
            <PuertaDeEntrada seccion={entrada} accion={accion} nota={notaCta} />
          </section>
        </Reveal>
      ) : null}

      {/* 6 · Cuatro reglas. La independencia es la prueba (P3). La única franja
          oscura de la página; sin CTA dentro: el rojo no va sobre oscuro. */}
      {reglas ? (
        <Reveal>
          <section aria-labelledby="reglas" style={franja}>
            <h2 id="reglas" style={{ ...h2, color: "var(--slg-paper)" }}>
              {reglas.titulo}
            </h2>
            <ul style={rejillaReglas}>
              {subsecciones(reglas.cuerpo).map((r) => (
                <li key={r.titulo} style={regla}>
                  <h3 style={reglaTitulo}>{r.titulo}</h3>
                  <p style={reglaTexto}>
                    <MarkdownEnLinea texto={r.cuerpo} />
                  </p>
                </li>
              ))}
            </ul>
            <p style={postura}>
              <MarkdownEnLinea texto={introduccion(reglas.cuerpo)} />
            </p>
          </section>
        </Reveal>
      ) : null}

      {/* 7 · Cuándo no conviene. La credibilidad se gana renunciando (P5). */}
      {cuandoNo ? (
        <Reveal>
          <section aria-labelledby="cuando-no" style={seccion}>
            <h2 id="cuando-no" style={h2}>
              {cuandoNo.titulo}
            </h2>
            <ListaTipografica
              elementos={elementosDeLista(cuandoNo.cuerpo).map((e) => ({ titulo: e, cuerpo: "" }))}
              comoTexto
            />
            {cita(cuandoNo.cuerpo) ? <p style={aforismo}>{cita(cuandoNo.cuerpo)}</p> : null}
          </section>
        </Reveal>
      ) : null}

      {/* 8 · Quién responde: una persona y una razón social, no un logo. */}
      {quien ? (
        <Reveal>
          <section aria-labelledby="quien" style={{ ...seccion, ...filete }}>
            <h2 id="quien" style={h2}>
              {quien.titulo}
            </h2>
            <div style={{ maxWidth: "var(--slg-medida)" }}>
              <Markdown texto={quien.cuerpo} />
            </div>
            <p style={{ margin: "var(--slg-space-4) 0 0" }}>
              <Link href={M.nosotros.ruta[lang]} style={enlace}>
                {t["home.aboutUs"]}
              </Link>
            </p>
          </section>
        </Reveal>
      ) : null}

      {/* 9 · Doctrina: el porqué. Cita y enlaces, no un bloque de texto. */}
      {doctrina && paginaDelMotorActiva("doctrina") ? (
        <Reveal>
          <section aria-labelledby="doctrina" style={{ ...seccion, ...banda }}>
            <h2 id="doctrina" style={h2}>
              {doctrina.titulo}
            </h2>
            <blockquote style={citaDoctrina}>{cita(doctrina.cuerpo)}</blockquote>
            <p style={apoyoDeSeccion}>
              <MarkdownEnLinea texto={sinCita(doctrina.cuerpo)} />
            </p>
            <p style={enlacesEnLinea}>
              <Link href={M.doctrina.ruta[lang]} style={enlace}>
                {t["home.readDoctrine"]}
              </Link>
              {paginaDelMotorActiva("blog") ? (
                <Link href={M.blog.ruta[lang]} style={enlace}>
                  {t["home.readArticles"]}
                </Link>
              ) : null}
            </p>
          </section>
        </Reveal>
      ) : null}

      {/* 11 · Cierre: la misma acción, otra vez. «Escríbenos» es texto, nunca rojo. */}
      {cierre ? (
        <Reveal>
          <section aria-labelledby="cierre" style={{ ...seccion, ...filete }}>
            <h2 id="cierre" style={h2}>
              {cierre.titulo}
            </h2>
            <p style={apoyoDeSeccion}>
              <MarkdownEnLinea texto={cierre.cuerpo} />
            </p>
            <Accion accion={accion} />
            {contacto ? (
              <p style={{ margin: "var(--slg-space-5) 0 0" }}>
                <Link href={contacto} style={enlace}>
                  {t["service.contact"]}
                </Link>
              </p>
            ) : null}
          </section>
        </Reveal>
      ) : null}
    </div>
  );
}

/* ── Piezas ─────────────────────────────────────────────────────────────── */

type AccionPrimaria = { href: string; etiqueta: string; descarga: boolean };

/**
 * La acción primaria: el documento del servicio de entrada (el diagnóstico).
 * Si el documento no está publicado en este idioma —o no hay módulo de
 * descargas—, el botón NO se rompe: pasa a enlazar la página del servicio, y
 * entonces deja de ser rojo, porque el rojo es solo para la descarga.
 */
function accionPrimaria(lang: "es" | "en", ruta: string | null, etiqueta: string): AccionPrimaria | null {
  const entradaDeLaOferta = SERVICIOS.find((s) => s.es === ruta || rutaEnDeServicio(s) === ruta);
  if (!entradaDeLaOferta) return null;
  const slug = lang === "en" ? slugEnDeServicio(entradaDeLaOferta) : entradaDeLaOferta.slug;
  const servicio = loadCollection<{ download?: string }>("service", lang).find((s) => s.slug === slug);
  const paginaDelServicio = lang === "en" ? rutaEnDeServicio(entradaDeLaOferta) : entradaDeLaOferta.es;

  const documento = moduloActivo("descargas")
    ? loadCollection<{ status: string }>("download", lang).find((d) => d.slug === servicio?.data.download)
    : undefined;
  if (documento?.data.status === "published") {
    return { href: `${PAGINAS_DEL_MOTOR.descargas.ruta[lang]}/${documento.slug}`, etiqueta, descarga: true };
  }
  return paginaDelServicio ? { href: paginaDelServicio, etiqueta, descarga: false } : null;
}

function Accion({ accion, nota }: { accion: AccionPrimaria | null; nota?: string }) {
  if (!accion) return null;
  return (
    <div style={{ marginTop: "var(--slg-space-6)" }}>
      <Link href={accion.href} className="slg-pressable" style={accion.descarga ? boton : botonSecundario}>
        {accion.etiqueta}
      </Link>
      {nota ? <p style={notaEstilo}>{nota}</p> : null}
    </div>
  );
}

/**
 * Una lista tipográfica: filete superior, título y una línea en `ink-2`. Sin
 * números —se reservan para el método—, sin iconos ni tarjetas. La comparten
 * «Tres situaciones» y «Cuándo no conviene»: una sola pieza, una sola forma.
 */
function ListaTipografica({
  elementos,
  comoTexto = false,
}: {
  elementos: { titulo: string; cuerpo: string }[];
  comoTexto?: boolean;
}) {
  return (
    <ul style={comoTexto ? rejillaDos : rejillaTres}>
      {elementos.map((e) => (
        <li key={e.titulo} style={itemTipografico}>
          {comoTexto ? (
            <p style={criterio}>{e.titulo}</p>
          ) : (
            <h3 style={h3}>{e.titulo}</h3>
          )}
          {e.cuerpo ? <p style={escena}>{e.cuerpo}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Antes y después como `<table>` semántica: dos columnas que se leen fila a
 * fila. En móvil, cada fila se apila como ficha (`[data-slg-tabla]`, que ya
 * existe en `motion.css`). Sin ✓ ni ✗, sin rojo ni verde.
 */
function AntesYDespues({ cuerpo }: { cuerpo: string }) {
  const [antes, despues] = introduccion(cuerpo)
    .split("|")
    .map((x) => x.trim());
  const filas = subsecciones(cuerpo);
  return (
    <table data-slg-tabla="apilada" style={tabla}>
      <thead>
        <tr>
          <th scope="col" style={{ ...celdaCabecera, color: "var(--slg-ink-2)" }}>
            {antes}
          </th>
          <th scope="col" style={celdaCabecera}>
            {despues}
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.titulo}>
            <td data-label={antes} style={{ ...celda, color: "var(--slg-ink-2)" }}>
              {f.titulo}
            </td>
            <td data-label={despues} style={{ ...celda, ...celdaDespues }}>
              {f.cuerpo}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * El método: `<ol>` de cuatro fases. El numeral es tipografía quieta, con
 * `aria-hidden` —el `<ol>` ya anuncia el orden, y así no se lee «cero uno»—.
 * Un único filete superior hace de conector estático. El escalonado existe
 * (`--slg-stagger`), pero a 0 ms por defecto (DD-7): el orden ya está escrito.
 */
function Metodo({ fases }: { fases: { titulo: string; cuerpo: string }[] }) {
  return (
    <ol style={rejillaMetodo}>
      {fases.map((f, i) => {
        const [resuelve, ...resto] = parrafos(f.cuerpo);
        return (
          <li
            key={f.titulo}
            className="slg-escalon"
            style={{ ...fase, ["--i" as string]: i }}
          >
            <span aria-hidden="true" style={numeral}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 style={h3}>{f.titulo}</h3>
            <p style={faseTexto}>{resuelve}</p>
            {resto.map((r) => (
              <p key={r} style={faseLinea}>
                <MarkdownEnLinea texto={r} />
              </p>
            ))}
          </li>
        );
      })}
    </ol>
  );
}

/** La puerta de entrada: «11 dimensiones» a la izquierda, el alcance y la acción a la derecha. */
function PuertaDeEntrada({
  seccion,
  accion,
  nota,
}: {
  seccion: { titulo: string; cuerpo: string };
  accion: AccionPrimaria | null;
  nota?: string;
}) {
  const [cifra, gancho, ...alcance] = parrafos(seccion.cuerpo);
  const [numero, unidad] = (cifra ?? "").split("|").map((x) => x.trim());
  return (
    <div style={puerta}>
      <p aria-hidden="true" style={puertaCifra}>
        <span style={numeral}>{numero}</span>
        <span style={puertaUnidad}>{unidad}</span>
      </p>
      <div>
        <h2 id="entrada" style={h2}>
          {seccion.titulo}
        </h2>
        <p style={{ ...apoyoDeSeccion, color: "var(--slg-ink)" }}>{gancho}</p>
        {alcance.map((a) => (
          <p key={a} style={{ margin: "0 0 var(--slg-space-4)", color: "var(--slg-ink-2)" }}>
            <MarkdownEnLinea texto={a} />
          </p>
        ))}
        <Accion accion={accion} nota={nota} />
      </div>
    </div>
  );
}

/* ── Lectura del registro ──────────────────────────────────────────────── */

/** Los párrafos de un bloque: una línea no vacía es un párrafo. */
const parrafos = (texto: string) =>
  texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Lo que va antes del primer `###`, sin listas ni citas: la entradilla. */
function introduccion(cuerpo: string): string {
  const antes = cuerpo.split(/^###\s/m)[0] ?? "";
  return parrafos(antes)
    .filter((l) => !l.startsWith("- ") && !l.startsWith(">"))
    .join(" ");
}

/** Los `###` de un bloque, cada uno con su cuerpo. */
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

/** El primer enlace Markdown de un bloque: `[texto](ruta)` → `ruta`. */
const enlaceDe = (cuerpo: string) => /\[[^\]]+\]\(([^)]+)\)/.exec(cuerpo)?.[1] ?? null;

const elementosDeLista = (cuerpo: string) =>
  parrafos(cuerpo)
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());

/** La primera cita (`> …`) de un bloque, sin la marca: el `<blockquote>` ya lo dice. */
const cita = (cuerpo: string) =>
  parrafos(cuerpo)
    .find((l) => l.startsWith(">"))
    ?.replace(/^>\s*/, "") ?? "";

const sinCita = (cuerpo: string) =>
  parrafos(cuerpo)
    .filter((l) => !l.startsWith(">"))
    .join(" ");

/* ── Estilos: todo sale de los tokens (plan visual §3) ─────────────────── */

const contenedor: React.CSSProperties = {
  maxWidth: "var(--slg-contenedor)",
  margin: "0 auto",
  padding: "0 var(--slg-gutter)",
};

const heroEstilo: React.CSSProperties = { padding: "var(--slg-hero-pad) 0 var(--slg-space-7)" };

/**
 * El antetítulo es una FRASE, no una etiqueta: en caja normal y peso 600. Una
 * frase entera en versalitas espaciadas grita (crítica C-13); las mayúsculas
 * quedan para rótulos de una a tres palabras.
 */
const eyebrow: React.CSSProperties = {
  margin: "0 0 var(--slg-space-4)",
  fontSize: "var(--slg-type-body)",
  fontWeight: 600,
  lineHeight: 1.3,
  letterSpacing: "var(--slg-track-small)",
  color: "var(--slg-blue-primary)",
};

const display: React.CSSProperties = {
  margin: 0,
  fontWeight: 700,
  color: "var(--slg-blue-deep)",
};

const lead: React.CSSProperties = {
  margin: "var(--slg-space-5) 0 0",
  fontSize: "var(--slg-type-lead)",
  lineHeight: 1.5,
  color: "var(--slg-ink-2)",
  maxWidth: "var(--slg-medida-lead)",
};

/** Media sección arriba y media abajo: entre dos bloques suma una sección entera. */
const seccion: React.CSSProperties = { padding: "calc(var(--slg-seccion) * 0.6) 0" };

/** Banda hundida: `paper-2`, sin sombra. La profundidad es tono, no relieve. */
const banda: React.CSSProperties = {
  background: "var(--slg-surface-sunken)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "var(--slg-space-8) clamp(1.25rem, 4vw, 3.5rem)",
};

const filete: React.CSSProperties = { borderTop: "1px solid var(--slg-hairline)" };

const h2: React.CSSProperties = {
  margin: "0 0 var(--slg-space-3)",
  fontSize: "var(--slg-type-h2)",
  lineHeight: "var(--slg-leading-h2)",
  letterSpacing: "var(--slg-track-h2)",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
  maxWidth: "28ch",
};

const h3: React.CSSProperties = {
  margin: "0 0 var(--slg-space-2)",
  fontSize: "var(--slg-type-h3)",
  lineHeight: "var(--slg-leading-h3)",
  color: "var(--slg-indigo)",
  fontWeight: 600,
};

const apoyoDeSeccion: React.CSSProperties = {
  margin: "0 0 var(--slg-space-6)",
  fontSize: "var(--slg-type-body)",
  color: "var(--slg-ink-2)",
  maxWidth: "var(--slg-medida-lead)",
};

const lista: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid" };

const rejillaTres: React.CSSProperties = {
  ...lista,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
  gap: "var(--slg-space-6)",
};

const rejillaDos: React.CSSProperties = {
  ...lista,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 24rem), 1fr))",
  gap: "var(--slg-space-5) var(--slg-space-6)",
  marginTop: "var(--slg-space-5)",
};

const itemTipografico: React.CSSProperties = {
  borderTop: "1px solid var(--slg-line)",
  paddingTop: "var(--slg-space-4)",
};

const escena: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9375rem",
  lineHeight: 1.6,
  color: "var(--slg-ink-2)",
};

const criterio: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--slg-type-body)",
  lineHeight: 1.5,
  color: "var(--slg-ink)",
};

const aforismo: React.CSSProperties = {
  margin: "var(--slg-space-7) 0 0",
  fontSize: "var(--slg-type-lead)",
  lineHeight: 1.4,
  fontWeight: 600,
  color: "var(--slg-blue-deep)",
  maxWidth: "36ch",
};

const tabla: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "var(--slg-space-5)",
  fontSize: "var(--slg-type-body)",
};

const celdaCabecera: React.CSSProperties = {
  textAlign: "left",
  fontSize: "var(--slg-type-eyebrow)",
  fontWeight: 600,
  letterSpacing: "var(--slg-track-eyebrow)",
  textTransform: "uppercase",
  color: "var(--slg-blue-deep)",
  padding: "0 var(--slg-space-5) var(--slg-space-3) 0",
  borderBottom: "1px solid var(--slg-line)",
  width: "50%",
};

const celda: React.CSSProperties = {
  padding: "var(--slg-space-4) var(--slg-space-5) var(--slg-space-4) 0",
  borderBottom: "1px solid var(--slg-hairline)",
  verticalAlign: "top",
  lineHeight: 1.5,
};

const celdaDespues: React.CSSProperties = {
  color: "var(--slg-ink)",
  paddingLeft: "var(--slg-space-4)",
  borderLeft: "2px solid var(--slg-blue-primary)",
};

const rejillaMetodo: React.CSSProperties = {
  ...lista,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
  gap: "var(--slg-space-6)",
  borderTop: "1px solid var(--slg-line)",
  paddingTop: "var(--slg-space-5)",
};

const fase: React.CSSProperties = { display: "flex", flexDirection: "column" };

const numeral: React.CSSProperties = {
  display: "block",
  fontSize: "var(--slg-type-numeral)",
  lineHeight: 1,
  letterSpacing: "var(--slg-track-numeral)",
  fontWeight: 700,
  fontVariantNumeric: "lining-nums tabular-nums",
  color: "var(--slg-blue-deep)",
  marginBottom: "var(--slg-space-4)",
};

const faseTexto: React.CSSProperties = {
  margin: "0 0 var(--slg-space-3)",
  fontSize: "0.9375rem",
  lineHeight: 1.6,
  color: "var(--slg-ink)",
};

const faseLinea: React.CSSProperties = {
  margin: "auto 0 0",
  fontSize: "var(--slg-type-small)",
  letterSpacing: "var(--slg-track-small)",
};

const puerta: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), max-content))",
  gap: "var(--slg-space-6) var(--slg-space-8)",
  alignItems: "start",
  background: "var(--slg-surface-sunken)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "clamp(1.75rem, 4vw, 3rem)",
};

const puertaCifra: React.CSSProperties = { margin: 0 };

const puertaUnidad: React.CSSProperties = {
  display: "block",
  fontSize: "var(--slg-type-small)",
  letterSpacing: "var(--slg-track-eyebrow)",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "var(--slg-ink-2)",
};

/** La franja oscura: `blue-deep`, blanco (11,9:1) y un filete cian. Tres colores. */
const franja: React.CSSProperties = {
  background: "var(--slg-surface-inverse)",
  color: "var(--slg-paper)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "var(--slg-space-8) clamp(1.25rem, 4vw, 3.5rem)",
  margin: "var(--slg-space-6) 0",
};

const rejillaReglas: React.CSSProperties = {
  ...lista,
  // Dos por dos en escritorio, una columna en móvil: cuatro reglas no son tres más una.
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 24rem), 1fr))",
  gap: "var(--slg-space-6)",
  margin: "var(--slg-space-6) 0",
};

const regla: React.CSSProperties = {
  borderLeft: "2px solid var(--slg-cyan)",
  paddingLeft: "var(--slg-space-4)",
};

const reglaTitulo: React.CSSProperties = {
  margin: "0 0 var(--slg-space-2)",
  fontSize: "var(--slg-type-h3)",
  fontWeight: 600,
  color: "var(--slg-paper)",
};

const reglaTexto: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9375rem",
  lineHeight: 1.6,
  color: "var(--slg-paper)",
  opacity: 0.92,
};

const postura: React.CSSProperties = {
  margin: 0,
  paddingTop: "var(--slg-space-5)",
  borderTop: "1px solid color-mix(in srgb, var(--slg-paper) 24%, transparent)",
  fontSize: "0.9375rem",
  lineHeight: 1.6,
  color: "var(--slg-paper)",
  maxWidth: "var(--slg-medida)",
};

const citaDoctrina: React.CSSProperties = {
  margin: "var(--slg-space-4) 0 var(--slg-space-5)",
  padding: 0,
  border: "none",
  fontSize: "clamp(1.25rem, 1rem + 1.2vw, 1.75rem)",
  lineHeight: 1.3,
  fontWeight: 600,
  color: "var(--slg-blue-deep)",
  maxWidth: "36ch",
};

const enlacesEnLinea: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--slg-space-5)",
  margin: 0,
};

const enlace: React.CSSProperties = {
  color: "var(--slg-link)",
  fontWeight: 600,
  textDecoration: "none",
  borderBottom: "1px solid currentColor",
};

/** El botón rojo: SOLO para la descarga (gate D2b). Blanco sobre rojo, 5,0:1. */
const boton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "2.75rem",
  padding: "0.75rem 1.5rem",
  background: "var(--slg-red)",
  color: "var(--slg-paper)",
  border: "1px solid var(--slg-red)",
  borderRadius: "var(--slg-radius-sm)",
  fontWeight: 600,
  fontSize: "1rem",
  textDecoration: "none",
};

/** Sin documento publicado, el mismo sitio, sin rojo: no es una descarga. */
const botonSecundario: React.CSSProperties = {
  ...boton,
  background: "var(--slg-paper)",
  color: "var(--slg-blue-deep)",
  border: "1px solid var(--slg-blue-deep)",
};

const notaEstilo: React.CSSProperties = {
  margin: "var(--slg-space-3) 0 0",
  fontSize: "var(--slg-type-small)",
  letterSpacing: "var(--slg-track-small)",
  color: "var(--slg-ink-2)",
};
