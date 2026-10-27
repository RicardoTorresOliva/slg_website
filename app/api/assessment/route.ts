import { redirect } from "next/navigation";

import { CUESTIONARIOS, etiquetaDePrograma, programaDe } from "@/lib/assessment/cuestionarios";
import { barrerDespues } from "@/lib/colas/barrer";
import { registrarCaptura } from "@/lib/descargas/service";

/**
 * El envío del Assessment (spec-delta-assessment).
 *
 * **La misma máquina que contacto** (DU-10): no valida ni escribe por su
 * cuenta, llama a `registrarCaptura` con origen `contact` —trampa, correo
 * corporativo, límite, consentimiento y entrega al CRM—. Las respuestas viajan
 * en el mensaje, como bloque de texto que empieza por `ASSESSMENT <programa>`:
 * no hay columna nueva ni migración, y quien lee la nota en el CRM ve de qué
 * programa son.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RESPUESTA = 1500;
const MAX_MENSAJE = 12000;

function ipDe(request: Request): string {
  const cabecera = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  return cabecera.split(",")[0]?.trim() ?? "";
}

function limpia(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim().slice(0, MAX_RESPUESTA);
}

export async function POST(request: Request) {
  const datos = await request.formData();
  const lang = String(datos.get("idioma") ?? "es") === "en" ? "en" : "es";
  const programa = programaDe(String(datos.get("programa") ?? ""));
  const base = lang === "en" ? "/en/assessment" : "/assessment";
  const volver = `${base}?programa=${programa}`;
  const gracias = lang === "en" ? "/en/thank-you" : "/gracias";

  const objetivo = limpia(datos.get("p0"));
  const lineas = [`ASSESSMENT ${etiquetaDePrograma(programa)} (${lang})`];
  if (objetivo) lineas.push("", `Objetivo / Goal: ${objetivo}`);
  lineas.push("");
  for (const pr of CUESTIONARIOS[programa]) {
    const respuesta = limpia(datos.get(`p${pr.id}`));
    lineas.push(`${pr.id}. ${pr.texto[lang]}`, `   → ${respuesta || "—"}`);
  }

  const resultado = await registrarCaptura({
    origen: "contact",
    datos,
    email: String(datos.get("email") ?? ""),
    nombre: String(datos.get("nombre") ?? ""),
    apellido: String(datos.get("apellido") ?? ""),
    empresa: String(datos.get("empresa") ?? "") || undefined,
    cargo: String(datos.get("cargo") ?? "") || undefined,
    mensaje: lineas.join("\n").slice(0, MAX_MENSAJE),
    pagina: base,
    locale: lang,
    ip: ipDe(request),
  });

  if (resultado.ok) barrerDespues({ inmediato: true });

  if (!resultado.ok) {
    // La trampa responde como un éxito y no ha guardado nada (RF-33).
    if (resultado.veredicto.motivo === "trampa") redirect(`${gracias}?estado=assessment`);
    redirect(`${volver}&error=${resultado.veredicto.motivo}`);
  }

  redirect(`${gracias}?estado=assessment`);
}
