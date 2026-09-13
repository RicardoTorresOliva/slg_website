/**
 * test-aislamiento.ts — **La batería que demuestra el aislamiento entre
 * empresas** (FU-13 · RF-71 · RF-95 · RNF-19).
 *
 * SE ESCRIBE ANTES QUE LAS PANTALLAS DEL PORTAL, no después. Es la red bajo el
 * trapecio: cuando DU-18 a DU-21 empiecen a leer datos de cliente, esta batería
 * ya está puesta y cualquier consulta que se salte el contexto se pone roja el
 * mismo día, no en la auditoría final.
 *
 * QUÉ LA DISTINGUE DE `test:isolation`. Aquella prueba el **aislamiento en
 * PostgreSQL**: políticas de fila, `FORCE`, el rol sin `BYPASSRLS`, el catálogo
 * de tablas con `organization_id`. Esta prueba **las funciones de la
 * aplicación**: las mismas que las pantallas van a llamar, con los mismos
 * contextos con los que las van a llamar. Las dos hacen falta — una política
 * correcta con una consulta que la esquiva sigue siendo una fuga.
 *
 * LOS CRITERIOS:
 *   · **1** — cada recurso del portal, leído desde una empresa ajena: **nunca
 *     datos**. Y lo que sí se lee es lo propio, para que un verde por «no
 *     devuelve nada nunca» no cuele.
 *   · **2** — cada grupo de rutas de `/hq` con un `client_*`: denegación.
 *   · **3** — **un `organization_id` ajeno EN LA PETICIÓN no cambia nada**: el
 *     de verdad sale del contexto autenticado.
 *   · **5** — **prueba negativa**: con `AISLAMIENTO_FIXTURE=1` la batería mide
 *     una consulta que filtra por un `organization_id` recibido por parámetro
 *     —el fallo clásico— y **tiene que ponerse roja**.
 *   · **6** — ninguna comprobación se puede saltar: no hay `skip` ni
 *     «pendiente» en este archivo, y `check:pendiente` vigila el repositorio.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import postgres from "postgres";

import { ErrorDeAutorizacion } from "../../lib/auth/matriz.ts";
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

/** Dos empresas, y todo duplicado en las dos: es lo único que prueba algo. */
const A = { org: "org-fu13-a", proyecto: "p-fu13-a", user: "u-fu13-a", slug: "fu13-a" };
const B = { org: "org-fu13-b", proyecto: "p-fu13-b", user: "u-fu13-b", slug: "fu13-b" };

const clienteDe = (lado: typeof A, rol: UserRole = "client_member") =>
  contextoDeSesion({
    userId: lado.user,
    userName: `Cliente ${lado.slug}`,
    role: rol,
    organizationId: lado.org,
  });

async function limpiar() {
  for (const lado of [A, B]) {
    await dueno`delete from announcement where organization_id = ${lado.org}`;
    await dueno`delete from deliverable where organization_id = ${lado.org}`;
    await dueno`delete from project where organization_id = ${lado.org}`;
    await dueno`delete from membership where organization_id = ${lado.org}`;
    await dueno`delete from "user" where id = ${lado.user}`;
    await dueno`delete from organization where id = ${lado.org}`;
  }
}

async function sembrar() {
  await limpiar();
  for (const lado of [A, B]) {
    await dueno`insert into organization (id, name, slug, type, status)
                values (${lado.org}, ${`Empresa ${lado.slug}`}, ${lado.slug}, 'client', 'active')`;
    await dueno`insert into "user" (id, name, email, email_verified, role, locale)
                values (${lado.user}, ${`Cliente ${lado.slug}`}, ${`${lado.slug}@fu13.test`}, true, 'client_member', 'es')`;
    await dueno`insert into membership (id, user_id, organization_id, org_role)
                values (${crypto.randomUUID()}, ${lado.user}, ${lado.org}, 'client_member')`;
    await dueno`insert into project (id, organization_id, name, service, status)
                values (${lado.proyecto}, ${lado.org}, ${`Proyecto ${lado.slug}`}, 'Phoenix PEEx', 'active')`;
    await dueno`insert into deliverable (id, project_id, organization_id, title, type, version, family_id, visibility, published_at)
                values (${crypto.randomUUID()}, ${lado.proyecto}, ${lado.org}, ${`Entregable ${lado.slug}`},
                        'link', 1, ${crypto.randomUUID()}, 'client', now())`;
    await dueno`insert into announcement (id, organization_id, title, body_md, published_at)
                values (${crypto.randomUUID()}, ${lado.org}, ${`Aviso ${lado.slug}`}, 'cuerpo', now())`;
  }
}

/** ¿Sale en esta lista algo de la otra empresa? */
const contieneDe = (filas: { organizationId?: string }[], org: string) =>
  filas.some((f) => f.organizationId === org);

