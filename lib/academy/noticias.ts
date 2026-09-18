/**
 * noticias.ts — Noticias con comentario **para una empresa** (DU-30 · RF-150 ·
 * RF-152 · RF-156 · D-161).
 *
 * **UNA NOTICIA ES DE UNA EMPRESA, Y EL COMENTARIO ES EL PRODUCTO.** `summary_md`
 * es la noticia; `comment_md` es lo que esa noticia significa para ESA empresa.
 * Por eso no hay «noticia global» ni se comparte: la misma noticia para dos
 * empresas son dos comentarios distintos, es decir, dos filas. Y nunca se lista
 * fuera de la empresa (RF-150): lo garantiza la política de fila, y aquí no hay
 * ningún `WHERE` que intente sustituirla.
 *
 * **LA IMPORTANCIA ES EDITORIAL** (D-161). La fija quien escribe —Hermes por la
 * API o Ricardo desde HQ—, 1 es «lo primero», y no se calcula de nada. El orden
 * de «Hoy» (RF-149) sale de ese número y después de la fecha.
 *
 * **PUBLICADA ⇔ CON AUTOR.** Lo impone `news_item_published_needs_author` en la
 * base: una noticia no sale al portal sin que conste quién la puso. El autor
 * sale del contexto (RF-111), nunca de un parámetro. El Markdown se guarda tal
 * cual y se sanea al renderizar (RNF-31), como el cuerpo de un aviso.
 */
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import type { AuthContext } from "../db/context.ts";
import { cruzaEmpresas } from "../db/context.ts";
import { NEWS_IMPORTANCE, newsItem, organization, project } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { DatoInvalido } from "../hq/empresas.ts";

import { conApunte, esUrlHttp, MAXIMO_TEXTO, MAXIMO_TITULO, MAXIMO_URL } from "./comun.ts";

export type Importancia = (typeof NEWS_IMPORTANCE)[number];

export type Noticia = {
  readonly id: string;
  readonly organizationId: string;
  readonly titulo: string;
  readonly fuenteUrl: string | null;
  readonly resumenMd: string;
  readonly comentarioMd: string;
  readonly importancia: Importancia;
  readonly publicadaEn: string | null;
  readonly autorTipo: string | null;
  readonly autorId: string | null;
  readonly autor: string | null;
  readonly creadaEn: string;
};

export type DatosDeNoticia = {
  readonly organizationId: string;
  readonly titulo: string;
  readonly fuenteUrl?: string | null;
  readonly resumenMd: string;
  readonly comentarioMd: string;
  readonly importancia: Importancia;
  /**
   * Obligatorio y sin defecto, como en los avisos: que un cliente vea o no vea
   * algo no es una decisión que se pueda olvidar.
   */
  readonly publicar: boolean;
};

function validar(datos: DatosDeNoticia): string | null {
  if (!datos.organizationId) return "empresa";
  const titulo = datos.titulo?.trim() ?? "";
  if (!titulo || titulo.length > MAXIMO_TITULO) return "titulo";
  if (!datos.resumenMd?.trim() || datos.resumenMd.length > MAXIMO_TEXTO) return "resumen";
  if (!datos.comentarioMd?.trim() || datos.comentarioMd.length > MAXIMO_TEXTO) return "comentario";
  if (!(NEWS_IMPORTANCE as readonly number[]).includes(datos.importancia)) return "importancia";
  if (datos.fuenteUrl && (datos.fuenteUrl.length > MAXIMO_URL || !esUrlHttp(datos.fuenteUrl))) return "fuente";
  if (typeof datos.publicar !== "boolean") return "publicar";
  return null;
}

/**
 * La prueba de «asignados» para una noticia, que es de una empresa y no de un
 * proyecto: un `slg_operator` escribe noticias para las empresas donde tiene
 * algún proyecto asignado. Se resuelve contra la base, con el contexto del
 * propio actor, y sin prueba el silencio vale «no» (`lib/hq/proyectos.ts`).
 */
async function tieneProyectoEn(ctx: AuthContext, organizationId: string): Promise<boolean> {
  if (ctx.actorType !== "user") return false;
  const filas = await withScope(ctx, (db) =>
    db
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.organizationId, organizationId), eq(project.ownerUserId, ctx.actorId)))
      .limit(1),
  );
  return filas.length > 0;
}

