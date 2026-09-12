/**
 * test-archivos.ts — Almacenamiento y URLs firmadas, contra un servidor HTTP
 * real que VERIFICA LA FIRMA.
 *
 * POR QUÉ UN SERVIDOR Y NO UN DOBLE. Lo que FU-09 promete en su criterio 1 es
 * que una petición **sin firma** y una **con firma caducada** se deniegan. Un
 * doble del adaptador no puede demostrarlo: solo demostraría que el adaptador
 * llama al doble. Aquí hay un servidor que recalcula la firma con la misma
 * librería que usa S3 —`@smithy/signature-v4`— y la compara; la petición
 * entra solo si la firma cuadra y la ventana no ha vencido, que es lo que hace
 * MinIO.
 *
 * Lo que este montaje NO prueba: que MinIO se comporte igual. Eso se comprueba
 * al desplegar (`docs/deployment.md`) y es parte de los pasos de Ricardo.
 */
import { createHash, createHmac } from "node:crypto";
import http from "node:http";

import {
  adaptadorS3,
  clienteS3,
  ErrorDeAlmacenamiento,
  ttlEnMinutos,
  validarSubida,
  type PuertoDeArchivos,
} from "../../lib/files/index.ts";
import { SIGNED_URL_TTL_MINUTES, UPLOAD_LIMITS } from "../../lib/db/limits.ts";

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

/**
 * Verificación de SigV4 escrita a mano, sobre `node:crypto`.
 *
 * Se recalcula la firma en vez de reusar el firmador del SDK a propósito: usar
 * el mismo objeto que firmó para comprobar la firma prueba poco —si tuviera un
 * defecto, lo tendría a los dos lados—. Esto sigue el estándar paso a paso, que
 * es lo que hace MinIO al otro lado.
 */

const CLAVE_ACCESO = "prueba-local-acceso";
const CLAVE_SECRETA = "prueba-local-secreta-0123456789";
const REGION = "us-east-1";
const PUERTO = 2529;

type Recibido = { method: string; path: string; aceptada: boolean; motivo: string };
const recibidos: Recibido[] = [];

