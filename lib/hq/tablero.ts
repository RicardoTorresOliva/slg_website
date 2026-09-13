/**
 * tablero.ts — El tablero de HQ, **bloque a bloque y degradando de uno en uno**
 * (DU-13).
 *
 * LA DECISIÓN QUE GOBIERNA ESTE ARCHIVO: **cada bloque se resuelve por separado
 * y su fallo se queda dentro del bloque**. Un `Promise.all` que lanza deja la
 * pantalla entera en blanco porque el CRM tardó; el criterio 8 pide lo
 * contrario, con todas las letras: «el tablero **se degrada** mostrando lo
 * propio y señalando el fallo, **no una pantalla en blanco**». Así que cada
 * bloque devuelve o su contenido o su motivo, y la pantalla pinta lo que haya.
 *
 * Es la diferencia entre «el CRM no responde» —que es información útil, y el
 * resto del tablero sigue sirviendo para trabajar— y «HQ está caído», que es lo
 * que parece cuando no se ve nada.
 *
 * LO QUE NO HAY AQUÍ, y tiene que seguir sin haber (RF-85, frontera (a)): ni
 * etapas, ni oportunidades, ni propietarios de lead, ni previsiones. Ninguna
 * función de este archivo escribe en el CRM. Lo vigila `check:hq`.
 */
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { articulos, prefijo } from "../content/blog.ts";
import { loadCollection } from "../content/loader.ts";
import { modoActivo } from "../crm/cola.ts";
import type { AuthContext } from "../db/context.ts";
import { agentEvent, auditLog, deliverable, organization, project } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";

import { capturasDeHq, capturasQuePidenOportunidad, type CapturaDeHq, type Filtro } from "./capturas.ts";
import { metricasDelCrm, urlDelCrm, type Metricas } from "./metricas.ts";

/**
 * Un bloque: o trae contenido, o trae el motivo por el que no. **Nunca las dos
 * cosas y nunca ninguna**, para que la pantalla no tenga que adivinar si un
 * array vacío es «no hay nada» o «no se pudo leer» — que son dos de los seis
 * estados canónicos y se pintan distinto.
 */
export type Bloque<T> = { readonly ok: true; readonly datos: T } | { readonly ok: false; readonly motivo: string };

async function bloque<T>(fn: () => Promise<T>): Promise<Bloque<T>> {
  try {
    return { ok: true, datos: await fn() };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message.slice(0, 200) };
  }
}

export type ArticuloDeHq = {
  readonly slug: string;
  readonly idioma: string;
  readonly titulo: string;
  readonly fecha: string;
  /** `true` cuando `status: draft`. Se muestra en HQ y en ninguna parte más (RF-22). */
  readonly borrador: boolean;
  readonly url: string | null;
  /** Listos para copiar (RF-25). Vacíos si el frontmatter no los trae. */
  readonly social: { readonly hook: string; readonly linkedin: string; readonly x: string };
};

export type Tablero = {
  readonly capturas: Bloque<readonly CapturaDeHq[]>;
  readonly metricas: Bloque<Metricas>;
  readonly empresas: Bloque<readonly { id: string; nombre: string; tipo: string }[]>;
  readonly proyectos: Bloque<readonly { id: string; nombre: string; empresa: string; estado: string }[]>;
  readonly entregables: Bloque<readonly { id: string; titulo: string; tipo: string; publicadoEn: string | null }[]>;
  readonly articulos: Bloque<readonly ArticuloDeHq[]>;
  readonly agentes: Bloque<readonly { id: string; tipo: string; creadoEn: string }[]>;
  readonly auditoria: Bloque<readonly { id: string; actor: string; accion: string; entidad: string; creadoEn: string }[]>;
  /** El modo del adaptador, visible sin abrir el panel de despliegue (criterio 7). */
  readonly captura: Bloque<{ readonly modo: string; readonly pidenOportunidad: number }>;
  readonly urlDelCrm: string | null;
};

const RECIENTES = 10;

