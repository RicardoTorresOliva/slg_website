/**
 * check-secrets.ts — Freno de secretos.
 *
 * El repositorio es PÚBLICO (§10-6) y el historial de git no se borra: una vez
 * publicado, un secreto está quemado. Este freno mira lo que se va a subir, no
 * lo que ya está.
 *
 * Mitiga R-09. Falla el pipeline, no avisa (FU-05, criterio 4).
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "../..");

const PATRONES: ReadonlyArray<{ re: RegExp; que: string }> = [
  { re: /\bcrm_live_[A-Za-z0-9_-]{16,}/g, que: "clave del CRM Softlanding Global" },
  { re: /\bre_[A-Za-z0-9_-]{20,}/g, que: "clave de Resend" },
  { re: /\bsk-[A-Za-z0-9]{20,}/g, que: "clave de proveedor de IA" },
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g, que: "clave privada" },
  { re: /\bghp_[A-Za-z0-9]{30,}/g, que: "token de GitHub" },
  { re: /\bAKIA[0-9A-Z]{16}\b/g, que: "clave de acceso AWS" },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, que: "token de Slack" },
  { re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./g, que: "JSON Web Token" },
  // Contraseña LITERAL embebida en una cadena de conexión.
  // Se excluyen a propósito las referencias a variable —`${VAR}`, `$(VAR)`,
  // `%VAR%`— y los marcadores `<...>`: una referencia no es un secreto, y
  // marcarla obligaría a poner excepciones, que es como mueren estos frenos.
  {
    re: /(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^:\s@/]*(?<!\})[:](?!\$\{|\$\(|%|<)[^@\s${<%]{6,}@/g,
    que: "contraseña literal en cadena de conexión",
  },
];

const IGNORAR = [
  "node_modules", ".next", ".git", "dist", "coverage",
  "package-lock.json", ".env", "docs/infra",
];

// El propio detector contiene los patrones que busca: se excluye para no
// denunciarse a sí mismo.
const AUTOEXCLUIDOS = ["scripts/ci/check-secrets.ts"];

type Hallazgo = { archivo: string; linea: number; que: string; muestra: string };
const hallazgos: Hallazgo[] = [];
let revisados = 0;

function recorrer(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(RAIZ, abs);
    if (IGNORAR.some((i) => rel === i || rel.startsWith(i + path.sep))) continue;
    if (e.isDirectory()) { recorrer(abs); continue; }
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|mdx|css|ya?ml|sql|sh|env\.example|Dockerfile)$/i.test(e.name)
        && e.name !== "Dockerfile" && e.name !== "docker-compose.yml") continue;
    if (AUTOEXCLUIDOS.includes(rel)) continue;

    revisados++;
    const texto = fs.readFileSync(abs, "utf8");
    texto.split("\n").forEach((linea, i) => {
      for (const { re, que } of PATRONES) {
        const rx = new RegExp(re.source, re.flags);
        let m: RegExpExecArray | null;
        while ((m = rx.exec(linea)) !== null) {
          hallazgos.push({
            archivo: rel, linea: i + 1, que,
            // Nunca se imprime el secreto entero, ni en el log de CI.
            muestra: m[0].slice(0, 8) + "…",
          });
        }
      }
    });
  }
}

recorrer(RAIZ);

if (hallazgos.length) {
  console.error(`✗ secretos: ${hallazgos.length} coincidencia(s) en ${revisados} archivos.\n`);
  for (const h of hallazgos) {
    console.error(`  ${h.archivo}:${h.linea} — ${h.que} («${h.muestra}»)`);
  }
  console.error(
    "\n  El repositorio es público y el historial de git no se borra.\n" +
    "  Si esto llega a subirse, el secreto está quemado y hay que rotarlo.\n",
  );
  process.exit(1);
}
console.log(`✓ secretos: ${revisados} archivos revisados, sin coincidencias.`);
