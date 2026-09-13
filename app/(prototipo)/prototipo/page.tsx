import { ArmazonDeApp } from "@/components/app/ArmazonDeApp";
import { ContenidoEntregado } from "@/components/app/ContenidoEntregado";
import { Estado } from "@/components/app/EstadosCanonicos";
import { BarraDeNavegacion } from "@/components/BarraDeNavegacion";
import { FormularioDeDescarga } from "@/components/FormularioDeDescarga";
import { Reveal } from "@/components/Reveal";
import { FichaDeApp, TablaDeApp } from "@/components/app/TablaDeApp";
import { VisorDeEntregables } from "@/components/VisorDeEntregables";
import {
  BloqueQueIncluye,
  HeroTipografico,
  Pie,
  TarjetaDeArticulo,
  TarjetaDeServicio,
} from "@/components/piezas";
import { ESTADOS_CANONICOS } from "@/lib/app/estados";
import { SECCIONES } from "@/lib/app/navegacion";
import { loadUiStrings } from "@/lib/content/loader";

/**
 * `/prototipo` — la compuerta de FU-10, navegable.
 *
 * El criterio 1 dice que los nueve prototipos son **componentes reales,
 * navegables con teclado y con gesto**, y que **una imagen no cierra esta
 * compuerta**. Esto no es una imagen: son los componentes que van a construir
 * las páginas, montados en una sola pantalla para poder recorrerlos.
 *
 * Vive en su propio grupo, `(prototipo)`, y **a ancho completo**. Estuvo en
 * `(auth)` para heredar su `noindex` y eso la metía en una tarjeta de 26 rem:
 * el armazón de aplicación y el visor se revisaban a 416 px, que no es la
 * anchura para la que existen. El `noindex` se conserva por otras dos vías —la
 * lista `GRUPO_AUTH` del middleware y el `robots` de esta misma página—,
 * ninguna de las cuales tenía que ver con el ancho.
 *
 * CÓMO SE REVISA, y es la parte que ningún script hace por nosotros:
 *   · con **teclado solo** —Tab por toda la pantalla— el anillo de dos capas
 *     tiene que verse en cada elemento interactivo, sin excepción;
 *   · en **móvil**, arrastrando el sheet: seguimiento 1:1, resistencia al
 *     pasarse, y un lanzamiento corto y rápido tiene que cerrar;
 *   · con **«reducir movimiento» activado** en el sistema, nada se desplaza;
 *   · con **«reducir transparencia»**, la barra deja de ser translúcida.
 */
