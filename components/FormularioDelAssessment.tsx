"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  CUESTIONARIOS,
  PROGRAMAS,
  etiquetaDePrograma,
  programaDe,
  type Pregunta,
} from "@/lib/assessment/cuestionarios";
import { NOMBRE_DEL_CAMPO_TRAMPA } from "@/lib/antiabuso/trampa";

import { AvisoDelFormulario } from "./AvisoDelFormulario";

export type TextosDelAssessment = Readonly<Record<string, string>>;

/**
 * El formulario del Assessment (spec-delta-assessment).
 *
 * Lee `?programa=` en el CLIENTE, dentro de `Suspense`, por la misma razón que
 * `AvisoDelFormulario`: leer la URL en el servidor volvería dinámica una página
 * que se prerrenderiza. Sin JavaScript sigue funcionando: el selector son
 * enlaces normales y el envío es un `POST` nativo; sin parámetro, PEEx.
 *
 * Una sola acción: enviar. Ninguna respuesta es obligatoria (DU-10).
 */
export function FormularioDelAssessment({ lang, textos }: { lang: "es" | "en"; textos: TextosDelAssessment }) {
  return (
    <Suspense fallback={null}>
      <Formulario lang={lang} textos={textos} />
    </Suspense>
  );
}

function Formulario({ lang, textos: t }: { lang: "es" | "en"; textos: TextosDelAssessment }) {
  const programa = programaDe(useSearchParams().get("programa"));
  const base = lang === "en" ? "/en/assessment" : "/assessment";
  const privacidad = lang === "en" ? "/en/legal/privacy" : "/legal/privacidad";
  const preguntas = CUESTIONARIOS[programa];

  return (
    <div>
      <nav aria-label={t["assessment.program"]} style={selector}>
        <span style={etiqueta}>{t["assessment.program"]}</span>
        {PROGRAMAS.map((p) => (
          <Link
            key={p}
            href={`${base}?programa=${p}`}
            aria-current={p === programa ? "page" : undefined}
            style={p === programa ? opcionActiva : opcion}
          >
            {etiquetaDePrograma(p)}
          </Link>
        ))}
      </nav>

      <form method="post" action="/api/assessment" style={caja} aria-label={t["assessment.send"]}>
        <input type="hidden" name="idioma" value={lang} />
        <input type="hidden" name="programa" value={programa} />

        {/* Campo trampa: invisible para una persona, irresistible para un bot. */}
        <div aria-hidden="true" style={trampa}>
          <label htmlFor={`as-${NOMBRE_DEL_CAMPO_TRAMPA}`}>{NOMBRE_DEL_CAMPO_TRAMPA}</label>
          <input id={`as-${NOMBRE_DEL_CAMPO_TRAMPA}`} name={NOMBRE_DEL_CAMPO_TRAMPA} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>

        <AvisoDelFormulario
          textos={{
            dominio_gratuito: t["download.freeEmailRejected"],
            datos_incompletos: t["download.incompleteData"],
          }}
        />

        <Campo id="nombre" etiqueta={t["form.name"]} requerido autoComplete="given-name" />
        <Campo id="apellido" etiqueta={t["form.lastName"]} requerido autoComplete="family-name" />
        <Campo id="email" etiqueta={t["download.emailLabel"]} tipo="email" requerido autoComplete="email" />
        <Campo id="empresa" etiqueta={t["assessment.company"]} autoComplete="organization" />
        <Campo id="cargo" etiqueta={t["assessment.jobTitle"]} autoComplete="organization-title" />

        <fieldset style={grupo}>
          <legend style={etiqueta}>{t["assessment.answers"]}</legend>

          <label htmlFor="as-p0" style={etiqueta}>
            {t["assessment.goal"]}
          </label>
          <textarea id="as-p0" name="p0" rows={3} style={{ ...campo, resize: "vertical" }} />

          {preguntas.map((pr) => (
            <PreguntaDelFormulario key={`${programa}-${pr.id}`} pr={pr} lang={lang} t={t} />
          ))}
        </fieldset>

        <button type="submit" style={boton}>
          {t["assessment.send"]}
        </button>

        <p style={aviso}>
          {t["downloads.privacy"]}{" "}
          <Link href={privacidad} style={{ color: "var(--slg-link)" }}>
            {t["downloads.privacyLink"]}
          </Link>
        </p>
      </form>
    </div>
  );
}

