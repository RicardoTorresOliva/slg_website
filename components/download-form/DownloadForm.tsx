"use client";

import { useId, useState } from "react";

import { esCorreoCorporativo } from "./free-email-domains.ts";
import { TAP_FEEDBACK } from "../shared/interaction.ts";

/**
 * DownloadForm — componente #5 de C.5, prototipado y validado PRIMERO
 * (RF-134, "el componente que paga el proyecto").
 *
 * Sin backend real: `onSubmit` es la única puerta hacia el servidor. Esta
 * unidad (FU-10) demuestra el camino completo del visitante con los ocho
 * estados del criterio 2; conectar `onSubmit` a `lead_capture`/CRM de verdad
 * es DU-08. El honeypot se envía sin más: descartarlo en silencio es
 * responsabilidad del servidor (FU-11), no de este componente.
 *
 * Validación de dominio gratuito: en el CLIENTE, para el error en línea
 * inmediato (RNF-33 exige que el SERVIDOR sea la autoridad real — este
 * componente no lo sustituye, solo da la primera señal).
 */

export type DatosDeEnvio = {
  name: string;
  email: string;
  company: string;
  role: string;
  message?: string;
  consentAt: string;
  /** Siempre vacío si quien envía es humano; el servidor decide qué hacer con esto. */
  honeypot: string;
};

export type ResultadoEnvio =
  | { estado: "exito"; hayArchivo: boolean }
  | { estado: "limite" }
  | { estado: "error_servidor" };

export type DownloadFormProps = {
  strings: Record<string, string>;
  /** `download.status === 'coming-soon'`: formulario reducido, botón sin rojo (§3.5). */
  variante: "completo" | "proximamente";
  /** Solo la variante `/contacto` pide mensaje (§3.3). */
  conMensaje?: boolean;
  /**
   * Clave de `content/ui` para el texto del botón. Por defecto, el de descarga.
   * Existe porque el mismo componente sirve a tres puertas (RF-43, RF-44) y un
   * formulario de contacto cuyo botón dice «Descargar el documento» promete
   * algo que no va a pasar.
   */
  claveDeBoton?: string;
  privacyHref?: string;
  onSubmit: (datos: DatosDeEnvio) => Promise<ResultadoEnvio>;
  onExito?: (resultado: Extract<ResultadoEnvio, { estado: "exito" }>) => void;
};

type EstadoFormulario =
  | { tipo: "reposo" }
  | { tipo: "enviando" }
  | { tipo: "exito"; hayArchivo: boolean }
  | { tipo: "limite" }
  | { tipo: "error_servidor" };

