/**
 * test-actualizar.ts — **La prueba de `sitio:actualizar`, con repositorios de
 * verdad en una carpeta temporal** (D-167).
 *
 * LO QUE TIENE QUE DEMOSTRAR:
 *   1. Un cambio de motor de la plantilla llega al cliente.
 *   2. La piel del cliente sale intacta aunque la plantilla la **cambie**, la
 *      **borre** o **añada** archivos en ella — los tres casos en que el driver
 *      `merge=ours` solo no basta.
 *   3. Una segunda ejecución no hace nada.
 *   4. Se niega con cambios sin guardar, fuera de develop, sobre la propia
 *      plantilla y sin historial común (salvo `--primera-vez`).
 *   5. Un conflicto en el motor deshace la fusión y no empuja nada.
 *   6. Unos frenos en rojo deshacen la fusión y no empujan nada.
 *   7. `.gitattributes` y `PIEL` dicen lo mismo.
 *
 * Sin red: la «plantilla» y el «origin» son repositorios desnudos locales.
 *
 *   npm run test:sitio-actualizar
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { PIEL, actualizar, esPiel, type Opciones } from "./fusion.ts";

let fallos = 0;
let pasadas = 0;
function comprobar(cond: boolean, que: string): void {
  if (cond) pasadas++;
  else {
    fallos++;
    console.error(`  ✗ ${que}`);
  }
}

const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "sitio-actualizar-"));
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "prueba",
  GIT_AUTHOR_EMAIL: "prueba@example.com",
  GIT_COMMITTER_NAME: "prueba",
  GIT_COMMITTER_EMAIL: "prueba@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
};
function git(dir: string, ...args: string[]): string {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", env: ENV });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}
function escribir(dir: string, archivo: string, texto: string): void {
  fs.mkdirSync(path.dirname(path.join(dir, archivo)), { recursive: true });
  fs.writeFileSync(path.join(dir, archivo), texto);
}
const leer = (dir: string, archivo: string): string | null =>
  fs.existsSync(path.join(dir, archivo)) ? fs.readFileSync(path.join(dir, archivo), "utf8") : null;
function commit(dir: string, msg: string): void {
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", msg);
}

// git hereda la identidad del entorno del proceso: la fijamos para `actualizar`.
Object.assign(process.env, ENV);

/** Plantilla desnuda + su copia de trabajo, y un cliente nacido de ella. */
function escenario(nombre: string): { plantilla: string; tpl: string; cliente: string } {
  const base = path.join(raiz, nombre);
  const plantilla = path.join(base, "website_template.git");
  const origen = path.join(base, "web_cliente.git");
  const tpl = path.join(base, "tpl");
  const cliente = path.join(base, "cliente");
  fs.mkdirSync(base, { recursive: true });
  git(base, "init", "-q", "--bare", "-b", "develop", plantilla);
  git(base, "clone", "-q", plantilla, tpl);
  git(tpl, "checkout", "-q", "-b", "develop");
  escribir(tpl, "lib/motor.ts", "export const v = 1;\n");
  escribir(tpl, "site.config.ts", "export default { nombre: 'Cliente Demo' };\n");
  escribir(tpl, "content/pages/es/inicio.md", "# Demo\n");
  escribir(tpl, "content/pages/es/borrable.md", "# Página de la demo\n");
  escribir(tpl, "public/fotos/demo.webp", "foto-demo");
  escribir(tpl, "app/icon.svg", "<svg>demo</svg>");
  escribir(tpl, "app/page.tsx", "export default 1;\n");
  commit(tpl, "plantilla inicial");
  git(tpl, "push", "-q", "origin", "develop");
  // El cliente nace con el historial de la plantilla (crear-sitio paso 1).
  git(base, "init", "-q", "--bare", "-b", "develop", origen);
  git(base, "clone", "-q", "-b", "develop", plantilla, cliente);
  git(cliente, "remote", "rename", "origin", "plantilla");
  git(cliente, "remote", "add", "origin", origen);
  escribir(cliente, "site.config.ts", "export default { nombre: 'Acme' };\n");
  escribir(cliente, "content/pages/es/inicio.md", "# Acme\n");
  escribir(cliente, "app/icon.svg", "<svg>acme</svg>");
  commit(cliente, "piel de Acme");
  git(cliente, "push", "-q", "origin", "develop");
  return { plantilla, tpl, cliente };
}

