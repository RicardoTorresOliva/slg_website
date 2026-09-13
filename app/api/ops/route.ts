import { timingSafeEqual } from "node:crypto";
import { Resolver } from "node:dns/promises";

import { asegurarBuckets, cerrarAccesoPublico, adaptadorS3, ttlEnSegundos } from "@/lib/files";
import { enviarCorreo } from "@/lib/mail";
import {
  estadoDeMigraciones,
  ponerClaveDeAplicacion,
  probarConexionDeAplicacion,
} from "@/lib/db/administracion";

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
 *
 * DESDE LA SESIÓN DEL 13-09 NO SOLO COMPRUEBA: **ACTÚA**. Tiene botones que
 * ponen la contraseña del rol de aplicación y crean los dos buckets. La razón
 * es la misma que la de existir: el paso a paso mandaba a una consola de
 * PostgreSQL y a la consola de MinIO, dos sitios distintos con credenciales
 * distintas, para hacer tres cosas que la máquina hace sola. **Lo que se puede
 * hacer con código no se le pide a una persona.**
 *
 * Las acciones van por **POST**, nunca por GET: un `ALTER ROLE` que se dispara
 * al abrir una URL se dispara también con el prefetch del navegador y con
 * cualquier `<img src>` de cualquier página.
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

/* ── Inventario: qué variables están puestas y cuáles faltan ─────────────── */

/**
 * Lo que más tiempo hacía perder no era una comprobación en rojo: era **no
 * saber qué falta**. Esta tabla lo dice variable por variable, con el nombre
 * exacto que hay que escribir en Easypanel y para qué sirve, y **nunca enseña
 * el valor** de una que sea secreta: solo si está y cuánto mide.
 */
const VARIABLES: readonly { nombre: string; para: string; secreta: boolean; obligatoria: boolean }[] = [
  { nombre: "DATABASE_URL", para: "Cómo se conecta el sitio a la base (rol slg_app)", secreta: true, obligatoria: true },
  { nombre: "DATABASE_URL_MIGRATIONS", para: "Cómo se conectan las migraciones (rol dueño)", secreta: true, obligatoria: true },
  { nombre: "APP_DB_PASSWORD", para: "La contraseña que el botón de abajo le pone a slg_app", secreta: true, obligatoria: true },
  { nombre: "BETTER_AUTH_SECRET", para: "Firma las sesiones", secreta: true, obligatoria: true },
  { nombre: "NEXT_PUBLIC_SITE_URL", para: "La dirección pública del sitio", secreta: false, obligatoria: true },
  { nombre: "S3_ENDPOINT", para: "Dónde está MinIO por dentro", secreta: false, obligatoria: true },
  { nombre: "S3_ACCESS_KEY_ID", para: "Usuario de MinIO", secreta: true, obligatoria: true },
  { nombre: "S3_SECRET_ACCESS_KEY", para: "Contraseña de MinIO", secreta: true, obligatoria: true },
  { nombre: "S3_BUCKET_DOWNLOADS", para: "Nombre del bucket de documentos", secreta: false, obligatoria: false },
  { nombre: "S3_BUCKET_DELIVERABLES", para: "Nombre del bucket de entregables", secreta: false, obligatoria: false },
  { nombre: "MAIL_SMTP_HOST", para: "Servidor de correo saliente", secreta: false, obligatoria: true },
  { nombre: "MAIL_SMTP_USERNAME", para: "Usuario SMTP", secreta: true, obligatoria: true },
  { nombre: "MAIL_SMTP_PASSWORD", para: "Contraseña SMTP", secreta: true, obligatoria: true },
  { nombre: "MAIL_FROM_ADDRESS", para: "Desde qué dirección se manda", secreta: false, obligatoria: true },
  { nombre: "OPS_MAIL_TO", para: "A quién va el correo de prueba de esta página", secreta: false, obligatoria: true },
  { nombre: "CRM_BASE_URL", para: "La API del CRM", secreta: false, obligatoria: false },
  { nombre: "CRM_API_KEY_CAPTURE", para: "Clave del CRM que escribe", secreta: true, obligatoria: false },
  { nombre: "CRM_API_KEY_READ", para: "Clave del CRM que solo lee", secreta: true, obligatoria: false },
  { nombre: "STAGING_BASIC_AUTH_USER", para: "SOLO en staging. En producción tiene que estar VACÍA", secreta: false, obligatoria: false },
];

