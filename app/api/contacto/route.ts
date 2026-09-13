import { redirect } from "next/navigation";

import { registrarCaptura, type Origen } from "@/lib/descargas/service";

/**
 * Contacto y solicitud del documento de Doctrina (DU-10).
 *
 * **Una sola máquina, tres puertas.** Este manejador no valida nada por su
 * cuenta ni escribe en la base: llama a `registrarCaptura`, la misma que usa la
 * descarga. Tres caminos paralelos habrían sido tres sitios donde olvidarse del
 * honeypot — y el que se olvida no da ningún error, simplemente deja pasar.
 *
 * Lo único que cambia entre las tres es el `source` y si hay archivo que firmar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGENES_ADMITIDOS: Origen[] = ["contact", "doctrine-request"];

function ipDe(request: Request): string {
  const cabecera = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  return cabecera.split(",")[0]?.trim() ?? "";
}

export async function POST(request: Request) {
  const datos = await request.formData();
  const lang = String(datos.get("idioma") ?? "es") === "en" ? "en" : "es";
  const email = String(datos.get("email") ?? "");
  const pedido = String(datos.get("origen") ?? "contact") as Origen;
  const origen: Origen = ORIGENES_ADMITIDOS.includes(pedido) ? pedido : "contact";

  const volver =
    origen === "doctrine-request"
      ? lang === "en"
        ? "/en/doctrine"
        : "/doctrina"
      : lang === "en"
        ? "/en/contact"
        : "/contacto";
  const gracias = lang === "en" ? "/en/thank-you" : "/gracias";

  const resultado = await registrarCaptura({
    origen,
    datos,
    email,
    nombre: String(datos.get("nombre") ?? "") || undefined,
    empresa: String(datos.get("empresa") ?? "") || undefined,
    mensaje: String(datos.get("mensaje") ?? "") || undefined,
    pagina: volver,
    locale: lang,
    ip: ipDe(request),
  });

  if (!resultado.ok) {
    // La trampa responde como un éxito y no ha guardado nada (RF-33).
    if (resultado.veredicto.motivo === "trampa") redirect(`${gracias}?estado=${origen}`);
    redirect(`${volver}?error=${resultado.veredicto.motivo}`);
  }

  // `/gracias` distingue la variante (criterio 7): no hay documento que ofrecer.
  redirect(`${gracias}?estado=${origen}`);
}