function aNoticia(f: typeof newsItem.$inferSelect): Noticia {
  return {
    id: f.id,
    organizationId: f.organizationId,
    titulo: f.title,
    fuenteUrl: f.sourceUrl,
    resumenMd: f.summaryMd,
    comentarioMd: f.commentMd,
    importancia: f.importance as Importancia,
    publicadaEn: f.publishedAt?.toISOString() ?? null,
    autorTipo: f.authorType,
    autorId: f.authorId,
    autor: f.authorLabel,
    creadaEn: f.createdAt.toISOString(),
  };
}

/**
 * Las noticias, primero las importantes y después las recientes: el orden de
 * «Hoy». Sin `soloPublicadas`, HQ ve también los borradores.
 */
export async function noticias(
  ctx: AuthContext,
  filtros: { organizationId?: string; soloPublicadas?: boolean; limite?: number } = {},
): Promise<Noticia[]> {
  exigir(ctx, "news.read");
  const filas = await withScope(ctx, (db) => {
    const q = db
      .select()
      .from(newsItem)
      .where(
        and(
          filtros.organizationId ? eq(newsItem.organizationId, filtros.organizationId) : undefined,
          filtros.soloPublicadas ? isNotNull(newsItem.publishedAt) : undefined,
        ),
      )
      .orderBy(asc(newsItem.importance), desc(newsItem.publishedAt), desc(newsItem.createdAt));
    return filtros.limite && filtros.limite > 0 ? q.limit(filtros.limite) : q;
  });
  return filas.map(aNoticia);
}

export async function crearNoticia(ctx: AuthContext, datos: DatosDeNoticia): Promise<Noticia> {
  const id = crypto.randomUUID();
  const asignado = await tieneProyectoEn(ctx, datos.organizationId);
  return conApunte(
    ctx,
    { accion: "news.create", entidad: "news_item", entidadId: id, organizationId: datos.organizationId },
    async () => {
      exigir(ctx, "news.write", { asignado });

      const malo = validar(datos);
      if (malo) throw new DatoInvalido(malo);

      /**
       * La empresa se verifica, no se cree. `organization` no está bajo política
       * de fila —es la tabla de las empresas mismas—, así que la comprobación es
       * explícita: existe, y si el actor tiene una sola empresa, es la suya.
       */
      const empresas = await withScope(ctx, (db) =>
        db.select({ id: organization.id }).from(organization).where(eq(organization.id, datos.organizationId)).limit(1),
      );
      /**
       * «Ajena» solo tiene sentido para quien NO cruza empresas. Un actor de SLG
       * lleva en el contexto la empresa de SLG —es su pertenencia— y escribe
       * para clientes precisamente porque cruza: comparar su `organizationId`
       * con la del cliente lo rechazaba siempre (lo encontró `test:gestion` en
       * CI, no una lectura). La prueba de asignación ya la hizo `exigir` arriba.
       */
      const ajena = !cruzaEmpresas(ctx) && ctx.organizationId !== datos.organizationId;
      if (empresas.length === 0 || ajena) throw new DatoInvalido("empresa");

      const publicadaEn = datos.publicar ? new Date() : null;
      const [fila] = await withScope(ctx, (db) =>
        db
          .insert(newsItem)
          .values({
            id,
            organizationId: datos.organizationId,
            title: datos.titulo.trim(),
            sourceUrl: datos.fuenteUrl?.trim() || null,
            summaryMd: datos.resumenMd,
            commentMd: datos.comentarioMd,
            importance: datos.importancia,
            publishedAt: publicadaEn,
            // Del contexto, no de un parámetro (RF-111). Sin publicar no hay
            // autor: lo impone la base, y aquí se respeta.
            authorType: datos.publicar ? ctx.actorType : null,
            authorId: datos.publicar ? ctx.actorId : null,
            authorLabel: datos.publicar ? ctx.actorLabel : null,
          })
          .returning(),
      );
      if (!fila) throw new DatoInvalido("empresa");
      return aNoticia(fila);
    },
  );
}
