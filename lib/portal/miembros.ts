/**
 * miembros.ts — Los miembros de **la empresa del usuario** (DU-21 · RF-92).
 *
 * **NO RECIBE NINGÚN `organization_id`, TAMPOCO PARA INVITAR** (D-127). Es la
 * diferencia entre esta puerta y la de HQ: `invitarACliente()` de `lib/hq`
 * **tiene** que aceptar la empresa como parámetro porque un operador de SLG
 * invita a empresas que no son la suya; aquí ese parámetro no existe, y por eso
 * «un `client_admin` no puede invitar a ninguna otra empresa» no depende de que
 * nadie se acuerde de comprobarlo: **no hay dónde escribir la otra empresa**.
 *
 * La comprobación de verdad sigue estando debajo, en `exigirAlcanceDeLaInvitación`
 * de FU-07, que rechaza con 404 al actor de cliente que apunte fuera de su
 * empresa. Dos capas: una que hace el intento inexpresable desde esta pantalla y
 * otra que lo rechaza aunque llegue por otro sitio. `test:miembros` prueba las
 * dos por separado, porque una sola probada es una sola que existe.
 *
 * **VER Y PODER SON DOS COSAS** (criterio 2). La lista se gobierna con
 * `member.read`, que tienen los dos roles de cliente; invitar se gobierna con
 * `member.invite`, que solo tiene `client_admin`. Con una sola acción, la
 * pantalla se le escondería entera a `client_member` — que es justo a quien el
 * criterio dice que hay que enseñársela.
 */
import { and, eq } from "drizzle-orm";

import { conAuditoria } from "../auditoria/index.ts";
import { exigir } from "../auth/matriz.ts";
import type { AuthContext } from "../db/context.ts";
import { invitation, membership, user } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { emitirInvitacion } from "../invitations/index.ts";

export type MiembroDeLaEmpresa = {
  readonly userId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: string;
};

export type InvitacionPendiente = {
  readonly id: string;
  readonly correo: string;
  readonly rol: string;
  readonly caducaEn: string;
};

/** Quién más está. La consulta arranca de `membership`, que sí está bajo política de fila. */
export async function miembrosDeLaEmpresa(ctx: AuthContext): Promise<MiembroDeLaEmpresa[]> {
  exigir(ctx, "member.read");
  return withScope(ctx, (db) =>
    db
      .select({
        userId: membership.userId,
        nombre: user.name,
        correo: user.email,
        rol: membership.orgRole,
      })
      .from(membership)
      .innerJoin(user, eq(user.id, membership.userId))
      .orderBy(membership.createdAt),
  );
}

/**
 * Las invitaciones que todavía no se han canjeado (criterio 7).
 *
 * Se enseñan **a los dos roles**: un miembro que ve «hay una invitación a
 * alguien que aún no ha entrado» entiende por qué esa persona no aparece en la
 * lista. Esconderlo produce la pregunta «¿se le invitó o no?», que acaba en un
 * correo a SLG.
 */
export async function invitacionesDeLaEmpresa(ctx: AuthContext): Promise<InvitacionPendiente[]> {
  exigir(ctx, "member.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select({
        id: invitation.id,
        correo: invitation.email,
        rol: invitation.role,
        caducaEn: invitation.expiresAt,
      })
      .from(invitation)
      .where(and(eq(invitation.status, "pending")))
      .orderBy(invitation.expiresAt),
  );
  return filas.map((f) => ({
    id: f.id,
    correo: f.correo,
    rol: f.rol,
    caducaEn: f.caducaEn.toISOString(),
  }));
}

export class MiembroInvalido extends Error {
  // Sin propiedad de parámetro: Node ejecuta estos archivos quitando tipos, sin
  // compilarlos, y `constructor(readonly campo)` no sobrevive a eso.
  readonly campo: string;
  constructor(campo: string) {
    super(`dato inválido: ${campo}`);
    this.name = "MiembroInvalido";
    this.campo = campo;
  }
}

/**
 * Invita a alguien **a la empresa de quien invita**. Sin parámetro de empresa.
 *
 * El rol se acota a los dos de cliente: conceder `slg_operator` desde el portal
 * sería repartir acceso a todas las empresas, y aunque FU-07 lo rechazaría por
 * `user.invite.slg`, un valor que nunca debería llegar se para antes de salir.
 */
export async function invitarMiembro(
  ctx: AuthContext,
  datos: { correo: string; rol: string; idioma?: "es" | "en" },
): Promise<{ id: string; correoEnviado: boolean }> {
  const correo = datos.correo.trim().toLowerCase();
  if (!correo.includes("@") || correo.length > 200) throw new MiembroInvalido("correo");
  if (datos.rol !== "client_admin" && datos.rol !== "client_member") {
    throw new MiembroInvalido("rol");
  }
  // Estrechado ARRIBA, no aquí: a partir de este punto el tipo ya no admite un
  // rol de SLG, así que el compilador impide que alguien amplíe el formulario
  // sin ampliar también la comprobación.
  const rol: "client_admin" | "client_member" = datos.rol;
  if (ctx.organizationId === null) throw new MiembroInvalido("empresa");
  const organizationId = ctx.organizationId;

  return conAuditoria(
    ctx,
    { accion: "member.invite", entidad: "invitation", organizationId },
    async () => {
      exigir(ctx, "member.invite");
      const r = await emitirInvitacion(ctx, {
        email: correo,
        organizationId,
        role: rol,
        idioma: datos.idioma,
        nombreDeQuienInvita: ctx.actorLabel ?? undefined,
      });
      /**
       * **La invitación existe aunque el correo no haya salido** (RF-119): lo
       * devolvemos para que la pantalla lo diga en vez de dar por hecho que
       * llegó. Es el fallo que dejó a alguien esperando un correo que nadie
       * mandó y que nadie sabía que no se había mandado.
       */
      return { id: r.invitacion.id, correoEnviado: r.correoEnviado };
    },
  );
}
