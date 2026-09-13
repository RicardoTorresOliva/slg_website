/**
 * service.ts — Emitir, reenviar, revocar y aceptar una invitación.
 *
 * EL ACCESO DE CLIENTES ES SOLO POR INVITACIÓN (§10-10): no hay registro
 * público. Esta es, por tanto, la puerta por la que entra todo el mundo, y por
 * eso sus cinco reglas son duras y están probadas una a una.
 *
 * LO QUE ESTE ARCHIVO NO DECIDE. La superficie de emisión no existe todavía —HQ
 * es DU-14 y el portal DU-21—, y la pantalla de aceptación es de DU-01. Aquí
 * está el servicio, que es lo que FU-07 produce: por eso es FU y no DU.
 */

import { and, eq, sql } from "drizzle-orm";

import { exigir, ErrorDeAutorizacion } from "../auth/index.ts";
import type { AuthContext } from "../db/context.ts";
import { invitation, ORG_TYPES, USER_ROLES, type UserRole } from "../db/schema.ts";
import { withScope, withSystemScope } from "../db/scope.ts";
import { enviarCorreo } from "../mail/index.ts";
import { emitir } from "../webhooks/index.ts";

import {
  caducidadDesdeAhora,
  enlaceDeInvitacion,
  generarTestigo,
  hashDeTestigo,
} from "./token.ts";

export type Invitacion = {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly status: "pending" | "accepted" | "rejected" | "canceled";
  readonly expiresAt: Date;
  readonly sentAt: Date | null;
};

export type ResultadoDeEmision = {
  readonly invitacion: Invitacion;
  /** Si el correo no salió, la invitación EXISTE y es reenviable (RF-119). */
  readonly correoEnviado: boolean;
  readonly errorDeCorreo: string | null;
};

/* ══════════════════════════════════════════════════════════════════════════
 * Quién puede invitar a quién
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * La regla de B.3 que **no es expresable en un `CHECK`** (`data_model` §5.7),
 * porque necesita el rol de quien invita, no solo la fila.
 *
 * Un `client_admin` puede invitar a miembros de **su** empresa (RF-92). De ahí
 * se sigue, y hay que escribirlo: no puede invitar a otra empresa, no puede
 * conceder `slg_admin` ni `slg_operator`, y no puede invitar a una organización
 * de tipo `slg`. Sin esta comprobación, «invitar a un miembro» sería una vía de
 * escalada de privilegios con formulario.
 */
function exigirAlcanceDeLaInvitacion(
  ctx: AuthContext,
  destino: { organizationId: string; role: UserRole; orgType: string },
): void {
  exigir(ctx, "member.invite");

  const esDeSlg = ctx.actorRole === "slg_admin" || ctx.actorRole === "slg_operator";

  // Conceder un rol de SLG es dar de alta a un usuario de SLG, que en B.3 es
  // una fila distinta y solo de `slg_admin`.
  if (destino.role === "slg_admin" || destino.role === "slg_operator") {
    exigir(ctx, "user.invite.slg");
  }

  if (esDeSlg) return;

  // Cliente: solo su propia empresa, y solo si es de tipo `client`.
  if (ctx.organizationId === null || destino.organizationId !== ctx.organizationId) {
    throw new ErrorDeAutorizacion(
      404,
      `actor ${ctx.actorId} intentó invitar a una empresa que no es la suya`,
    );
  }
  if (destino.orgType !== "client") {
    throw new ErrorDeAutorizacion(
      404,
      `actor ${ctx.actorId} intentó invitar a una organización de tipo ${destino.orgType}`,
    );
  }
}

function esRolValido(valor: string): valor is UserRole {
  return (USER_ROLES as readonly string[]).includes(valor);
}

/**
 * Todo el acceso a datos de este módulo pasa por `withSystemScope`, igual que el
 * resto del proyecto. Las dos funciones `SECURITY DEFINER` del canje se invocan
 * desde dentro de esa transacción: no hay una segunda conexión ni un cliente
 * crudo escondido aquí.
 */
