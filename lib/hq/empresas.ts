/**
 * empresas.ts — Crear y editar empresas cliente desde HQ (DU-14 · RF-77).
 *
 * **LA AUTORIZACIÓN VA PRIMERO Y LA AUDITORÍA ENVUELVE** (criterio 4). No es
 * orden estético: `conAuditoria` apunta el éxito si la operación sale y apunta
 * el **rechazo** si `exigir()` la para. Escribir primero y comprobar después
 * dejaría filas creadas por quien no podía crearlas; auditar solo el éxito
 * dejaría los intentos sin rastro, que es lo que el criterio pide que no pase.
 */
import { eq } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import { conAuditoria } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";
import { ORG_STATUS, ORG_TYPES, organization } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";

/**
 * Los tipos y estados **NO se declaran aquí**: se reexportan del esquema.
 *
 * Lo intentó esta unidad y lo paró la base de datos en la primera ejecución de
 * la prueba: se escribió `"internal"` donde el vocabulario dice `"slg"`, y la
 * restricción `organization_type_valid` rechazó la fila. Una lista de valores
 * copiada a mano al lado de otra es una lista que se desvía, y el sitio donde
 * se nota es una restricción de integridad a las tres semanas.
 */
export const TIPOS_DE_EMPRESA = ORG_TYPES;
export const ESTADOS_DE_EMPRESA = ORG_STATUS;

export type Empresa = {
  readonly id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly tipo: string;
  readonly estado: string;
  readonly contactoPrincipal: string | null;
  /** El identificador de la empresa en el CRM (D-163). Nulo en las anteriores. */
  readonly crmCompanyId: string | null;
};

export type DatosDeEmpresa = {
  readonly nombre: string;
  readonly slug: string;
  readonly tipo: string;
  readonly estado: string;
  /** El correo de la persona de contacto. Un dato de trabajo, no una cuenta. */
  readonly contactoPrincipal?: string | null;
  /**
   * El identificador de la empresa en el CRM (D-163): es lo que permite al CRM
   * crear aquí sus proyectos. Opcional, porque una empresa puede darse de alta
   * antes de existir en el CRM; único, porque dos empresas de aquí no pueden
   * ser la misma de allí.
   */
  readonly crmCompanyId?: string | null;
};

/** El tope de la columna, el mismo que declara el catálogo de la API v1. */
const CRM_ID_MAXIMO = 200;

