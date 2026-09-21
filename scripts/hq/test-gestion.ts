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
 *   · **DU-29 (criterio 1)** — hitos, pendientes y noticias desde HQ:
 *     `slg_operator` sobre un proyecto (o una empresa) no asignado → rechazado
 *     **y auditado como `.denied`**; título vacío o fecha imposible → dato
 *     inválido con su campo; crear → aparece; hecho/reabrir y cerrar/reabrir
 *     dejan el estado y las fechas coherentes (RF-151, RF-152, RF-156).
 *   · **Archivar y cerrar (data_model §2.5, §4.3)** — archivar una empresa y
 *     cerrar un proyecto **cambian `status` y no borran nada**: proyectos,
 *     entregables y pertenencias se cuentan antes y después. Solo `slg_admin`
 *     archiva empresas; `slg_operator` cierra solo los proyectos que tiene
 *     asignados, y cada rechazo queda auditado como `.denied`. Reactivar y
 *     reabrir lo devuelven todo tal como estaba.
 *   · **El identificador del CRM (D-163)** — se pone al crear la empresa, se
 *     edita, y **es de una sola**: repetirlo en otra empresa es un dato
 *     inválido con su campo (`crmCompanyId`), no un error de PostgreSQL, tanto
 *     al crear como al editar. En blanco vuelve a ser nulo.
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
/** La segunda empresa, solo para probar que el identificador del CRM es de una (D-163). */
const SLUG_SEGUNDA = "cliente-dos-du14";
const CRM_ID = "crm-du14-0001";
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
  // El entregable de la prueba de archivado cuelga del proyecto con `RESTRICT`
  // (§4.3): si se borrara el proyecto antes, la limpieza moriría aquí.
  await dueno`delete from deliverable where organization_id in (select id from organization where slug in (${SLUG_CLIENTE}, 'slg-du14'))`;
  // Las tres tablas de la Academy cuelgan del proyecto (DU-29): antes que él.
  await dueno`delete from milestone where organization_id in (select id from organization where slug in (${SLUG_CLIENTE}, 'slg-du14'))`;
  await dueno`delete from action_item where organization_id in (select id from organization where slug in (${SLUG_CLIENTE}, 'slg-du14'))`;
  await dueno`delete from news_item where organization_id in (select id from organization where slug in (${SLUG_CLIENTE}, 'slg-du14'))`;
  await dueno`delete from project where organization_id in (select id from organization where slug in (${SLUG_CLIENTE}, 'slg-du14'))`;
  await dueno`delete from organization where slug in (${SLUG_CLIENTE}, 'slg-du14')`;
  // La segunda empresa de D-163 no tiene proyectos ni miembros: solo la fila.
  await dueno`delete from organization where slug = ${SLUG_SEGUNDA}`;
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
  await dueno`delete from milestone where organization_id in (${ORG_SLG}, ${ORG_CLIENTE})`;
  await dueno`delete from action_item where organization_id in (${ORG_SLG}, ${ORG_CLIENTE})`;
  await dueno`delete from news_item where organization_id in (${ORG_SLG}, ${ORG_CLIENTE})`;
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

  const { archivarEmpresa, crearEmpresa, empresas, editarEmpresa, reactivarEmpresa } = await import("../../lib/hq/empresas.ts");
  const { archivarProyecto, crearProyecto, editarProyecto, estaAsignado, proyectos, reabrirProyecto } = await import(
    "../../lib/hq/proyectos.ts"
  );
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
      crmCompanyId: ` ${CRM_ID} `,
    });
    await dueno`update organization set id = ${ORG_CLIENTE} where id = ${creada.id}`;
    check("la empresa se crea", creada.nombre === NOMBRE_CLIENTE, JSON.stringify(creada));
    check("con el identificador del CRM, recortado (D-163)", creada.crmCompanyId === CRM_ID, String(creada.crmCompanyId));
    check(
      "y la fila lo lleva",
      ((await dueno`select crm_company_id from organization where id = ${ORG_CLIENTE}`) as unknown as { crm_company_id: string | null }[])[0]?.crm_company_id === CRM_ID,
    );
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
      crmCompanyId: CRM_ID,
    });
    check(
      "el administrador edita la empresa",
      (await empresas(admin())).some((e) => e.nombre === `${NOMBRE_CLIENTE} S.L.`),
    );
    check(
      "y conserva el identificador del CRM",
      (await empresas(admin())).some((e) => e.id === ORG_CLIENTE && e.crmCompanyId === CRM_ID),
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

    /* ── D-163 · el identificador del CRM es de una sola empresa ────────── */
    console.log("\nEl identificador del CRM es de una sola empresa (D-163):\n");
    const campoDe = async (fn: () => Promise<unknown>): Promise<string> => {
      try {
        await fn();
        return "";
      } catch (e) {
        return (e as Error & { campo?: string }).campo ?? (e as Error).name;
      }
    };
    const SEGUNDA = { nombre: "Cliente Dos DU14", slug: SLUG_SEGUNDA, tipo: "client", estado: "active" };
    check(
      "crear otra empresa con el MISMO identificador devuelve «crmCompanyId», no un error de PostgreSQL",
      (await campoDe(() => crearEmpresa(admin(), { ...SEGUNDA, crmCompanyId: CRM_ID }))) === "crmCompanyId",
    );
    check(
      "y la primera sigue siendo la única con ese identificador (índice único parcial de 0020)",
      ((await dueno`select count(*)::text as n from organization where crm_company_id = ${CRM_ID}`) as unknown as { n: string }[])[0]?.n === "1",
    );
    const segunda = await crearEmpresa(admin(), SEGUNDA);
    check("sin identificador se crea: es opcional, y queda nulo", segunda.slug === SLUG_SEGUNDA && segunda.crmCompanyId === null, JSON.stringify(segunda));
    check(
      "editarla para ponerle el de la primera también se rechaza sobre «crmCompanyId»",
      (await campoDe(() => editarEmpresa(admin(), segunda.id, { ...SEGUNDA, crmCompanyId: CRM_ID }))) === "crmCompanyId",
    );
    await editarEmpresa(admin(), segunda.id, { ...SEGUNDA, crmCompanyId: "crm-du14-0002" });
    check(
      "con uno propio, la edición lo guarda y la lista lo enseña",
      (await empresas(admin())).some((e) => e.id === segunda.id && e.crmCompanyId === "crm-du14-0002"),
    );
    await editarEmpresa(admin(), segunda.id, { ...SEGUNDA, crmCompanyId: "  " });
    check(
      "y en blanco lo quita: vuelve a ser nulo, no una cadena vacía",
      (await empresas(admin())).some((e) => e.id === segunda.id && e.crmCompanyId === null),
    );
    check(
      "uno más largo de lo que admite la columna es «crmCompanyId» antes de tocar la base",
      (await campoDe(() => editarEmpresa(admin(), segunda.id, { ...SEGUNDA, crmCompanyId: "x".repeat(201) }))) === "crmCompanyId",
    );

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

    /* ── DU-29 · hitos, pendientes y noticias desde HQ ──────────────────── */
    const {
      actualizarHito,
      cerrarPendiente,
      crearHito,
      crearNoticia,
      crearPendiente,
      hitosDeProyecto,
      noticias,
      pendientesAbiertos,
      pendientesDeProyecto,
      reabrirPendiente,
    } = await import("../../lib/academy/index.ts");

    /**
     * La edición del operador de más arriba no llevaba `responsableId`, y
     * `editarProyecto` lo guarda tal cual: el proyecto se quedó **sin
     * responsable**. Se reasigna a propósito, porque lo que se prueba aquí es
     * «asignado sí / no asignado no», y sin asignación las dos mitades darían
     * «no» y la prueba pasaría por la razón equivocada.
     */
    await editarProyecto(admin(), proyectoId, {
      organizationId: ORG_CLIENTE,
      nombre: "Proyecto Demo",
      servicio: "Phoenix PEEx",
      estado: "active",
      responsableId: OPERADOR,
    });
    check("el operador vuelve a ser responsable de su proyecto", await estaAsignado(operador(), proyectoId));

    const campoDe = async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        return "(aceptado)";
      } catch (e) {
        return (e as Error & { campo?: string }).campo ?? (e as Error).name;
      }
    };
    const estadoDe = async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        return 0;
      } catch (e) {
        return e instanceof ErrorDeAutorizacion ? e.status : -1;
      }
    };

    console.log("\nDU-29 — hitos: solo en los proyectos asignados, y el rechazo queda auditado (RF-152, RF-156):\n");
    const estadoHitoAjeno = await estadoDe(() =>
      crearHito(operador(), { projectId: ajeno, titulo: "Hito ajeno", venceEn: "2026-10-01" }),
    );
    check(
      "el operador NO crea un hito en un proyecto que no tiene asignado",
      estadoHitoAjeno === 403 || estadoHitoAjeno === 404,
      `estado ${estadoHitoAjeno}`,
    );
    check("y el intento queda auditado como rechazo", (await apuntes("milestone.create.denied", OPERADOR)).length === 1);
    check(
      "un hito sin título es un dato inválido, no una avería",
      (await campoDe(() => crearHito(admin(), { projectId: proyectoId, titulo: "   ", venceEn: "2026-10-01" }))) === "titulo",
    );
    check(
      "y uno con fecha imposible también",
      (await campoDe(() => crearHito(admin(), { projectId: proyectoId, titulo: "Entrega", venceEn: "no es una fecha" }))) === "fecha",
    );

    const hito = await crearHito(operador(), {
      projectId: proyectoId,
      titulo: "Entrega del diagnóstico",
      venceEn: "2026-10-15",
      posicion: 1,
    });
    check("en su proyecto asignado, el hito se crea pendiente y sin fecha de hecho", hito.estado === "pending" && hito.hechoEn === null);
    check("con la empresa copiada del proyecto, no de un parámetro", hito.organizationId === ORG_CLIENTE);
    check("y aparece en la lista del proyecto", (await hitosDeProyecto(admin(), proyectoId)).some((h) => h.id === hito.id));
    check("la creación queda auditada", (await apuntes("milestone.create", OPERADOR)).length === 1);

    const hecho = await actualizarHito(admin(), hito.id, { estado: "done" });
    check("marcarlo hecho pone la fecha", hecho?.estado === "done" && hecho.hechoEn !== null, JSON.stringify(hecho));
    const reabierto = await actualizarHito(admin(), hito.id, { estado: "pending" });
    check("y reabrirlo la quita: hecho ⇔ con fecha", reabierto?.estado === "pending" && reabierto.hechoEn === null);
    check("un hito que no existe para este actor es `null`, no un error", (await actualizarHito(admin(), "no-existe", { estado: "done" })) === null);

    console.log("\nDU-29 — pendientes: crear, cerrar y reabrir, con quién lo cerró (RF-151):\n");
    const estadoPendienteAjeno = await estadoDe(() =>
      crearPendiente(operador(), { projectId: ajeno, titulo: "Ajeno", cierra: "client" }),
    );
    check(
      "el operador NO crea un pendiente en un proyecto ajeno",
      estadoPendienteAjeno === 403 || estadoPendienteAjeno === 404,
      `estado ${estadoPendienteAjeno}`,
    );
    check("y queda auditado", (await apuntes("action_item.create.denied", OPERADOR)).length === 1);
    check(
      "un pendiente sin título es un dato inválido",
      (await campoDe(() => crearPendiente(admin(), { projectId: proyectoId, titulo: "", cierra: "client" }))) === "titulo",
    );
    check(
      "y uno con fecha límite imposible también",
      (await campoDe(() => crearPendiente(admin(), { projectId: proyectoId, titulo: "Organigrama", venceEn: "ayer", cierra: "client" }))) === "fecha",
    );

    const pendiente = await crearPendiente(operador(), {
      projectId: proyectoId,
      titulo: "Enviar el organigrama",
      venceEn: "2026-09-30",
      cierra: "client",
    });
    check("en su proyecto asignado, el pendiente se crea abierto y sin cierre", pendiente.estado === "open" && pendiente.hechoPor === null);
    check("y aparece entre los abiertos de la empresa", (await pendientesAbiertos(admin(), ORG_CLIENTE)).some((p) => p.id === pendiente.id));

    const cerrado = await cerrarPendiente(admin(), pendiente.id);
    check(
      "cerrarlo guarda quién y cuándo, del contexto y no de un parámetro",
      cerrado?.estado === "done" && cerrado.hechoPorTipo === "user" && cerrado.hechoPorId === ADMIN && cerrado.hechoEn !== null,
      JSON.stringify(cerrado),
    );
    check("y sale de los abiertos", !(await pendientesAbiertos(admin(), ORG_CLIENTE)).some((p) => p.id === pendiente.id));
    check("el cierre queda auditado", (await apuntes("action_item.close", ADMIN)).length === 1);
    const reabiertoP = await reabrirPendiente(admin(), pendiente.id);
    check(
      "reabrirlo borra el cierre entero",
      reabiertoP?.estado === "open" && reabiertoP.hechoEn === null && reabiertoP.hechoPor === null,
      JSON.stringify(reabiertoP),
    );
    check(
      "y vuelve a la lista del proyecto como abierto",
      (await pendientesDeProyecto(admin(), proyectoId)).some((p) => p.id === pendiente.id && p.estado === "open"),
    );

    console.log("\nDU-29 — noticias: de UNA empresa, y solo donde el operador tiene proyecto (RF-150, RF-152):\n");
    const noticiaBase = {
      titulo: "Nueva norma sectorial",
      resumenMd: "Resumen de la noticia.",
      comentarioMd: "Para esta empresa significa revisar el plan.",
      importancia: 1 as const,
      publicar: true,
    };
    // En la empresa de SLG el operador tiene membresía pero ningún proyecto:
    // sin prueba de asignación, el silencio vale «no».
    const estadoNoticiaAjena = await estadoDe(() => crearNoticia(operador(), { ...noticiaBase, organizationId: ORG_SLG }));
    check(
      "el operador NO escribe para una empresa donde no tiene proyecto",
      estadoNoticiaAjena === 403 || estadoNoticiaAjena === 404,
      `estado ${estadoNoticiaAjena}`,
    );
    check("y queda auditado", (await apuntes("news.create.denied", OPERADOR)).length === 1);
    check(
      "una noticia sin título es un dato inválido",
      (await campoDe(() => crearNoticia(admin(), { ...noticiaBase, titulo: "", organizationId: ORG_CLIENTE }))) === "titulo",
    );
    check(
      "y una con fuente que no es http(s) también",
      (await campoDe(() => crearNoticia(admin(), { ...noticiaBase, organizationId: ORG_CLIENTE, fuenteUrl: "javascript:alert(1)" }))) === "fuente",
    );

    const publicada = await crearNoticia(operador(), { ...noticiaBase, organizationId: ORG_CLIENTE, fuenteUrl: "https://ejemplo.test/norma" });
    check(
      "donde sí tiene proyecto, la publica con su autoría del contexto",
      publicada.publicadaEn !== null && publicada.autorTipo === "user" && publicada.autorId === OPERADOR,
      JSON.stringify(publicada),
    );
    const borrador = await crearNoticia(admin(), { ...noticiaBase, organizationId: ORG_CLIENTE, titulo: "Borrador", publicar: false });
    check("un borrador no lleva fecha de publicación ni autor", borrador.publicadaEn === null && borrador.autor === null);
    const deLaEmpresa = await noticias(admin(), { organizationId: ORG_CLIENTE });
    check("HQ ve las dos", deLaEmpresa.some((n) => n.id === publicada.id) && deLaEmpresa.some((n) => n.id === borrador.id));
    check(
      "y solo la publicada sale por `soloPublicadas`, que es lo que ve el portal",
      (await noticias(admin(), { organizationId: ORG_CLIENTE, soloPublicadas: true })).every((n) => n.id !== borrador.id),
    );
    check("la escritura queda auditada", (await apuntes("news.create", OPERADOR)).length === 1);

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

    /* ── Archivar y cerrar · nada se borra (data_model §2.5 y §4.3) ────── */
    console.log("\nArchivar una empresa — cambia el estado, queda auditado y NO borra nada (§2.5, §4.3):\n");

    /**
     * Un entregable de verdad colgando del proyecto: es lo que §4.3 promete que
     * se conserva, y se **cuenta** antes y después en vez de suponerlo. Se
     * siembra con el dueño porque publicarlo por el servicio pediría un
     * archivo, y aquí lo que se prueba es que sobrevive, no que se publica.
     */
    await dueno`insert into deliverable (id, project_id, organization_id, title, type, version, family_id, visibility, published_at)
                values (${crypto.randomUUID()}, ${proyectoId}, ${ORG_CLIENTE}, 'Informe final', 'pdf', 1, ${crypto.randomUUID()}, 'client', now())`;
    const cuenta = async () => {
      const [p] = await dueno<{ n: number }[]>`select count(*)::int as n from project where organization_id = ${ORG_CLIENTE}`;
      const [d] = await dueno<{ n: number }[]>`select count(*)::int as n from deliverable where organization_id = ${ORG_CLIENTE}`;
      const [m] = await dueno<{ n: number }[]>`select count(*)::int as n from membership where organization_id = ${ORG_CLIENTE}`;
      return { proyectos: Number(p?.n ?? -1), entregables: Number(d?.n ?? -1), pertenencias: Number(m?.n ?? -1) };
    };
    const antesDeArchivar = await cuenta();
    check(
      "hay algo que perder: dos proyectos y un entregable",
      antesDeArchivar.proyectos === 2 && antesDeArchivar.entregables === 1,
      JSON.stringify(antesDeArchivar),
    );

    const estadoArchivoAjeno = await estadoDe(() => archivarEmpresa(operador(), ORG_SLG));
    check(
      "el operador NO archiva una empresa que no tiene asignada",
      estadoArchivoAjeno === 403 || estadoArchivoAjeno === 404,
      `estado ${estadoArchivoAjeno}`,
    );
    check("y el intento queda auditado como rechazo", (await apuntes("org.archive.denied", OPERADOR)).length === 1);
    // Ni la empresa donde SÍ tiene un proyecto: archivar una empresa entera
    // —con los proyectos de otros y el acceso de todos sus miembros— no es
    // «operar sobre un proyecto asignado». Es una decisión de administrador.
    const estadoArchivoPropio = await estadoDe(() => archivarEmpresa(operador(), ORG_CLIENTE));
    check(
      "ni una donde tiene proyecto: archivar una empresa es de administrador",
      estadoArchivoPropio === 403 || estadoArchivoPropio === 404,
      `estado ${estadoArchivoPropio}`,
    );
    check("y la empresa sigue activa", (await empresas(admin())).find((e) => e.id === ORG_CLIENTE)?.estado === "active");

    const archivada = await archivarEmpresa(admin(), ORG_CLIENTE);
    check("el administrador la archiva y vuelve archivada", archivada?.estado === "archived", JSON.stringify(archivada));
    check(
      "y sigue en la lista de HQ, con su estado escrito",
      (await empresas(admin())).some((e) => e.id === ORG_CLIENTE && e.estado === "archived"),
    );
    check("el archivado queda auditado", (await apuntes("org.archive", ADMIN)).length === 1);
    const despuesDeArchivar = await cuenta();
    check(
      "NO se borra ningún proyecto, entregable ni pertenencia",
      JSON.stringify(despuesDeArchivar) === JSON.stringify(antesDeArchivar),
      `${JSON.stringify(antesDeArchivar)} → ${JSON.stringify(despuesDeArchivar)}`,
    );
    check(
      "y HQ sigue viendo sus proyectos",
      (await proyectos(admin())).filter((p) => p.organizationId === ORG_CLIENTE).length === antesDeArchivar.proyectos,
    );
    check("una empresa que no existe es `null`, no un error", (await archivarEmpresa(admin(), "no-existe")) === null);

    console.log("\nReactivar — la devuelve, con todo lo suyo y sin volver a invitar a nadie:\n");
    const reactivada = await reactivarEmpresa(admin(), ORG_CLIENTE);
    check("vuelve activa", reactivada?.estado === "active", JSON.stringify(reactivada));
    check("y queda auditado", (await apuntes("org.reactivate", ADMIN)).length === 1);
    check("con todo lo suyo intacto", JSON.stringify(await cuenta()) === JSON.stringify(antesDeArchivar));

    console.log("\nCerrar un proyecto — solo los asignados, y sus entregables se quedan (RF-86, §2.5):\n");
    const estadoCierreAjeno = await estadoDe(() => archivarProyecto(operador(), ajeno));
    check(
      "el operador NO cierra un proyecto que no es suyo",
      estadoCierreAjeno === 403 || estadoCierreAjeno === 404,
      `estado ${estadoCierreAjeno}`,
    );
    check("y el intento queda auditado como rechazo", (await apuntes("project.close.denied", OPERADOR)).length === 1);
    const cerradoProyecto = await archivarProyecto(operador(), proyectoId);
    check(
      "el suyo sí, y vuelve cerrado con su empresa",
      cerradoProyecto?.estado === "closed" && cerradoProyecto.organizationId === ORG_CLIENTE,
      JSON.stringify(cerradoProyecto),
    );
    check("el cierre queda auditado", (await apuntes("project.close", OPERADOR)).length === 1);
    check("sus entregables siguen ahí", (await cuenta()).entregables === antesDeArchivar.entregables);
    check("y HQ lo lista como cerrado", (await proyectos(admin())).some((p) => p.id === proyectoId && p.estado === "closed"));
    check("un proyecto que no existe es `null`, no un error", (await archivarProyecto(admin(), "no-existe")) === null);

    const reabiertoProyecto = await reabrirProyecto(admin(), proyectoId);
    check("reabrirlo lo devuelve a activo", reabiertoProyecto?.estado === "active", JSON.stringify(reabiertoProyecto));
    check("y queda auditado", (await apuntes("project.reopen", ADMIN)).length === 1);

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