/** RFC 3986: `encodeURIComponent` deja sin escapar cinco caracteres que sí lo exigen. */
function rfc3986(valor: string): string {
  return encodeURIComponent(valor).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function hmac(clave: Buffer | string, dato: string): Buffer {
  return createHmac("sha256", clave).update(dato, "utf8").digest();
}

function sha256hex(dato: string): string {
  return createHash("sha256").update(dato, "utf8").digest("hex");
}

async function verificar(
  url: URL,
  method: string,
  cabeceras: Record<string, string | string[] | undefined>,
): Promise<{ ok: boolean; motivo: string }> {
  const firma = url.searchParams.get("X-Amz-Signature");
  const fecha = url.searchParams.get("X-Amz-Date");
  const caduca = url.searchParams.get("X-Amz-Expires");
  const credencial = url.searchParams.get("X-Amz-Credential");
  const firmadas = url.searchParams.get("X-Amz-SignedHeaders");
  if (!firma || !fecha || !caduca || !credencial || !firmadas) {
    return { ok: false, motivo: "sin firma" };
  }

  // Ventana: `X-Amz-Date` + `X-Amz-Expires`. Vencida es vencida.
  const emitida = Date.parse(
    `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}T` +
      `${fecha.slice(9, 11)}:${fecha.slice(11, 13)}:${fecha.slice(13, 15)}Z`,
  );
  if (!Number.isFinite(emitida)) return { ok: false, motivo: "fecha ilegible" };
  if (Date.now() > emitida + Number(caduca) * 1000) return { ok: false, motivo: "firma caducada" };

  // Consulta canónica: todo menos la firma, ordenado y codificado.
  const canonicalQuery = [...url.searchParams.entries()]
    .filter(([k]) => k !== "X-Amz-Signature")
    .map(([k, v]) => [rfc3986(k), rfc3986(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  /**
   * Las cabeceras firmadas se reconstruyen con su VALOR REAL. En una lectura
   * solo viaja `host`; en una subida viajan además `content-length` y
   * `content-type`, y ahí está el detalle que importa: si el cliente declara
   * 1 MB y manda 40, el valor no coincide con lo firmado y la firma falla. Sin
   * eso, el límite de tamaño sería una sugerencia.
   */
  const canonicalHeaders = firmadas
    .split(";")
    .map((h) => {
      if (h === "host") return `host:${url.host}\n`;
      const valor = cabeceras[h];
      const texto = Array.isArray(valor) ? valor.join(",") : (valor ?? "");
      return `${h}:${texto.trim().replace(/\s+/g, " ")}\n`;
    })
    .join("");

  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQuery,
    canonicalHeaders,
    firmadas,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const alcance = credencial.split("/").slice(1).join("/");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    fecha,
    alcance,
    sha256hex(canonicalRequest),
  ].join("\n");

  const [dia, region, servicio] = alcance.split("/");
  const kFecha = hmac(`AWS4${CLAVE_SECRETA}`, dia);
  const kRegion = hmac(kFecha, region);
  const kServicio = hmac(kRegion, servicio);
  const kFirma = hmac(kServicio, "aws4_request");
  const esperada = createHmac("sha256", kFirma).update(stringToSign, "utf8").digest("hex");

  return esperada === firma ? { ok: true, motivo: "" } : { ok: false, motivo: "firma no cuadra" };
}

async function levantarServidor() {
  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PUERTO}`);
    void verificar(url, req.method ?? "GET", req.headers).then(({ ok, motivo }) => {
      recibidos.push({ method: req.method ?? "GET", path: url.pathname, aceptada: ok, motivo });
      // Consumir el cuerpo: sin esto, un PUT queda colgado.
      req.resume();
      if (!ok) {
        res.writeHead(403, { "content-type": "application/xml" });
        res.end(`<Error><Code>AccessDenied</Code></Error>`);
        return;
      }
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end("contenido");
    });
  });
  await new Promise<void>((r) => servidor.listen(PUERTO, "127.0.0.1", r));
  return () => new Promise<void>((r) => servidor.close(() => r()));
}

function apuntarA() {
  process.env.S3_ENDPOINT = `http://127.0.0.1:${PUERTO}`;
  process.env.S3_REGION = REGION;
  process.env.S3_ACCESS_KEY_ID = CLAVE_ACCESO;
  process.env.S3_SECRET_ACCESS_KEY = CLAVE_SECRETA;
  process.env.S3_BUCKET_DOWNLOADS = "downloads";
  process.env.S3_BUCKET_DELIVERABLES = "deliverables";
  delete process.env.SIGNED_URL_TTL_DOWNLOAD_MINUTES;
  delete process.env.SIGNED_URL_TTL_DELIVERABLE_MINUTES;
  delete process.env.SIGNED_URL_TTL_UPLOAD_MINUTES;
}

const MB = 1024 * 1024;

async function main() {
  console.log("Almacenamiento y URLs firmadas — contra un servidor que verifica la firma\n");
  apuntarA();
  const cerrar = await levantarServidor();
  const puerto: PuertoDeArchivos = adaptadorS3(clienteS3());

  try {
    /* ── Criterio 3 · la caducidad sale de configuración ─────────────────── */
    console.log("Criterio 3 — la caducidad se lee de configuración:\n");

    const descarga = await puerto.firmarDescarga({
      bucket: "downloads",
      clave: "d-01.pdf",
      uso: "download",
    });
    const expiresDescarga = new URL(descarga.url).searchParams.get("X-Amz-Expires");
    check(
      "la descarga pública firma 15 minutos exactos (api_contracts §11.9)",
      expiresDescarga === String(15 * 60) && descarga.ttlMinutos === 15,
      `X-Amz-Expires=${expiresDescarga}`,
    );

    const entregable = await puerto.firmarDescarga({
      bucket: "deliverables",
      clave: "e-01.pdf",
      uso: "deliverable",
    });
    check(
      "el entregable del portal firma 10 minutos, no 30",
      new URL(entregable.url).searchParams.get("X-Amz-Expires") === String(10 * 60),
      "estaban intercambiados en limits.ts hasta FU-09 (D-60)",
    );

    const subida = await puerto.firmarSubida({
      destino: "deliverables:pdf",
      clave: "proyecto/e-02.pdf",
      mime: "application/pdf",
      bytes: 10 * MB,
    });
    check(
      "la subida firma 30 minutos: es la única que atraviesa una transferencia real",
      new URL(subida.url).searchParams.get("X-Amz-Expires") === String(30 * 60),
    );

    process.env.SIGNED_URL_TTL_DOWNLOAD_MINUTES = "7";
    check("una variable de entorno cambia el valor sin tocar código", ttlEnMinutos("download") === 7);
    process.env.SIGNED_URL_TTL_DOWNLOAD_MINUTES = "999";
    let rechazaTope = false;
    try {
      ttlEnMinutos("download");
    } catch {
      rechazaTope = true;
    }
    check(
      "una caducidad desmesurada se rechaza al arrancar",
      rechazaTope,
      "una firma que vive horas ya no es una firma, es un enlace público con fecha",
    );
    delete process.env.SIGNED_URL_TTL_DOWNLOAD_MINUTES;

    check(
      "el defecto vive en un solo sitio y coincide con el contrato",
      SIGNED_URL_TTL_MINUTES.download === 15 &&
        SIGNED_URL_TTL_MINUTES.deliverable === 10 &&
        SIGNED_URL_TTL_MINUTES.upload === 30,
    );

    /* ── Criterio 1 · sin firma y con firma caducada, denegado ───────────── */
    console.log("\nCriterio 1 — sin firma, alterada o caducada:\n");
    recibidos.length = 0;

    const conFirma = await fetch(descarga.url);
    check("con firma válida, 200", conFirma.status === 200, `status ${conFirma.status}`);

    const sinFirma = new URL(descarga.url);
    sinFirma.search = "";
    const rSinFirma = await fetch(sinFirma.toString());
    check("sin firma, denegado", rSinFirma.status === 403, `status ${rSinFirma.status}`);

    const alterada = new URL(descarga.url);
    alterada.pathname = "/downloads/otro-documento.pdf";
    const rAlterada = await fetch(alterada.toString());
    check(
      "cambiar el objeto invalida la firma",
      rAlterada.status === 403,
      "si no, una firma serviría para leer cualquier otro archivo del bucket",
    );

    const recortada = new URL(descarga.url);
    recortada.searchParams.set("X-Amz-Expires", "86400");
    const rRecortada = await fetch(recortada.toString());
    check("alargar la caducidad a mano invalida la firma", rRecortada.status === 403);

    // Caducada: se firma con un minuto y se retrasa el reloj del servidor
    // moviendo `X-Amz-Date` al pasado — la firma deja de cuadrar Y la ventana
    // vence, que son los dos motivos por los que debe denegarse.
    const vieja = new URL(descarga.url);
    const fechaVieja = new Date(Date.now() - 2 * 60 * 60 * 1000)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    vieja.searchParams.set("X-Amz-Date", fechaVieja);
    const rVieja = await fetch(vieja.toString());
    check("con la ventana vencida, denegado", rVieja.status === 403);

    const denegadas = recibidos.filter((r) => !r.aceptada);
    check(
      "el servidor denegó las cuatro por firma, no por otra cosa",
      denegadas.length === 4,
      denegadas.map((d) => d.motivo).join(" | "),
    );

    /* ── Criterio 4 · MIME y tamaño, antes de un solo byte ───────────────── */
    console.log("\nCriterio 4 — tipo y tamaño rechazados en el servidor:\n");
    const antes = recibidos.length;

    const casos: [string, { destino: string; clave: string; mime: string; bytes: number }][] = [
      ["un ejecutable como material", { destino: "deliverables:material", clave: "x.exe", mime: "application/x-msdownload", bytes: 1024 }],
      ["un SVG como material", { destino: "deliverables:material", clave: "x.svg", mime: "image/svg+xml", bytes: 1024 }],
      ["un HTML de 6 MB", { destino: "deliverables:html", clave: "x.html", mime: "text/html", bytes: 6 * MB }],
      ["un markdown de 2 MB", { destino: "deliverables:md", clave: "x.md", mime: "text/markdown", bytes: 2 * MB }],
      ["un PDF de descarga de 30 MB", { destino: "downloads:pdf", clave: "d.pdf", mime: "application/pdf", bytes: 30 * MB }],
      ["cualquier cosa por encima del tope duro", { destino: "deliverables:pdf", clave: "x.pdf", mime: "application/pdf", bytes: 51 * MB }],
      ["una clave con travesía de directorios", { destino: "deliverables:pdf", clave: "../../etc/passwd", mime: "application/pdf", bytes: 1024 }],
      ["un destino inventado", { destino: "deliverables:zip", clave: "x.zip", mime: "application/zip", bytes: 1024 }],
    ];

    for (const [nombre, entrada] of casos) {
      let rechazado = false;
      let publico = "";
      try {
        await puerto.firmarSubida(entrada);
      } catch (e) {
        rechazado = e instanceof ErrorDeAlmacenamiento;
        publico = e instanceof ErrorDeAlmacenamiento ? e.publico : "";
      }
      check(`${nombre} se rechaza`, rechazado);
      if (rechazado) {
        check(
          `${nombre} · el mensaje no describe el sistema`,
          !/bucket|s3|minio|clave secreta/i.test(publico),
          publico,
        );
      }
    }

    check(
      "ninguno de los ocho llegó a tocar el almacenamiento",
      recibidos.length === antes,
      "rechazar DESPUÉS de firmar deja una ventana en la que el archivo ya está escrito",
    );

    const deDosMegas = await puerto.firmarSubida({
      destino: "deliverables:html",
      clave: "proyecto/informe.html",
      mime: "text/html; charset=utf-8",
      bytes: 2 * MB,
    });
    check(
      "un HTML válido de 2 MB sí se firma, con el MIME normalizado",
      deDosMegas.url.length > 0,
      "`text/html; charset=utf-8` es text/html: el parámetro no debe estorbar",
    );

    // Se firma una subida pequeña para poder enviarla de verdad: `ContentLength`
    // entra en la firma, así que un cuerpo que no coincide con lo declarado no
    // se puede mandar. Eso es exactamente lo que queremos que pase.
    const cuerpo = "<!doctype html><p>x</p>";
    const pequena = await puerto.firmarSubida({
      destino: "deliverables:html",
      clave: "proyecto/informe.html",
      mime: "text/html",
      bytes: Buffer.byteLength(cuerpo),
    });
    const rSubida = await fetch(pequena.url, {
      method: "PUT",
      body: cuerpo,
      headers: { "content-type": "text/html" },
    });
    check("y el PUT firmado se acepta", rSubida.status === 200, `status ${rSubida.status}`);

    /* ── Criterio 2 · el puerto no ofrece listar ─────────────────────────── */
    console.log("\nCriterio 2 — no hay forma de listar un bucket:\n");
    const operaciones = Object.keys(puerto).sort();
    check(
      "el puerto expone exactamente tres operaciones",
      operaciones.join(",") === "borrar,firmarDescarga,firmarSubida",
      operaciones.join(", "),
    );
    check(
      "ninguna se llama listar, ni nada parecido",
      !operaciones.some((o) => /list|listar|enumerar|index/i.test(o)),
      "la garantía no es acordarse de no llamarla: es que no exista",
    );

    /* ── Los límites, contra data_model §2.6 ─────────────────────────────── */
    console.log("\nLos cinco límites de data_model §2.6:\n");
    const esperados: [string, number][] = [
      ["downloads pdf", 25 * MB],
      ["deliverables pdf", 50 * MB],
      ["deliverables html", 5 * MB],
      ["deliverables md", 1 * MB],
      ["tope duro", 50 * MB],
    ];
    const reales = [
      UPLOAD_LIMITS.downloadPdf,
      UPLOAD_LIMITS.deliverablePdf,
      UPLOAD_LIMITS.deliverableHtml,
      UPLOAD_LIMITS.deliverableMarkdown,
      UPLOAD_LIMITS.hardCap,
    ];
    esperados.forEach(([nombre, valor], i) => {
      check(`${nombre} = ${valor / MB} MB`, reales[i] === valor);
    });

    check(
      "justo en el límite se acepta, y un byte más se rechaza",
      validarSubida({ destino: "downloads:pdf", clave: "d.pdf", mime: "application/pdf", bytes: 25 * MB }).ok &&
        !validarSubida({ destino: "downloads:pdf", clave: "d.pdf", mime: "application/pdf", bytes: 25 * MB + 1 }).ok,
    );
  } finally {
    await cerrar();
  }
}

try {
  await main();
} catch (e) {
  console.error(`\n✗ La prueba no pudo completarse: ${(e as Error).message}`);
  fallos++;
}

console.log("");
if (fallos > 0) {
  console.error(`✗ archivos: ${fallos} fallo(s) sobre ${comprobaciones} comprobaciones.\n`);
  process.exit(1);
}
console.log(`✓ archivos: ${comprobaciones} comprobaciones contra un servidor real, sin fallos.\n`);
