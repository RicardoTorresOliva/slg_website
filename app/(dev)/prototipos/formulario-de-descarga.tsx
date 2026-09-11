"use client";

import { useState } from "react";

import { DownloadForm, type DatosDeEnvio, type ResultadoEnvio } from "@/components/download-form/DownloadForm.tsx";

/**
 * Envoltorio SOLO de esta vitrina: simula lo que el servidor decidiría
 * (DU-08/FU-11, todavía sin construir) para poder demostrar los ocho estados
 * del criterio 2 sin depender de esas unidades. `DownloadForm` en sí no sabe
 * que esto es una simulación — recibe la misma forma de `onSubmit` que
 * recibiría de una Server Action real.
 */
export function PrototipoFormularioDeDescarga({
  strings,
  variante,
}: {
  strings: Record<string, string>;
  variante: "completo" | "proximamente";
}) {
  const [simular, setSimular] = useState<"exito_con_archivo" | "exito_sin_archivo" | "limite" | "error_servidor">(
    "exito_con_archivo",
  );
  const [ultimoEnvio, setUltimoEnvio] = useState<DatosDeEnvio | null>(null);

  async function onSubmit(datos: DatosDeEnvio): Promise<ResultadoEnvio> {
    setUltimoEnvio(datos);
    await new Promise((r) => setTimeout(r, 400)); // simula latencia de red, no "retardo artificial" del propio componente
    switch (simular) {
      case "exito_con_archivo":
        return { estado: "exito", hayArchivo: true };
      case "exito_sin_archivo":
        return { estado: "exito", hayArchivo: false };
      case "limite":
        return { estado: "limite" };
      case "error_servidor":
        return { estado: "error_servidor" };
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line p-6">
      <label className="flex items-center gap-2 text-sm text-ink-2">
        Simular respuesta del servidor:
        <select
          value={simular}
          onChange={(e) => setSimular(e.target.value as typeof simular)}
          className="rounded border border-line px-2 py-1"
        >
          <option value="exito_con_archivo">Éxito (con archivo)</option>
          <option value="exito_sin_archivo">Éxito (sin archivo — próximamente)</option>
          <option value="limite">Límite de peticiones (429)</option>
          <option value="error_servidor">Error del servidor</option>
        </select>
      </label>

      <DownloadForm strings={strings} variante={variante} onSubmit={onSubmit} />

      {ultimoEnvio && (
        <p className="text-xs text-ink-2">
          Último intento de envío: {ultimoEnvio.email} — honeypot: «{ultimoEnvio.honeypot || "(vacío)"}»
        </p>
      )}
    </div>
  );
}
