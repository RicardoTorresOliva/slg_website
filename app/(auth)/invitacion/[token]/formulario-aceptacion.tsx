"use client";

import { useState, useTransition } from "react";

import { authClient } from "../../../../lib/auth/client.ts";
import { aceptarConContrasenaAction } from "./actions.ts";

/**
 * Los tres métodos de aceptación (criterio 2 de FU-07). Google/Microsoft
 * llaman a `signIn.social` con `requestSignUp: true` — el único caso en el
 * que se permite crear una cuenta nueva por ese medio (F.1,
 * `lib/auth/config.ts`) — y vuelven a `/invitacion/[token]/completar`, donde
 * el servidor liga la cuenta a la invitación.
 */
export function FormularioAceptacion({
  token,
  strings: t,
  hayGoogle,
  hayMicrosoft,
}: {
  token: string;
  strings: Record<string, string>;
  hayGoogle: boolean;
  hayMicrosoft: boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function aceptarConContrasena() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await aceptarConContrasenaAction(token, password);
      if (resultado && !resultado.ok) {
        setError(
          resultado.mensaje === "correo_no_coincide"
            ? t["invitation.error.emailMismatch"]
            : t["invitation.error.generic"],
        );
      }
    });
  }

  function continuarCon(provider: "google" | "microsoft") {
    void authClient.signIn.social({
      provider,
      requestSignUp: true,
      callbackURL: `/invitacion/${token}/completar`,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm text-ink-2">
          {t["invitation.password.label"]}
        </label>
        <input
          id="password"
          type="password"
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-line px-3 py-2 text-ink"
        />
        <button
          type="button"
          disabled={pendiente || password.length < 12}
          onClick={aceptarConContrasena}
          className="rounded-md bg-blue-primary px-4 py-2 font-medium text-paper disabled:opacity-50"
        >
          {t["invitation.password.button"]}
        </button>
      </div>

      {(hayGoogle || hayMicrosoft) && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          {hayGoogle && (
            <button
              type="button"
              onClick={() => continuarCon("google")}
              className="rounded-md border border-line px-4 py-2 text-ink"
            >
              {t["invitation.google.button"]}
            </button>
          )}
          {hayMicrosoft && (
            <button
              type="button"
              onClick={() => continuarCon("microsoft")}
              className="rounded-md border border-line px-4 py-2 text-ink"
            >
              {t["invitation.microsoft.button"]}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-stop">{error}</p>}
    </div>
  );
}
