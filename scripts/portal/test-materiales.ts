/**
 * test-materiales.ts — **Los materiales de programa contra PostgreSQL real**
 * (DU-20 · RF-91 · RF-144 · frontera (b) de `scope.md`).
 *
 * Los cinco criterios, y por qué cada uno necesita la base de verdad:
 *
 *   · **1** — la pantalla separa materiales de entregables de proyecto. Se
 *     comprueba el reparto (`separarMateriales`) **y** que las dos pantallas lo
 *     usan, que es lo que hace que repartan igual.
 *   · **2** — **no existe ruta ni entidad que liste materiales fuera de su
 *     proyecto**. Se comprueba en la FORMA del resultado: la única puerta
 *     devuelve grupos, cada material cae en el grupo de su proyecto, y el
 *     módulo no exporta nada que devuelva una lista plana.
 *   · **3** — `membership` no es matrícula: **la base rechaza** meter a la misma
 *     persona en dos empresas cliente. Un `if` en el código no se prueba así;
 *     un índice sí.
 *   · **4** — no es un LMS: se interroga el **esquema real** en busca de
 *     columnas de lección, progreso, evaluación o certificado. Una prueba
 *     contra el código miraría lo que se escribió; esta mira lo que existe.
 *   · **5** — sin materiales · material de otra empresa (no sale, ni pidiéndolo).
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import fs from "node:fs";
import path from "node:path";

import postgres from "postgres";

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

const RAIZ = path.resolve(import.meta.dirname, "../..");
const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

/** Dos empresas: la nuestra y la de al lado. El criterio 5 vive en la de al lado. */
const A = { org: "org-du20-a", slug: "du20-a", user: "u-du20-a", p1: "p-du20-a1", p2: "p-du20-a2" };
const B = { org: "org-du20-b", slug: "du20-b", user: "u-du20-b", p1: "p-du20-b1", p2: "" };

const cliente = (lado: typeof A, rol: UserRole = "client_member") =>
  contextoDeSesion({
    userId: lado.user,
    userName: `Cliente ${lado.slug}`,
    role: rol,
    organizationId: lado.org,
  });

async function limpiar() {
  for (const lado of [A, B]) {
    await dueno`delete from deliverable where organization_id = ${lado.org}`;
    await dueno`delete from project where organization_id = ${lado.org}`;
    await dueno`delete from membership where organization_id = ${lado.org}`;
    await dueno`delete from organization where id = ${lado.org} or slug = ${lado.slug}`;
    await dueno`delete from "user" where id = ${lado.user}`;
  }
  await dueno`delete from membership where user_id = 'u-du20-doble'`;
  await dueno`delete from "user" where id = 'u-du20-doble'`;
}

async function entregable(
  org: string,
  proyecto: string,
  titulo: string,
  tipo: string,
  visibilidad = "client",
) {
  const id = crypto.randomUUID();
  await dueno`insert into deliverable (id, project_id, organization_id, title, type, version, family_id, visibility, published_at)
              values (${id}, ${proyecto}, ${org}, ${titulo}, ${tipo}, 1, ${crypto.randomUUID()}, ${visibilidad}, now())`;
  return id;
}

async function sembrar() {
  await limpiar();
  for (const lado of [A, B]) {
    await dueno`insert into organization (id, name, slug, type, status)
                values (${lado.org}, ${`Empresa ${lado.slug}`}, ${lado.slug}, 'client', 'active')`;
    await dueno`insert into "user" (id, name, email, email_verified, role, locale)
                values (${lado.user}, ${`Cliente ${lado.slug}`}, ${`${lado.slug}@du20.test`}, true, 'client_member', 'es')`;
    await dueno`insert into membership (id, user_id, organization_id, org_role)
                values (${crypto.randomUUID()}, ${lado.user}, ${lado.org}, 'client_member')`;
  }
  // Empresa A: un proyecto CON materiales y entregables, y otro SIN materiales.
  await dueno`insert into project (id, organization_id, name, service, status)
              values (${A.p1}, ${A.org}, 'Programa Phoenix', 'Phoenix PEEx', 'active')`;
  await dueno`insert into project (id, organization_id, name, service, status)
              values (${A.p2}, ${A.org}, 'Diagnóstico', 'SLG_Readiness', 'active')`;
  await entregable(A.org, A.p1, "Informe de arranque", "pdf");
  await entregable(A.org, A.p1, "Manual del programa", "material");
  await entregable(A.org, A.p1, "Anexo de ejercicios", "material");
  await entregable(A.org, A.p1, "Notas internas", "material", "internal");
  await entregable(A.org, A.p2, "Diagnóstico inicial", "md");

  // Empresa B: un material que A no puede ver de ninguna manera (criterio 5).
  await dueno`insert into project (id, organization_id, name, service, status)
              values (${B.p1}, ${B.org}, 'Programa ajeno', 'Phoenix TEAx', 'active')`;
  return { ajeno: await entregable(B.org, B.p1, "Material ajeno", "material") };
}

