/**
 * entregables.ts — Publicar entregables por proyecto (DU-15 · RF-80 · RF-143 ·
 * RF-111 · RNF-25).
 *
 * **REEMITIR CREA UNA VERSIÓN NUEVA Y NO DESTRUYE LA ANTERIOR** (RF-143). Las
 * versiones de un mismo entregable comparten `family_id` y se distinguen por
 * `version`; la anterior **sigue en su sitio y sigue consultable**. No se
 * sobrescribe ni el objeto del bucket: cada versión tiene su propia clave.
 *
 * La razón no es coleccionismo. Un entregable es **trabajo entregado a un
 * cliente**: si la versión 2 corrige un error de la 1, la pregunta «¿qué le
 * dimos en marzo?» tiene que tener respuesta, y sobrescribir la borra. Y si la
 * versión 2 sale mal, sin la 1 no hay a dónde volver.
 *
 * **LA VALIDACIÓN VA ANTES DE LA FIRMA** (RNF-25). `validarSubida` decide tipo
 * y tamaño **antes de emitir la URL**: sin firma no hay escritura posible, así
 * que no existe ninguna ventana en la que un archivo no validado esté en el
 * bucket. Validar al terminar significaría haberlo escrito para luego borrarlo.
 *
 * **LA ATRIBUCIÓN DISTINGUE PERSONA DE CLAVE** (RF-111). Sale de `AuthContext`,
 * no de un parámetro: quien publica no elige cómo se le atribuye.
 *
 * **EL ORIGEN ES ORTOGONAL AL TIPO** (`data_model.md` §3.10, `source`). Un
 * `link` va siempre por enlace y `pdf`/`html`/`md` siempre por archivo, pero un
 * `material` puede ser **un archivo subido O un enlace** —una clase grabada en
 * un host de vídeo (RF-155)—: con enlace, `file_key` queda nulo y `url` lleno;
 * con archivo, al revés. Nunca los dos: un material con archivo y enlace es
 * ambiguo, y se rechaza en vez de adivinar cuál manda. Sin esto, «Clases» no
 * encontraba nunca un vídeo: el formulario solo guardaba la URL de un `link`.
 */
import { and, desc, eq, sql } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import { conAuditoria } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";
import { DELIVERABLE_TYPES, VISIBILITY, deliverable } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { adaptadorDeArchivos, validarSubida, type Destino } from "../files/index.ts";
import { anunciarEntregable } from "../webhooks/index.ts";

import { DatoInvalido } from "./empresas.ts";

export type Entregable = {
  readonly id: string;
  readonly projectId: string;
  readonly organizationId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly version: number;
  readonly familyId: string;
  readonly visibilidad: string;
  readonly claveDeArchivo: string | null;
  readonly url: string | null;
  readonly publicadoEn: string | null;
  readonly publicadoPorTipo: string | null;
  readonly publicadoPor: string | null;
};

export type DatosDeEntregable = {
  readonly projectId: string;
  readonly organizationId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly visibilidad: string;
  /** Para un entregable por enlace: `link`, o `material` sin archivo. Excluyente con el archivo. */
  readonly url?: string | null;
  /** Para un entregable por archivo: lo que hace falta para validar y firmar. */
  readonly archivo?: { readonly nombre: string; readonly mime: string; readonly bytes: number } | null;
  /**
   * La familia a la que pertenece. **Con ella se publica una versión nueva**;
   * sin ella, un entregable nuevo con su propia familia.
   */
  readonly familyId?: string | null;
};

/**
 * El destino de subida que le corresponde a cada tipo. `link` no tiene.
 *
 * Se exporta para que la API de DU-23 use **este** mapa y no escriba el suyo:
 * dos mapas de tipo a bucket es el sitio exacto donde un `html` acaba subido al
 * bucket de los PDF y nadie se entera hasta que el visor no lo encuentra.
 */
export function destinoDe(tipo: string): Destino | null {
  if (tipo === "pdf") return "deliverables:pdf";
  if (tipo === "html") return "deliverables:html";
  if (tipo === "md") return "deliverables:md";
  if (tipo === "material") return "deliverables:material";
  return null;
}

