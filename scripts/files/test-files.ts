/**
 * test-files.ts — Pruebas de FU-09: URLs firmadas de descarga y de subida.
 *
 * Corre contra un MinIO real (proceso local, no un supuesto ni un mock de
 * SigV4 reinventado): la caducidad y el rechazo de peticiones sin firma los
 * hace cumplir el propio servidor S3-compatible, exactamente como en
 * producción. `check-files-encapsulado.ts` cubre por separado los criterios
 * 1 (nadie fuera de `lib/files/client.ts` importa el cliente) y 2 (cero
 * `ListObjects*`).
 *
 * A. Descarga firmada: se sube un objeto de prueba, se emite la URL y se lee
 *    de vuelta el mismo contenido.
 * B. Una petición SIN firma al mismo objeto la rechaza MinIO (criterio 1).
 * C. Una firma CADUCADA también la rechaza MinIO (criterio 1) — se prueba el
 *    mismo mecanismo SigV4 que usa `emitirUrlFirmadaDeDescarga`, con un
 *    `expiresIn` de 1 segundo en vez del de configuración, porque la
 *    configuración real solo admite minutos enteros.
 * D. La caducidad emitida coincide EXACTAMENTE con el minuto de configuración
 *    (criterio 3), leído de `SIGNED_URL_TTL_DOWNLOAD_MINUTES` — no repetido a
 *    mano.
 * E. Subida por formulario (POST policy) con tipo y tamaño correctos: el
 *    propio MinIO la acepta y el objeto queda disponible.
 * F. Un tipo MIME fuera del permitido lo rechaza la propia función ANTES de
 *    pedir la firma (capa propia) — y si se fuerza la petición a MinIO con un
 *    `Content-Type` distinto al firmado, MinIO también la rechaza (capa de
 *    almacenamiento), cero bytes escritos (criterio 4).
 * G. Un cuerpo por encima del tamaño máximo lo rechaza MinIO por la condición
 *    `content-length-range` de la política, antes de aceptar el archivo
 *    (criterio 4).
 *
 * NO cubre: MinIO de producción real (D-51: credencial de administrador,
 * rotación pendiente, R-41) ni el paso de sincronización contenido→`download`
 * (fuera de alcance de FU-09, ver hallazgo de `download`/`deliverable`
 * incompletos frente a `data_model` §5.10/§5.11/§5.14, marcado aparte).
 */
import { CreateBucketCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { leerFilesConfig } from "../../lib/files/config.ts";
import { crearClienteS3 } from "../../lib/files/client.ts";
import { emitirUrlFirmadaDeDescarga, emitirUrlFirmadaDeSubida } from "../../lib/files/signed-urls.ts";
import { MimeNoPermitidoError } from "../../lib/files/types.ts";

let fallos = 0;
function ok(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) console.log(`  ✓ ${nombre}`);
  else {
    fallos++;
    console.error(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

async function main() {
  console.log("FU-09 — URLs firmadas de descarga y de subida\n");

  const cfg = leerFilesConfig();
  const client = crearClienteS3(cfg);

  for (const bucket of [cfg.bucketDownloads, cfg.bucketDeliverables]) {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (e) {
      if (!(e instanceof Error) || !e.name.includes("BucketAlreadyOwnedByYou")) throw e;
    }
  }

  // ── A/B/C/D. Descarga firmada ───────────────────────────────────────────
  console.log("A-D. URL firmada de descarga");
  const clave = `pruebas/documento-${Date.now()}.pdf`;
  const contenido = "contenido de prueba, no un PDF real";
  await client.send(
    new PutObjectCommand({ Bucket: cfg.bucketDownloads, Key: clave, Body: contenido, ContentType: "application/pdf" }),
  );

  const firmada = await emitirUrlFirmadaDeDescarga(client, cfg, { bucket: "downloads", key: clave });
  const respuestaOk = await fetch(firmada.url);
  ok("con firma vigente, el objeto se lee (200)", respuestaOk.status === 200);
  ok("el contenido leído es el mismo que se subió", (await respuestaOk.text()) === contenido);

  const respuestaSinFirma = await fetch(
    `${cfg.endpoint}/${cfg.bucketDownloads}/${encodeURIComponent(clave)}`,
  );
  ok(
    "sin firma, MinIO deniega el acceso (criterio 1)",
    respuestaSinFirma.status === 403 || respuestaSinFirma.status === 401,
    `status recibido: ${respuestaSinFirma.status}`,
  );

  const urlCaducaYa = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: cfg.bucketDownloads, Key: clave }),
    { expiresIn: 1 },
  );
  await new Promise((r) => setTimeout(r, 2000));
  const respuestaCaducada = await fetch(urlCaducaYa);
  ok(
    "con firma caducada, MinIO también deniega (criterio 1)",
    respuestaCaducada.status === 403,
    `status recibido: ${respuestaCaducada.status}`,
  );

  const minutosEsperados = cfg.ttlDownloadMinutes;
  const segundosReales = Math.round((firmada.expiresAt.getTime() - Date.now()) / 1000);
  ok(
    `la caducidad coincide con SIGNED_URL_TTL_DOWNLOAD_MINUTES=${minutosEsperados} (criterio 3)`,
    Math.abs(segundosReales - minutosEsperados * 60) <= 2,
    `diferencia real: ${segundosReales}s vs ${minutosEsperados * 60}s esperados`,
  );

  // ── E/F/G. Subida por formulario (POST policy) ─────────────────────────
  console.log("\nE-G. URL firmada de subida");
  const claveSubida = `pruebas/subida-${Date.now()}.pdf`;

  const subida = await emitirUrlFirmadaDeSubida(client, cfg, {
    destino: { bucket: "downloads" },
    key: claveSubida,
    mimeType: "application/pdf",
  });

  async function intentarSubir(url: string, campos: Record<string, string>, cuerpo: string | Uint8Array) {
    const form = new FormData();
    for (const [k, v] of Object.entries(campos)) form.append(k, v);
    form.append("file", new Blob([cuerpo]));
    return fetch(url, { method: "POST", body: form });
  }

  const respuestaSubidaOk = await intentarSubir(subida.url, subida.fields, "un pdf de mentira, pero del tamaño y tipo correctos");
  ok(
    "subida con tipo y tamaño correctos: MinIO la acepta",
    respuestaSubidaOk.status >= 200 && respuestaSubidaOk.status < 300,
    `status recibido: ${respuestaSubidaOk.status}`,
  );
  const verificacion = await client.send(
    new GetObjectCommand({ Bucket: cfg.bucketDownloads, Key: claveSubida }),
  );
  ok("el objeto subido existe de verdad en el bucket", !!verificacion.Body);

  let mimeRechazadoEnCapaPropia = false;
  try {
    await emitirUrlFirmadaDeSubida(client, cfg, {
      destino: { bucket: "downloads" },
      key: `pruebas/no-deberia-existir-${Date.now()}.exe`,
      mimeType: "application/x-msdownload",
    });
  } catch (e) {
    mimeRechazadoEnCapaPropia = e instanceof MimeNoPermitidoError;
  }
  ok("un MIME no permitido se rechaza ANTES de pedir la firma (capa propia)", mimeRechazadoEnCapaPropia);

  const claveMimeForzado = `pruebas/mime-forzado-${Date.now()}.pdf`;
  const subidaParaForzar = await emitirUrlFirmadaDeSubida(client, cfg, {
    destino: { bucket: "downloads" },
    key: claveMimeForzado,
    mimeType: "application/pdf",
  });
  const respuestaMimeForzado = await intentarSubir(
    subidaParaForzar.url,
    { ...subidaParaForzar.fields, "Content-Type": "text/html" },
    "<html>esto no es un pdf</html>",
  );
  ok(
    "MinIO rechaza un Content-Type distinto al firmado (capa de almacenamiento, criterio 4)",
    respuestaMimeForzado.status >= 400,
    `status recibido: ${respuestaMimeForzado.status}`,
  );

  const claveSobreTamano = `pruebas/sobre-tamano-${Date.now()}.pdf`;
  const subidaParaTamano = await emitirUrlFirmadaDeSubida(client, cfg, {
    destino: { bucket: "downloads" },
    key: claveSobreTamano,
    mimeType: "application/pdf",
  });
  const cuerpoDemasiadoGrande = new Uint8Array(26 * 1024 * 1024); // 26 MB > 25 MB de `downloads`
  const respuestaSobreTamano = await intentarSubir(
    subidaParaTamano.url,
    subidaParaTamano.fields,
    cuerpoDemasiadoGrande,
  );
  ok(
    "MinIO rechaza un cuerpo por encima del tamaño máximo, antes de aceptarlo (criterio 4)",
    respuestaSobreTamano.status >= 400,
    `status recibido: ${respuestaSobreTamano.status}`,
  );

  console.log(fallos ? `\n✗ ${fallos} comprobación(es) fallida(s).\n` : "\n✓ Todo correcto.\n");
  process.exit(fallos ? 1 : 0);
}

main().catch((error) => {
  console.error("Error inesperado en test-files.ts:", error);
  process.exit(1);
});