export const metadata = {
  title: "Prototipo C.5 · SLG Agency",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const ENLACES = [
  { href: "/ai", etiqueta: "SLG_AI" },
  { href: "/holdings", etiqueta: "SLG_Holdings" },
  { href: "/doctrina", etiqueta: "Doctrina" },
  { href: "/blog", etiqueta: "Blog" },
];

export default function Prototipo() {
  const t = loadUiStrings().es;

  const textosFormulario = {
    etiqueta: t["download.emailLabel"],
    cta: t["download.cta"],
    proximamente: t["download.comingSoon"],
    correoGratuito: t["download.freeEmailRejected"],
    correoInvalido: "Ese correo no parece válido. Revísalo.",
    enviando: "Enviando…",
    entregado: "Listo. Revisa tu bandeja de entrada.",
    errorServidor: "No hemos podido entregarlo ahora mismo. Inténtalo de nuevo en un minuto.",
  };

  return (
    <div>
      <BarraDeNavegacion
        enlaces={ENLACES}
        activo="/ai"
        acceso={{ href: "/acceder", etiqueta: t["nav.signin"] }}
        inicio="/"
        conmutador={{
          href: "/en/ai",
          etiqueta: t["nav.lang"],
          etiquetaNoDisponible: t["nav.langUnavailable"],
          idiomaDestino: "en",
        }}
        textos={{ menu: t["nav.menu"], navegacion: t["nav.aria"], inicio: t["nav.home"] }}
      />

      <div style={contenedor}>
        <Bloque n={1} titulo="Formulario de descarga" nota="El primero de los nueve (RF-134): es el CTA único de toda página de servicio.">
          <div style={rejilla}>
            <Caso titulo="Reposo">
              <FormularioDeDescarga textos={textosFormulario} />
            </Caso>
            <Caso titulo="Disponible próximamente">
              <FormularioDeDescarga textos={textosFormulario} documentoDisponible={false} />
            </Caso>
            <Caso titulo="Enviando">
              <FormularioDeDescarga textos={textosFormulario} estadoInicial="enviando" />
            </Caso>
            <Caso titulo="Error del servidor">
              <FormularioDeDescarga textos={textosFormulario} estadoInicial="error" />
            </Caso>
          </div>
          <p style={pista}>
            El error en línea se prueba escribiendo un correo de dominio gratuito —por ejemplo
            <code> nombre@gmail.com</code>— y pulsando el botón: el mensaje aparece bajo el campo, en
            el idioma de la página, y el foco vuelve al campo.
          </p>
        </Bloque>

        <Bloque n={2} titulo="Barra translúcida + sheet móvil" nota="La barra está arriba. En móvil, el botón «Menú» abre el sheet arrastrable.">
          <p style={pista}>
            Arrastra el sheet hacia abajo: sigue al dedo 1:1. Arrástralo hacia arriba: resiste en vez
            de bloquearse. Suéltalo con un movimiento corto y rápido: cierra, porque decide con la
            proyección del momentum y no con la posición.
          </p>
        </Bloque>

        <Bloque n={3} titulo="Hero tipográfico" nota="Una idea por viewport. Sin imagen de stock, sin gradiente animado.">
          <HeroTipografico
            titular="Autoridad silenciosa"
            apoyo="Un titular, una línea de apoyo y nada más compitiendo por la atención."
            accion={{ href: "/ai", etiqueta: "Ver SLG_AI" }}
          />
        </Bloque>

        <Bloque n={4} titulo="Tarjeta de rama / servicio">
          <div style={rejilla}>
            <Reveal>
              <TarjetaDeServicio nombre="Phoenix PEEx" rama="SLG_Academy" href="/ai/academy/phoenix-peex" resumen="Marcador estructural. El copy definitivo es FU-01." />
            </Reveal>
            <Reveal>
              <TarjetaDeServicio nombre="SLG_Readiness" rama="SLG_Enterprise" href="/ai/enterprise/readiness" resumen="Marcador estructural. El copy definitivo es FU-01." />
            </Reveal>
            <Reveal>
              <TarjetaDeServicio nombre="APP_Building" rama="SLG_Factory" href="/ai/factory/app-building" resumen="Marcador estructural. El copy definitivo es FU-01." />
            </Reveal>
          </div>
        </Bloque>

        <Bloque n={5} titulo="Bloque «Qué incluye»" nota="Lista, no párrafo: es la sección que el comprador escanea.">
          <BloqueQueIncluye
            titulo="Qué incluye"
            elementos={[
              "Marcador estructural — el contenido definitivo llega con FU-01.",
              "La lista sale tal cual de la fuente de la oferta.",
              "Un elemento por línea, para poder recorrerla sin leerla entera.",
            ]}
          />
        </Bloque>

        <Bloque n={6} titulo="Tarjeta de artículo">
          <div style={rejilla}>
            <TarjetaDeArticulo
              titulo="Autoridad silenciosa"
              fecha="2026-09-08"
              href="/blog/autoridad-silenciosa"
              resumen="Marcador estructural."
              etiquetas={["Doctrina", "AI Literacy"]}
            />
          </div>
        </Bloque>

        <Bloque n={7} titulo="Pie">
          <Pie
            derechos={t["footer.rights"]}
            enlaces={[
              { href: "/legal/privacidad", etiqueta: "Privacidad" },
              { href: "/legal/terminos", etiqueta: "Términos" },
            ]}
          />
        </Bloque>

        <Bloque
          n={8}
          titulo="Shell de app"
          nota="Barra lateral, tabla, ficha y los SEIS estados canónicos. Las tres preguntas de wayfinding respondidas, y NINGÚN conmutador de idioma: la interfaz sale de la preferencia de la cuenta (RF-72). En móvil la tabla se apila en fichas: no se lee con zoom."
        >
          <div style={{ border: "1px solid var(--slg-line)", borderRadius: "var(--slg-radius-md)", overflow: "hidden" }}>
            <ArmazonDeApp
              superficie={t["app.shell.hq"]}
              seccionActiva={SECCIONES.find((x) => x.clave === "captures") ?? null}
              secciones={SECCIONES.filter((x) => x.superficie === "hq").map((x) => ({
                clave: x.clave,
                href: "#prototipo",
                etiqueta: t[`app.nav.${x.clave}`],
              }))}
              textos={{
                secciones: t["app.shell.sections"],
                estasEn: t["app.shell.youAreHere"],
                cerrarSesion: t["app.shell.signout"],
                saltar: t["app.shell.skip"],
                cuenta: t["app.shell.account"],
              }}
              usuario={{ nombre: "Ricardo Torres Oliva", cerrarSesionHref: "/api/acceso/salir" }}
            >
              <div style={{ display: "grid", gap: "1rem" }}>
                <TablaDeApp
                  etiqueta="Capturas web recientes"
                  columnas={["Correo", "Origen", "Estado"]}
                  filas={[
                    ["lead@empresa.com", "/ai/academy/phoenix-peex", "Entregada"],
                    ["otro@empresa.com", "/contacto", "En cola"],
                  ]}
                />
                <FichaDeApp
                  titulo="Detalle de la captura"
                  campos={[
                    { etiqueta: "Documento", valor: "D-01" },
                    { etiqueta: "Idioma", valor: "es" },
                    { etiqueta: "Intentos", valor: "1 de 5" },
                  ]}
                />
                {ESTADOS_CANONICOS.map((estado) => (
                  <Estado
                    key={estado}
                    estado={estado}
                    textos={{
                      titulo: t[`app.state.${estado}.titulo`],
                      texto: t[`app.state.${estado}.texto`],
                      accion: t[`app.state.${estado}.accion`],
                    }}
                    accion={{ href: "#prototipo" }}
                    identificador="req_7Q2M…"
                  />
                ))}

                <ContenidoEntregado idioma="en">
                  <p style={{ margin: 0, fontSize: "0.9375rem" }}>
                    This deliverable was written in English and is shown exactly as delivered, even
                    when the interface language is Spanish (RF-72).
                  </p>
                </ContenidoEntregado>
              </div>
            </ArmazonDeApp>
          </div>
          <p style={pista}>
            Estréchalo a menos de 48rem: la barra lateral sube arriba y las secciones se tumban en
            una tira que se desplaza. <strong>Nada se pliega</strong>: «a dónde puedo ir» se
            responde sin abrir nada, también en móvil.
          </p>
        </Bloque>

        <Bloque n={9} titulo="Visor de entregables" nota="Origen separado (D-45), sandbox sin allow-same-origin y CSP estricta como defensa en profundidad.">
          <VisorDeEntregables
            src="about:blank"
            titulo="Entregable de ejemplo"
            descargaHref="#"
            etiquetaDescarga="Descargar"
          />
          <p style={pista}>
            En el prototipo el marco está vacío a propósito: lo que se revisa aquí es el encuadre, el
            encabezado y que el documento **no** pueda alcanzar la sesión, no su contenido.
          </p>
        </Bloque>
      </div>
    </div>
  );
}

function Bloque({
  n,
  titulo,
  nota,
  children,
}: {
  n: number;
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ padding: "3rem 0", borderTop: "1px solid var(--slg-line)" }}>
      <p style={{ margin: 0, fontSize: "0.8125rem", letterSpacing: "0.04em", color: "var(--slg-ink-2)" }}>
        COMPONENTE {n} DE 9
      </p>
      <h2 style={{ margin: "0.25rem 0 0.5rem", fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {titulo}
      </h2>
      {nota ? <p style={{ ...pista, marginTop: 0 }}>{nota}</p> : null}
      <div style={{ marginTop: "1.5rem" }}>{children}</div>
    </section>
  );
}

function Caso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>{titulo}</p>
      {children}
    </div>
  );
}

const contenedor: React.CSSProperties = { maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" };
const rejilla: React.CSSProperties = {
  display: "grid",
  gap: "1.5rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(17rem, 1fr))",
};
const pista: React.CSSProperties = {
  marginTop: "1.25rem",
  fontSize: "0.875rem",
  lineHeight: 1.6,
  color: "var(--slg-ink-2)",
};