const opc = (dir: string, plantilla: string, extra: Partial<Opciones> = {}): Opciones => ({
  dir,
  plantilla,
  primeraVez: false,
  empujar: true,
  frenos: "",
  ...extra,
});
const callado = (): void => {};

try {
  // ── 1–3 · El camino normal ───────────────────────────────────────────────
  {
    const { plantilla, tpl, cliente } = escenario("normal");
    escribir(tpl, "lib/motor.ts", "export const v = 2;\n"); // motor
    escribir(tpl, "site.config.ts", "export default { nombre: 'Demo 2' };\n"); // piel cambiada
    escribir(tpl, "content/pages/es/inicio.md", "# Demo 2\n"); // piel cambiada por los dos
    fs.rmSync(path.join(tpl, "content/pages/es/borrable.md")); // piel borrada
    fs.rmSync(path.join(tpl, "public/fotos/demo.webp")); // piel borrada
    escribir(tpl, "content/pages/es/nueva-demo.md", "# Nueva\n"); // piel añadida
    escribir(tpl, "app/icon.png", "png-demo"); // piel añadida por comodín
    escribir(tpl, "lib/nuevo.ts", "export {};\n"); // motor añadido
    commit(tpl, "motor v2 y demo nueva");
    git(tpl, "push", "-q", "origin", "develop");

    const r = actualizar(opc(cliente, plantilla), callado);
    comprobar(r.estado === "actualizado", `el camino normal actualiza (salió ${r.estado})`);
    comprobar(leer(cliente, "lib/motor.ts") === "export const v = 2;\n", "el cambio de motor llega");
    comprobar(leer(cliente, "lib/nuevo.ts") !== null, "un archivo de motor nuevo llega");
    comprobar(leer(cliente, "site.config.ts")!.includes("Acme"), "la ficha del cliente no se pisa");
    comprobar(leer(cliente, "content/pages/es/inicio.md") === "# Acme\n", "contenido cambiado por los dos: gana el cliente");
    comprobar(leer(cliente, "content/pages/es/borrable.md") !== null, "la plantilla no borra contenido del cliente");
    comprobar(leer(cliente, "public/fotos/demo.webp") !== null, "la plantilla no borra fotos del cliente");
    comprobar(leer(cliente, "content/pages/es/nueva-demo.md") === null, "contenido nuevo de la demo no entra");
    comprobar(leer(cliente, "app/icon.png") === null, "un icono nuevo de la demo no entra");
    comprobar(leer(cliente, "app/icon.svg") === "<svg>acme</svg>", "el icono del cliente sigue");
    comprobar(git(cliente, "status", "--porcelain") === "", "el árbol queda limpio");
    const origenDevelop = git(cliente, "ls-remote", "origin", "develop").split("\t")[0];
    comprobar(origenDevelop === git(cliente, "rev-parse", "HEAD"), "se empuja a develop de origin");
    comprobar(git(cliente, "rev-list", "--parents", "-n", "1", "HEAD").split(" ").length === 3, "queda un commit de fusión");
    comprobar(git(cliente, "config", "merge.ours.driver") === "true", "configura el driver merge.ours");

    const r2 = actualizar(opc(cliente, plantilla), callado);
    comprobar(r2.estado === "al-dia", "la segunda vez no hace nada");

    // 4 · Negativas
    escribir(cliente, "lib/motor.ts", "sucio");
    comprobar(actualizar(opc(cliente, plantilla), callado).estado === "parado", "se niega con cambios sin guardar");
    git(cliente, "checkout", "-q", "--", "lib/motor.ts");
    git(cliente, "checkout", "-q", "-b", "otra");
    comprobar(actualizar(opc(cliente, plantilla), callado).estado === "parado", "se niega fuera de develop");
    git(cliente, "checkout", "-q", "develop");
    comprobar(actualizar(opc(tpl, plantilla), callado).estado === "parado", "se niega sobre la propia plantilla");
  }

  // ── 5 · Conflicto de motor ───────────────────────────────────────────────
  {
    const { plantilla, tpl, cliente } = escenario("conflicto");
    escribir(tpl, "lib/motor.ts", "export const v = 'plantilla';\n");
    commit(tpl, "motor");
    git(tpl, "push", "-q", "origin", "develop");
    escribir(cliente, "lib/motor.ts", "export const v = 'cliente';\n");
    commit(cliente, "ajuste local de motor");
    const antes = git(cliente, "rev-parse", "HEAD");
    const r = actualizar(opc(cliente, plantilla), callado);
    comprobar(r.estado === "parado" && r.motivo.includes("lib/motor.ts"), "un conflicto de motor para y lo nombra");
    comprobar(git(cliente, "rev-parse", "HEAD") === antes, "tras el conflicto, HEAD sigue igual");
    comprobar(git(cliente, "status", "--porcelain") === "", "tras el conflicto, árbol limpio (fusión deshecha)");
  }

  // ── 6 · Frenos en rojo ───────────────────────────────────────────────────
  {
    const { plantilla, tpl, cliente } = escenario("frenos");
    escribir(tpl, "lib/motor.ts", "export const v = 3;\n");
    commit(tpl, "motor");
    git(tpl, "push", "-q", "origin", "develop");
    const antes = git(cliente, "rev-parse", "HEAD");
    const r = actualizar(opc(cliente, plantilla, { frenos: "exit 1" }), callado);
    comprobar(r.estado === "parado", "frenos en rojo paran");
    comprobar(git(cliente, "rev-parse", "HEAD") === antes, "frenos en rojo deshacen la fusión");
    comprobar(git(cliente, "ls-remote", "origin", "develop").split("\t")[0] === antes, "frenos en rojo no empujan");
    const r2 = actualizar(opc(cliente, plantilla, { frenos: "true", empujar: false }), callado);
    comprobar(r2.estado === "actualizado" && !r2.empujado, "frenos en verde y --sin-empujar: fusiona sin empujar");
  }

  // ── Sin historial común: solo con --primera-vez ──────────────────────────
  {
    const { plantilla } = escenario("ajeno");
    const ajeno = path.join(raiz, "ajeno", "suelto");
    fs.mkdirSync(ajeno);
    git(ajeno, "init", "-q", "-b", "develop");
    git(ajeno, "remote", "add", "origin", path.join(raiz, "ajeno", "web_cliente.git"));
    escribir(ajeno, "site.config.ts", "export default { nombre: 'Suelto' };\n");
    escribir(ajeno, "lib/motor.ts", "export const v = 0;\n");
    escribir(ajeno, "content/pages/es/inicio.md", "# Suelto\n");
    commit(ajeno, "sitio suelto");
    comprobar(actualizar(opc(ajeno, plantilla), callado).estado === "parado", "sin historial común se niega");
    // lib/motor.ts lo añadieron los dos: en la primera vez gana la plantilla.
    const r = actualizar(opc(ajeno, plantilla, { primeraVez: true, empujar: false }), callado);
    comprobar(r.estado === "actualizado", `--primera-vez engancha (salió ${r.estado})`);
    comprobar(leer(ajeno, "lib/motor.ts") === "export const v = 1;\n", "--primera-vez trae el motor");
    comprobar(leer(ajeno, "site.config.ts")!.includes("Suelto"), "--primera-vez conserva la ficha");
    comprobar(leer(ajeno, "content/pages/es/borrable.md") === null, "--primera-vez no mete contenido de la demo");
    comprobar(leer(ajeno, "public/fotos/demo.webp") === null, "--primera-vez no mete fotos de la demo");
    comprobar(actualizar(opc(ajeno, plantilla, { empujar: false }), callado).estado === "al-dia", "después, ya comparte historial");
  }

  // ── 7 · .gitattributes = PIEL ────────────────────────────────────────────
  {
    const attrs = fs
      .readFileSync(path.join(import.meta.dirname, "../../.gitattributes"), "utf8")
      .split("\n")
      .filter((l) => l.includes("merge=ours"))
      .map((l) => l.split(/\s+/)[0]!.replace(/\*\*$/, ""));
    const piel = PIEL.map((p) => p);
    comprobar(
      attrs.length === piel.length && piel.every((p) => attrs.includes(p)),
      `.gitattributes y PIEL coinciden (attrs: ${attrs.join(" ")})`,
    );
    comprobar(esPiel("app/icon.svg") && esPiel("app/apple-icon.png") && !esPiel("app/icons/x.ts"), "el comodín no baja de carpeta");
    comprobar(!esPiel("app/page.tsx") && !esPiel("docs/PLANTILLA.md"), "el motor no es piel");
  }
} finally {
  fs.rmSync(raiz, { recursive: true, force: true });
}

console.log(`${fallos === 0 ? "✓" : "✗"} test:sitio-actualizar — ${pasadas} bien, ${fallos} mal`);
process.exitCode = fallos === 0 ? 0 : 1;