function inventario(): Resultado[] {
  return VARIABLES.map((v) => {
    const valor = process.env[v.nombre];
    const puesta = Boolean(valor && valor.trim());
    const muestra = !puesta
      ? v.obligatoria
        ? "FALTA. Ponla en Easypanel → slg-web → Environment."
        : "sin poner (opcional por ahora)"
      : v.secreta
        ? `puesta (${valor!.length} caracteres; no se muestra)`
        : valor!.slice(0, 80);
    return { que: `${v.nombre} — ${v.para}`, ok: puesta || !v.obligatoria, detalle: muestra };
  });
}

/* ── La página ───────────────────────────────────────────────────────────── */

type Bloque = { titulo: string; filas: Resultado[]; nota?: string };

const ACCIONES: readonly { id: string; boton: string; explica: string }[] = [
  {
    id: "clave-de-app",
    boton: "Ponerle la contraseña al usuario de la base",
    explica:
      "Coge el valor de APP_DB_PASSWORD y se lo pone al usuario slg_app. Es lo que antes había que " +
      "escribir a mano en una consola de PostgreSQL. Se puede pulsar las veces que haga falta.",
  },
  {
    id: "crear-buckets",
    boton: "Crear los dos buckets y cerrarlos",
    explica:
      "Crea «downloads» y «deliverables» en MinIO si no están, y los deja cerrados a accesos " +
      "anónimos. Es lo que antes había que hacer entrando a la consola de MinIO.",
  },
];

