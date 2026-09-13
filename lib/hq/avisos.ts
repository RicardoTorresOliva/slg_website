/**
 * avisos.ts — Avisos dirigidos a **una empresa** (DU-15 · RF-81 · RNF-31).
 *
 * **UN AVISO ES SIEMPRE DE UNA EMPRESA.** `organization_id` es `NOT NULL` en el
 * esquema y aquí es obligatorio: no hay «aviso global». La razón es de
 * aislamiento, no de producto — un aviso sin empresa es una fila que la política
 * de fila no sabe acotar, y la primera consulta que la incluya se la enseña a
 * todo el mundo. Si algún día hace falta un aviso para todos, se publica uno por
 * empresa: más filas, cero ambigüedad.
 *
 * **EL MARKDOWN SE SANEA AL RENDERIZARSE, NO AL GUARDARSE** (RNF-31). Se guarda
 * el texto tal como se escribió —es lo que la persona quiso decir, y una
 * limpieza en la escritura se pierde para siempre— y el componente `Markdown`
 * **no produce HTML arbitrario**: construye elementos de React, así que un
 * `<script>` dentro del cuerpo sale como texto. Desde DU-15 restringe además el
 * esquema de los enlaces, porque aquí el Markdown ya no viene del repositorio:
 * lo escribe una persona en un formulario y lo lee un cliente.
 */
import { desc, eq } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import { conAuditoria } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";
import { announcement } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { anunciarAviso } from "../webhooks/index.ts";

import { DatoInvalido } from "./empresas.ts";

export type Aviso = {
  readonly id: string;
  readonly organizationId: string;
  readonly titulo: string;
  readonly cuerpoMd: string;
  /** El idioma EN QUE SE ESCRIBIÓ (RF-72). Lo usa `lang` en el portal. */
  readonly idioma: string;
  readonly publicadoEn: string | null;
  readonly autorTipo: string | null;
  readonly autor: string | null;
};

export type DatosDeAviso = {
  readonly organizationId: string;
  readonly titulo: string;
  readonly cuerpoMd: string;
  /**
   * En qué idioma está escrito. **Lo elige quien publica**, no se deduce del
   * idioma de su interfaz: alguien con la interfaz en español escribe a un
   * cliente internacional en inglés continuamente.
   */
  readonly idioma: string;
};

const MAXIMO_CUERPO = 20_000;

function validar(datos: DatosDeAviso): string | null {
  if (!datos.organizationId) return "empresa";
  if (!datos.titulo.trim()) return "titulo";
  if (!datos.cuerpoMd.trim()) return "cuerpo";
  // Un tope generoso, pero tope: un aviso no es un entregable, y un cuerpo sin
  // límite es una columna de texto que alguien acaba usando de almacén.
  if (datos.cuerpoMd.length > MAXIMO_CUERPO) return "cuerpo";
  if (datos.idioma !== "es" && datos.idioma !== "en") return "idioma";
  return null;
}

export async function avisos(ctx: AuthContext, organizationId?: string): Promise<Aviso[]> {
  exigir(ctx, "announcement.read");
  const filas = await withScope(ctx, (db) => {
    const q = db.select().from(announcement).orderBy(desc(announcement.createdAt));
    return organizationId ? q.where(eq(announcement.organizationId, organizationId)) : q;
  });
  return filas.map((f) => ({
    id: f.id,
    organizationId: f.organizationId,
    titulo: f.title,
    cuerpoMd: f.bodyMd,
    idioma: f.locale,
    publicadoEn: f.publishedAt?.toISOString() ?? null,
    autorTipo: f.authorType,
    autor: f.authorLabel,
  }));
}

export async function publicarAviso(ctx: AuthContext, datos: DatosDeAviso): Promise<string> {
  const id = crypto.randomUUID();
  return conAuditoria(
    ctx,
    {
      accion: "announcement.publish",
      entidad: "announcement",
      entidadId: id,
      organizationId: datos.organizationId,
    },
    async () => {
      exigir(ctx, "announcement.publish");

      const malo = validar(datos);
      if (malo) throw new DatoInvalido(malo);

      await withScope(ctx, (db) =>
        db.insert(announcement).values({
          id,
          organizationId: datos.organizationId,
          title: datos.titulo.trim(),
          bodyMd: datos.cuerpoMd,
          locale: datos.idioma,
          publishedAt: new Date(),
          // Como en los entregables (RF-111): del contexto, no de un parámetro.
          authorType: ctx.actorType,
          authorId: ctx.actorId,
          authorLabel: ctx.actorLabel,
        }),
      );
      // Como el entregable: el evento va después de la escritura y sin llevar
      // el cuerpo del aviso.
      await anunciarAviso({ announcementId: id, organizationId: datos.organizationId });

      return id;
    },
  );
}