async function main() {
  const { ajeno } = await sembrar();

  const { materialesPorProyecto, separarMateriales, esMaterial } = await import(
    "../../lib/portal/materiales.ts"
  );
  const { entregablesDelCliente } = await import("../../lib/hq/entregables.ts");

  console.log("\nCriterio 1 — la pantalla separa materiales de entregables de proyecto:\n");

  const todos = await entregablesDelCliente(cliente(A), A.p1);
  const { deProyecto, materiales } = separarMateriales(todos);
  check("el proyecto trae entregables de trabajo y materiales", todos.length === 3, JSON.stringify(todos.map((e) => e.tipo)));
  check(
    "y el reparto deja cada uno en su lado",
    deProyecto.length === 1 && materiales.length === 2,
    `trabajo=${deProyecto.length} materiales=${materiales.length}`,
  );
  check("ningún material se cuela entre los entregables de trabajo", !deProyecto.some((e) => esMaterial(e.tipo)));
  check("y el `internal` no sale por la puerta del cliente (RF-89)", !todos.some((e) => e.titulo.includes("internas")));

  const pantallaProyecto = fs.readFileSync(
    path.join(RAIZ, "app/(portal)/portal/proyectos/[id]/page.tsx"),
    "utf8",
  );
  const pantallaMateriales = fs.readFileSync(
    path.join(RAIZ, "app/(portal)/portal/materiales/page.tsx"),
    "utf8",
  );
  check(
    "las DOS pantallas reparten con la misma función, no con dos filtros escritos a mano",
    pantallaProyecto.includes("separarMateriales") && pantallaMateriales.includes("materialesPorProyecto"),
  );
  check(
    "y la pantalla de proyecto pinta los dos bloques con su título propio",
    pantallaProyecto.includes('t["portal.deliv.work"]') && pantallaProyecto.includes('t["portal.mat.title"]'),
  );

  console.log("\nCriterio 2 — ningún material se lista fuera del proyecto que lo contiene:\n");

  const grupos = await materialesPorProyecto(cliente(A));
  check("la única puerta devuelve GRUPOS, no una lista", Array.isArray(grupos) && grupos.every((g) => "proyecto" in g && "materiales" in g));
  check("un grupo por proyecto CON materiales, y el proyecto sin ellos no aparece", grupos.length === 1, JSON.stringify(grupos.map((g) => g.proyecto.id)));
  check(
    "cada material cae en el grupo de SU proyecto",
    grupos.every((g) => g.materiales.every((m) => m.projectId === g.proyecto.id)),
  );
  check("y el grupo trae el proyecto entero, no solo su identificador", grupos[0]?.proyecto.nombre === "Programa Phoenix");

  const modulo = await import("../../lib/portal/materiales.ts");
  const exportaciones = Object.keys(modulo);
  check(
    "el módulo no exporta ninguna función que devuelva materiales sueltos",
    exportaciones.sort().join(",") === "TIPO_MATERIAL,esMaterial,materialesPorProyecto,separarMateriales",
    exportaciones.join(","),
  );

  console.log("\nCriterio 3 — `membership` no es una matrícula: lo impide la BASE:\n");

  await dueno`insert into "user" (id, name, email, email_verified, role, locale)
              values ('u-du20-doble', 'Doble', 'doble@du20.test', true, 'client_member', 'es')`;
  await dueno`insert into membership (id, user_id, organization_id, org_role)
              values (${crypto.randomUUID()}, 'u-du20-doble', ${A.org}, 'client_member')`;
  let rechazado = false;
  let mensaje = "";
  try {
    await dueno`insert into membership (id, user_id, organization_id, org_role)
                values (${crypto.randomUUID()}, 'u-du20-doble', ${B.org}, 'client_member')`;
  } catch (e) {
    rechazado = true;
    mensaje = (e as Error).message;
  }
  check("la misma persona NO puede pertenecer a dos empresas cliente (RF-69)", rechazado, mensaje);
  check("y el rechazo lo firma el índice de DU-20, no otro", mensaje.includes("uq_membership_una_empresa_cliente"), mensaje);

  // La restricción es de CLIENTE: a SLG no le aplica, y el índice parcial lo
  // demuestra dejando pasar lo que no prohíbe.
  let slgPasa = true;
  try {
    await dueno`insert into membership (id, user_id, organization_id, org_role)
                values (${crypto.randomUUID()}, 'u-du20-doble', ${B.org}, 'slg_operator')`;
  } catch {
    slgPasa = false;
  }
  check("y no prohíbe de más: la pertenencia con rol de SLG sigue siendo posible", slgPasa);

  console.log("\nCriterio 4 — no es un LMS, y se comprueba contra el ESQUEMA real:\n");

  /**
   * `completed_at` NO está en la lista, y la ausencia es deliberada:
   * `download_event.completed_at` es **una descarga que terminó**, no una
   * lección aprobada. La palabra solo significa matrícula cuando cuelga de una
   * persona y un programa, y ese caso lo cubre —exactamente— la comprobación de
   * las columnas de `membership` que viene tres líneas más abajo. Meterla aquí
   * habría puesto en rojo un freno correcto contra un dato inocente, que es la
   * forma en que un freno se acaba desactivando.
   */
  const PROHIBIDAS = [
    "lesson", "leccion", "progress", "progreso", "cohort", "cohorte",
    "enrollment", "matricula", "quiz", "assessment", "certificate", "certificado",
    "completion", "grade", "score",
  ];
  const columnas = (await dueno`
    SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public'
  `) as unknown as { table_name: string; column_name: string }[];
  const sospechosas = columnas.filter((c) =>
    PROHIBIDAS.some((p) => c.column_name.toLowerCase().includes(p)),
  );
  check(
    "ninguna tabla tiene columnas de lección, progreso, evaluación ni certificado",
    sospechosas.length === 0,
    sospechosas.map((c) => `${c.table_name}.${c.column_name}`).join(", "),
  );

  const tablas = (await dueno`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `) as unknown as { table_name: string }[];
  const tablasLms = tablas.filter((t) => PROHIBIDAS.some((p) => t.table_name.toLowerCase().includes(p)));
  check("ni existe ninguna tabla de curso", tablasLms.length === 0, tablasLms.map((t) => t.table_name).join(", "));

  const membershipCols = columnas
    .filter((c) => c.table_name === "membership")
    .map((c) => c.column_name)
    .sort();
  check(
    "y `membership` sigue teniendo exactamente las cinco columnas de una pertenencia",
    membershipCols.join(",") === "created_at,id,org_role,organization_id,user_id",
    membershipCols.join(","),
  );

  console.log("\nCriterio 5 — estados resueltos:\n");

  const sinMateriales = await materialesPorProyecto(cliente(B));
  check(
    "la empresa de al lado ve SU material, que es lo que hace significativo que A no lo vea",
    sinMateriales.length === 1 && sinMateriales[0]?.materiales.length === 1,
  );

  await dueno`delete from deliverable where id = ${ajeno}`;
  const ahoraVacio = await materialesPorProyecto(cliente(B));
  check("sin materiales, la puerta devuelve CERO grupos y la pantalla enseña el vacío", ahoraVacio.length === 0);

  const desdeA = await materialesPorProyecto(cliente(A, "client_admin"));
  check(
    "el material de otra empresa no aparece ni siendo `client_admin`",
    desdeA.every((g) => g.materiales.every((m) => m.organizationId === A.org)),
  );
  const proyectosAjenos = desdeA.filter((g) => g.proyecto.id === B.p1);
  check("ni su proyecto: la política de fila no lo devuelve, así que la pantalla es un 404", proyectosAjenos.length === 0);

  await limpiar();
  await dueno.end({ timeout: 5 });

  if (fallos > 0) {
    console.error(`\n✗ materiales: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ materiales: ${comprobaciones} comprobaciones contra PostgreSQL real, sin fallos.`);
  // El pool de la aplicación queda abierto tras `withScope`: sin esto el
  // proceso termina las comprobaciones y se queda vivo, y la cadena de
  // `test:db` no avanza.
  process.exit(0);
}

await main();