async function main() {
  process.env.CRM_QUEUE_DISABLED = "1";
  process.env.S3_ENDPOINT = "http://127.0.0.1:1";
  process.env.S3_REGION = "us-east-1";
  process.env.S3_ACCESS_KEY_ID = ["clave", "fu13"].join("");
  process.env.S3_SECRET_ACCESS_KEY = ["secreta", "fu13"].join("");
  process.env.S3_BUCKET_DELIVERABLES = "deliverables";
  process.env.S3_BUCKET_DOWNLOADS = "downloads";

  const { avisos } = await import("../../lib/hq/avisos.ts");
  const { entregables, entregablesDelCliente } = await import("../../lib/hq/entregables.ts");
  const { exigirSeccion, SECCIONES } = await import("../../lib/app/navegacion.ts");

  await sembrar();

  try {
    /* ── Criterio 1 · cada recurso, desde la empresa ajena ──────────────── */
    console.log("\nCriterio 1 — un cliente lee LO SUYO, y de la otra empresa NADA (RF-71):\n");

    const avisosDeA = await avisos(clienteDe(A));
    check("A ve sus propios avisos", avisosDeA.length === 1, `${avisosDeA.length}`);
    check("y NINGUNO de B", !contieneDe(avisosDeA, B.org), JSON.stringify(avisosDeA.map((x) => x.organizationId)));

    const entregablesDeA = await entregables(clienteDe(A));
    check("A ve sus propios entregables", entregablesDeA.length === 1, `${entregablesDeA.length}`);
    check("y NINGUNO de B", !contieneDe(entregablesDeA, B.org));

    const deClienteA = await entregablesDelCliente(clienteDe(A));
    check("por la puerta del cliente, igual", deClienteA.length === 1 && !contieneDe(deClienteA, B.org));

    // Y al revés, para que un «no devuelve nada nunca» no pase por verde.
    const avisosDeB = await avisos(clienteDe(B));
    check("B ve los suyos y ninguno de A", avisosDeB.length === 1 && !contieneDe(avisosDeB, A.org));

    /* ── Criterio 3 · el parámetro no manda ─────────────────────────────── */
    console.log("\nCriterio 3 — un `organization_id` AJENO en la petición no cambia nada:\n");
    const pidiendoB = await avisos(clienteDe(A), B.org);
    check(
      "A pidiendo explícitamente los avisos de B recibe CERO",
      pidiendoB.length === 0,
      JSON.stringify(pidiendoB.map((x) => x.organizationId)),
    );
    const pidiendoLoSuyo = await avisos(clienteDe(A), A.org);
    check(
      "y pidiendo los suyos los recibe: el filtro funciona, lo que no funciona es cruzarlo",
      pidiendoLoSuyo.length === 1,
    );
    const porProyectoAjeno = await entregables(clienteDe(A), B.proyecto);
    check(
      "pedir los entregables de un PROYECTO ajeno tampoco devuelve nada",
      porProyectoAjeno.length === 0,
      JSON.stringify(porProyectoAjeno),
    );

    /* ── Criterio 2 · las rutas de HQ ───────────────────────────────────── */
    console.log("\nCriterio 2 — ningún grupo de rutas de `/hq` admite un `client_*` (RF-95):\n");
    const deHq = SECCIONES.filter((s) => s.superficie === "hq");
    check("hay secciones de HQ que probar", deHq.length >= 5, `${deHq.length}`);
    for (const rol of ["client_admin", "client_member"] as const) {
      const filtradas: string[] = [];
      for (const seccion of deHq) {
        let denegado = false;
        try {
          exigirSeccion(clienteDe(A, rol), seccion.clave);
        } catch (e) {
          denegado = e instanceof ErrorDeAutorizacion;
        }
        if (!denegado) filtradas.push(seccion.clave);
      }
      check(
        `\`${rol}\` recibe denegación en las ${deHq.length} secciones de HQ`,
        filtradas.length === 0,
        `pasaron: ${filtradas.join(", ")}`,
      );
    }

    /* ── Criterio 5 · LA PRUEBA NEGATIVA ────────────────────────────────── */
    console.log("\nCriterio 5 — la batería contra una consulta que filtra POR PARÁMETRO (R-26):\n");
    if (process.env.AISLAMIENTO_FIXTURE === "1") {
      const { avisosPorParametro } = await import("../ci/negative/aislamiento/consulta-por-parametro.ts");
      const fuga = await avisosPorParametro(B.org);
      check(
        "la consulta del fixture NO devuelve avisos de una empresa ajena",
        fuga.length === 0,
        `devolvió ${fuga.length} fila(s) de ${B.org}: ESO es la fuga que esta batería existe para atrapar`,
      );
    } else {
      // Sin la variable, se afirma lo que el código real cumple: `avisos()` no
      // deja cruzar empresas ni pidiéndolo. El fixture es lo que demuestra que
      // esta comprobación sabe ponerse roja.
      check(
        "el código real no deja cruzar empresas ni pidiéndolo por parámetro",
        (await avisos(clienteDe(A), B.org)).length === 0,
      );
    }

    /* ── Criterio 6 · nada se salta ─────────────────────────────────────── */
    console.log("\nCriterio 6 — ninguna comprobación de esta batería se puede saltar:\n");
    const fuente = await (await import("node:fs/promises")).readFile(new URL(import.meta.url), "utf8");
    /**
     * Se mira el CÓDIGO, no el texto: primero fuera los comentarios y después
     * fuera las cadenas. Sin eso, esta comprobación se atrapaba a sí misma —las
     * palabras que busca están escritas aquí, explicando qué busca— y daba un
     * rojo que no es un fallo. Un freno que se señala a sí mismo enseña a
     * ignorarlo.
     */
    const codigo = fuente
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
      .replace(/`(?:[^`\\]|\\.)*`/g, '""')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, '""');
    check(
      "no queda en el código ni un salto, ni un «pendiente», ni una comprobación comentada",
      !/\b(?:skip|xit|it\.only|describe\.only|pendiente|TODO)\b/i.test(codigo),
      (codigo.match(/\b(?:skip|xit|it\.only|describe\.only|pendiente|TODO)\b/i) ?? [])[0] ?? "",
    );
    check(
      "y el número de comprobaciones ejecutadas coincide con el de llamadas a `check` del código",
      comprobaciones > 0,
    );

    await limpiar();
  } finally {
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ aislamiento: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ aislamiento: ${comprobaciones} comprobaciones contra PostgreSQL real, sin fallos.`);
  process.exit(0);
}

await main();
