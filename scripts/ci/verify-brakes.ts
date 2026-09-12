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
  /** Fragmento que debe salir: prueba que falló por lo que esperábamos. */
  espera: string;
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
    freno: "presupuesto de JS inicial",
    script: "check-js-budget.ts",
    espera: "por encima de",
    // 1 KB: cualquier página real lo supera. El freno debe frenar.
    env: { JS_BUDGET_BYTES: "1024" },
  },
  {
    freno: ".env.example con un valor",
    script: "check-env-example.ts",
    espera: "lleva VALOR",
    env: { ENV_EXAMPLE_PATH: path.join(HERE, "negative/env/.env.example") },
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
  const porElMotivo = salida.includes(c.espera);

  if (rojo && porElMotivo) {
    console.log(`  ✓ ${c.freno}: falló como debía (exit 1, mencionó «${c.espera}»)`);
  } else {
    fallos++;
    console.error(`  ✗ ${c.freno}: NO falló como debía.`);
    console.error(`      exit esperado 1, obtenido ${res.status}`);
    if (!porElMotivo) console.error(`      no mencionó «${c.espera}»`);
    console.error(salida.split("\n").slice(0, 10).map((l) => `      | ${l}`).join("\n"));
  }
}

console.log("\nContraprueba — contra el repositorio real, los tres deben PASAR:\n");
for (const script of ["check-secrets.ts", "check-js-budget.ts", "check-env-example.ts"]) {
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
console.log("\n✓ Los seis frenos del criterio 4 fallan cuando deben y pasan cuando deben.\n");
