/**
 * test-gestion.ts — Empresas, proyectos, usuarios e invitaciones (DU-14),
 * contra PostgreSQL real.
 *
 * Los criterios que solo se comprueban así:
 *
 *   · **criterio 2** — el campo `service` **solo admite nomenclatura literal**.
 *     Se prueban las tres formas de romperlo que salen solas al escribir:
 *     minúsculas, espacios en vez de guion bajo, y un nombre inventado.
 *   · **criterio 3** — una invitación no aceptada **se revoca y deja de servir
 *     de inmediato**: el mismo testigo que valía hace un segundo ya no vale.
 *   · **criterio 4** — `slg_operator` opera **solo sobre sus proyectos
 *     asignados**, y **no puede** crear claves, invitar usuarios SLG ni ver
 *     auditoría. Los intentos **se rechazan en el servidor** y **quedan
 *     auditados**, que es la mitad que casi nunca se prueba.
 *   · **criterio 6** — estados: sin empresas · sin proyectos · invitación
 *     caducada · **correo fallido con la invitación viva y reenviable**
 *     (RF-119).
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import postgres from "postgres";

import { ErrorDeAutorizacion, puede } from "../../lib/auth/matriz.ts";
import { contextoDeSesion } from "../../lib/db/context.ts";
import type { UserRole } from "../../lib/db/schema.ts";

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

const SUFIJO = "du14.test";
const ORG_SLG = "org-slg-du14";
const ORG_CLIENTE = "org-cliente-du14";
const ADMIN = "u-admin-du14";
/** Con sufijo: «Cliente Demo» a secas es de la semilla y no es nuestro. */
const NOMBRE_CLIENTE = "Cliente Demo DU14";
const SLUG_CLIENTE = "cliente-demo-du14";
const OPERADOR = "u-operador-du14";

const ctxDe = (rol: UserRole, userId: string, org: string | null) =>
  contextoDeSesion({ userId, userName: `Persona ${rol}`, role: rol, organizationId: org });

const admin = () => ctxDe("slg_admin", ADMIN, ORG_SLG);
const operador = () => ctxDe("slg_operator", OPERADOR, ORG_SLG);

async function limpiar() {
  /**
   * También por slug, y **solo por los slugs de esta prueba**: una ejecución que
   * muera entre el `insert` y el renombrado deja una empresa con id aleatorio
   * que un borrado por id no encuentra, y la siguiente ejecución choca contra el
   * índice único.
   *
   * El nombre lleva sufijo `DU14` a propósito. La primera versión usaba
   * «Cliente Demo» a secas —el del criterio 1— y su slug chocaba con el de la
   * **semilla**: la limpieza se llevaba por delante los datos de desarrollo, y
   * el borrado murió contra la clave ajena de un entregable de la semilla. Una
   * prueba que borra datos que no ha creado es una prueba que rompe el entorno.
   */
  await dueno`delete from invitation where organization_id in (select id from organization where slug in (${SLUG_CLIENTE}, 'slg-du14'))`;
  await dueno`delete from membership where organization_id in (select id from organization where slug in (${SLUG_CLIENTE}, 'slg-du14'))`;
  await dueno`delete from project where organization_id in (select id from organization where slug in (${SLUG_CLIENTE}, 'slg-du14'))`;
  await dueno`delete from organization where slug in (${SLUG_CLIENTE}, 'slg-du14')`;
  /**
   * **`audit_log` NO se limpia, y no es un olvido**: un disparador de la
   * migración 0003 lo hace inmutable (RNF-29) y rechaza el `DELETE` incluso al
   * usuario dueño. La primera versión de esta prueba intentaba borrarlo y la
   * base de datos la paró — que es exactamente lo que ese disparador existe
   * para hacer. Por eso los apuntes se cuentan **desde el instante en que
   * empieza la prueba** en vez de en absoluto.
   */
  await dueno`delete from invitation where organization_id in (${ORG_SLG}, ${ORG_CLIENTE})`;
  await dueno`delete from membership where organization_id in (${ORG_SLG}, ${ORG_CLIENTE})`;
  await dueno`delete from deliverable where organization_id in (${ORG_SLG}, ${ORG_CLIENTE})`;
  await dueno`delete from project where organization_id in (${ORG_SLG}, ${ORG_CLIENTE})`;
  await dueno`delete from "user" where id in (${ADMIN}, ${OPERADOR})`;
  await dueno`delete from organization where id in (${ORG_SLG}, ${ORG_CLIENTE})`;
}

