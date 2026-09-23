/**
 * verify-gates.ts — Prueba negativa de los cuatro gates de contenido.
 *
 * FU-03, criterio 6. Mitigación de R-26 (scripts de verificación con falsos
 * verdes): **un script que nunca se ha visto en rojo no se acepta como gate
 * verde**. Aquí cada uno se ejecuta contra un árbol roto a propósito y se
 * comprueba que falla, con el mensaje esperado.
 *
 * Esto no prueba que los scripts sean correctos en todos los casos. Prueba lo
 * mínimo que hay que probar antes de confiar en ellos: que **pueden** fallar.
 * Un gate que siempre pasa es indistinguible de un gate que no existe.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const HERE = import.meta.dirname;

type Case = {
  gate: string;
  script: string;
  fixture: string;
  /** Fragmento que debe aparecer en la salida: prueba que falló por lo esperado. */
  expect: string;
  args?: string[];
  /**
   * Otra ficha para el caso (`SITIO_FICHA`): la nomenclatura es de cada sitio,
   * y su prueba negativa trae sus propias reglas para no depender de la oferta
   * del sitio que la ejecuta.
   */
  ficha?: string;
};

const CASES: Case[] = [
  {
    gate: "frontmatter",
    script: "check-frontmatter.ts",
    fixture: "negative/frontmatter",
    expect: "description",
  },
  {
    gate: "frontmatter · contrato A.3",
    script: "check-frontmatter.ts",
    fixture: "negative/frontmatter",
    expect: "Descarga",
  },
  {
    gate: "paridad ES/EN",
    script: "check-pairs.ts",
    fixture: "negative/pairs",
    expect: "inexistente",
  },
  {
    gate: "nomenclatura literal",
    script: "check-nomenclature.ts",
    fixture: "negative/nomenclature",
    expect: "Producto Uno",
    ficha: "negative/nomenclature/site.config.ts",
  },
  {
    gate: "nomenclatura · regla de contenido",
    script: "check-nomenclature.ts",
    fixture: "negative/nomenclature",
    expect: "a medida",
    ficha: "negative/nomenclature/site.config.ts",
  },
  {
    gate: "copy · sin Sesión Cero ni agenda",
    script: "check-copy.ts",
    fixture: "negative/copy",
    expect: "Sesión Cero",
  },
  {
    gate: "copy · cifra sin respaldo",
    script: "check-copy.ts",
    fixture: "negative/copy",
    expect: "porcentaje sin respaldo",
  },
  {
    gate: "cero [PENDIENTE]",
    script: "check-pending.ts",
    fixture: "negative/pending",
    expect: "PENDIENTE",
    args: ["--strict"],
  },
];

let failed = 0;
console.log("Prueba negativa de los gates de contenido — cada uno debe FALLAR:\n");

for (const c of CASES) {
  const res = spawnSync(
    process.execPath,
    [path.join(HERE, c.script), ...(c.args ?? [])],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        CONTENT_ROOT: path.join(HERE, c.fixture),
        ...(c.ficha ? { SITIO_FICHA: path.join(HERE, c.ficha) } : {}),
      },
    },
  );

  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const exitedRed = res.status === 1;
  const rightReason = output.includes(c.expect);

  if (exitedRed && rightReason) {
    console.log(`  ✓ ${c.gate}: falló como debía (exit 1, mencionó «${c.expect}»)`);
  } else {
    failed++;
    console.error(`  ✗ ${c.gate}: NO falló como debía.`);
    console.error(`      exit esperado 1, obtenido ${res.status}`);
    if (!rightReason) console.error(`      no mencionó «${c.expect}»`);
    console.error(
      output
        .split("\n")
        .slice(0, 8)
        .map((l) => `      | ${l}`)
        .join("\n"),
    );
  }
}

// Y la contraprueba: contra el contenido real, los cuatro pasan.
console.log("\nContraprueba — contra el contenido real, los cinco deben PASAR:\n");
for (const script of [
  "check-frontmatter.ts",
  "check-pairs.ts",
  "check-nomenclature.ts",
  "check-pending.ts",
  "check-copy.ts",
]) {
  const res = spawnSync(process.execPath, [path.join(HERE, script)], {
    encoding: "utf8",
  });
  if (res.status === 0) {
    console.log(`  ✓ ${script}: pasa`);
  } else {
    failed++;
    console.error(`  ✗ ${script}: falla contra el contenido real (exit ${res.status})`);
    console.error(`${res.stdout ?? ""}${res.stderr ?? ""}`);
  }
}

if (failed) {
  console.error(`\n✗ ${failed} comprobación(es) de gate no se comportaron como deben.\n`);
  process.exit(1);
}
console.log("\n✓ Los cinco gates de contenido fallan cuando deben y pasan cuando deben.\n");
