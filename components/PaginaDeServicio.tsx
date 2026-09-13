import Link from "next/link";

import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { secciones } from "@/lib/content/secciones";

import { Markdown } from "./Markdown";
import { BloqueQueIncluye, HeroTipografico } from "./piezas";

/**
 * Una página de servicio — **las seis secciones del contrato A.3, en orden
 * fijo** (RF-06). Falta o desorden de una sección = página rechazada, y eso no
 * es una revisión manual: lo comprueba `check:paginas` sobre el HTML servido.
 *
 *   1. Para quién y qué problema
 *   2. Qué es
 *   3. Qué incluye
 *   4. Cómo trabajamos
 *   5. **Descarga** — el ÚNICO llamado a la acción de la página (RF-07)
 *   6. Siguiente paso — enlace a contacto, sin venta y **sin widget** (RF-08)
 *
 * **El orden lo decide el `.md`, no este archivo**: las secciones se piden por
 * posición. Y por eso añadir un servicio es añadir un archivo (RF-27).
 *
 * En M1 la sección 5 muestra el bloque de descarga; su **máquina** —formulario,
 * entrega firmada y captura al CRM— es DU-08. Aquí se anuncia el documento y se
 * enlaza a su página, que es lo que el contrato pide en esta unidad.
 */
export function PaginaDeServicio({ slug, lang }: { slug: string; lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const registro = loadCollection<{ name: string; download: string }>("service", lang).find(
    (s) => s.slug === slug,
  );
  const bloques = secciones(registro?.body ?? "");
  const [paraQuien, queEs, queIncluye, comoTrabajamos, descarga, siguiente] = bloques;

  const documento = loadCollection<{ title: string; audience: string; status: string }>(
    "download",
    lang,
  ).find((d) => d.slug === registro?.data.download);

  const contacto = lang === "en" ? "/en/contact" : "/contacto";
  const descargas = lang === "en" ? "/en/downloads" : "/descargas";

  return (
    <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "0 1.25rem" }}>
      <HeroTipografico
        titular={registro?.data.name ?? ""}
        apoyo={primeraLinea(paraQuien?.cuerpo ?? "")}
      />

      {/* 1 · Para quién y qué problema */}
      <Seccion titulo={paraQuien?.titulo}>
        <Markdown texto={paraQuien?.cuerpo ?? ""} />
      </Seccion>

      {/* 2 · Qué es */}
      <Seccion titulo={queEs?.titulo}>
        <Markdown texto={queEs?.cuerpo ?? ""} />
      </Seccion>

      {/* 3 · Qué incluye — lista, no párrafo: es la sección que se escanea. */}
      <Seccion titulo={queIncluye?.titulo}>
        {lineas(queIncluye?.cuerpo ?? "").length > 0 ? (
          <BloqueQueIncluye elementos={lineas(queIncluye?.cuerpo ?? "")} />
        ) : (
          // Criterio 7: bloque vacío resuelto, no un hueco.
          <p style={{ color: "var(--slg-ink-2)" }}>{t["service.includesEmpty"]}</p>
        )}
      </Seccion>

      {/* 4 · Cómo trabajamos */}
      <Seccion titulo={comoTrabajamos?.titulo}>
        <BloqueQueIncluye elementos={lineas(comoTrabajamos?.cuerpo ?? "")} />
      </Seccion>

      {/* 5 · Descarga — el ÚNICO CTA. No hay segundo, ni agenda, ni formulario
          de contacto en esta página (RF-07, §10-8). */}
      <Seccion titulo={descarga?.titulo}>
        {documento ? (
          <div style={caja}>
            <p style={tituloDelDocumento}>{documento.data.title}</p>
            <p style={{ margin: "0 0 1.25rem", color: "var(--slg-ink-2)", fontSize: "0.9375rem" }}>
              {documento.data.audience}
            </p>
            <Link href={`${descargas}/${documento.slug}`} style={boton}>
              {documento.data.status === "available" ? t["download.cta"] : t["download.comingSoon"]}
            </Link>
          </div>
        ) : (
          // Criterio 7: servicio sin documento asociado. La página no se rompe.
          <p style={{ color: "var(--slg-ink-2)" }}>{t["service.noDocument"]}</p>
        )}
      </Seccion>

      {/* 6 · Siguiente paso — sin venta y SIN widget de terceros (RF-08). */}
      <Seccion titulo={siguiente?.titulo}>
        <p style={{ margin: "0 0 1rem" }}>{primeraLinea(siguiente?.cuerpo ?? "")}</p>
        <Link href={contacto} style={{ color: "var(--slg-link)" }}>
          {t["service.contact"]}
        </Link>
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  if (!titulo) return null;
  return (
    <section style={{ padding: "2rem 0", borderTop: "1px solid var(--slg-line)" }}>
      <h2 style={tituloDeSeccion}>{titulo}</h2>
      {children}
    </section>
  );
}

const primeraLinea = (texto: string) => texto.split("\n").filter(Boolean)[0] ?? "";
/** Cada línea no vacía es un elemento. Así lo escribe el contrato A.3. */
const lineas = (texto: string) =>
  texto
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

const tituloDeSeccion: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1.25rem",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const tituloDelDocumento: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.125rem",
  fontWeight: 600,
  color: "var(--slg-blue-deep)",
};

const caja: React.CSSProperties = {
  background: "var(--slg-paper-2)",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "1.75rem",
};

const boton: React.CSSProperties = {
  display: "inline-block",
  background: "var(--slg-red)",
  color: "var(--slg-paper)",
  padding: "0.75rem 1.25rem",
  borderRadius: "var(--slg-radius-sm)",
  textDecoration: "none",
  fontSize: "0.9375rem",
  fontWeight: 600,
};