function Campo({
  id,
  etiqueta: texto,
  tipo = "text",
  requerido = false,
  autoComplete,
}: {
  id: string;
  etiqueta: string;
  tipo?: string;
  requerido?: boolean;
  autoComplete?: string;
}) {
  return (
    <>
      <label htmlFor={`as-${id}`} style={etiqueta}>
        {texto}
      </label>
      <input id={`as-${id}`} name={id} type={tipo} required={requerido} autoComplete={autoComplete} style={campo} />
    </>
  );
}

function PreguntaDelFormulario({ pr, lang, t }: { pr: Pregunta; lang: "es" | "en"; t: TextosDelAssessment }) {
  const name = `p${pr.id}`;
  const id = `as-${name}`;
  const texto = pr.texto[lang];

  if (pr.tipo === "escala") {
    const [min, max] = pr.extremos?.[lang] ?? ["1", "5"];
    return (
      <fieldset style={sub}>
        <legend style={etiqueta}>{texto}</legend>
        <p style={aviso}>
          {t["assessment.scaleHint"]}: 1 = {min} · 5 = {max}
        </p>
        <div style={fila}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} style={radio}>
              <input type="radio" name={name} value={String(n)} /> {n}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (pr.tipo === "opcion") {
    return (
      <fieldset style={sub}>
        <legend style={etiqueta}>{texto}</legend>
        <div style={fila}>
          {(pr.opciones?.[lang] ?? []).map((o) => (
            <label key={o} style={radio}>
              <input type="radio" name={name} value={o} /> {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (pr.tipo === "numero") {
    return (
      <>
        <label htmlFor={id} style={etiqueta}>
          {texto}
        </label>
        <input id={id} name={name} type="number" inputMode="decimal" min="0" step="any" style={campo} />
      </>
    );
  }
  return (
    <>
      <label htmlFor={id} style={etiqueta}>
        {texto}
      </label>
      <textarea id={id} name={name} rows={3} style={{ ...campo, resize: "vertical" }} />
    </>
  );
}

const selector: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" };
const opcion: React.CSSProperties = { padding: "0.4rem 0.9rem", border: "1px solid var(--slg-line)", borderRadius: "var(--slg-radius-sm)", color: "var(--slg-link)", textDecoration: "none", fontSize: "0.9375rem" };
const opcionActiva: React.CSSProperties = { ...opcion, background: "var(--slg-blue-deep)", color: "var(--slg-paper)", borderColor: "var(--slg-blue-deep)", fontWeight: 600 };
const caja: React.CSSProperties = { background: "var(--slg-paper-2)", border: "1px solid var(--slg-line)", borderRadius: "var(--slg-radius-lg)", padding: "1.75rem", display: "grid", gap: "0.5rem" };
const grupo: React.CSSProperties = { border: "none", padding: 0, margin: "1rem 0 0", display: "grid", gap: "0.5rem" };
const sub: React.CSSProperties = { border: "none", padding: 0, margin: 0, display: "grid", gap: "0.25rem" };
const fila: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "1rem" };
const radio: React.CSSProperties = { fontSize: "0.9375rem", color: "var(--slg-ink)" };
const trampa: React.CSSProperties = { position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" };
const etiqueta: React.CSSProperties = { fontSize: "0.9375rem", fontWeight: 600, color: "var(--slg-ink)" };
const campo: React.CSSProperties = { padding: "0.75rem", border: "1px solid var(--slg-line)", borderRadius: "var(--slg-radius-sm)", font: "inherit", fontSize: "1rem", background: "var(--slg-paper)", color: "var(--slg-ink)" };
const boton: React.CSSProperties = { marginTop: "0.5rem", background: "var(--slg-red)", color: "var(--slg-paper)", padding: "0.8125rem 1.25rem", border: "none", borderRadius: "var(--slg-radius-sm)", font: "inherit", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer" };
const aviso: React.CSSProperties = { margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--slg-ink-2)" };
