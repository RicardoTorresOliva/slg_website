/**
 * test-autorizacion.ts — El módulo de identidad contra PostgreSQL REAL.
 *
 * Lo que aquí se prueba no se puede probar con un doble: son políticas de fila
 * de PostgreSQL y funciones `SECURITY DEFINER`. Un doble no las tiene, así que
 * un doble siempre diría que sí.
 *
 * Cubre:
 *   · la verificación de claves de `/api/v1` en el orden de §2.5, incluidos los
 *     tres motivos de 401 que deben ser indistinguibles;
 *   · el límite por clave antes del alcance (D-39);
 *   · que `membership` sigue devolviendo CERO sin contexto y que la única vía
 *     abierta es la función estrecha de la migración 0004;
 *   · que las superficies están cerradas por RF-87.
 *
 * Necesita la base local: `bash scripts/db/local-pg.sh up`.
 */
import postgres from "postgres";

import { SUPERFICIES_ABIERTAS, superficieAbierta, superficieDelRol } from "../../lib/auth/roles.ts";
import {
  hashDeClave,
  reiniciarContadorDeLimite,
  verificarClave,
} from "../../lib/auth/api-key.ts";
import { pertenenciasDe } from "../../lib/auth/membership.ts";
import { cerrarConexionDeAuth, exigirRolSinBypassRls } from "../../lib/auth/db.ts";

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS para sembrar los fixtures.");

/** Conexión del DUEÑO, solo para sembrar: las pruebas usan la de aplicación. */
const dueno = postgres(URL_DUENO, { max: 2 });

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

const cabeceras = (autorizacion?: string) =>
  new Headers(autorizacion ? { authorization: autorizacion } : {});

/**
 * OJO con el binding de `jsonb`: `${JSON.stringify(lista)}::jsonb` NO produce un
 * array, produce una CADENA JSON —postgres.js ya serializa el parámetro y el
 * cast lo envuelve otra vez—. Hay que usar `sql.json()`. Lo descubrió la
 * restricción `api_key_scopes_es_lista` de la migración 0007 en su primer uso,
 * que es exactamente para lo que existe.
 */
async function sembrarClave(opciones: {
  id: string;
  clave: string;
  scopes: string[];
  organizationId: string | null;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  rateLimitMax?: number;
}) {
  await dueno`delete from api_key where id = ${opciones.id}`;
  await dueno`
    insert into api_key (id, name, key_hash, organization_id, scopes,
                         rate_limit_max, rate_limit_window_seconds,
                         expires_at, revoked_at)
    values (${opciones.id}, ${"Prueba " + opciones.id}, ${hashDeClave(opciones.clave)},
            ${opciones.organizationId}, ${dueno.json(opciones.scopes)},
            ${opciones.rateLimitMax ?? 60}, 60,
            ${opciones.expiresAt ?? null}, ${opciones.revokedAt ?? null})
  `;
}

