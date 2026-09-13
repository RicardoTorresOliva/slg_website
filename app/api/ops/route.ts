import { timingSafeEqual } from "node:crypto";
import { Resolver } from "node:dns/promises";

import { adaptadorS3, ttlEnSegundos } from "@/lib/files";
import { enviarCorreo } from "@/lib/mail";

/**
 * `/api/ops` — la comprobación de infraestructura, **desde el navegador**.
 *
 * POR QUÉ EXISTE. Dos criterios abiertos —la prueba de bandeja de entrada de
 * FU-08 y la confirmación de que los buckets son privados de FU-09— solo se
 * pueden verificar **contra la infraestructura real**, con las credenciales
 * puestas. Y quien tiene esas credenciales no tiene terminal: las puso en
 * Easypanel. Pedirle que ejecute un script era pedirle algo que no puede hacer,
 * así que la comprobación se abre donde sí puede: una URL.
 *
 * CÓMO SE CIERRA. Sin `OPS_TOKEN` definida, esta ruta **no existe**: 404, no
 * 403, porque un 403 confirma que está ahí (D-38). Con ella definida, exige el
 * testigo exacto y se compara en **tiempo constante**. Los destinatarios del
 * correo de prueba salen de `OPS_MAIL_TO`, nunca de la petición: así ni con el
 * testigo filtrado se puede usar esto para mandar correo a terceros.
 *
 * SE APAGA BORRANDO LA VARIABLE. Cuando los dos criterios estén cerrados, se
 * quita `OPS_TOKEN` de Easypanel y la ruta vuelve a no existir.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resultado = { que: string; ok: boolean; detalle: string };

function testigoCorrecto(dado: string | null, esperado: string): boolean {
  if (!dado) return false;
  const a = Buffer.from(dado);
  const b = Buffer.from(esperado);
  // La longitud sí se filtra: es información inútil para adivinar el testigo.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ── Correo ──────────────────────────────────────────────────────────────── */

/**
 * ANTES DE MANDAR NADA, se comprueba que el dominio del remitente esté
 * realmente verificado. Es la comprobación que más vale de todas: un
 * `MAIL_FROM_ADDRESS` apuntando a un subdominio sin DKIM **no rebota con un
 * error claro**, se entrega a la carpeta de spam y parece que todo funciona.
 */
async function dnsDelRemitente(from: string): Promise<Resultado[]> {
  const dominio = from.split("@")[1] ?? "";
  const resolver = new Resolver({ timeout: 4_000, tries: 2 });
  const out: Resultado[] = [];

  const mirar = async (nombre: string, que: string, pista: string) => {
    try {
      const txt = (await resolver.resolveTxt(nombre)).map((t) => t.join("")).join(" ");
      out.push({ que, ok: txt.length > 0, detalle: txt.slice(0, 120) });
    } catch {
      out.push({ que, ok: false, detalle: pista });
    }
  };

  await mirar(
    `resend._domainkey.${dominio}`,
    `DKIM de ${dominio}`,
    `No hay registro DKIM para ${dominio}. El remitente apunta a un dominio que el ` +
      `proveedor no tiene verificado: el correo saldrá sin firmar y acabará en spam.`,
  );
  await mirar(
    `send.${dominio}`,
    `SPF de envío de ${dominio}`,
    `No hay SPF en send.${dominio}.`,
  );
  return out;
}