/** El slug se normaliza aquí, una vez, y no en cada formulario. */
export function slugDe(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validar(datos: DatosDeEmpresa): string | null {
  if (!datos.nombre.trim()) return "nombre";
  if (!slugDe(datos.slug || datos.nombre)) return "slug";
  if (!(TIPOS_DE_EMPRESA as readonly string[]).includes(datos.tipo)) return "tipo";
  if (!(ESTADOS_DE_EMPRESA as readonly string[]).includes(datos.estado)) return "estado";
  if ((datos.crmCompanyId?.trim().length ?? 0) > CRM_ID_MAXIMO) return "crmCompanyId";
  return null;
}

/**
 * Una violación de unicidad de PostgreSQL, y **de qué campo**. Se reconoce por
 * el código `23505`, que es estable y está documentado; el texto del mensaje no
 * lo es. Desde D-163 hay dos índices únicos en la tabla —el del slug y el del
 * identificador del CRM— y responden con campos distintos, así que se mira el
 * nombre de la restricción: sin nombre, es el slug, que es lo que había.
 */
function campoRepetido(e: unknown): "slug" | "crmCompanyId" | null {
  const mira = (x: unknown): { code?: string; constraint_name?: string } | null =>
    typeof x === "object" && x !== null ? (x as { code?: string; constraint_name?: string }) : null;
  const directo = mira(e);
  const causa = mira((e as { cause?: unknown } | null)?.cause);
  const chocado = directo?.code === "23505" ? directo : causa?.code === "23505" ? causa : null;
  if (!chocado) return null;
  return chocado.constraint_name === "uq_organization_crm_id" ? "crmCompanyId" : "slug";
}

export class DatoInvalido extends Error {
  readonly campo: string;
  constructor(campo: string) {
    super(`dato inválido: ${campo}`);
    this.name = "DatoInvalido";
    this.campo = campo;
  }
}

export async function empresas(ctx: AuthContext): Promise<Empresa[]> {
  exigir(ctx, "org.read");
  const filas = await withScope(ctx, (db) =>
    db.select().from(organization).orderBy(organization.name),
  );
  return filas.map((f) => ({
    id: f.id,
    nombre: f.name,
    slug: f.slug,
    tipo: f.type,
    estado: f.status,
    contactoPrincipal: f.metadata,
    crmCompanyId: f.crmCompanyId,
  }));
}

export async function crearEmpresa(ctx: AuthContext, datos: DatosDeEmpresa): Promise<Empresa> {
  const id = crypto.randomUUID();
  return conAuditoria(ctx, { accion: "org.create", entidad: "organization", entidadId: id }, async () => {
    /**
     * `slg_operator` NO puede crear empresas: su fila de B.3 es «asignados», y
     * una empresa que todavía no existe **no puede estar asignada a nadie**. Se
     * pasa `asignado: false` explícitamente en vez de omitirlo para que se lea
     * el razonamiento, aunque el resultado sea el mismo.
     */
    exigir(ctx, "org.write", { asignado: false });

    const malo = validar(datos);
    if (malo) throw new DatoInvalido(malo);

    const slug = slugDe(datos.slug || datos.nombre);
    const crmCompanyId = datos.crmCompanyId?.trim() || null;
    try {
      await withScope(ctx, (db) =>
        db.insert(organization).values({
          id,
          name: datos.nombre.trim(),
          slug,
          type: datos.tipo,
          status: datos.estado,
          metadata: datos.contactoPrincipal?.trim() || null,
          crmCompanyId,
        }),
      );
    } catch (e) {
      /**
       * **Un slug repetido es un dato inválido, no una avería.** Lo encontró la
       * prueba de esta unidad: sin esto, crear «Cliente Demo» dos veces devolvía
       * un error crudo de PostgreSQL — un 500 en la cara de quien solo había
       * repetido un nombre. Y como el slug se deriva del nombre cuando se deja
       * vacío, repetirlo es lo más fácil del mundo. El identificador del CRM
       * repetido en otra empresa (D-163) es el mismo caso con otro campo.
       */
      const campo = campoRepetido(e);
      if (campo) throw new DatoInvalido(campo);
      throw e;
    }
    return {
      id,
      nombre: datos.nombre.trim(),
      slug,
      tipo: datos.tipo,
      estado: datos.estado,
      contactoPrincipal: datos.contactoPrincipal?.trim() || null,
      crmCompanyId,
    };
  });
}

export async function editarEmpresa(
  ctx: AuthContext,
  id: string,
  datos: DatosDeEmpresa,
  circunstancias: { asignado?: boolean } = {},
): Promise<void> {
  await conAuditoria(
    ctx,
    { accion: "org.update", entidad: "organization", entidadId: id, organizationId: id },
    async () => {
      // Aquí `asignado` SÍ puede ser cierto: quien llama lo resolvió contra la
      // base —la empresa existe y este operador tiene proyectos en ella— antes
      // de preguntar. Sin prueba, la matriz lo trata como «no».
      exigir(ctx, "org.write", circunstancias);

      const malo = validar(datos);
      if (malo) throw new DatoInvalido(malo);

      try {
        await withScope(ctx, (db) =>
          db
            .update(organization)
            .set({
              name: datos.nombre.trim(),
              slug: slugDe(datos.slug || datos.nombre),
              type: datos.tipo,
              status: datos.estado,
              metadata: datos.contactoPrincipal?.trim() || null,
              crmCompanyId: datos.crmCompanyId?.trim() || null,
            })
            .where(eq(organization.id, id)),
        );
      } catch (e) {
        const campo = campoRepetido(e);
        if (campo) throw new DatoInvalido(campo);
        throw e;
      }
    },
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Archivar y reactivar (RF-77 · data_model §2.5 y §4.3)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Archivar es `UPDATE organization SET status = 'archived'` **y nada más**.
 * Los proyectos, los entregables y las pertenencias se quedan donde están:
 * son la prueba de lo que se entregó, y la pertenencia es lo que permite
 * reactivar sin volver a invitar. El acceso de sus miembros al portal lo corta
 * la capa de sesión —`app_memberships_de_usuario` solo devuelve empresas
 * `active`—, no esta función. Lo pidió el uso real: se creó una empresa de
 * prueba y no había forma de quitarla desde la pantalla, aunque el modelo
 * llevaba el estado desde el primer día.
 *
 * **Sin prueba de asignación, a propósito.** Archivar una empresa entera
 * —con los proyectos de otros operadores y el acceso de todos sus miembros—
 * no es «operar sobre un proyecto asignado», que es lo único que la fila
 * «asignados» de B.3 le concede a `slg_operator`. Se pasa `asignado: false`
 * explícitamente, como en `crearEmpresa`, para que se lea la decisión.
 *
 * Devuelve `null` si la empresa no existe para este actor: la política de fila
 * deja el `UPDATE` en cero filas, y cero filas no es una avería.
 */
async function cambiarEstadoDeEmpresa(
  ctx: AuthContext,
  id: string,
  estado: (typeof ORG_STATUS)[number],
  accion: "org.archive" | "org.reactivate",
): Promise<Empresa | null> {
  return conAuditoria(ctx, { accion, entidad: "organization", entidadId: id, organizationId: id }, async () => {
    exigir(ctx, "org.write", { asignado: false });

    const [fila] = await withScope(ctx, (db) =>
      db.update(organization).set({ status: estado }).where(eq(organization.id, id)).returning(),
    );
    if (!fila) return null;
    return {
      id: fila.id,
      nombre: fila.name,
      slug: fila.slug,
      tipo: fila.type,
      estado: fila.status,
      contactoPrincipal: fila.metadata,
      crmCompanyId: fila.crmCompanyId,
    };
  });
}

export async function archivarEmpresa(ctx: AuthContext, id: string): Promise<Empresa | null> {
  return cambiarEstadoDeEmpresa(ctx, id, "archived", "org.archive");
}

export async function reactivarEmpresa(ctx: AuthContext, id: string): Promise<Empresa | null> {
  return cambiarEstadoDeEmpresa(ctx, id, "active", "org.reactivate");
}
