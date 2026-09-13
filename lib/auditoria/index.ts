/**
 * `lib/auditoria` — el registro de quién hizo qué, **y de quién intentó qué**.
 *
 * LO SEGUNDO ES LO QUE LA MAYORÍA DE REGISTROS NO TIENEN, y es lo que el
 * criterio 4 de DU-14 pide con todas las letras: los intentos de un
 * `slg_operator` de crear claves, invitar usuarios SLG o ver auditoría «se
 * **rechazan en el servidor** y **se auditan**». Un registro que solo anota los
 * éxitos contesta «¿quién borró esto?» y no contesta **«¿alguien ha estado
 * probando puertas?»**, que es la pregunta que avisa antes de que pase algo.
 *
 * `audit_log` es de **solo inserción**: la migración 0002 le quita a la
 * aplicación `UPDATE`, `DELETE` y `TRUNCATE`. Un registro que se puede editar
 * no es un registro, y quien consiguiera entrar no podría borrar su rastro ni
 * teniendo la conexión de la aplicación.
 *
 * **NUNCA LANZA.** Si la escritura del registro fallara y propagara, un fallo
 * del registro tumbaría la operación que estaba registrando — y en el caso del
 * rechazo sería peor todavía: convertiría un 404 limpio en un 500 que **sí**
 * confirma que la ruta existe.
 */
import { ErrorDeAutorizacion } from "../auth/matriz.ts";
import { auditLog } from "../db/schema.ts";
import { withSystemScope } from "../db/scope.ts";
import type { AuthContext } from "../db/context.ts";

export type Apunte = {
  /** Qué se hizo: `org.create`, `project.update`, `invitation.revoke`… */
  readonly accion: string;
  /** Sobre qué tipo de cosa: `organization`, `project`, `invitation`. */
  readonly entidad: string;
  readonly entidadId?: string | null;
  readonly organizationId?: string | null;
  readonly ip?: string | null;
};

async function escribir(ctx: AuthContext, apunte: Apunte): Promise<void> {
  try {
    await withSystemScope(
      "registro de auditoría: la fila describe al actor, no pertenece a su empresa, " +
        "y tiene que escribirse aunque el actor no tuviera permiso sobre el recurso.",
      async (db) => {
        await db.insert(auditLog).values({
          id: crypto.randomUUID(),
          actorType: ctx.actorType,
          actorId: ctx.actorId,
          actorLabel: ctx.actorLabel,
          action: apunte.accion,
          entity: apunte.entidad,
          entityId: apunte.entidadId ?? null,
          organizationId: apunte.organizationId ?? null,
          ip: apunte.ip ?? null,
        });
      },
    );
  } catch {
    // Deliberado: ver la cabecera. Un fallo del registro no puede convertirse
    // en un fallo de lo registrado.
  }
}

/** Lo que ocurrió. */
export async function auditar(ctx: AuthContext, apunte: Apunte): Promise<void> {
  await escribir(ctx, apunte);
}

/**
 * Lo que **se intentó y se rechazó**.
 *
 * La acción se guarda con el sufijo `.denied` en vez de en una columna aparte:
 * así una sola consulta por `action LIKE '%.denied'` saca todos los intentos, y
 * el histórico de una acción concreta —éxitos y rechazos— se lee de una pasada
 * sin unir dos tablas ni dos formatos.
 */
export async function auditarRechazo(ctx: AuthContext, apunte: Apunte): Promise<void> {
  await escribir(ctx, { ...apunte, accion: `${apunte.accion}.denied` });
}

/**
 * Envuelve una operación: la audita si sale bien y **audita el rechazo** si la
 * autorización la para.
 *
 * Existe para que ningún sitio pueda acordarse de auditar el éxito y olvidarse
 * del rechazo, que es el olvido natural — el rechazo es el camino que nadie
 * prueba a mano.
 */
export async function conAuditoria<T>(
  ctx: AuthContext,
  apunte: Apunte,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const salida = await fn();
    await auditar(ctx, apunte);
    return salida;
  } catch (e) {
    /**
     * **Solo el rechazo de autorización se apunta como rechazo.** Un fallo de
     * base de datos o una restricción violada no son «alguien probando
     * puertas»: apuntarlos igual llenaría el registro de ruido y haría inútil
     * la consulta por `.denied`, que existe precisamente para ver los intentos.
     */
    if (e instanceof ErrorDeAutorizacion) await auditarRechazo(ctx, apunte);
    throw e;
  }
}

/**
 * El apunte de **una llamada a `/api/v1`**, que devuelve su identificador
 * (DU-22 · `api_contracts` §2.8 · RF-107).
 *
 * **DEVOLVER EL IDENTIFICADOR ES EL PUNTO.** El `request_id` que viaja en la
 * cabecera `X-Request-Id` de toda respuesta y en el cuerpo de todo error **es
 * esta fila**. Así, cuando un agente dice «me falló la llamada
 * `aud_01J9…`», Ricardo la encuentra en HQ sin que el agente tenga que
 * describirla y sin que la respuesta haya tenido que contar nada de dentro
 * (RNF-32).
 *
 * **NUNCA LANZA, Y AUN ASÍ SIEMPRE DEVUELVE UN IDENTIFICADOR.** Si la escritura
 * fallara, la petición no puede convertirse en un 500 por culpa del registro —y
 * menos en la ruta del 401, donde un 500 confirmaría que la ruta existe—. Se
 * devuelve el identificador que se había generado: no habrá fila que buscar,
 * pero la respuesta sigue siendo correcta y el fallo del registro se ve en los
 * registros del proceso, que es donde se mira.
 *
 * `actorType` llega como `system` cuando la clave no se pudo resolver: el 401
 * también se audita, y la fila no puede mentir diciendo que había una clave.
 */
export async function auditarLlamadaDeApi(
  quien: {
    readonly actorType: "api_key" | "system";
    readonly actorId: string | null;
    readonly actorLabel: string | null;
  },
  apunte: Apunte & { readonly metadata?: Record<string, unknown> },
): Promise<string> {
  const id = crypto.randomUUID();
  try {
    await withSystemScope(
      "DU-22 · toda llamada a /api/v1 se audita, incluidas las que acaban en 401, " +
        "403 y 429: el registro describe al actor, no pertenece a su empresa.",
      async (db) => {
        await db.insert(auditLog).values({
          id,
          actorType: quien.actorType,
          actorId: quien.actorId,
          actorLabel: quien.actorLabel,
          action: apunte.accion,
          entity: apunte.entidad,
          entityId: apunte.entidadId ?? null,
          organizationId: apunte.organizationId ?? null,
          ip: apunte.ip ?? null,
          metadata: apunte.metadata ?? null,
        });
      },
    );
  } catch {
    // Ver la cabecera: el identificador se devuelve igual.
  }
  return id;
}
