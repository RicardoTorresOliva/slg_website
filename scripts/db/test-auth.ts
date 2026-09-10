/**
 * test-auth.ts — Pruebas de FU-06: matriz B.3, alcances, superficies, claves.
 *
 * Corre contra PostgreSQL real (aislamiento de FU-04), no contra supuestos.
 * `membership` y `api_key` están en `ORG_SCOPED_TABLES`: todo lo que las toca
 * pasa por `withScope`/`withSystemScope`, igual que el código real — probar
 * con una conexión sin contexto habría dado falsos negativos por RLS, no por
 * un fallo de la lógica.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { contextoDeClaveApi, contextoDeSesion, type AuthContext } from "../../lib/db/context.ts";
import { withScope } from "../../lib/db/scope.ts";
import { exigir, puedeHacer, type Accion } from "../../lib/auth/permissions.ts";
import { evaluarSuperficie, organizacionDelUsuario } from "../../lib/auth/org.ts";
import { crearClaveApi, verificarClaveApi, revocarClaveApi } from "../../lib/auth/api-keys.ts";
import { apiKey, membership, organization, user, type UserRole } from "../../lib/db/schema.ts";

// Sin RLS (no están en ORG_SCOPED_TABLES): conexión directa basta.
const conexion = postgres(process.env.DATABASE_URL!, { max: 5, onnotice: () => {} });
const db = drizzle(conexion, { schema: { organization, user } });

let fallos = 0;
function ok(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) console.log(`  ✓ ${nombre}`);
  else {
    fallos++;
    console.error(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

function ctxDeRol(role: UserRole, organizationId: string | null = null): AuthContext {
  return contextoDeSesion({ userId: "u1", userName: "prueba", role, organizationId });
}

const CTX_SLG_ADMIN = ctxDeRol("slg_admin");

async function main() {
  console.log("FU-06 — matriz B.3, alcances, superficies y claves de API\n");

  // ── A. La matriz B.3, fila por fila (criterio 2) ───────────────────────────
  console.log("A. Matriz B.3 por rol");
  const filas: [Accion, UserRole[]][] = [
    ["hq.ver_tablero", ["slg_admin", "slg_operator"]],
    ["captures.reintentar", ["slg_admin", "slg_operator"]],
    ["orgs.escribir", ["slg_admin", "slg_operator"]],
    ["identidad.invitar_slg", ["slg_admin"]],
    ["identidad.crear_clave_api", ["slg_admin"]],
    ["deliverables.publicar", ["slg_admin", "slg_operator"]],
    ["deliverables.ver_propios", ["slg_admin", "slg_operator", "client_admin", "client_member"]],
    ["identidad.invitar_miembro_empresa", ["slg_admin", "slg_operator", "client_admin"]],
    ["events.registrar", ["slg_admin", "slg_operator"]],
    ["audit.ver", ["slg_admin"]],
  ];
  const TODOS: UserRole[] = ["slg_admin", "slg_operator", "client_admin", "client_member"];
  for (const [accion, permitidos] of filas) {
    for (const rol of TODOS) {
      const esperado = permitidos.includes(rol);
      ok(
        `${accion} · ${rol} → ${esperado ? "permitido" : "denegado"}`,
        puedeHacer(ctxDeRol(rol), accion) === esperado,
      );
    }
  }

  // ── B. Alcances de clave: sin implicación entre ellos (criterio 4) ─────────
  console.log("\nB. Alcances de clave de API — sin implicación (RF-147)");
  const claveSoloEventos = contextoDeClaveApi({
    apiKeyId: "k1",
    name: "prueba",
    organizationId: null,
    scopes: ["events:write"],
  });
  ok("events:write registra actividad", puedeHacer(claveSoloEventos, "events.registrar"));
  ok(
    "events:write NO publica entregables (no implica deliverables:write)",
    !puedeHacer(claveSoloEventos, "deliverables.publicar"),
  );
  ok(
    "ninguna clave invita usuarios SLG ni crea claves (sin alcance de administrador)",
    !puedeHacer(claveSoloEventos, "identidad.invitar_slg") &&
      !puedeHacer(claveSoloEventos, "identidad.crear_clave_api"),
  );

  // ── C. El mensaje de error no distingue el motivo (criterio 7, RNF-32) ─────
  console.log("\nC. Mensajes de autorización no revelan el motivo");
  const mensajes = new Set<string>();
  for (const [accion, rol] of [
    ["audit.ver", "client_member"],
    ["identidad.crear_clave_api", "slg_operator"],
  ] as const) {
    try {
      exigir(ctxDeRol(rol), accion);
      mensajes.add("(no lanzó)");
    } catch (e) {
      mensajes.add((e as Error).message);
    }
  }
  ok(
    "el mismo mensaje sirve para cualquier motivo de rechazo",
    mensajes.size === 1 && !mensajes.has("(no lanzó)"),
    `mensajes distintos: ${[...mensajes].join(" | ")}`,
  );

  // ── D. Compuertas de superficie (criterios 3 y 5) ──────────────────────────
  console.log("\nD. `evaluarSuperficie` — orden de las comprobaciones");
  ok("sin sesión → sin_sesion", evaluarSuperficie(null, "hq").tipo === "sin_sesion");
  ok(
    "client_member pidiendo hq → no_encontrado (D-38: nunca 403)",
    evaluarSuperficie(ctxDeRol("client_member"), "hq").tipo === "no_encontrado",
  );
  ok(
    "slg_operator pidiendo portal → no_encontrado",
    evaluarSuperficie(ctxDeRol("slg_operator"), "portal").tipo === "no_encontrado",
  );
  ok(
    "client_admin con sesión pero SIN empresa pidiendo portal → no_encontrado",
    evaluarSuperficie(ctxDeRol("client_admin", null), "portal").tipo === "no_encontrado",
  );
  ok(
    "client_admin con empresa pidiendo portal → ok",
    evaluarSuperficie(ctxDeRol("client_admin", "org-1"), "portal").tipo === "ok",
  );
  ok(
    "slg_admin pidiendo hq → ok",
    evaluarSuperficie(ctxDeRol("slg_admin"), "hq").tipo === "ok",
  );

  // ── E. Resolución de empresa contra Postgres real ──────────────────────────
  console.log("\nE. `organizacionDelUsuario` contra datos reales");
  const orgId = randomUUID();
  const userId = randomUUID();
  // `organization` y `user` no están en ORG_SCOPED_TABLES: sin RLS.
  await db.insert(organization).values({
    id: orgId,
    name: "Empresa de prueba FU-06",
    slug: `prueba-fu06-${orgId.slice(0, 8)}`,
    type: "client",
  });
  await db.insert(user).values({
    id: userId,
    name: "Usuario de prueba",
    email: `prueba-fu06-${userId.slice(0, 8)}@example.com`,
    role: "client_member",
  });
  // `membership` sí está en ORG_SCOPED_TABLES: exige contexto de slg_admin
  // (o de la propia empresa, que todavía no existe como sesión real).
  await withScope(CTX_SLG_ADMIN, (tx) =>
    tx.insert(membership).values({ id: randomUUID(), userId, organizationId: orgId, orgRole: "client_member" }),
  );
  const resuelta = await organizacionDelUsuario(userId);
  ok("resuelve la empresa real de la pertenencia sembrada", resuelta === orgId);
  ok(
    "un usuario sin pertenencia resuelve null",
    (await organizacionDelUsuario(randomUUID())) === null,
  );

  // ── F. Claves de API contra Postgres real (criterio 4 + ciclo de vida) ─────
  console.log("\nF. Ciclo de vida de una clave de API");
  const { id: claveId, claveCruda } = await crearClaveApi(CTX_SLG_ADMIN, {
    name: "clave de prueba FU-06",
    organizationId: null,
    scopes: ["events:write"],
    expiresAt: new Date(Date.now() + 60_000),
  });
  const v1 = await verificarClaveApi(claveCruda);
  ok("una clave recién creada verifica en verde", v1.ok);
  ok("verificar con basura no encuentra nada", !(await verificarClaveApi("slg_key_basura")).ok);

  await revocarClaveApi(CTX_SLG_ADMIN, claveId);
  const v2 = await verificarClaveApi(claveCruda);
  ok("una clave revocada deja de verificar", !v2.ok && v2.razon === "revocada");

  const { claveCruda: claveQueExpira } = await crearClaveApi(CTX_SLG_ADMIN, {
    name: "clave que ya expiró",
    organizationId: null,
    scopes: ["events:write"],
    expiresAt: new Date(Date.now() - 1000), // ya en el pasado
  });
  const v3 = await verificarClaveApi(claveQueExpira);
  ok("una clave con expiresAt en el pasado no verifica", !v3.ok && v3.razon === "caducada");

  const { claveCruda: claveLimitada } = await crearClaveApi(CTX_SLG_ADMIN, {
    name: "clave con límite bajo",
    organizationId: null,
    scopes: ["events:write"],
    expiresAt: new Date(Date.now() + 60_000),
    rateLimitMax: 2,
    rateLimitWindowSeconds: 60,
  });
  const resultados = [];
  for (let i = 0; i < 3; i++) resultados.push(await verificarClaveApi(claveLimitada));
  ok(
    "al tercer uso dentro de la ventana, el límite corta (RF-99)",
    resultados[0].ok && resultados[1].ok && !resultados[2].ok && resultados[2].razon === "limite_excedido",
  );

  // ── Limpieza ────────────────────────────────────────────────────────────
  await withScope(CTX_SLG_ADMIN, async (tx) => {
    await tx.delete(apiKey).where(eq(apiKey.name, "clave de prueba FU-06"));
    await tx.delete(apiKey).where(eq(apiKey.name, "clave que ya expiró"));
    await tx.delete(apiKey).where(eq(apiKey.name, "clave con límite bajo"));
    await tx.delete(membership).where(eq(membership.userId, userId));
  });
  await db.delete(user).where(eq(user.id, userId));
  await db.delete(organization).where(eq(organization.id, orgId));
  await conexion.end({ timeout: 5 });

  if (fallos) {
    console.error(`\n✗ ${fallos} fallo(s).\n`);
    process.exit(1);
  }
  console.log("\n✓ FU-06: matriz, alcances, superficies y claves — todo verificado.\n");
  // `lib/db/scope.ts` mantiene su propio pool de conexión vivo a propósito
  // —es correcto para un servidor de verdad—, pero eso deja a un script sin
  // nada que cierre esa conexión. Salida explícita, no un cuelgue silencioso.
  process.exit(0);
}

main().catch((e) => {
  console.error(`\n✗ ${e?.stack ?? e}\n`);
  process.exit(1);
});