async function tipoDeOrganizacion(organizationId: string): Promise<string | null> {
  return withSystemScope("leer el tipo de una organización (FU-07)", async (db) => {
    const filas = await db.execute<{ type: string }>(
      sql`select type from organization where id = ${organizationId} and status = 'active'`,
    );
    return filas[0]?.type ?? null;
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * Emisión
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Manda el correo de invitación **sin que su fallo se lleve por delante la
 * invitación** (RF-119).
 *
 * POR QUÉ HACE FALTA ESTA ENVOLTURA. `enviarCorreo` devuelve `estado: "failed"`
 * cuando el envío se intenta y no sale, pero **lanza** cuando el problema es de
 * configuración —falta `MAIL_SMTP_HOST`, por ejemplo—. Sin esto, esa excepción
 * sale de `emitirInvitacion` y quien llamó recibe un error en vez de
 * `correoEnviado: false`… con la fila de la invitación **ya escrita**. Es decir:
 * la invitación existe, es reenviable, y la pantalla dice que no se pudo crear.
 *
 * Lo encontró la prueba de DU-14 al correr sin SMTP. Para RF-119 da igual por
 * qué no salió el correo: la invitación sobrevive y se puede reenviar, y eso
 * tiene que ser cierto también cuando el fallo es de configuración.
 */
async function intentarCorreo(
  entrada: Parameters<typeof enviarCorreo>[0],
): Promise<{ estado: string; error: string | null }> {
  try {
    const r = await enviarCorreo(entrada);
    return { estado: r.estado, error: r.error };
  } catch (e) {
    return { estado: "failed", error: (e as Error).message.slice(0, 300) };
  }
}

export async function emitirInvitacion(
  ctx: AuthContext,
  entrada: {
    email: string;
    organizationId: string;
    role: UserRole;
    idioma?: "es" | "en";
    nombreDeQuienInvita?: string;
  },
): Promise<ResultadoDeEmision> {
  if (!esRolValido(entrada.role)) {
    throw new Error(`Rol de invitación desconocido: ${entrada.role}`);
  }

  const orgType = await tipoDeOrganizacion(entrada.organizationId);
  if (orgType === null) {
    // Empresa inexistente o archivada: 404, como cualquier recurso ajeno. Una
    // invitación vigente a una empresa archivada es una puerta abierta a un
    // sitio cerrado (`data_model` §4.3).
    throw new ErrorDeAutorizacion(
      404,
      `organización ${entrada.organizationId} inexistente o archivada`,
    );
  }
  if (!(ORG_TYPES as readonly string[]).includes(orgType)) {
    throw new Error(`Tipo de organización desconocido: ${orgType}`);
  }

  exigirAlcanceDeLaInvitacion(ctx, {
    organizationId: entrada.organizationId,
    role: entrada.role,
    orgType,
  });

  const correo = entrada.email.trim().toLowerCase();
  const { enClaro, hash } = generarTestigo();

  /**
   * Se escribe CON EL CONTEXTO DE QUIEN INVITA, no como sistema.
   *
   * `invitation` está bajo row level security: con el contexto del actor, la
   * política hace cumplir la pertenencia ella sola —un `client_admin` no puede
   * insertar en otra empresa aunque este código lo intentara— y la comprobación
   * de B.3 de arriba pasa a ser la segunda capa, no la única.
   */
  const fila = await withScope(ctx, async (db) => {
    const [creada] = await db
      .insert(invitation)
      .values({
        id: crypto.randomUUID(),
        email: correo,
        organizationId: entrada.organizationId,
        role: entrada.role,
        tokenHash: hash,
        status: "pending",
        expiresAt: caducidadDesdeAhora(),
        inviterId: ctx.actorType === "user" ? ctx.actorId : null,
      })
      .returning();
    return creada;
  });

  const invitacion = aInvitacion(fila);

  // El correo va DESPUÉS de que la fila exista. Si el orden fuera el contrario y
  // el proceso muriera en medio, habría un enlace en el buzón de alguien sin
  // nada detrás que lo canjeara.
  const envio = await intentarCorreo({
    tipo: "invitation",
    para: correo,
    idioma: entrada.idioma ?? "es",
    datos: {
      invitadoPor: entrada.nombreDeQuienInvita ?? ctx.actorLabel,
      url: enlaceDeInvitacion(enClaro),
    },
  });

  if (envio.estado === "delivered") {
    await withScope(ctx, async (db) => {
      await db
        .update(invitation)
        .set({ sentAt: new Date() })
        .where(eq(invitation.id, invitacion.id));
    });
    // `invitation.sent` solo cuando el correo SALIÓ (DU-12). Una invitación
    // creada cuyo correo falló no se ha enviado, y anunciarla haría que un
    // flujo externo diera por avisada a una persona que no recibió nada.
    // El payload NO lleva el correo ni el testigo: quien escucha necesita saber
    // que ocurrió, no a quién ni con qué llave.
    await emitir("invitation.sent", {
      invitationId: invitacion.id,
      organizationId: entrada.organizationId,
      role: entrada.role,
    });
  }

  return {
    invitacion: { ...invitacion, sentAt: envio.estado === "delivered" ? new Date() : null },
    correoEnviado: envio.estado === "delivered",
    errorDeCorreo: envio.error,
  };
}

/**
 * Reenvío: **testigo nuevo y caducidad nueva**, sobre la misma invitación.
 *
 * No se reenvía el mismo enlace porque el anterior arrastra su caducidad —una
 * invitación reenviada a la hora 71 duraría un minuto— y porque, si el primer
 * correo llegó a un buzón equivocado, reenviar el mismo enlace deja ese enlace
 * vivo. Emitir uno nuevo invalida el viejo: el índice único sobre `token_hash`
 * se encarga de que solo uno sirva.
 */
export async function reenviarInvitacion(
  ctx: AuthContext,
  invitationId: string,
  opciones?: { idioma?: "es" | "en" },
): Promise<ResultadoDeEmision> {
  // La política de fila decide si este actor puede siquiera verla: para otra
  // empresa, `leerInvitacion` devuelve null y la respuesta es 404.
  const actual = await leerInvitacion(ctx, invitationId);
  if (!actual) throw new ErrorDeAutorizacion(404, `invitación ${invitationId} inexistente o ajena`);
  if (actual.status !== "pending") {
    throw new ErrorDeAutorizacion(
      404,
      `invitación ${invitationId} en estado ${actual.status}: solo se reenvía una pendiente`,
    );
  }

  const orgType = (await tipoDeOrganizacion(actual.organizationId)) ?? "client";
  exigirAlcanceDeLaInvitacion(ctx, {
    organizationId: actual.organizationId,
    role: actual.role,
    orgType,
  });

  const { enClaro, hash } = generarTestigo();
  await withScope(ctx, async (db) => {
    await db
      .update(invitation)
      .set({ tokenHash: hash, expiresAt: caducidadDesdeAhora(), sentAt: null })
      .where(and(eq(invitation.id, invitationId), eq(invitation.status, "pending")));
  });

  const envio = await intentarCorreo({
    tipo: "invitation",
    para: actual.email,
    idioma: opciones?.idioma ?? "es",
    datos: { invitadoPor: ctx.actorLabel, url: enlaceDeInvitacion(enClaro) },
  });

  if (envio.estado === "delivered") {
    await withScope(ctx, async (db) => {
      await db.update(invitation).set({ sentAt: new Date() }).where(eq(invitation.id, invitationId));
    });
    // Un reenvío ES un envío: sale el mismo evento. Callarlo aquí haría que el
    // flujo externo viera una sola invitación donde hubo dos correos, que es
    // justo la diferencia que importa cuando alguien dice que no le llegó.
    await emitir("invitation.sent", {
      invitationId,
      organizationId: actual.organizationId,
      role: actual.role,
    });
  }

  const refrescada = await leerInvitacion(ctx, invitationId);
  return {
    invitacion: refrescada!,
    correoEnviado: envio.estado === "delivered",
    errorDeCorreo: envio.error,
  };
}

/** Revocación: inmediata. El enlace deja de servir en la misma transacción. */
export async function revocarInvitacion(
  ctx: AuthContext,
  invitationId: string,
): Promise<boolean> {
  const actual = await leerInvitacion(ctx, invitationId);
  if (!actual) throw new ErrorDeAutorizacion(404, `invitación ${invitationId} inexistente o ajena`);

  const orgType = (await tipoDeOrganizacion(actual.organizationId)) ?? "client";
  exigirAlcanceDeLaInvitacion(ctx, {
    organizationId: actual.organizationId,
    role: actual.role,
    orgType,
  });

  return withScope(ctx, async (db) => {
    const filas = await db
      .update(invitation)
      .set({
        status: "canceled",
        revokedAt: new Date(),
        revokedByUserId: ctx.actorType === "user" ? ctx.actorId : null,
        // El testigo se borra: revocada es revocada, y un hash guardado de algo
        // que ya no vale solo sirve para confundir una auditoría.
        tokenHash: null,
      })
      .where(and(eq(invitation.id, invitationId), eq(invitation.status, "pending")))
      .returning({ id: invitation.id });
    return filas.length === 1;
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * Canje
 * ══════════════════════════════════════════════════════════════════════════ */

export type EstadoDeTestigo =
  | { readonly valido: true; readonly invitacion: Invitacion }
  | { readonly valido: false; readonly motivoInterno: string };

/**
 * El mensaje público de un testigo inválido es SIEMPRE el mismo, no importa si
 * no existió, si caducó, si ya se usó o si lo revocaron (criterio 1). Distinguir
 * los cuatro casos le dice a quien prueba enlaces cuáles existieron.
 */
export const MENSAJE_DE_TESTIGO_INVALIDO =
  "Este enlace no es válido. Solicita una invitación nueva a tu contacto en SLG.";

export async function consultarTestigo(enClaro: string): Promise<EstadoDeTestigo> {
  const hash = hashDeTestigo(enClaro);
  const fila = await withSystemScope("canjear un testigo de invitación (FU-07)", async (db) => {
    const filas = await db.execute<{
      id: string;
      organization_id: string;
      email: string;
      role: string;
      status: string;
      expires_at: Date | string;
      accepted_at: Date | string | null;
      revoked_at: Date | string | null;
    }>(sql`select * from app_invitacion_por_hash(${hash})`);
    return filas[0];
  });

  if (!fila) return { valido: false, motivoInterno: "ningún testigo con ese hash" };
  if (fila.status !== "pending") {
    return { valido: false, motivoInterno: `invitación en estado ${fila.status}` };
  }
  const caduca = fila.expires_at instanceof Date ? fila.expires_at : new Date(fila.expires_at);
  if (caduca.getTime() <= Date.now()) {
    return { valido: false, motivoInterno: "invitación caducada" };
  }

  return {
    valido: true,
    invitacion: {
      id: fila.id,
      organizationId: fila.organization_id,
      email: fila.email,
      role: fila.role as UserRole,
      status: "pending",
      expiresAt: caduca,
      sentAt: null,
    },
  };
}

export type ResultadoDeAceptacion =
  | { readonly aceptada: true; readonly organizationId: string; readonly role: UserRole }
  | { readonly aceptada: false; readonly mensaje: string; readonly motivoInterno: string };

/**
 * Canjea el testigo para una cuenta ya autenticada, por cualquiera de los tres
 * métodos (RF-61). Quien llama —DU-01— ya resolvió la identidad; aquí se decide
 * si esa identidad puede tomar ESTA invitación.
 *
 * RF-63 Y R-22, LA REGLA QUE MÁS IMPORTA. Si el proveedor no entrega un correo
 * **verificado**, la aceptación exige que quien acepta escriba el correo y que
 * coincida con el de la invitación. Nunca se vincula por un correo no
 * verificado: Entra ID puede no emitir correo para cuentas gestionadas (F.1), y
 * un correo sin verificar es una afirmación del usuario, no un hecho.
 */
export async function aceptarInvitacion(entrada: {
  testigo: string;
  userId: string;
  /** Correo que el proveedor entrega **verificado**, o `null` si no lo hace. */
  correoVerificado: string | null;
  /** Correo escrito por la persona, cuando el proveedor no verifica. */
  correoDeclarado?: string;
}): Promise<ResultadoDeAceptacion> {
  const estado = await consultarTestigo(entrada.testigo);
  if (!estado.valido) {
    return {
      aceptada: false,
      mensaje: MENSAJE_DE_TESTIGO_INVALIDO,
      motivoInterno: estado.motivoInterno,
    };
  }

  const inv = estado.invitacion;
  const esperado = inv.email.trim().toLowerCase();

  const verificado = entrada.correoVerificado?.trim().toLowerCase() ?? null;
  if (verificado !== null) {
    if (verificado !== esperado) {
      return {
        aceptada: false,
        mensaje: MENSAJE_DE_TESTIGO_INVALIDO,
        motivoInterno: "el correo verificado del proveedor no es el de la invitación",
      };
    }
  } else {
    // RF-63: coincidencia explícita. Sin ella, se rechaza.
    const declarado = entrada.correoDeclarado?.trim().toLowerCase();
    if (!declarado || declarado !== esperado) {
      return {
        aceptada: false,
        mensaje: MENSAJE_DE_TESTIGO_INVALIDO,
        motivoInterno:
          "el proveedor no entregó correo verificable y no hubo coincidencia explícita (RF-63, R-22)",
      };
    }
  }

  const ok = await withSystemScope("consumir la invitación (FU-07)", async (db) => {
    const filas = await db.execute<{ ok: boolean }>(
      sql`select app_canjear_invitacion(${inv.id}, ${entrada.userId}, ${crypto.randomUUID()}) as ok`,
    );
    return filas[0]?.ok === true;
  });

  if (!ok) {
    // La condición `status = 'pending'` de la función no se cumplió: alguien
    // canjeó el mismo enlace entre la consulta y el canje. Un solo uso, real.
    return {
      aceptada: false,
      mensaje: MENSAJE_DE_TESTIGO_INVALIDO,
      motivoInterno: "carrera perdida: la invitación se canjeó entre la consulta y el canje",
    };
  }

  return { aceptada: true, organizationId: inv.organizationId, role: inv.role };
}

/* ══════════════════════════════════════════════════════════════════════════ */

async function leerInvitacion(ctx: AuthContext, id: string): Promise<Invitacion | null> {
  return withScope(ctx, async (db) => {
    const [fila] = await db.select().from(invitation).where(eq(invitation.id, id));
    return fila ? aInvitacion(fila) : null;
  });
}

/**
 * Invitaciones pendientes caducadas: las cierra el barrido, no un reloj
 * guardado. «Caducada» no es un valor de estado (`data_model` §3.5) porque un
 * estado derivado del reloj exige un proceso que lo actualice, y ese proceso es
 * justo el que falla en silencio; aquí el proceso existe y se puede contar.
 *
 * Va por la función de la migración 0009 porque el barrido recorre TODAS las
 * empresas y no tiene actor: sin contexto, la política de fila devolvería cero
 * y el barrido no barrería nada sin decirlo.
 */
export async function caducarPendientesVencidas(): Promise<number> {
  return withSystemScope("caducar invitaciones vencidas (FU-07)", async (db) => {
    const filas = await db.execute<{ n: number }>(sql`select app_caducar_invitaciones() as n`);
    return Number(filas[0]?.n ?? 0);
  });
}

type FilaDeInvitacion = typeof invitation.$inferSelect;

function aInvitacion(f: FilaDeInvitacion): Invitacion {
  return {
    id: f.id,
    organizationId: f.organizationId,
    email: f.email,
    role: f.role as UserRole,
    status: f.status as Invitacion["status"],
    expiresAt: f.expiresAt,
    sentAt: f.sentAt,
  };
}