async function probarCorreo(): Promise<Resultado[]> {
  const from = process.env.MAIL_FROM_ADDRESS ?? "";
  const destinos = (process.env.OPS_MAIL_TO ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const out: Resultado[] = [
    { que: "Remitente configurado", ok: from.includes("@"), detalle: from || "(sin MAIL_FROM_ADDRESS)" },
  ];
  if (!from.includes("@")) return out;

  out.push(...(await dnsDelRemitente(from)));

  if (destinos.length === 0) {
    out.push({
      que: "Destinatarios de la prueba",
      ok: false,
      detalle: "Falta OPS_MAIL_TO. Ponle tres direcciones de proveedores distintos, separadas por comas.",
    });
    return out;
  }

  for (const para of destinos) {
    try {
      const r = await enviarCorreo({
        tipo: "capture_notice",
        para,
        idioma: "es",
        datos: {
          correo: from,
          origen: "comprobación de infraestructura",
          urlCrm: process.env.NEXT_PUBLIC_SITE_URL ?? "https://softlandingglobal.com",
        },
      });
      out.push({
        que: `Correo a ${para}`,
        ok: r.estado === "delivered",
        detalle:
          r.estado === "delivered"
            ? "Aceptado por el servidor SMTP. Mira la bandeja — y la carpeta de spam."
            : `El servidor no lo aceptó (${r.estado}): ${r.error ?? "sin detalle"}`,
      });
    } catch (e) {
      out.push({ que: `Correo a ${para}`, ok: false, detalle: (e as Error).message });
    }
  }
  return out;
}

/* ── Almacenamiento ──────────────────────────────────────────────────────── */

/**
 * Sube un objeto de prueba, lo lee con firma, intenta leerlo SIN firma y lo
 * borra. La tercera es la que importa: si un `GET` sin firmar devuelve el
 * archivo, **el bucket es público** y todo el modelo de entrega por URL
 * caducada no vale nada.
 */
async function probarAlmacenamiento(): Promise<Resultado[]> {
  const out: Resultado[] = [];
  const clave = `ops/comprobacion-${Date.now()}.pdf`;
  // Un PDF mínimo y válido: el destino `downloads:pdf` solo admite PDF.
  const cuerpo = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

  try {
    // DENTRO del try: si faltan las variables de S3, `adaptadorS3()` lanza, y
    // esta página tiene que CONTARLO, no romperse. Una comprobación que se cae
    // cuando encuentra el problema no comprueba nada.
    const adaptador = adaptadorS3();
    const subida = await adaptador.firmarSubida({
      destino: "downloads:pdf",
      clave,
      mime: "application/pdf",
      bytes: cuerpo.byteLength,
    });
    const put = await fetch(subida.url, {
      method: "PUT",
      headers: { "content-type": "application/pdf" },
      body: new Uint8Array(cuerpo),
    });
    out.push({
      que: "Subida firmada al bucket «downloads»",
      ok: put.ok,
      detalle: put.ok ? `${cuerpo.byteLength} bytes subidos` : `HTTP ${put.status}`,
    });
    if (!put.ok) return out;

    const descarga = await adaptador.firmarDescarga({ bucket: "downloads", clave, uso: "download" });
    const get = await fetch(descarga.url);
    out.push({
      que: "Lectura CON firma",
      ok: get.ok,
      detalle: get.ok
        ? `HTTP ${get.status}; la firma caduca en ${ttlEnSegundos("download")} s`
        : `HTTP ${get.status} — la firma no sirve para leer`,
    });

    // La prueba de privacidad: la MISMA URL sin la parte firmada.
    const sinFirma = descarga.url.split("?")[0];
    const abierto = await fetch(sinFirma);
    out.push({
      que: "Lectura SIN firma (tiene que FALLAR)",
      ok: !abierto.ok,
      detalle: abierto.ok
        ? `HTTP ${abierto.status}: EL BUCKET ES PÚBLICO. Ponlo en privado antes de subir nada real.`
        : `HTTP ${abierto.status} — denegado, que es lo correcto`,
    });

    await adaptador.borrar({ bucket: "downloads", clave });
    out.push({ que: "Borrado del objeto de prueba", ok: true, detalle: clave });
  } catch (e) {
    out.push({ que: "Almacenamiento", ok: false, detalle: (e as Error).message });
  }
  return out;
}

/* ── La página ───────────────────────────────────────────────────────────── */

function pagina(bloques: { titulo: string; filas: Resultado[] }[]): string {
  const fila = (r: Resultado) =>
    `<tr><td>${r.ok ? "✅" : "❌"}</td><td><strong>${escapar(r.que)}</strong><br><small>${escapar(r.detalle)}</small></td></tr>`;
  const bloque = (b: { titulo: string; filas: Resultado[] }) =>
    `<h2>${escapar(b.titulo)}</h2><table>${b.filas.map(fila).join("")}</table>`;
  const total = bloques.flatMap((b) => b.filas);
  const fallos = total.filter((r) => !r.ok).length;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comprobación de infraestructura</title>
<style>
 body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#24394D}
 table{border-collapse:collapse;width:100%;margin-bottom:2rem}
 td{border-bottom:1px solid #e6e9ee;padding:.6rem .4rem;vertical-align:top}
 td:first-child{width:2rem;font-size:1.2rem}
 small{color:#5b6b7c}
 .r{padding:1rem;border-radius:8px;background:${fallos ? "#fdeaea" : "#eaf7ee"};margin-bottom:2rem}
</style></head><body>
<h1>Comprobación de infraestructura</h1>
<div class="r"><strong>${fallos === 0 ? "Todo correcto." : `${fallos} de ${total.length} comprobaciones fallaron.`}</strong></div>
${bloques.map(bloque).join("")}
<p><small>Cuando esto esté en verde, borra la variable <code>OPS_TOKEN</code> en Easypanel y esta página deja de existir.</small></p>
</body></html>`;
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(request: Request) {
  const esperado = process.env.OPS_TOKEN;
  if (!esperado) return new Response("Not Found", { status: 404 });

  const token = new URL(request.url).searchParams.get("token");
  if (!testigoCorrecto(token, esperado)) return new Response("Not Found", { status: 404 });

  const bloques = [
    { titulo: "Correo transaccional (FU-08, criterio 3)", filas: await probarCorreo() },
    { titulo: "Almacenamiento de archivos (FU-09)", filas: await probarAlmacenamiento() },
  ];

  return new Response(pagina(bloques), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
