/**
 * supabase.ts — El puerto de archivos sobre Supabase Storage.
 *
 * POR QUÉ EXISTE, si ya hay un adaptador S3. Supabase Storage habla S3, pero
 * sus claves S3 solo se crean desde el panel: la API de gestión no las expone
 * (comprobado contra la especificación OpenAPI el 2026-09-18). Montar el
 * despliegue sin pasar por una pantalla exigía otra vía, y la REST de Storage
 * con la clave de servicio hace exactamente lo que el puerto pide: firmar
 * descargas, firmar subidas, borrar y comprobar existencia.
 *
 * SIN LISTAR. RF-123 prohíbe enumerar un bucket, y `check-archivos` lo vigila:
 * aquí no hay ninguna llamada a `object/list`. La existencia se comprueba con
 * un HEAD sobre la clave concreta, que es lo mismo que hace `HeadObject`.
 *
 * SIN DEPENDENCIA NUEVA. `fetch` está en el runtime; `@supabase/storage-js`
 * añadiría un paquete para envolver cuatro peticiones HTTP.
 *
 * Se elige con `FILES_DRIVER=supabase`. Sin esa variable manda el adaptador
 * S3, que es el diseño del VPS (`architecture` §7.1) y no cambia.
 */
import { ErrorDeAlmacenamiento, type PuertoDeArchivos, type UrlFirmada } from "./port.ts";
import { ttlEnMinutos, ttlEnSegundos, type UsoDeFirma } from "./ttl.ts";
import { DESTINOS, validarSubida, type Bucket, type Destino } from "./validation.ts";

function exigirVariable(nombre: string): string {
  const v = process.env[nombre];
  if (!v) {
    throw new ErrorDeAlmacenamiento(
      "El almacenamiento de archivos no está disponible.",
      `Falta la variable de entorno ${nombre}. Los nombres están en .env.example.`,
    );
  }
  return v;
}

function nombreDeBucket(bucket: Bucket): string {
  return bucket === "downloads"
    ? exigirVariable("S3_BUCKET_DOWNLOADS")
    : exigirVariable("S3_BUCKET_DELIVERABLES");
}

/** `https://<ref>.supabase.co/storage/v1`, sin barra final. */
function baseDeStorage(): string {
  return `${exigirVariable("SUPABASE_URL").replace(/\/+$/, "")}/storage/v1`;
}

function cabeceras(extra: Record<string, string> = {}): Record<string, string> {
  const clave = exigirVariable("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: clave, Authorization: `Bearer ${clave}`, ...extra };
}

/** Cada segmento de la clave se codifica por separado: las barras son ruta. */
function ruta(clave: string): string {
  return clave.split("/").map(encodeURIComponent).join("/");
}

async function fallo(respuesta: Response, que: string): Promise<never> {
  const cuerpo = await respuesta.text().catch(() => "");
  throw new ErrorDeAlmacenamiento(
    "El almacenamiento de archivos no ha respondido.",
    `${que}: HTTP ${respuesta.status} ${cuerpo.slice(0, 200)}`,
  );
}

function firmada(url: string, uso: UsoDeFirma): UrlFirmada {
  const ttlMinutos = ttlEnMinutos(uso);
  return { url, ttlMinutos, caducaEn: new Date(Date.now() + ttlMinutos * 60_000) };
}

export function adaptadorSupabase(): PuertoDeArchivos {
  return {
    async firmarDescarga({ bucket, clave, uso, nombreDeDescarga }) {
      const base = baseDeStorage();
      const r = await fetch(`${base}/object/sign/${nombreDeBucket(bucket)}/${ruta(clave)}`, {
        method: "POST",
        headers: cabeceras({ "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn: ttlEnSegundos(uso) }),
      });
      if (!r.ok) await fallo(r, `firmar descarga de ${clave}`);
      const { signedURL } = (await r.json()) as { signedURL: string };
      // `download=<nombre>` hace que el navegador guarde el archivo con ese
      // nombre en vez de abrirlo: el equivalente a ResponseContentDisposition.
      const url = new URL(`${base}${signedURL}`);
      if (nombreDeDescarga) url.searchParams.set("download", nombreDeDescarga.replace(/["\\]/g, ""));
      return firmada(url.toString(), uso);
    },

    async firmarSubida({ destino, clave, mime, bytes }) {
      const veredicto = validarSubida({ destino, mime, bytes, clave });
      if (!veredicto.ok) {
        throw new ErrorDeAlmacenamiento(
          veredicto.mensaje,
          `subida rechazada por «${veredicto.motivo}»: destino=${destino} mime=${mime} bytes=${bytes}`,
        );
      }
      const base = baseDeStorage();
      const bucket = nombreDeBucket(DESTINOS[destino as Destino].bucket);
      const r = await fetch(`${base}/object/upload/sign/${bucket}/${ruta(clave)}`, {
        method: "POST",
        headers: cabeceras(),
      });
      if (!r.ok) await fallo(r, `firmar subida de ${clave}`);
      const { url } = (await r.json()) as { url: string };
      // La URL firmada de subida se consume con PUT y el cuerpo del archivo.
      return firmada(`${base}${url}`, "upload");
    },

    async borrar({ bucket, clave }) {
      const r = await fetch(`${baseDeStorage()}/object/${nombreDeBucket(bucket)}/${ruta(clave)}`, {
        method: "DELETE",
        headers: cabeceras(),
      });
      if (!r.ok && r.status !== 404) await fallo(r, `borrar ${clave}`);
    },

    async existe({ bucket, clave }) {
      const r = await fetch(
        `${baseDeStorage()}/object/authenticated/${nombreDeBucket(bucket)}/${ruta(clave)}`,
        { method: "HEAD", headers: cabeceras() },
      );
      if (r.status === 200) return true;
      if (r.status === 404 || r.status === 400) return false;
      throw new ErrorDeAlmacenamiento(
        "No se ha podido comprobar el archivo.",
        `HEAD falló para ${clave}: HTTP ${r.status}`,
      );
    },
  };
}