function pagina(bloques: Bloque[], token: string, hecho?: Bloque): string {
  const fila = (r: Resultado) =>
    `<tr><td>${r.ok ? "✅" : "❌"}</td><td><strong>${escapar(r.que)}</strong><br><small>${escapar(r.detalle)}</small></td></tr>`;
  const pintar = (b: Bloque) =>
    `<h2>${escapar(b.titulo)}</h2>${b.nota ? `<p class="n">${escapar(b.nota)}</p>` : ""}<table>${b.filas.map(fila).join("")}</table>`;
  const total = bloques.flatMap((b) => b.filas);
  const fallos = total.filter((r) => !r.ok).length;

  const botones = ACCIONES.map(
    (a) => `<form method="post" action="/api/ops?token=${encodeURIComponent(token)}">
      <input type="hidden" name="accion" value="${a.id}">
      <button type="submit">${escapar(a.boton)}</button>
      <small>${escapar(a.explica)}</small>
    </form>`,
  ).join("");

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Puesta en marcha</title>
<style>
 body{font:16px/1.5 system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#24394D}
 table{border-collapse:collapse;width:100%;margin-bottom:2rem}
 td{border-bottom:1px solid #e6e9ee;padding:.6rem .4rem;vertical-align:top}
 td:first-child{width:2rem;font-size:1.2rem}
 small{color:#5b6b7c;display:block;margin-top:.25rem}
 .n{color:#5b6b7c;font-size:.9rem;margin:.25rem 0 1rem}
 .r{padding:1rem;border-radius:8px;background:${fallos ? "#fdeaea" : "#eaf7ee"};margin-bottom:2rem}
 .hecho{padding:1rem;border-radius:8px;background:#eef4fb;border:1px solid #cddcf0;margin-bottom:2rem}
 form{padding:1rem;border:1px solid #e6e9ee;border-radius:8px;margin-bottom:1rem}
 button{font:inherit;padding:.6rem 1rem;border:1px solid #14508C;background:#14508C;color:#fff;border-radius:6px;cursor:pointer}
</style></head><body>
<h1>Puesta en marcha</h1>
<div class="r"><strong>${fallos === 0 ? "Todo correcto." : `${fallos} de ${total.length} comprobaciones fallaron.`}</strong></div>
${hecho ? `<div class="hecho">${pintar(hecho)}</div>` : ""}
<h2>Acciones — pulsa y ya está</h2>
${botones}
${bloques.map(pintar).join("")}
<p><small>Cuando esto esté en verde, borra la variable <code>OPS_TOKEN</code> en Easypanel y esta página deja de existir.</small></p>
</body></html>`;
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function autorizado(request: Request): string | null {
  const esperado = process.env.OPS_TOKEN;
  if (!esperado) return null;
  const token = new URL(request.url).searchParams.get("token");
  return testigoCorrecto(token, esperado) ? esperado : null;
}

async function diagnostico(): Promise<Bloque[]> {
  return [
    {
      titulo: "Variables de entorno — qué hay puesto y qué falta",
      nota: "Se ponen en Easypanel → proyecto slg_website → servicio slg-web → pestaña Environment.",
      filas: inventario(),
    },
    {
      titulo: "Base de datos",
      filas: [
        { que: "Conexión de la aplicación", ...(await probarConexionDeAplicacion()) },
        { que: "Migraciones aplicadas", ...(await estadoDeMigraciones()) },
      ],
    },
    { titulo: "Correo transaccional (FU-08, criterio 3)", filas: await probarCorreo() },
    { titulo: "Almacenamiento de archivos (FU-09)", filas: await probarAlmacenamiento() },
  ];
}

export async function GET(request: Request) {
  const token = autorizado(request);
  if (!token) return new Response("Not Found", { status: 404 });

  return new Response(pagina(await diagnostico(), token), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Las acciones. **Solo por POST**, y la página las ofrece como botones.
 *
 * Un `ALTER ROLE` o un `CreateBucket` que se disparan al abrir una URL se
 * disparan también con el prefetch del navegador, con el historial y con
 * cualquier `<img src>` de cualquier página. Por eso no hay ninguna acción
 * alcanzable con GET, ni siquiera con el testigo puesto.
 */
export async function POST(request: Request) {
  const token = autorizado(request);
  if (!token) return new Response("Not Found", { status: 404 });

  const datos = await request.formData();
  const accion = String(datos.get("accion") ?? "");

  let hecho: Bloque;
  try {
  if (accion === "clave-de-app") {
    const r = await ponerClaveDeAplicacion();
    const despues = r.ok ? await probarConexionDeAplicacion() : null;
    hecho = {
      titulo: "Contraseña del usuario de la base",
      nota: despues?.ok
        ? "Hecho. La aplicación ya conecta."
        : "Si la conexión sigue fallando, reinicia slg-web: el servidor guarda conexiones abiertas con la contraseña vieja.",
      filas: [
        { que: "ALTER ROLE slg_app", ok: r.ok, detalle: r.detalle },
        ...(despues ? [{ que: "Conexión de la aplicación", ok: despues.ok, detalle: despues.detalle }] : []),
      ],
    };
  } else if (accion === "crear-buckets") {
    const creados = await asegurarBuckets();
    const cerrados = creados.some((c) => c.ok) ? await cerrarAccesoPublico() : [];
    hecho = {
      titulo: "Buckets de MinIO",
      nota: "La prueba que de verdad manda es la de «Lectura SIN firma» del bloque de almacenamiento: tiene que FALLAR.",
      filas: [
        ...creados.map((c) => ({ que: `Bucket «${c.nombre}»`, ok: c.ok, detalle: c.detalle })),
        ...cerrados.map((c) => ({ que: `Cerrar «${c.nombre}» a accesos anónimos`, ok: c.ok, detalle: c.detalle })),
      ],
    };
  } else {
    hecho = { titulo: "Acción desconocida", filas: [{ que: accion || "(vacía)", ok: false, detalle: "No existe." }] };
  }
  } catch (e) {
    /**
     * **Ninguna acción puede acabar en un 500.** Esta página existe para
     * arreglar una infraestructura a medio montar: es normal que falte algo, y
     * una pantalla en blanco con «Internal Server Error» no dice qué falta.
     * Cualquier cosa que se escape se cuenta como fila roja y la página sigue
     * pintándose con el diagnóstico entero.
     */
    hecho = {
      titulo: `Acción «${accion}»`,
      filas: [{ que: "No se pudo completar", ok: false, detalle: (e as Error).message.slice(0, 300) }],
    };
  }

  return new Response(pagina(await diagnostico(), token, hecho), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