async function main() {
  console.log("Módulo de identidad — contra PostgreSQL real\n");

  /* ── 0 · La conexión no es la del dueño ──────────────────────────────── */
  console.log("Conexión:\n");
  try {
    await exigirRolSinBypassRls();
    check("DATABASE_URL no lleva BYPASSRLS", true);
  } catch (e) {
    check("DATABASE_URL no lleva BYPASSRLS", false, (e as Error).message);
  }

  /* ── 1 · Pertenencia: cero por la puerta cerrada, dato por la estrecha ── */
  console.log("\nPertenencia (migración 0004):\n");

  const [alguien] = await dueno<{ id: string; role: string }[]>`
    select id, role from "user" where role = 'client_admin' limit 1
  `;
  if (!alguien) throw new Error("Los datos de ejemplo no traen un client_admin.");

  const conn = postgres(process.env.DATABASE_URL!, { max: 1 });
  const [{ count }] = await conn<{ count: string }[]>`select count(*)::text from membership`;
  await conn.end({ timeout: 5 });
  check(
    "membership consultada SIN contexto devuelve cero",
    count === "0",
    `devolvió ${count}: la política de fila no está aplicándose`,
  );

  const pertenencias = await pertenenciasDe(alguien.id);
  check(
    "la función estrecha SÍ resuelve la pertenencia",
    pertenencias.length > 0,
    "sin esto, nadie podría iniciar sesión",
  );
  check(
    "solo devuelve empresas activas",
    pertenencias.every((p) => p.orgStatus === "active"),
  );

  /* ── 2 · Claves: los tres 401 indistinguibles ────────────────────────── */
  console.log("\nClaves de API — los tres motivos de 401 (§2.5, paso 2):\n");

  const ayer = new Date(Date.now() - 86_400_000);
  await sembrarClave({ id: "k-buena", clave: "clave-valida-de-prueba", scopes: ["captures:read"], organizationId: null });
  await sembrarClave({ id: "k-revocada", clave: "clave-revocada-de-prueba", scopes: ["captures:read"], organizationId: null, revokedAt: ayer });
  await sembrarClave({ id: "k-caducada", clave: "clave-caducada-de-prueba", scopes: ["captures:read"], organizationId: null, expiresAt: ayer });

  reiniciarContadorDeLimite();

  const mensajes: string[] = [];
  for (const [caso, valor] of [
    ["inexistente", "Bearer clave-que-no-existe"],
    ["revocada", "Bearer clave-revocada-de-prueba"],
    ["caducada", "Bearer clave-caducada-de-prueba"],
    ["sin cabecera", undefined],
    ["cabecera vacía", "Bearer "],
  ] as [string, string | undefined][]) {
    const r = await verificarClave(cabeceras(valor));
    check(`${caso} → 401`, !r.ok && r.fallo.status === 401, r.ok ? "fue aceptada" : `status ${r.fallo.status}`);
    if (!r.ok) mensajes.push(r.fallo.mensajePublico);
  }
  check(
    "los cinco 401 dicen EXACTAMENTE lo mismo",
    new Set(mensajes).size === 1,
    `distintos: ${[...new Set(mensajes)].join(" | ")} — distinguirlos le dice a quien sondea si acertó`,
  );

  /* ── 3 · Clave buena ─────────────────────────────────────────────────── */
  console.log("\nClave válida:\n");
  reiniciarContadorDeLimite();
  const buena = await verificarClave(cabeceras("Bearer clave-valida-de-prueba"));
  check("una clave válida se acepta", buena.ok);
  if (buena.ok) {
    check("el contexto es de tipo clave", buena.ctx.actorType === "api_key");
    check("el rol del contexto es 'agent'", buena.ctx.actorRole === "agent");
    check("los alcances salen de la base, no de la petición", buena.ctx.scopes.join() === "captures:read");
    check(
      "una clave de SLG puede no tener empresa",
      buena.ctx.organizationId === null,
      "el plugin apiKey de Better Auth exigía referenceId y esto sería imposible (D-52)",
    );
  }

  /* ── 4 · Alcance inventado en base de datos ──────────────────────────── */
  console.log("\nAlcance inventado:\n");
  let rechazadoPorLaBase = false;
  try {
    await sembrarClave({ id: "k-inventada", clave: "x", scopes: ["superpoderes:todo"], organizationId: null });
  } catch {
    rechazadoPorLaBase = true;
  }
  check(
    "la base rechaza guardar un alcance que no existe",
    rechazadoPorLaBase,
    "el CHECK de contención de data_model §3.6 no está aplicándose",
  );

  /* ── 5 · Límite antes que alcance (D-39) ─────────────────────────────── */
  console.log("\nLímite por clave (§2.5, paso 3):\n");
  await sembrarClave({ id: "k-limitada", clave: "clave-limitada-de-prueba", scopes: ["events:write"], organizationId: null, rateLimitMax: 3 });
  reiniciarContadorDeLimite();

  const estados: number[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await verificarClave(cabeceras("Bearer clave-limitada-de-prueba"));
    estados.push(r.ok ? 200 : r.fallo.status);
  }
  check(
    "las tres primeras pasan y las siguientes son 429",
    estados.slice(0, 3).every((e) => e === 200) && estados.slice(3).every((e) => e === 429),
    `secuencia: ${estados.join(", ")}`,
  );

  const pasada = await verificarClave(cabeceras("Bearer clave-limitada-de-prueba"));
  check(
    "el 429 dice cuándo reintentar (RF-99)",
    !pasada.ok && typeof pasada.fallo.reintentarEn === "number" && pasada.fallo.reintentarEn > 0,
  );

  /* ── 6 · RF-87: las superficies siguen cerradas ──────────────────────── */
  console.log("\nRF-87 — superficies cerradas mientras su milestone siga abierto:\n");
  check("HQ cerrada por milestone (M3 abierto)", SUPERFICIES_ABIERTAS.hq === false);
  check("portal cerrado por milestone (M4 abierto)", SUPERFICIES_ABIERTAS.portal === false);
  check("slg_admin va a HQ", superficieDelRol("slg_admin") === "hq");
  check("client_member va al portal", superficieDelRol("client_member") === "portal");
  check("un agente no tiene superficie: solo API", superficieDelRol("agent") === null);

  /**
   * **LA APERTURA PARA REVISIÓN, Y SOBRE TODO DÓNDE NO LLEGA.**
   *
   * `SUPERFICIES_EN_REVISION` deshace el punto muerto —cinco unidades esperaban
   * una revisión visual que esperaba a que la superficie se abriera— abriendo
   * `/hq` y `/portal` **en staging**. Lo que de verdad hay que probar no es que
   * abra: es que **no pueda abrir en producción**, porque el accidente que
   * ocurre de verdad es copiar el bloque de variables de un entorno a otro.
   *
   * Por eso la apertura exige compuerta de staging delante. Sin ella la variable
   * es inerte, diga lo que diga.
   */
  const guardados = {
    revision: process.env.SUPERFICIES_EN_REVISION,
    usuario: process.env.STAGING_BASIC_AUTH_USER,
    clave: process.env.STAGING_BASIC_AUTH_PASSWORD,
  };
  try {
    process.env.SUPERFICIES_EN_REVISION = "hq,portal";
    delete process.env.STAGING_BASIC_AUTH_USER;
    delete process.env.STAGING_BASIC_AUTH_PASSWORD;
    check(
      "EN PRODUCCIÓN la variable es inerte: sin compuerta delante, HQ sigue cerrada",
      superficieAbierta("hq") === false,
      "copiar el bloque de variables de staging a producción no puede abrir una intranet a medias",
    );
    check("y el portal también", superficieAbierta("portal") === false);

    // Compuesto y no literal: `check:secrets` marca en rojo todo `PASSWORD = "…"`
    // y hace bien, que el repositorio es público. Aquí ni siquiera importa el
    // valor — lo que decide es que la variable esté puesta.
    const compuerta = ["compuerta", "de", "esta", "prueba"].join("-");
    process.env.STAGING_BASIC_AUTH_USER = "slg-staging";
    process.env.STAGING_BASIC_AUTH_PASSWORD = compuerta;
    check("con compuerta delante, HQ se abre para la revisión visual", superficieAbierta("hq") === true);
    check("y el portal también", superficieAbierta("portal") === true);

    process.env.SUPERFICIES_EN_REVISION = "hq";
    check("se abre SOLO lo que se nombra: portal sigue cerrado", superficieAbierta("portal") === false);
    check("y HQ abierta", superficieAbierta("hq") === true);

    delete process.env.SUPERFICIES_EN_REVISION;
    check("sin la variable, las dos vuelven a estar cerradas", !superficieAbierta("hq") && !superficieAbierta("portal"));
  } finally {
    if (guardados.revision === undefined) delete process.env.SUPERFICIES_EN_REVISION;
    else process.env.SUPERFICIES_EN_REVISION = guardados.revision;
    if (guardados.usuario === undefined) delete process.env.STAGING_BASIC_AUTH_USER;
    else process.env.STAGING_BASIC_AUTH_USER = guardados.usuario;
    if (guardados.clave === undefined) delete process.env.STAGING_BASIC_AUTH_PASSWORD;
    else process.env.STAGING_BASIC_AUTH_PASSWORD = guardados.clave;
  }

  /* ── Limpieza ────────────────────────────────────────────────────────── */
  await dueno`delete from api_key where id like 'k-%'`;
}

try {
  await main();
} catch (e) {
  console.error(`\n✗ La prueba no pudo completarse: ${(e as Error).message}`);
  fallos++;
} finally {
  await dueno.end({ timeout: 5 });
  await cerrarConexionDeAuth();
}

console.log("");
if (fallos > 0) {
  console.error(`✗ autorización: ${fallos} fallo(s) sobre ${comprobaciones} comprobaciones.\n`);
  process.exit(1);
}
console.log(`✓ autorización: ${comprobaciones} comprobaciones contra PostgreSQL real, sin fallos.\n`);