/** Los artículos de los dos idiomas, publicados y borradores (RF-22, RF-25). */
function articulosDeHq(): ArticuloDeHq[] {
  const salida: ArticuloDeHq[] = [];
  for (const lang of ["es", "en"] as const) {
    // Los publicados salen de `articulos()`, que ya normaliza fecha y social.
    for (const a of articulos(lang)) {
      salida.push({
        slug: a.slug,
        idioma: lang,
        titulo: a.titulo,
        fecha: a.fecha,
        borrador: false,
        url: `${prefijo(lang)}/blog/${a.slug}`,
        social: a.social,
      });
    }
    /**
     * Los BORRADORES hay que leerlos del cargador en crudo: `articulos()`
     * filtra por `status: published` a propósito —es la garantía de RF-138— y
     * pedirle que los devuelva sería abrir la puerta por la que un borrador
     * acaba servido en la web. HQ los lee aparte, que es lo que RF-22 pide.
     */
    for (const p of loadCollection<{
      title: string;
      date: string | Date;
      status?: string;
      social?: { hook?: string; linkedin?: string; x?: string };
    }>("post", lang)) {
      if (p.data.status === "published") continue;
      salida.push({
        slug: p.slug,
        idioma: lang,
        titulo: p.data.title,
        fecha: p.data.date instanceof Date ? p.data.date.toISOString().slice(0, 10) : String(p.data.date).slice(0, 10),
        borrador: true,
        // Sin URL, y no por olvido: un borrador NO se sirve en ninguna ruta
        // pública, así que darle un enlace sería ofrecer un 404.
        url: null,
        social: {
          hook: p.data.social?.hook ?? "",
          linkedin: p.data.social?.linkedin ?? "",
          x: p.data.social?.x ?? "",
        },
      });
    }
  }
  return salida.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function tableroDeHq(ctx: AuthContext, filtro: Filtro = {}): Promise<Tablero> {
  // Se lanzan a la vez y se esperan juntos: son independientes, y encadenarlos
  // sumaría las latencias de ocho consultas y tres llamadas HTTP.
  const [capturas, metricas, empresas, proyectos, entregables, arts, agentes, auditoria, captura] =
    await Promise.all([
      bloque(() => capturasDeHq(ctx, filtro)),
      bloque(() => metricasDelCrm()),
      bloque(() =>
        withScope(ctx, (db) =>
          db
            .select({ id: organization.id, nombre: organization.name, tipo: organization.type })
            .from(organization)
            .where(eq(organization.status, "active"))
            .orderBy(organization.name),
        ),
      ),
      bloque(() =>
        withScope(ctx, (db) =>
          db
            .select({
              id: project.id,
              nombre: project.name,
              empresa: organization.name,
              estado: project.status,
            })
            .from(project)
            .innerJoin(organization, eq(project.organizationId, organization.id))
            .orderBy(desc(project.createdAt))
            .limit(RECIENTES),
        ),
      ),
      bloque(() =>
        withScope(ctx, (db) =>
          db
            .select({
              id: deliverable.id,
              titulo: deliverable.title,
              tipo: deliverable.type,
              publicadoEn: deliverable.publishedAt,
            })
            .from(deliverable)
            .where(and(isNotNull(deliverable.publishedAt)))
            .orderBy(desc(deliverable.publishedAt))
            .limit(RECIENTES),
        ).then((filas) =>
          filas.map((f) => ({ ...f, publicadoEn: f.publicadoEn?.toISOString() ?? null })),
        ),
      ),
      bloque(async () => articulosDeHq()),
      bloque(() =>
        withScope(ctx, (db) =>
          db
            .select({ id: agentEvent.id, tipo: agentEvent.kind, creadoEn: agentEvent.createdAt })
            .from(agentEvent)
            .orderBy(desc(agentEvent.createdAt))
            .limit(RECIENTES),
        ).then((filas) => filas.map((f) => ({ ...f, creadoEn: f.creadoEn.toISOString() }))),
      ),
      bloque(() =>
        withScope(ctx, (db) =>
          db
            .select({
              id: auditLog.id,
              actor: auditLog.actorLabel,
              accion: auditLog.action,
              entidad: auditLog.entity,
              creadoEn: auditLog.createdAt,
            })
            .from(auditLog)
            .orderBy(desc(auditLog.createdAt))
            .limit(RECIENTES),
        ).then((filas) =>
          filas.map((f) => ({ ...f, actor: f.actor ?? "—", creadoEn: f.creadoEn.toISOString() })),
        ),
      ),
      bloque(async () => ({
        modo: modoActivo(),
        pidenOportunidad: await capturasQuePidenOportunidad(ctx),
      })),
    ]);

  return {
    capturas,
    metricas,
    empresas,
    proyectos,
    entregables,
    articulos: arts,
    agentes,
    auditoria,
    captura,
    urlDelCrm: urlDelCrm(),
  };
}
