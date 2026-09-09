/**
 * check-pending.ts — Gate 4 de 4.
 *
 * Cero `[PENDIENTE]`, lorem ipsum ni texto de relleno en el contenido de `main`.
 *
 * Matiz importante del brief: los `[PENDIENTE]` son **obligatorios en staging**
 * donde falte un dato, y **prohibidos en producción**. Por eso este script mira
 * solo `content/`, que es lo que se publica, y no la documentación del repo,
 * donde un `[PENDIENTE]` es información legítima.
 *
 * Cubre: RF-15 · DoD #10 · FU-03 criterio 6 · gates D5 y D12.
 */
import fs from "node:fs";
import path from "node:path";

import { walkContent, report, CONTENT_ROOT, type Failure } from "./lib.ts";

const BANNED: ReadonlyArray<{ re: RegExp; what: string }> = [
  { re: /\[PENDIENTE[^\]]*\]/gi, what: "marcador [PENDIENTE]" },
  { re: /\blorem\s+ipsum\b/gi, what: "lorem ipsum" },
  { re: /\bTODO\b/g, what: "marcador TODO" },
  { re: /\bTBD\b/g, what: "marcador TBD" },
  { re: /\bXXX+\b/g, what: "marcador XXX" },
];

/**
 * Modo estricto. Sin él, los marcadores se listan como aviso y el script pasa:
 * es el comportamiento correcto en `develop`/staging, donde el brief los EXIGE
 * allí donde falta un dato. Con `--strict` fallan: es el gate de `main`.
 */
const STRICT = process.argv.includes("--strict") || process.env.CONTENT_STRICT === "1";

const failures: Failure[] = [];
let checked = 0;

function scan(text: string, rel: string) {
  text.split("\n").forEach((line, i) => {
    for (const { re, what } of BANNED) {
      const rx = new RegExp(re.source, re.flags);
      let m: RegExpExecArray | null;
      while ((m = rx.exec(line)) !== null) {
        failures.push({ file: rel, detail: `línea ${i + 1}: ${what} — «${m[0]}»` });
      }
    }
  });
}

for (const doc of walkContent()) {
  checked++;
  scan(doc.raw, doc.rel);
}

const uiDir = path.join(CONTENT_ROOT, "ui");
if (fs.existsSync(uiDir)) {
  for (const f of fs.readdirSync(uiDir).filter((x) => x.endsWith(".json"))) {
    checked++;
    scan(fs.readFileSync(path.join(uiDir, f), "utf8"), `content/ui/${f}`);
  }
}

if (!STRICT && failures.length) {
  console.log(
    `· cero-pendientes (modo staging): ${failures.length} marcador(es) en ${checked} archivos.\n` +
      "  Es lo esperado fuera de `main`: el brief los exige donde falta un dato.\n" +
      "  En `main` este mismo script se ejecuta con --strict y entonces falla.\n",
  );
  for (const f of failures) console.log(`  ${f.file} — ${f.detail}`);
  process.exit(0);
}

report(STRICT ? "cero [PENDIENTE] en contenido (--strict)" : "cero [PENDIENTE] en contenido", failures, checked);
