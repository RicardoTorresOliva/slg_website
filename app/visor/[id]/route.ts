import { sesionActual } from "@/lib/auth";
import { MAXIMO_BYTES, sanearHtml } from "@/lib/visor/documento";
import { origenDelVisor, politicaDelVisor, visorEstaSeparado } from "@/lib/visor/origen";
import { documentoParaElVisor, urlFirmadaDelObjeto } from "@/lib/visor/servicio";

/**
 * `/visor/[id]` — **el documento del entregable HTML, en su propio origen**
 * (DU-19 · D-45 · RF-90 · RNF-21 · R-11).
 *
 * SE SIRVE DESDE `visor.softlandingglobal.com`, NO DESDE EL DOMINIO DEL SITIO.
 * Parte de estos HTML los generan agentes Hermes, y desde el dominio de la
 * aplicación un script hostil **comparte origen con la sesión del cliente**:
 * podría leer la cookie, llamar a la API con las credenciales del navegador y
 * llevarse los datos. Desde un subdominio propio no puede, y no porque nosotros
 * lo impidamos: **porque el navegador lo aísla**.
 *
 * **SIN ORIGEN SEPARADO NO SIRVE NADA.** Ni «mientras tanto» desde el mismo
 * dominio: ese repliegue silencioso a la opción insegura es lo que D-45 prohíbe
 * y sería invisible. Devuelve 404 y el portal lo cuenta con un estado.
 *
 * **LA SESIÓN NO LLEGA AQUÍ.** El navegador no manda las cookies del dominio de
 * la aplicación a este subdominio — eso *es* el aislamiento. Si llegara una,
 * significaría que alguien puso la cookie a nivel de dominio padre y el
 * mecanismo entero estaría roto **sin que nada fallara visiblemente**: por eso
 * se comprueba y se responde con un error explícito en vez de seguir.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noEncontrado = () => new Response("Not Found", { status: 404 });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!visorEstaSeparado()) return noEncontrado();

  /**
   * Solo responde **en el host del visor**. Pedida en el dominio de la
   * aplicación devuelve 404: si respondiera, el documento se serviría desde el
   * mismo origen que la sesión y el aislamiento se habría evaporado sin que
   * nada fallara. Se mira la cabecera `Host` porque detrás hay un proxy y la
   * URL de la petición puede venir normalizada.
   */
  const visor = origenDelVisor()!;
  const hostDelVisor = new URL(visor).host;
  const hostPedido = request.headers.get("host") ?? new URL(request.url).host;
  if (hostPedido !== hostDelVisor) return noEncontrado();

  const sesion = await sesionActual().catch(() => null);
  if (sesion) {
    return new Response(
      "El visor ha recibido una sesión, y eso no debe ocurrir: la cookie está puesta a nivel de " +
        "dominio padre y el aislamiento del visor no existe. Revisa la configuración antes de servir nada.",
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const { id } = await params;
  const doc = await documentoParaElVisor(id);
  if (!doc) return noEncontrado();

  let crudo: string;
  try {
    const url = await urlFirmadaDelObjeto(doc.claveDeArchivo);
    const respuesta = await fetch(url);
    if (!respuesta.ok) return noEncontrado();
    crudo = await respuesta.text();
  } catch {
    return noEncontrado();
  }

  if (crudo.length > MAXIMO_BYTES) {
    return new Response("El documento es demasiado grande para el visor.", { status: 413 });
  }

  const { html } = sanearHtml(crudo);

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": politicaDelVisor(),
      // Ni buscadores ni caché compartida: es contenido de un cliente.
      "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
      "cache-control": "no-store, private",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}
