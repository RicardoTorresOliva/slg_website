import { redirect } from "next/navigation";

import { loadCollection } from "@/lib/content/loader";
import { registrarCaptura } from "@/lib/descargas/service";

/**
 * El manejador del formulario de descarga (DU-08).
 *
 * **POST nativo, respuesta por redirección.** No hay JSON ni `fetch`: el
 * formulario se envía como HTML de toda la vida y la respuesta es un `303` a
 * `/gracias`, donde el visitante encuentra su enlace. Así funciona sin
 * JavaScript, y así el botón «atrás» no reenvía el formulario.
 *
 * **El resultado viaja en la URL de `/gracias`, no en una sesión**: el visitante
 * es anónimo, no hay sesión que usar, y una cookie para esto sería una cookie
 * más que consentir.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La IP del cliente, si el despliegue la expone. Vacía no rompe nada. */
function ipDe(request: Request): string {
  const cabecera =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  // El primer valor de `x-forwarded-for` es el cliente; el resto son proxies.
  return cabecera.split(",")[0]?.trim() ?? "";
}

export async function POST(request: Request) {
  const datos = await request.formData();
  const slug = String(datos.get("documento") ?? "");
  const lang = String(datos.get("idioma") ?? "es") === "en" ? "en" : "es";
  const email = String(datos.get("email") ?? "");

  const gracias = lang === "en" ? "/en/thank-you" : "/gracias";
  const base = lang === "en" ? "/en/downloads" : "/descargas";

  const doc = loadCollection<{
    title: string;
    audience: string;
    learns: readonly string[];
    status: string;
    file_key?: string;
  }>("download", lang).find((d) => d.slug === slug);

  if (!doc) redirect(`${base}?error=no-existe`);

  const resultado = await registrarCaptura({
    origen: "download",
    documento: {
      slug: doc.slug,
      titulo: doc.data.title,
      audiencia: doc.data.audience,
      aprende: doc.data.learns ?? [],
      estado: doc.data.status,
      claveDeArchivo: doc.data.file_key,
    },
    datos,
    email,
    pagina: `${base}/${slug}`,
    locale: lang,
    utm: utmDe(request),
    ip: ipDe(request),
  });

  if (!resultado.ok) {
    const motivo = resultado.veredicto.motivo;
    // La TRAMPA se responde como un éxito: al bot no se le dice que ha fallado
    // —decírselo es entrenarlo— y no se ha guardado nada (RF-33).
    if (motivo === "trampa") redirect(`${gracias}?estado=proximamente`);
    redirect(`${base}/${slug}?error=${motivo}`);
  }

  if (resultado.proximamente) redirect(`${gracias}?estado=proximamente`);

  // El enlace firmado va en la URL de `/gracias`. Ya caduca por sí mismo: es
  // el propio mecanismo de la firma el que lo limita, no el secreto de la URL.
  redirect(`${gracias}?url=${encodeURIComponent(resultado.url ?? "")}&doc=${encodeURIComponent(slug)}`);
}

/** Las UTM que traiga el formulario, si la página las propagó. */
function utmDe(request: Request): Record<string, string> | undefined {
  const url = new URL(request.url);
  const out: Record<string, string> = {};
  for (const clave of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = url.searchParams.get(clave);
    if (v) out[clave] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