export function DownloadForm({
  strings: t,
  variante,
  claveDeBoton,
  conMensaje = false,
  privacyHref = "/legal/privacidad",
  onSubmit,
  onExito,
}: DownloadFormProps) {
  const [estado, setEstado] = useState<EstadoFormulario>({ tipo: "reposo" });
  const [email, setEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [consentido, setConsentido] = useState(false);
  const idBase = useId();

  function validarCorreoAlSalir() {
    if (email && !esCorreoCorporativo(email)) {
      setErrorEmail(t["download.freeEmailRejected"]);
    } else {
      setErrorEmail(null);
    }
  }

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estado.tipo === "enviando") return;

    const formData = new FormData(evento.currentTarget);
    const correo = String(formData.get("email") ?? "");
    if (!esCorreoCorporativo(correo)) {
      setErrorEmail(t["download.freeEmailRejected"]);
      // El foco vuelve al campo con error (RNF-05): no se avanza a "enviando".
      (evento.currentTarget.elements.namedItem("email") as HTMLInputElement | null)?.focus();
      return;
    }

    setEstado({ tipo: "enviando" });
    const resultado = await onSubmit({
      name: String(formData.get("name") ?? ""),
      email: correo,
      company: String(formData.get("company") ?? ""),
      role: String(formData.get("role") ?? ""),
      message: conMensaje ? String(formData.get("message") ?? "") : undefined,
      consentAt: new Date().toISOString(),
      honeypot: String(formData.get("empresa_confirmar") ?? ""),
    });

    if (resultado.estado === "exito") {
      setEstado({ tipo: "exito", hayArchivo: resultado.hayArchivo });
      onExito?.(resultado);
    } else if (resultado.estado === "limite") {
      setEstado({ tipo: "limite" });
    } else {
      // Servidor: los datos ya escritos en el DOM se conservan — no se limpia el formulario.
      setEstado({ tipo: "error_servidor" });
    }
  }

  if (estado.tipo === "exito") {
    // La navegación real a /gracias (RF-42) la decide quien use este
    // componente (DU-08) a través de `onExito`; aquí solo se demuestra que
    // el estado de éxito existe y es distinguible de los demás (criterio 2).
    return (
      <p role="status" className="text-ink">
        {estado.hayArchivo ? "✓ (demo) redirige a /gracias" : "✓ (demo) redirige a /gracias — próximamente"}
      </p>
    );
  }

  const enviando = estado.tipo === "enviando";
  const esProximamente = variante === "proximamente";

  return (
    <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4" aria-busy={enviando}>
      {!esProximamente && (
        <>
          <Campo id={`${idBase}-name`} name="name" label={t["download.nameLabel"]} required disabled={enviando} />
          <Campo
            id={`${idBase}-company`}
            name="company"
            label={t["download.companyLabel"]}
            required
            disabled={enviando}
          />
          <Campo id={`${idBase}-role`} name="role" label={t["download.roleLabel"]} required disabled={enviando} />
        </>
      )}

      <Campo
        id={`${idBase}-email`}
        name="email"
        type="email"
        label={t["download.emailLabel"]}
        required
        disabled={enviando}
        value={email}
        onChange={(v) => {
          setEmail(v);
          if (errorEmail) setErrorEmail(null);
        }}
        onBlur={validarCorreoAlSalir}
        error={errorEmail}
      />

      {!esProximamente && conMensaje && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idBase}-message`} className="text-sm text-ink-2">
            {t["download.messageLabel"]}
          </label>
          <textarea
            id={`${idBase}-message`}
            name="message"
            disabled={enviando}
            rows={4}
            className="rounded-md border border-line px-3 py-2 text-ink"
          />
        </div>
      )}

      {/* Honeypot: invisible para humanos, no para lectores de pantalla mal configurados. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor={`${idBase}-hp`}>{t["download.honeypotLabel"]}</label>
        <input id={`${idBase}-hp`} name="empresa_confirmar" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/*
        El aviso de privacidad aparece en LAS DOS variantes, y eso es una
        corrección, no una preferencia: la variante «próximamente» también
        recoge un correo y también guarda `consent_at`: guardar la marca de un
        consentimiento sin haber enseñado a qué se consiente no es un
        consentimiento (RF-36, y criterio 3 de DU-06 — «enlazadas desde el pie
        y desde TODO formulario público»).

        Lo que cambia entre variantes es la forma, no la existencia: la
        completa pide una casilla explícita; la reducida, que es un solo campo,
        lo dice en línea bajo el botón, como fija `ui_wireframes` §2.2.
      */}
      {esProximamente ? (
        <p className="text-sm text-ink-2">
          {t["download.consentNotice"].split("{{privacyLink}}")[0]}
          <a href={privacyHref}>{t["download.consentLinkText"]}</a>
          {t["download.consentNotice"].split("{{privacyLink}}")[1]}
        </p>
      ) : (
        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            required
            disabled={enviando}
            checked={consentido}
            onChange={(e) => setConsentido(e.target.checked)}
            className="mt-1"
          />
          <span>
            {t["download.consentLabel"].split("{{privacyLink}}")[0]}
            <a href={privacyHref}>{t["download.consentLinkText"]}</a>
            {t["download.consentLabel"].split("{{privacyLink}}")[1]}
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={enviando || (!esProximamente && !consentido)}
        className={
          esProximamente
            ? `rounded-md border border-line px-4 py-2 font-medium text-ink disabled:opacity-50 ${TAP_FEEDBACK}`
            : `rounded-md bg-stop px-4 py-2 font-medium text-paper disabled:opacity-50 ${TAP_FEEDBACK}`
        }
      >
        {enviando
          ? "…"
          : claveDeBoton
            ? t[claveDeBoton]
            : esProximamente
              ? t["download.notifyButton"]
              : t["download.cta"]}
      </button>

      {esProximamente && <p className="text-sm text-ink-2">{t["download.comingSoonBody"]}</p>}

      {estado.tipo === "limite" && (
        <p role="alert" className="text-sm text-ink-2">
          {t["download.rateLimited"]}
        </p>
      )}
      {estado.tipo === "error_servidor" && (
        <p role="alert" className="text-sm text-stop">
          {t["download.serverError"]}
        </p>
      )}
    </form>
  );
}

function Campo({
  id,
  name,
  label,
  type = "text",
  required,
  disabled,
  value,
  onChange,
  onBlur,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-ink-2">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="rounded-md border border-line px-3 py-2 text-ink"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-stop">
          {error}
        </p>
      )}
    </div>
  );
}
