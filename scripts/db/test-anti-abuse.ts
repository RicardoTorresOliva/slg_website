/**
 * test-anti-abuse.ts — Pruebas de FU-11: dominios de correo gratuito
 * (RF-31/RF-32), límite de peticiones (RF-34) y el helper de honeypot
 * (RF-33). Contra Postgres real (`blocked_email_domain`/`rate_limit_event`
 * con RLS, 0009/0010), no simulado.
 *
 * Fuera de alcance de este script, a propósito: criterio 5 (cero scripts de
 * terceros en las 27 rutas — esas rutas no existen todavía, DU-02/03 en
 * adelante) y criterio 6 (validar contra esquema antes de usarse — no hay
 * todavía un formulario real con Server Action que reciba esta entrada; eso
 * es DU-08). Ambos se cierran cuando exista el llamador real, no aquí.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { withScope, withSystemScope } from "../../lib/db/scope.ts";
import { contextoDeSesion } from "../../lib/db/context.ts";
import { esDominioDeCorreoGratuito, verificarLimiteDePeticiones, esHoneypotRelleno } from "../../lib/anti-abuse/index.ts";
import { blockedEmailDomain, rateLimitEvent } from "../../lib/db/schema.ts";

const conexion = postgres(process.env.DATABASE_URL!, { max: 5, onnotice: () => {} });
const db = drizzle(conexion, { schema: { blockedEmailDomain, rateLimitEvent } });

let fallos = 0;
function ok(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) console.log(`  ✓ ${nombre}`);
  else {
    fallos++;
    console.error(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

async function main() {
  console.log("FU-11 — anti-abuso propio\n");

  // ── RF-31/RF-32: dominios de correo gratuito, dato editable sin desplegar ──
  console.log("Dominios de correo gratuito (RF-31/RF-32)");

  ok(
    "un dominio de la semilla (gmail.com) se rechaza",
    await esDominioDeCorreoGratuito("visitante@gmail.com"),
  );
  ok(
    "un dominio corporativo cualquiera se acepta",
    !(await esDominioDeCorreoGratuito(`contacto@empresa-${randomUUID().slice(0, 8)}.test`)),
  );
  ok(
    "un correo sin arroba no revienta, se trata como no-bloqueado",
    !(await esDominioDeCorreoGratuito("no-es-un-correo")),
  );

  // RF-32 en el hecho, no solo en la promesa: añadir un dominio EN CALIENTE
  // (sin build, sin deploy — un INSERT) y comprobar que se aplica de inmediato.
  const dominioNuevo = `dominio-prueba-${randomUUID().slice(0, 8)}.test`;
  const antesDeAñadirlo = await esDominioDeCorreoGratuito(`x@${dominioNuevo}`);
  await withSystemScope("prueba: ampliar la lista en caliente (FU-11 test)", (tx) =>
    tx.insert(blockedEmailDomain).values({ domain: dominioNuevo }),
  );
  const despuesDeAñadirlo = await esDominioDeCorreoGratuito(`x@${dominioNuevo}`);
  ok(
    "ampliar la lista con un INSERT (sin desplegar) se refleja en la siguiente comprobación",
    !antesDeAñadirlo && despuesDeAñadirlo,
  );

  // ── RF-33: honeypot ──
  console.log("\nHoneypot (RF-33)");
  ok("campo vacío no se marca como relleno", !esHoneypotRelleno(""));
  ok("campo ausente (undefined) no se marca como relleno", !esHoneypotRelleno(undefined));
  ok("campo solo con espacios no se marca como relleno", !esHoneypotRelleno("   "));
  ok("campo con cualquier texto SÍ se marca como relleno", esHoneypotRelleno("un bot lo rellenó"));

  // ── RF-34: límite de peticiones ──
  console.log("\nLímite de peticiones (RF-34)");

  const ipDePrueba = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
  const clave = { accion: "test_anti_abuso", tipoDeClave: "ip" as const, valorDeClave: ipDePrueba, limite: 3, ventanaSegundos: 60 };

  const r1 = await verificarLimiteDePeticiones(clave);
  const r2 = await verificarLimiteDePeticiones(clave);
  const r3 = await verificarLimiteDePeticiones(clave);
  const r4 = await verificarLimiteDePeticiones(clave);
  ok("las tres primeras peticiones dentro del umbral se permiten", r1.permitido && r2.permitido && r3.permitido);
  ok("la cuarta petición, sobre el umbral de 3, se bloquea", !r4.permitido);
  ok(
    "el resultado no expone el umbral ni el conteo (RF-34: sin revelar el umbral)",
    Object.keys(r4).length === 1 && "permitido" in r4,
  );

  const emailDePrueba = `otro-${randomUUID().slice(0, 8)}@empresa.test`;
  const claveDeCorreo = { accion: "test_anti_abuso", tipoDeClave: "email" as const, valorDeClave: emailDePrueba, limite: 1, ventanaSegundos: 60 };
  const porIp = await verificarLimiteDePeticiones({ ...clave, valorDeClave: `${ipDePrueba}-otra-clave-no-usada-arriba` });
  const porCorreo1 = await verificarLimiteDePeticiones(claveDeCorreo);
  const porCorreo2 = await verificarLimiteDePeticiones(claveDeCorreo);
  ok("el límite por IP y por correo son independientes (una IP nueva no hereda el bloqueo)", porIp.permitido);
  ok("el límite por correo se aplica igual que por IP", porCorreo1.permitido && !porCorreo2.permitido);

  const otraAccion = { ...clave, accion: "otro_formulario" };
  const enOtroNamespace = await verificarLimiteDePeticiones(otraAccion);
  ok(
    "una acción (namespace) distinta no hereda el bloqueo de otra, misma clave",
    enOtroNamespace.permitido,
  );

  // Concurrencia: N peticiones simultáneas para la MISMA clave nunca dejan
  // pasar más del umbral — es lo que exige el `pg_advisory_xact_lock` de
  // rate-limit.ts, no una comprobación secuencial como las de arriba.
  const claveConcurrente = { accion: "test_concurrencia", tipoDeClave: "ip" as const, valorDeClave: `${ipDePrueba}-concurrente`, limite: 5, ventanaSegundos: 60 };
  const resultadosConcurrentes = await Promise.all(
    Array.from({ length: 10 }, () => verificarLimiteDePeticiones(claveConcurrente)),
  );
  const permitidos = resultadosConcurrentes.filter((r) => r.permitido).length;
  ok(
    `10 peticiones simultáneas contra un umbral de 5 permiten exactamente 5, ni una más (bloqueo consultivo sin condición de carrera)`,
    permitidos === 5,
    `permitió ${permitidos}`,
  );

  // ── RLS: nadie fuera de `system` puede leer estas tablas ──
  console.log("\nAislamiento (RLS de 0010)");
  const ctxDeClienteCualquiera = contextoDeSesion({
    userId: randomUUID(),
    userName: "actor de prueba, no system",
    role: "client_admin",
    organizationId: null,
  });
  const filasVisiblesSinSystem = await withScope(ctxDeClienteCualquiera, (tx) =>
    tx.select().from(blockedEmailDomain).limit(1),
  );
  ok(
    "un actor autenticado normal (no `system`) no ve ninguna fila de blocked_email_domain",
    filasVisiblesSinSystem.length === 0,
  );

  console.log(fallos ? `\n✗ ${fallos} comprobación(es) fallaron.\n` : "\n✓ Todas las comprobaciones pasaron.\n");
  await conexion.end({ timeout: 5 });
  process.exit(fallos ? 1 : 0);
}

main().catch((error) => {
  console.error("Error inesperado en test-anti-abuse.ts:", error);
  process.exit(1);
});
