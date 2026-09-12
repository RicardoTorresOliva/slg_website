import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { buscarDocumento } from "@/lib/content/downloads";
import { withSystemScope } from "@/lib/db/scope";
import { downloadEvent } from "@/lib/db/schema";
import { crearClienteS3, emitirUrlFirmadaDeDescarga, leerFilesConfig } from "@/lib/files";
import { localeDeRuta } from "@/lib/routes/map";

/**
 * Entrega del archivo (DU-08, RF-38 y RF-41).
 *
 * Esta ruta existe por dos razones que la hacen distinta de enlazar la URL
 * firmada directamente:
 *
 * 1. **Registra el instante de finalización** (criterio 8). La emisión ya
 *    quedó anotada al capturar; sin este paso, `completed_at` no se llenaría
 *    nunca y la métrica diría cuántas URLs se emitieron, no cuántas descargas
 *    ocurrieron — que no es lo mismo ni de lejos.
 * 2. **La firma se emite al pulsar**, no al cargar `/gracias`. Una firma
 *    emitida en el renderizado empieza a caducar mientras el visitante lee la
 *    página.
 *
 * El archivo nunca se sirve desde aquí: se responde con una redirección a la
 * URL firmada del almacenamiento, que es el único camino al objeto (RF-38).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ evento: string }> },
) {
  const { evento: eventoId } = await params;
  const locale = localeDeRuta(new URL(request.url).searchParams.get("desde") ?? "/");

  const evento = await withSystemScope(
    "entrega de archivo por URL firmada al visitante que capturó el lead (RF-38, RF-41)",
    async (db) => {
      const [fila] = await db
        .select({
          id: downloadEvent.id,
          slug: downloadEvent.downloadSlug,
          // Vigencia según el reloj de la base de datos, no el del proceso web.
          vigente: sql<boolean>`${downloadEvent.signedUrlExpiresAt} > now()`,
        })
        .from(downloadEvent)
        .where(eq(downloadEvent.id, eventoId))
        .limit(1);
      return fila ?? null;
    },
  );

  if (!evento) return NextResponse.json({ error: "no_encontrado" }, { status: 404 });
  if (!evento.vigente) return NextResponse.json({ error: "caducado" }, { status: 410 });

  const documento = buscarDocumento(evento.slug, locale) ?? buscarDocumento(evento.slug, "es");
  if (!documento?.claveDeArchivo) {
    return NextResponse.json({ error: "sin_archivo" }, { status: 404 });
  }

  const cfg = leerFilesConfig();
  const { url } = await emitirUrlFirmadaDeDescarga(crearClienteS3(cfg), cfg, {
    bucket: "downloads",
    key: documento.claveDeArchivo,
  });

  // Solo la PRIMERA finalización marca la hora: si el visitante vuelve a
  // pulsar, la métrica seguiría diciendo cuándo se descargó de verdad.
  await withSystemScope("marca de descarga completada (RF-41)", async (db) => {
    await db
      .update(downloadEvent)
      .set({ completedAt: new Date() })
      .where(and(eq(downloadEvent.id, eventoId), isNull(downloadEvent.completedAt)));
  });

  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
