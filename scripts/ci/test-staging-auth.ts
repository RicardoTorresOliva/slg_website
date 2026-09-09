/**
 * test-staging-auth.ts — Protección de staging (FU-05, criterio 1).
 *
 * Comprueba comportamiento contra un servidor real, no configuración. Sirve
 * tanto para el contenedor local como para el staging desplegado:
 *
 *   BASE_URL=https://staging.softlandingglobal.com \
 *   STAGING_BASIC_AUTH_USER=... STAGING_BASIC_AUTH_PASSWORD=... \
 *   node scripts/ci/test-staging-auth.ts
 *
 * Nació de un fallo real: las variables estaban documentadas en `.env.example`
 * pero **no existía el código que las usaba**. Staging estuvo abierto e
 * indexable durante una hora y media. Una prueba que mide comportamiento lo
 * habría visto; una revisión de la documentación, no.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
const USUARIO = process.env.STAGING_BASIC_AUTH_USER;
const CLAVE = process.env.STAGING_BASIC_AUTH_PASSWORD;

if (!USUARIO || !CLAVE) {
  console.error(
    "Faltan STAGING_BASIC_AUTH_USER y STAGING_BASIC_AUTH_PASSWORD.\n" +
      "Sin ellas no se puede distinguir «protegido» de «roto».",
  );
  process.exit(1);
}

const valida = "Basic " + Buffer.from(`${USUARIO}:${CLAVE}`).toString("base64");
const invalida = "Basic " + Buffer.from(`${USUARIO}:no-es-la-clave`).toString("base64");

let fallos = 0;
async function caso(
  nombre: string,
  ruta: string,
  cabeceras: Record<string, string>,
  esperado: number,
): Promise<Response> {
  const r = await fetch(BASE + ruta, { headers: cabeceras, redirect: "manual" });
  const ok = r.status === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? "✓" : "✗"} ${nombre.padEnd(50)} ${r.status} (esperado ${esperado})`);
  return r;
}

function afirmar(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) console.log(`  ✓ ${nombre}`);
  else { fallos++; console.error(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ""}`); }
}

async function main() {
  console.log(`Protección de staging — ${BASE}\n`);

  const r401 = await caso("sin credenciales → 401", "/", {}, 401);
  await caso("credenciales incorrectas → 401", "/", { authorization: invalida }, 401);
  const r200 = await caso("credenciales correctas → 200", "/", { authorization: valida }, 200);

  // La sonda queda fuera a propósito: si pidiera credenciales, el monitor
  // externo daría el sitio por caído siempre y el aviso dejaría de significar algo.
  await caso("/api/health sin credenciales → 200", "/api/health", {}, 200);

  await caso("una página de contenido sin credenciales", "/nosotros", {}, 401);
  await caso("la versión en inglés tampoco se escapa", "/en/about", {}, 401);

  console.log("");
  afirmar(
    "el 401 ofrece autenticación básica",
    (r401.headers.get("www-authenticate") ?? "").startsWith("Basic realm="),
  );
  afirmar(
    "el 401 no se indexa",
    (r401.headers.get("x-robots-tag") ?? "").includes("noindex"),
  );
  afirmar(
    "la página autenticada tampoco se indexa",
    (r200.headers.get("x-robots-tag") ?? "").includes("noindex"),
  );
  afirmar(
    "las cabeceras de seguridad siguen presentes",
    Boolean(r200.headers.get("content-security-policy")),
  );

  if (fallos) {
    console.error(`\n✗ ${fallos} fallo(s). Staging no está protegido como exige el criterio 1.\n`);
    process.exit(1);
  }
  console.log("\n✓ Staging protegido y fuera de los buscadores.\n");
}

main().catch((e) => {
  console.error(`\n✗ No se pudo comprobar ${BASE}: ${e?.message ?? e}\n`);
  process.exit(1);
});