async function sembrar() {
  await limpiar();
  await dueno`insert into organization (id, name, slug, type, status)
              values (${ORG_SLG}, 'SLG DU14', 'slg-du14', 'slg', 'active')`;
  await dueno`insert into "user" (id, name, email, email_verified, role, locale)
              values (${ADMIN}, 'Admin DU14', ${`admin@${SUFIJO}`}, true, 'slg_admin', 'es'),
                     (${OPERADOR}, 'Operador DU14', ${`operador@${SUFIJO}`}, true, 'slg_operator', 'es')`;
  await dueno`insert into membership (id, user_id, organization_id, org_role)
              values (${crypto.randomUUID()}, ${ADMIN}, ${ORG_SLG}, 'slg_admin'),
                     (${crypto.randomUUID()}, ${OPERADOR}, ${ORG_SLG}, 'slg_operator')`;
}

/** El instante en que empieza la prueba: todo se cuenta a partir de aquí. */
const DESDE = new Date();

const apuntes = async (accion: string, actor: string) =>
  await dueno`select action from audit_log
               where action = ${accion} and actor_id = ${actor} and created_at >= ${DESDE}`;

async function main() {
  process.env.CRM_QUEUE_DISABLED = "1";
  // El enlace de la invitación es absoluto a propósito (si no, el correo
  // llegaría con un enlace roto), así que la prueba tiene que dar una base.
  process.env.NEXT_PUBLIC_SITE_URL ??= "http://127.0.0.1:3000";
  // Sin SMTP configurado el envío falla — y eso es justo lo que hace falta para
  // el criterio 6: la invitación tiene que quedar creada y reenviable igual.
  delete process.env.MAIL_SMTP_HOST;

  const { crearEmpresa, empresas, editarEmpresa } = await import("../../lib/hq/empresas.ts");
  const { crearProyecto, editarProyecto, estaAsignado, proyectos } = await import("../../lib/hq/proyectos.ts");
  const { invitarASlg, invitarACliente, invitacionesPendientes, revocar } = await import("../../lib/hq/usuarios.ts");
  const { esServicioLiteral, serviciosLiterales } = await import("../../lib/hq/servicios.ts");
  const { consultarTestigo } = await import("../../lib/invitations/index.ts");
  const { generarTestigo } = await import("../../lib/invitations/token.ts");

  await sembrar();

  try {
    /* ── Criterio 6 · el estado vacío ───────────────────────────────────── */
    console.log("\nCriterio 6 — sin empresas de cliente y sin proyectos, el sistema no se rompe:\n");
    const antes = await proyectos(admin());
    check("la lista de proyectos puede estar vacía", Array.isArray(antes));

    /* ── Empresas ───────────────────────────────────────────────────────── */
    console.log("\nEmpresas — crear, y el slug derivado del nombre:\n");
    const creada = await crearEmpresa(admin(), {
      nombre: NOMBRE_CLIENTE,
      slug: "",
      tipo: "client",
      estado: "active",
      contactoPrincipal: `contacto@${SUFIJO}`,
    });
    await dueno`update organization set id = ${ORG_CLIENTE} where id = ${creada.id}`;
    check("la empresa se crea", creada.nombre === NOMBRE_CLIENTE, JSON.stringify(creada));
    check("el slug se deriva del nombre cuando se deja vacío", creada.slug === SLUG_CLIENTE, creada.slug);
    check(
      "el alta queda auditada",
      (await apuntes("org.create", ADMIN)).length === 1,
      `${(await apuntes("org.create", ADMIN)).length}`,
    );
    check("y aparece en la lista", (await empresas(admin())).some((e) => e.nombre === NOMBRE_CLIENTE));

    console.log("\nUn slug repetido es un dato inválido, no una avería:\n");
    let campoRepetido = "";
    try {
      await crearEmpresa(admin(), { nombre: NOMBRE_CLIENTE, slug: "", tipo: "client", estado: "active" });
    } catch (e) {
      campoRepetido = (e as Error & { campo?: string }).campo ?? (e as Error).name;
    }
    check(
      "crear dos veces el mismo nombre devuelve «slug», no un error de PostgreSQL",
      campoRepetido === "slug",
      campoRepetido,
    );

    /* ── Criterio 2 · nomenclatura literal ──────────────────────────────── */
    console.log("\nEmpresas — editar, y quién puede:\n");
    await editarEmpresa(admin(), ORG_CLIENTE, {
      nombre: `${NOMBRE_CLIENTE} S.L.`,
      slug: SLUG_CLIENTE,
      tipo: "client",
      estado: "active",
      contactoPrincipal: `contacto@${SUFIJO}`,
    });
    check(
      "el administrador edita la empresa",
      (await empresas(admin())).some((e) => e.nombre === `${NOMBRE_CLIENTE} S.L.`),
    );
    check("y la edición queda auditada", (await apuntes("org.update", ADMIN)).length === 1);

    let estadoEdicion = 0;
    try {
      // Sin prueba de asignación, el silencio vale «no»: es la regla de la
      // matriz, y es lo que impide que un `asignado: true` por comodidad
      // convierta a cualquier operador en administrador.
      await editarEmpresa(operador(), ORG_CLIENTE, {
        nombre: "Mía ahora",
        slug: SLUG_CLIENTE,
        tipo: "client",
        estado: "active",
      });
    } catch (e) {
      estadoEdicion = e instanceof ErrorDeAutorizacion ? e.status : -1;
    }
    check("el operador NO edita una empresa que no tiene asignada", estadoEdicion > 0, `estado ${estadoEdicion}`);
    check("y ese intento queda auditado", (await apuntes("org.update.denied", OPERADOR)).length === 1);

    console.log("\nCriterio 2 — `service` solo admite nomenclatura literal (RF-79, RF-14):\n");
    const oferta = serviciosLiterales();
    check("están LOS ONCE servicios de A.2, no solo los que son marca", oferta.length === 11, `${oferta.length}: ${oferta.join(" · ")}`);
    check(
      "incluidos los dos que NO son marca registrada y por eso no están en LITERAL_TERMS",
      oferta.some((s) => s.includes("Coaching")) && oferta.some((s) => s.includes("Customize") || s.includes("Programa")),
      oferta.join(" · "),
    );
    check("«Phoenix PEEx» vale", esServicioLiteral("Phoenix PEEx"));
    for (const roto of ["phoenix peex", "Phoenix PEEX", "SLG Readiness", "Consultoría IA", ""]) {
      check(`«${roto || "(vacío)"}» NO vale`, !esServicioLiteral(roto));
    }

    let motivo = "";
    try {
      await crearProyecto(admin(), {
        organizationId: ORG_CLIENTE,
        nombre: "Proyecto roto",
        servicio: "phoenix peex",
        estado: "active",
      });
    } catch (e) {
      motivo = (e as Error & { campo?: string }).campo ?? (e as Error).name;
    }
    check("el servidor rechaza un servicio mal escrito, no solo el desplegable", motivo === "servicio", motivo);

    const proyectoId = await crearProyecto(admin(), {
      organizationId: ORG_CLIENTE,
      nombre: "Proyecto Demo",
      servicio: "Phoenix PEEx",
      estado: "active",
      responsableId: OPERADOR,
    });
    check("con el nombre literal, el proyecto se crea", typeof proyectoId === "string" && proyectoId.length > 0);

    /* ── Criterio 4 · «asignados» ───────────────────────────────────────── */
    console.log("\nCriterio 4 — `slg_operator` opera SOLO sobre sus proyectos asignados (RF-86):\n");
    check("el operador figura como responsable de su proyecto", await estaAsignado(operador(), proyectoId));

    const ajeno = await crearProyecto(admin(), {
      organizationId: ORG_CLIENTE,
      nombre: "Proyecto ajeno",
      servicio: "SLG_Readiness",
      estado: "active",
      responsableId: ADMIN,
    });
    check("y NO de uno que no es suyo", !(await estaAsignado(operador(), ajeno)));

    // Editar el asignado: pasa.
    let ok = true;
    try {
      await editarProyecto(operador(), proyectoId, {
        organizationId: ORG_CLIENTE,
        nombre: "Proyecto Demo (editado)",
        servicio: "Phoenix PEEx",
        estado: "paused",
      });
    } catch {
      ok = false;
    }
    check("edita el proyecto que tiene asignado", ok);

    // Editar el ajeno: se rechaza EN EL SERVIDOR.
    let estado = 0;
    try {
      await editarProyecto(operador(), ajeno, {
        organizationId: ORG_CLIENTE,
        nombre: "Se lo quedo",
        servicio: "SLG_Readiness",
        estado: "closed",
      });
    } catch (e) {
      estado = e instanceof ErrorDeAutorizacion ? e.status : -1;
    }
    check("NO puede editar el que no es suyo: lo para el servidor", estado === 403 || estado === 404, `estado ${estado}`);
    check(
      "y el intento QUEDA AUDITADO como rechazo",
      (await apuntes("project.update.denied", OPERADOR)).length === 1,
      `${(await apuntes("project.update.denied", OPERADOR)).length} apuntes`,
    );

    // Crear empresa: tampoco.
    let estadoEmpresa = 0;
    try {
      await crearEmpresa(operador(), { nombre: "Mía", slug: "mia", tipo: "client", estado: "active" });
    } catch (e) {
      estadoEmpresa = e instanceof ErrorDeAutorizacion ? e.status : -1;
    }
    check("tampoco puede crear empresas: una empresa nueva no está asignada a nadie", estadoEmpresa > 0);
    check(
      "y ese intento también queda auditado",
      (await apuntes("org.create.denied", OPERADOR)).length === 1,
    );

    console.log("\nCriterio 4 (bis) — las tres acciones que el operador NO tiene (RF-86):\n");
    for (const accion of ["user.invite.slg", "apikey.manage", "audit.read"] as const) {
      check(`\`slg_operator\` no puede «${accion}»`, !puede(operador(), accion).permitido);
      check(`\`slg_admin\` sí puede «${accion}»`, puede(admin(), accion).permitido);
    }

    let estadoInvitar = 0;
    try {
      await invitarASlg(operador(), { email: `nuevo@${SUFIJO}`, organizationId: ORG_SLG, role: "slg_operator" });
    } catch (e) {
      estadoInvitar = e instanceof ErrorDeAutorizacion ? e.status : -1;
    }
    check("invitar a SLG se rechaza en el servidor", estadoInvitar > 0, `estado ${estadoInvitar}`);
    check(
      "y queda auditado",
      (await apuntes("user.invite.slg.denied", OPERADOR)).length === 1,
    );

    /* ── Criterios 1, 3 y 6 · invitaciones ──────────────────────────────── */
    console.log("\nCriterio 3 — una invitación no aceptada se revoca y deja de servir DE INMEDIATO:\n");
    const emitida = await invitarACliente(admin(), {
      email: `invitado@${SUFIJO}`,
      organizationId: ORG_CLIENTE,
      role: "client_member",
      idioma: "es",
    });
    check("la invitación se crea", Boolean(emitida.invitacion.id));
    check(
      "SIN correo saliente la invitación sigue creada y reenviable (RF-119, criterio 6)",
      emitida.correoEnviado === false && emitida.invitacion.status === "pending",
      JSON.stringify({ correo: emitida.correoEnviado, estado: emitida.invitacion.status }),
    );
    check(
      "y aparece entre las pendientes",
      (await invitacionesPendientes(admin())).some((i) => i.id === emitida.invitacion.id),
    );

    /**
     * EL TESTIGO EN CLARO NO SALE DE `emitirInvitacion`, y eso es correcto: solo
     * existe dentro del correo. Así que para poder comprobar que **revocar lo
     * mata**, se le pone a esta invitación un testigo conocido —generado con la
     * misma función que usa el servicio— escribiendo su hash directamente.
     *
     * Se cambia el hash y no se inventa otro camino porque lo que se prueba es
     * la revocación, no la emisión: la emisión ya está probada arriba y en
     * `test:invitaciones`.
     */
    const { enClaro: testigo, hash } = generarTestigo();
    await dueno`update invitation set token_hash = ${hash} where id = ${emitida.invitacion.id}`;
    const antesDeRevocar = await consultarTestigo(testigo);
    check("antes de revocar, el testigo vale", antesDeRevocar.valido === true, JSON.stringify(antesDeRevocar));

    await revocar(admin(), emitida.invitacion.id);
    const despues = await consultarTestigo(testigo);
    check("después de revocar, el MISMO testigo ya no vale", despues.valido === false, JSON.stringify(despues));
    check(
      "la revocación queda auditada",
      (await apuntes("invitation.revoke", ADMIN)).length === 1,
    );
    check(
      "y desaparece de las pendientes",
      !(await invitacionesPendientes(admin())).some((i) => i.id === emitida.invitacion.id),
    );

    console.log("\nCriterio 6 — una invitación caducada tampoco vale:\n");
    const caducable = await invitarACliente(admin(), {
      email: `caduca@${SUFIJO}`,
      organizationId: ORG_CLIENTE,
      role: "client_member",
    });
    const otro = generarTestigo();
    await dueno`update invitation
                   set token_hash = ${otro.hash}, expires_at = now() - interval '1 hour'
                 where id = ${caducable.invitacion.id}`;
    const caducado = await consultarTestigo(otro.enClaro);
    check("un testigo caducado no vale", caducado.valido === false, JSON.stringify(caducado));

    await limpiar();
  } finally {
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ gestión: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ gestión: ${comprobaciones} comprobaciones contra PostgreSQL real, sin fallos.`);
  process.exit(0);
}

await main();
