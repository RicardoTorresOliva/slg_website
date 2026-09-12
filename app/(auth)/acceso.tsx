import Link from "next/link";

import { proveedoresDisponibles } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";

/**
 * La pantalla de acceso, compartida por `/acceder` y `/en/sign-in`.
 *
 * CERO JAVASCRIPT. Es un `<form method="post">` contra un manejador de ruta. Un
 * formulario de acceso que depende de JS falla justo cuando peor viene —red
 * mala, extensión que bloquea, script que no carga— y además cuesta bytes del
 * presupuesto del gate D1.
 *
 * LOS CINCO ESTADOS DEL CRITERIO 8, todos aquí:
 *   · cargando            → el navegador lo muestra solo al enviar el formulario
 *   · credenciales inválidas → `?error=credenciales`, con el MISMO texto para todo
 *   · proveedor no disponible → botón deshabilitado y explicado
 *   · cuenta sin acceso   → cae en el mismo texto neutro, a propósito
 *   · enlace caducado     → `?error=enlace`
 */
export function PantallaDeAcceso({
  lang,
  error,
  volver,
}: {
  lang: "es" | "en";
  error?: string;
  volver?: string;
}) {
  const t = loadUiStrings()[lang];
  const proveedores = proveedoresDisponibles();
  const rutaRecuperar = lang === "es" ? "/recuperar" : "/en/recover";

  /**
   * TODO error termina en el mismo texto salvo el del enlace caducado, que no
   * habla de ninguna cuenta y sí ayuda a entender qué pasó (RF-59, criterio 2).
   */
  const mensaje =
    error === "bloqueado"
      ? t["auth.signin.locked"]
      : error === "enlace"
        ? t["auth.recover.expired"]
        : error
          ? t["auth.signin.error"]
          : null;

  return (
    <>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{t["auth.signin.title"]}</h1>
      <p style={{ color: "var(--slg-ink-2)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        {t["auth.signin.intro"]}
      </p>

      {mensaje ? (
        <p
          role="alert"
          style={{
            border: "1px solid var(--slg-line)",
            borderLeft: "3px solid var(--slg-stop)",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            fontSize: "0.9375rem",
          }}
        >
          {mensaje}
        </p>
      ) : null}

      <form method="post" action="/api/acceso/contrasena" style={{ display: "grid", gap: "1rem" }}>
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="volver" value={volver ?? ""} />

        <label style={{ display: "grid", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.875rem" }}>{t["auth.signin.email"]}</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            style={campo}
          />
        </label>

        <label style={{ display: "grid", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.875rem" }}>{t["auth.signin.password"]}</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            // 12 es la regla del servidor (RF-64); decirlo aquí evita un viaje.
            minLength={12}
            style={campo}
          />
        </label>

        <button type="submit" style={boton}>
          {t["auth.signin.submit"]}
        </button>
      </form>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
        <BotonDeProveedor
          disponible={proveedores.google}
          href="/api/auth/sign-in/social?provider=google"
          etiqueta={t["auth.signin.google"]}
          noDisponible={t["auth.signin.providerUnavailable"]}
        />
        <BotonDeProveedor
          disponible={proveedores.microsoft}
          href="/api/auth/sign-in/social?provider=microsoft"
          etiqueta={t["auth.signin.microsoft"]}
          noDisponible={t["auth.signin.providerUnavailable"]}
        />
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
        <Link href={rutaRecuperar}>{t["auth.signin.forgot"]}</Link>
      </p>
    </>
  );
}

/**
 * Un proveedor sin credenciales se pinta **deshabilitado y explicado**, no se
 * esconde. Un botón que desaparece hace pensar que el método no existe; uno
 * deshabilitado dice que hoy no está disponible, que es la verdad (criterio 8).
 */
function BotonDeProveedor({
  disponible,
  href,
  etiqueta,
  noDisponible,
}: {
  disponible: boolean;
  href: string;
  etiqueta: string;
  noDisponible: string;
}) {
  if (!disponible) {
    return (
      <span style={{ ...boton, ...deshabilitado }} aria-disabled="true">
        {etiqueta} · {noDisponible}
      </span>
    );
  }
  return (
    <a href={href} style={{ ...boton, textDecoration: "none", textAlign: "center" }}>
      {etiqueta}
    </a>
  );
}

const campo: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm, 4px)",
  font: "inherit",
  color: "inherit",
  background: "var(--slg-paper)",
};

const boton: React.CSSProperties = {
  display: "block",
  padding: "0.625rem 1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm, 4px)",
  background: "var(--slg-paper)",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
};

const deshabilitado: React.CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
  textAlign: "center",
};
