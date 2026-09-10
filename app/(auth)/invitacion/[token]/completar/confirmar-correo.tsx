"use client";

import { useState, useTransition } from "react";

import { confirmarCorreoAction } from "./actions.ts";

export function ConfirmarCorreo({ token, strings: t }: { token: string; strings: Record<string, string> }) {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  function confirmar() {
    setError(false);
    iniciarTransicion(async () => {
      const resultado = await confirmarCorreoAction(token, correo);
      if (resultado && !resultado.ok) setError(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        className="rounded-md border border-line px-3 py-2 text-ink"
      />
      <button
        type="button"
        disabled={pendiente || !correo}
        onClick={confirmar}
        className="rounded-md bg-blue-primary px-4 py-2 font-medium text-paper disabled:opacity-50"
      >
        {t["invitation.confirmEmail.button"]}
      </button>
      {error && <p className="text-sm text-stop">{t["invitation.error.emailMismatch"]}</p>}
    </div>
  );
}
