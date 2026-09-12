"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DownloadForm, type DatosDeEnvio, type ResultadoEnvio } from "../download-form/DownloadForm";
import { enviarCaptura, type OrigenDeCaptura } from "@/lib/capture/acciones";

/**
 * Puente entre `DownloadForm` (FU-10, sin servidor) y la Server Action de
 * DU-08. El formulario ya sabía manejar sus ocho estados; aquí solo se le
 * conecta la puerta real y se navega a `/gracias` cuando termina.
 *
 * El slug y la ruta viajan como props desde el servidor, no se leen del DOM:
 * lo que el cliente envía, el cliente lo puede cambiar — y el servidor
 * resuelve el estado del documento por su cuenta de todos modos.
 */
export function FormularioDeCaptura({
  origen = "download",
  slug = null,
  rutaDePagina,
  strings,
  variante,
  conMensaje,
  claveDeBoton,
  privacyHref,
}: {
  origen?: OrigenDeCaptura;
  slug?: string | null;
  rutaDePagina: string;
  strings: Record<string, string>;
  variante: "completo" | "proximamente";
  /** Solo el formulario de contacto pide mensaje libre (§3.3). */
  conMensaje?: boolean;
  /** Clave de `content/ui` para el botón; por defecto el de descarga. */
  claveDeBoton?: string;
  privacyHref: string;
}) {
  const router = useRouter();
  const [dominioRechazado, setDominioRechazado] = useState(false);

  async function alEnviar(datos: DatosDeEnvio): Promise<ResultadoEnvio> {
    const busqueda = typeof window !== "undefined" ? window.location.search : null;
    const r = await enviarCaptura(origen, slug, rutaDePagina, busqueda, {
      nombre: datos.name,
      correo: datos.email,
      empresa: datos.company,
      cargo: datos.role,
      mensaje: datos.message,
      consentAt: datos.consentAt,
      honeypot: datos.honeypot,
    });

    if (r.estado === "exito") {
      router.push(r.destino);
      return { estado: "exito", hayArchivo: r.hayArchivo };
    }
    if (r.estado === "limite") return { estado: "limite" };
    if (r.estado === "dominio_gratuito") {
      // El formulario ya avisa de esto en cliente; que el servidor lo repita
      // es la autoridad real (RNF-33), no una duplicación ociosa.
      setDominioRechazado(true);
      return { estado: "error_servidor" };
    }
    return { estado: "error_servidor" };
  }

  return (
    <>
      {dominioRechazado && (
        <p role="alert" className="mb-3 text-sm text-stop">
          {strings["download.freeEmailRejected"]}
        </p>
      )}
      <DownloadForm
        strings={strings}
        variante={variante}
        conMensaje={conMensaje}
        claveDeBoton={claveDeBoton}
        privacyHref={privacyHref}
        onSubmit={alEnviar}
      />
    </>
  );
}