/** La clave del objeto. **Lleva la versión**: dos versiones nunca se pisan. */
function claveDe(familyId: string, version: number, nombre: string): string {
  const limpio = nombre.replace(/[^A-Za-z0-9._-]/g, "-").slice(-80);
  return `${familyId}/v${version}/${limpio}`;
}

/**
 * De dónde sale el contenido (`source`, §3.10): `link` siempre por enlace;
 * `material` por enlace cuando no trae archivo y sí URL; todo lo demás, por
 * archivo. Es la única función que lo decide, y `validar` y la inserción la
 * leen las dos: dos criterios distintos son el sitio exacto donde un material
 * queda con la URL guardada y el `file_key` también.
 */
function origenDe(datos: DatosDeEntregable): "file" | "link" {
  if (datos.tipo === "link") return "link";
  if (datos.tipo === "material" && !datos.archivo && datos.url?.trim()) return "link";
  return "file";
}

/**
 * Solo http(s): un `javascript:` o un `file:` en un entregable es un enlace
 * que se abre en el navegador de un cliente.
 */
function esUrlHttp(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function validar(datos: DatosDeEntregable): string | null {
  if (!datos.projectId) return "proyecto";
  if (!datos.titulo.trim()) return "titulo";
  if (!(DELIVERABLE_TYPES as readonly string[]).includes(datos.tipo)) return "tipo";
  if (!(VISIBILITY as readonly string[]).includes(datos.visibilidad)) return "visibilidad";

  if (origenDe(datos) === "link") {
    const url = datos.url?.trim() ?? "";
    if (!url || !esUrlHttp(url)) return "url";
    return null;
  }

  if (!datos.archivo) return "archivo";
  // Un material con archivo Y enlace es ambiguo: no se adivina cuál manda.
  if (datos.tipo === "material" && datos.url?.trim()) return "url";
  return null;
}

export async function entregables(ctx: AuthContext, projectId?: string): Promise<Entregable[]> {
  exigir(ctx, "deliverable.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select()
      .from(deliverable)
      .where(projectId ? eq(deliverable.projectId, projectId) : sql`true`)
      .orderBy(desc(deliverable.createdAt)),
  );
  return filas.map((f) => ({
    id: f.id,
    projectId: f.projectId,
    organizationId: f.organizationId,
    titulo: f.title,
    tipo: f.type,
    version: f.version,
    familyId: f.familyId,
    visibilidad: f.visibility,
    claveDeArchivo: f.fileKey,
    url: f.url,
    publicadoEn: f.publishedAt?.toISOString() ?? null,
    publicadoPorTipo: f.publishedByType,
    publicadoPor: f.publishedByLabel ?? null,
  }));
}

/**
 * Los entregables que un CLIENTE puede ver: `visibility = 'client'` y nada más
 * (criterio 5, RF-89).
 *
 * Existe como función aparte y no como un parámetro de `entregables()` **a
 * propósito**: un filtro opcional es un filtro que alguien olvida pasar, y el
 * olvido enseña material interno a un cliente. Con dos funciones, la del portal
 * no tiene forma de devolver un `internal` — ni pasándole nada raro.
 */
export async function entregablesDelCliente(
  ctx: AuthContext,
  projectId?: string,
): Promise<Entregable[]> {
  const todos = await entregables(ctx, projectId);
  return todos.filter((e) => e.visibilidad === "client");
}

export type ResultadoDePublicacion = {
  readonly id: string;
  readonly version: number;
  readonly familyId: string;
  /** Para un entregable por archivo: a dónde subirlo. `null` si es por enlace. */
  readonly subida: { readonly url: string; readonly caducaEn: string } | null;
};

export async function publicarEntregable(
  ctx: AuthContext,
  datos: DatosDeEntregable,
): Promise<ResultadoDePublicacion> {
  const id = crypto.randomUUID();
  return conAuditoria(
    ctx,
    {
      accion: "deliverable.publish",
      entidad: "deliverable",
      entidadId: id,
      organizationId: datos.organizationId,
    },
    async () => {
      exigir(ctx, "deliverable.publish");

      const malo = validar(datos);
      if (malo) throw new DatoInvalido(malo);

      const familyId = datos.familyId?.trim() || crypto.randomUUID();

      // La versión sale de lo que ya hay en la familia, no de un contador del
      // formulario: dos publicaciones a la vez no pueden acordar un número.
      const version = await withScope(ctx, async (db) => {
        const filas = (await db.execute(sql`
          SELECT coalesce(max(version), 0) + 1 AS siguiente
            FROM deliverable WHERE family_id = ${familyId}
        `)) as unknown as { siguiente: number }[];
        return Number(filas[0]?.siguiente ?? 1);
      });

      const origen = origenDe(datos);
      let fileKey: string | null = null;
      let subida: ResultadoDePublicacion["subida"] = null;

      if (origen === "file" && datos.archivo) {
        const destino = destinoDe(datos.tipo);
        if (!destino) throw new DatoInvalido("tipo");
        fileKey = claveDe(familyId, version, datos.archivo.nombre);

        /**
         * **ANTES DE LA FIRMA.** Si el tipo o el tamaño no encajan, no se emite
         * URL y no hay forma de escribir en el bucket. El mensaje del rechazo
         * viaja en el campo del error para que el formulario lo señale.
         */
        const veredicto = validarSubida({
          destino,
          mime: datos.archivo.mime,
          bytes: datos.archivo.bytes,
          clave: fileKey,
        });
        if (!veredicto.ok) throw new DatoInvalido(`archivo:${veredicto.motivo}`);

        const firmada = await adaptadorDeArchivos().firmarSubida({
          destino,
          clave: fileKey,
          mime: datos.archivo.mime,
          bytes: datos.archivo.bytes,
        });
        subida = { url: firmada.url, caducaEn: firmada.caducaEn.toISOString() };
      }

      await withScope(ctx, (db) =>
        db.insert(deliverable).values({
          id,
          projectId: datos.projectId,
          organizationId: datos.organizationId,
          title: datos.titulo.trim(),
          type: datos.tipo,
          fileKey,
          // `source` en dos columnas (§3.10): por enlace, `url` y `file_key`
          // nulo; por archivo, al revés. Lo decide `origenDe`, no el tipo.
          url: origen === "link" ? (datos.url ?? "").trim() : null,
          version,
          familyId,
          visibility: datos.visibilidad,
          publishedAt: new Date(),
          // RF-111: sale del contexto, no de un parámetro. Quien publica no
          // elige cómo se le atribuye.
          publishedByType: ctx.actorType,
          publishedById: ctx.actorId,
          publishedByLabel: ctx.actorLabel,
        }),
      );

      /**
       * El evento saliente de DU-12, por fin en su sitio. Va **después** de la
       * escritura y por la función de `lib/webhooks`, que no deja inventarse el
       * payload; no lleva ni el título ni el archivo, porque un webhook que sale
       * de nuestra infraestructura no puede ser la puerta por donde viaja
       * material de un cliente (§10-6).
       */
      await anunciarEntregable({
        deliverableId: id,
        projectId: datos.projectId,
        organizationId: datos.organizationId,
      });

      return { id, version, familyId, subida };
    },
  );
}

/** Las versiones de una familia, de la más nueva a la más vieja (RF-143). */
export async function versionesDe(ctx: AuthContext, familyId: string): Promise<Entregable[]> {
  exigir(ctx, "deliverable.read");
  const todas = await entregables(ctx);
  return todas.filter((e) => e.familyId === familyId).sort((a, b) => b.version - a.version);
}

/**
 * La URL firmada para **descargar** un entregable por archivo.
 *
 * Un `internal` no se descarga desde el portal, y esta función no lo sabe: lo
 * sabe quien la llama, que primero ha pedido la lista con `entregablesDelCliente`.
 * La defensa real de RF-89 es que **el portal nunca ve el identificador** de un
 * `internal`, no que esta función lo adivine.
 */
export async function enlaceDeDescarga(
  ctx: AuthContext,
  id: string,
): Promise<{ url: string; caducaEn: string } | null> {
  exigir(ctx, "deliverable.read");
  const filas = await withScope(ctx, (db) =>
    db.select().from(deliverable).where(and(eq(deliverable.id, id))).limit(1),
  );
  const fila = filas[0];
  if (!fila?.fileKey) return null;
  const firmada = await adaptadorDeArchivos().firmarDescarga({
    bucket: "deliverables",
    clave: fila.fileKey,
    uso: "deliverable",
    nombreDeDescarga: fila.title,
  });
  return { url: firmada.url, caducaEn: firmada.caducaEn.toISOString() };
}
