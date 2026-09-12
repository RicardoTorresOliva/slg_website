/**
 * verify-brakes.ts — Prueba negativa de los frenos que añade FU-05.
 *
 * FU-05 criterio 5 y R-26: cada freno del criterio 4 tiene que haberse visto en
 * ROJO, por el motivo esperado, antes de que su verde signifique algo.
 *
 * Los cuatro frenos de contenido —frontmatter, `pair`, nomenclatura,
 * `[PENDIENTE]`— ya tienen su prueba negativa en `scripts/content/verify-gates.ts`
 * (FU-03 criterio 6): este script la EJECUTA en vez de duplicarla, y añade los
 * frenos nuevos de esta unidad.
 *
 * Ejecutar con `npm run check:brakes`. Requiere un build previo para el
 * presupuesto de JS.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const HERE = import.meta.dirname;
const REPO_ROOT = path.resolve(HERE, "../..");

type Caso = {
  freno: string;
  script: string;
  /**
   * Fragmento —o fragmentos— que deben salir: prueban que falló por lo que
   * esperábamos y no por otra cosa. Varios cuando un solo fixture tiene que
   * disparar varias comprobaciones distintas, como el del gesto.
   */
  espera: string | string[];
  env?: Record<string, string>;
  args?: string[];
};

const CASOS: Caso[] = [
  {
    freno: "patrón de secreto · clave de acceso S3",
    script: "check-secrets.ts",
    espera: "clave de acceso AWS/S3",
    env: { SECRETS_SCAN_ROOT: path.join(HERE, "negative/secrets") },
  },
  {
    freno: "patrón de secreto · cadena de conexión con contraseña",
    script: "check-secrets.ts",
    espera: "cadena de conexión con contraseña",
    env: { SECRETS_SCAN_ROOT: path.join(HERE, "negative/secrets") },
  },
  {
    freno: "patrón de secreto · contraseña pegada en el código",
    script: "check-secrets.ts",
    espera: "variable de secreto con valor",
    env: { SECRETS_SCAN_ROOT: path.join(HERE, "negative/secrets") },
  },
  {
    freno: "presupuesto de JS inicial",
    script: "check-js-budget.ts",
    espera: "por encima de",
    // 1 KB: cualquier página real lo supera. El freno debe frenar.
    env: { JS_BUDGET_BYTES: "1024" },
  },
  {
    freno: "listado de un bucket en el código",
    script: "check-archivos.ts",
    espera: "ninguna ruta de la aplicación lista el contenido",
    env: { ARCHIVOS_ROOT: path.join(HERE, "negative/archivos") },
  },
  {
    freno: "entregable versionado en un repositorio público",
    script: "check-archivos.ts",
    espera: "está en control de versiones",
    env: { ARCHIVOS_ROOT: path.join(HERE, "negative/archivos") },
  },
  {
    freno: "anima algo que provoca reflow",
    script: "check-motion.ts",
    espera: "solo se animan transform y opacity",
    env: { MOTION_ROOT: path.join(HERE, "negative/motion") },
  },
  {
    freno: "@keyframes en una interacción agarrable",
    script: "check-motion.ts",
    espera: "@keyframes en un componente agarrable",
    env: { MOTION_ROOT: path.join(HERE, "negative/motion") },
  },
  {
    freno: "frontera de módulo cruzada",
    script: "check-fronteras.ts",
    espera: "importa el framework de identidad",
    env: { FRONTERAS_ROOT: path.join(HERE, "negative/fronteras") },
  },
  {
    freno: "migración no declarada en el journal",
    script: "check-migrations.ts",
    espera: "NO está en meta/_journal.json",
    env: { MIGRATIONS_DIR: path.join(HERE, "negative/migrations") },
  },
  {
    freno: ".env.example con un valor",
    script: "check-env-example.ts",
    espera: "lleva VALOR",
    env: { ENV_EXAMPLE_PATH: path.join(HERE, "negative/env/.env.example") },
  },
  {
    // Un solo fixture, las CUATRO cláusulas de RNF-45 incumplidas. El medidor
    // tiene que ver las cuatro: si solo viera una, las otras tres serían un
    // verde sin respaldo.
    freno: "las cuatro cláusulas del sheet, medidas cuadro a cuadro",
    script: "test-gesto.ts",
    espera: [
      "✗ 1:1",
      "✗ rubber-band",
      "✗ un lanzamiento rápido y corto CIERRA",
      "✗ la velocidad se transfiere",
    ],
    env: { GESTO_URL: `file://${path.join(HERE, "negative/gesto/roto.html")}` },
  },
];

let fallos = 0;

console.log("Frenos de FU-05 — cada uno debe FALLAR contra su fixture:\n");

for (const c of CASOS) {
  const res = spawnSync(process.execPath, [path.join(HERE, c.script), ...(c.args ?? [])], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, ...c.env },
  });
  const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const rojo = res.status === 1;
  const esperados = Array.isArray(c.espera) ? c.espera : [c.espera];
  const faltan = esperados.filter((e) => !salida.includes(e));
  const porElMotivo = faltan.length === 0;

  if (rojo && porElMotivo) {
    console.log(`  ✓ ${c.freno}: falló como debía (exit 1, mencionó «${esperados.join("», «")}»)`);
  } else {
    fallos++;
    console.error(`  ✗ ${c.freno}: NO falló como debía.`);
    console.error(`      exit esperado 1, obtenido ${res.status}`);
    if (!porElMotivo) console.error(`      no mencionó «${faltan.join("», «")}»`);
    console.error(salida.split("\n").slice(0, 10).map((l) => `      | ${l}`).join("\n"));
  }
}

console.log("\nContraprueba — contra el repositorio real, los ocho deben PASAR:\n");
for (const script of [
  "check-secrets.ts",
  "check-js-budget.ts",
  "check-env-example.ts",
  "check-migrations.ts",
  "check-fronteras.ts",
  "check-archivos.ts",
  "check-contraste.ts",
  "check-motion.ts",
]) {
  const res = spawnSync(process.execPath, [path.join(HERE, script)], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  if (res.status === 0) {
    console.log(`  ✓ ${script}: pasa`);
  } else {
    fallos++;
    console.error(`  ✗ ${script}: falla contra el repositorio real (exit ${res.status})`);
    console.error(`${res.stdout ?? ""}${res.stderr ?? ""}`);
  }
}

console.log("\nFrenos de contenido de FU-03 — se delega en su propia prueba negativa:\n");
{
  const res = spawnSync(process.execPath, [path.join(REPO_ROOT, "scripts/content/verify-gates.ts")], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  if (res.status === 0) {
    console.log(
      salida
        .split("\n")
        .filter((l) => l.trim().startsWith("✓") || l.trim().startsWith("✗"))
        .map((l) => `  ${l.trim()}`)
        .join("\n"),
    );
  } else {
    fallos++;
    console.error(`  ✗ verify-gates.ts: los frenos de contenido no se comportan como deben.`);
    console.error(salida);
  }
}

if (fallos) {
  console.error(`\n✗ ${fallos} freno(s) no se comportaron como deben.\n`);
  process.exit(1);
}
console.log("\n✓ Los trece frenos del criterio 4 fallan cuando deben y pasan cuando deben.\n");
