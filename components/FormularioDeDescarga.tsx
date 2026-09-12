"use client";

import { useId, useRef, useState } from "react";

import { PRESS } from "@/lib/design/motion";

/**
 * 1 · Formulario de descarga — **el primero de los nueve** (RF-134).
 *
 * Se prototipa y valida antes que los otros ocho porque es el CTA único de toda
 * página de servicio: «el componente que paga el proyecto». Si este falla, el
 * resto del sitio es un folleto.
 *
 * LOS CINCO ESTADOS DEL CRITERIO 2, todos aquí y todos alcanzables desde el
 * prototipo: reposo · error en línea · enviando · disponible próximamente ·
 * error del servidor.
 *
 * La validación de correo corporativo que se ve aquí es **cortesía**, no
 * seguridad: la autoritativa es la de **FU-11**, en el servidor. Esta existe
 * para que el visitante no descubra el problema después de esperar.
 */

export type EstadoDelFormulario = "reposo" | "enviando" | "entregado" | "proximamente" | "error";

export type TextosDelFormulario = {
  readonly etiqueta: string;
  readonly cta: string;
  readonly proximamente: string;
  readonly correoGratuito: string;
  readonly correoInvalido: string;
  readonly enviando: string;
  readonly entregado: string;
  readonly errorServidor: string;
};

/**
 * Lista corta, solo para el aviso inmediato. La lista real vive en el servidor
 * (FU-11): duplicarla entera aquí la convertiría en dos listas que divergen, y
 * el día que diverjan el servidor rechazaría lo que el navegador aceptó.
 */
const GRATUITOS_EVIDENTES = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com",
  "live.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "mail.com",
];

export function FormularioDeDescarga({
  textos,
  estadoInicial = "reposo",
  documentoDisponible = true,
  onEnviar,
}: {
  textos: TextosDelFormulario;
  estadoInicial?: EstadoDelFormulario;
  documentoDisponible?: boolean;
  onEnviar?: (correo: string) => Promise<"entregado" | "error">;
}) {
  const idCampo = useId();
  const idError = `${idCampo}-error`;
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDelFormulario>(
    documentoDisponible ? estadoInicial : "proximamente",
  );
  const [pulsado, setPulsado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  function validar(valor: string): string | null {
    const v = valor.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return textos.correoInvalido;
    const dominio = v.split("@")[1] ?? "";
    if (GRATUITOS_EVIDENTES.includes(dominio)) return textos.correoGratuito;
    return null;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validar(correo);
    if (problema) {
      setError(problema);
      // El foco vuelve al campo: quien usa lector de pantalla no se entera del
      // error si el foco se queda en el botón.
      campo.current?.focus();
      return;
    }
    setError(null);
    setEstado("enviando");
    const resultado = (await onEnviar?.(correo)) ?? "entregado";
    setEstado(resultado);
  }

  if (estado === "proximamente") {
    return (
      <p className="slg-card" style={aviso} role="status">
        {textos.proximamente}
      </p>
    );
  }

  if (estado === "entregado") {
    return (
      <p className="slg-card" style={aviso} role="status">
        {textos.entregado}
      </p>
    );
  }

  return (
    <form onSubmit={enviar} noValidate style={{ display: "grid", gap: "0.75rem" }}>
      <label htmlFor={idCampo} style={{ fontSize: "0.875rem", color: "var(--slg-ink-2)" }}>
        {textos.etiqueta}
      </label>

      <input
        ref={campo}
        id={idCampo}
        className="slg-field"
        type="email"
        name="email"
        value={correo}
        autoComplete="email"
        // `aria-invalid` y `aria-describedby` son lo que hace que el error EN
        // LÍNEA exista también para quien no lo ve.
        aria-invalid={error !== null}
        aria-describedby={error ? idError : undefined}
        onChange={(e) => {
          setCorreo(e.target.value);
          if (error) setError(null);
        }}
        style={campoEstilo(error !== null)}
      />

      {error ? (
        <p id={idError} role="alert" style={errorEstilo}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="slg-pressable"
        data-pressed={pulsado ? "true" : "false"}
        onPointerDown={() => setPulsado(true)}
        onPointerUp={() => setPulsado(false)}
        onPointerCancel={() => setPulsado(false)}
        onBlur={() => setPulsado(false)}
        disabled={estado === "enviando"}
        style={botonRojo}
      >
        {estado === "enviando" ? textos.enviando : textos.cta}
      </button>

      {estado === "error" ? (
        <p role="alert" style={errorEstilo}>
          {textos.errorServidor}
        </p>
      ) : null}
    </form>
  );
}

const campoEstilo = (conError: boolean): React.CSSProperties => ({
  padding: "0.75rem 0.875rem",
  border: `1px solid ${conError ? "var(--slg-red)" : "var(--slg-line)"}`,
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-paper)",
  color: "var(--slg-ink)",
  font: "inherit",
  fontSize: "1rem",
});

const errorEstilo: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  // El rojo como DETENCIÓN, no como decoración: 5,0:1 sobre --paper.
  color: "var(--slg-red)",
};

/**
 * El único botón rojo de la página. El kit permite **1–2 instancias de rojo por
 * viewport** y esta es una de ellas: el CTA de descarga. Blanco sobre rojo mide
 * 5,0:1, que `check:contraste` comprueba en cada push.
 */
const botonRojo: React.CSSProperties = {
  padding: "0.8125rem 1.25rem",
  border: "none",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-red)",
  color: "var(--slg-paper)",
  font: "inherit",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  transitionDuration: `${PRESS.ms}ms`,
};

const aviso: React.CSSProperties = {
  margin: 0,
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-paper-2)",
  fontSize: "0.9375rem",
};
