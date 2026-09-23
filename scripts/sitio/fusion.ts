/**
 * fusion.ts — **Traer la plantilla a un sitio de cliente sin tocar su piel**
 * (D-167, `npm run sitio:actualizar`).
 *
 * EL MODELO. Cada sitio de cliente nace con el historial completo de
 * `website_template` (`commands/crear-sitio.md` paso 1). Actualizarlo es una
 * fusión que git entiende: `git merge plantilla/develop`. Lo único que hay que
 * añadir a git es **qué archivos son del cliente** —la piel— y que esos no los
 * decide la plantilla nunca.
 *
 * POR QUÉ NO BASTA CON `.gitattributes` + `merge=ours`. El driver `ours` solo
 * corre cuando **los dos lados** cambiaron el mismo archivo. Si la plantilla
 * borra una foto de la demo que el cliente no tocó, git la borra sin preguntar;
 * si añade una página de la demo, entra. Y la plantilla hace las dos cosas a
 * menudo: su piel es la de «Cliente Demo». Así que, después de fusionar, la
 * piel se deja **exactamente como estaba en `HEAD`**: se restaura lo que había y
 * se quita lo que entró. `.gitattributes` queda como segunda red, para quien
 * fusione a mano.
 *
 * LA CONSECUENCIA QUE HAY QUE SABER. Si la plantilla añade un archivo de piel
 * que el motor **necesita** (una página nueva que una ruta espera), al cliente
 * no le llega: los frenos lo dirán, y se escribe en su `content/` a mano.
 *
 * NUNCA PUBLICA EN PRODUCCIÓN. Empuja a `develop` (vista previa); pasar a `main`
 * es otro paso, con el «sí» de Ricardo.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** De dónde viene el motor. */
export const PLANTILLA = "https://github.com/RicardoTorresOliva/website_template.git";
export const REMOTO = "plantilla";
export const RAMA_PLANTILLA = "develop";

/**
 * La piel: lo que es del cliente y la plantilla no pisa.
 *   · termina en `/`  → la carpeta entera
 *   · termina en `*`  → archivos de esa carpeta que empiezan así
 *   · si no           → ese archivo
 * Los tres documentos de `docs/` son la memoria del proyecto, no del motor.
 * `.gitattributes` repite esta lista; `test-actualizar.ts` comprueba que coinciden.
 */
export const PIEL = [
  "site.config.ts",
  "content/",
  "public/marca/",
  "public/fotos/",
  "app/icon*",
  "app/apple-icon*",
  "app/favicon.ico",
  "README.md",
  "docs/project_memory.md",
  "docs/work_log.md",
  "docs/decision_log.md",
] as const;

export function esPiel(archivo: string): boolean {
  return PIEL.some((p) => {
    if (p.endsWith("/")) return archivo.startsWith(p);
    if (p.endsWith("*")) {
      const prefijo = p.slice(0, -1);
      return archivo.startsWith(prefijo) && !archivo.slice(prefijo.length).includes("/");
    }
    return archivo === p;
  });
}

export type Opciones = {
  readonly dir: string;
  readonly plantilla: string;
  /** Primera fusión de un repositorio que no nació de la plantilla (`web_demo`). */
  readonly primeraVez: boolean;
  readonly empujar: boolean;
  /** Orden de shell con los frenos que se corren antes de empujar; vacía = ninguno. */
  readonly frenos: string;
};

export type Resultado =
  | { estado: "al-dia" }
  | { estado: "actualizado"; desde: string; hasta: string; empujado: boolean; pielProtegida: number }
  | { estado: "parado"; motivo: string };

type Salida = (linea: string) => void;

function git(dir: string, args: string[], permitirFallo = false): { ok: boolean; out: string } {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  const ok = r.status === 0;
  if (!ok && !permitirFallo) {
    throw new Error(`git ${args.join(" ")} falló:\n${(r.stderr || r.stdout).trim()}`);
  }
  return { ok, out: (r.stdout ?? "").trim() };
}

/**
 * Los frenos de antes de empujar: los rápidos, que no piden base ni navegador.
 * `npm install` primero porque la plantilla puede traer dependencias nuevas. El
 * resto —compilación, base, Lighthouse— lo corre el CI del cliente sobre develop.
 */
export const FRENOS =
  "npm install --no-audit --no-fund --loglevel=error && npm run check:types && npm run lint && npm run check:content && npm run check:sitio";

const lineas = (s: string): string[] => s.split("\n").filter(Boolean);
/** Listas de archivos con `-z`: sin esto git entrecomilla los nombres con tildes. */
const archivos = (s: string): string[] => s.split("\0").filter(Boolean);

export function actualizar(o: Opciones, decir: Salida): Resultado {
  const parar = (motivo: string): Resultado => {
    decir(`✗ ${motivo}`);
    return { estado: "parado", motivo };
  };

  // 1 · Nunca sobre la propia plantilla, nunca con cambios a medias.
  const origen = git(o.dir, ["remote", "get-url", "origin"], true).out;
  if (/website_template(\.git)?$/.test(origen)) {
    return parar("Esto es la plantilla: se actualizan los sitios de cliente, no ella.");
  }
  if (git(o.dir, ["status", "--porcelain"]).out) {
    return parar("Hay cambios sin guardar. Guárdalos (commit) o descártalos y vuelve a empezar.");
  }
  const rama = git(o.dir, ["rev-parse", "--abbrev-ref", "HEAD"]).out;
  if (rama !== "develop") {
    return parar(`Se actualiza sobre develop y estás en «${rama}»: git checkout develop.`);
  }

  // 2 · Remoto y driver. Idempotente: si ya están, no se tocan.
  const remotos = lineas(git(o.dir, ["remote"]).out);
  if (!remotos.includes(REMOTO)) {
    git(o.dir, ["remote", "add", REMOTO, o.plantilla]);
    decir(`· Remoto «${REMOTO}» añadido → ${o.plantilla}`);
  }
  git(o.dir, ["config", "merge.ours.driver", "true"]);
  git(o.dir, ["fetch", "--quiet", REMOTO, RAMA_PLANTILLA]);
  const ref = `${REMOTO}/${RAMA_PLANTILLA}`;
  const hasta = git(o.dir, ["rev-parse", "--short", ref]).out;
  const desde = git(o.dir, ["rev-parse", "--short", "HEAD"]).out;

  // 3 · ¿Hace falta?
  if (git(o.dir, ["merge-base", "--is-ancestor", ref, "HEAD"], true).ok) {
    decir(`✓ Ya al día con la plantilla (${hasta}).`);
    return { estado: "al-dia" };
  }
  const comun = git(o.dir, ["merge-base", "HEAD", ref], true).ok;
  if (!comun && !o.primeraVez) {
    return parar(
      "Este repositorio no comparte historial con la plantilla. La primera vez se engancha con --primera-vez.",
    );
  }

  // 4 · Fusionar sin cerrar, para poder dejar la piel como estaba.
  const pielAntes = archivos(git(o.dir, ["ls-tree", "-r", "-z", "--name-only", "HEAD"]).out).filter(esPiel);
  const args = ["merge", "--no-ff", "--no-commit", "--quiet", ref];
  // Sin historial común, los dos lados «añadieron» cada archivo del motor y
  // todos chocarían. La primera vez el motor es el de la plantilla (`-X theirs`);
  // la piel se restaura igual justo después.
  if (!comun) args.splice(1, 0, "--allow-unrelated-histories", "-X", "theirs");
  git(o.dir, args, true); // un conflicto sale con código 1; se mira abajo

  // 5 · La piel, exactamente como en HEAD.
  const enIndice = new Set(archivos(git(o.dir, ["ls-files", "-z"]).out).filter(esPiel));
  for (const f of archivos(git(o.dir, ["diff", "-z", "--name-only", "--diff-filter=U"]).out)) {
    if (esPiel(f)) enIndice.add(f);
  }
  const antes = new Set(pielAntes);
  const sobran = [...enIndice].filter((f) => !antes.has(f));
  if (sobran.length > 0) {
    git(o.dir, ["rm", "-q", "-f", "--cached", "--", ...sobran]);
    for (const f of sobran) fs.rmSync(path.join(o.dir, f), { force: true });
  }
  if (pielAntes.length > 0) git(o.dir, ["checkout", "HEAD", "--", ...pielAntes]);
  const cambiada = archivos(git(o.dir, ["diff", "-z", "--cached", "--name-only", "HEAD"]).out).filter(esPiel);
  if (cambiada.length > 0) {
    git(o.dir, ["merge", "--abort"], true);
    return parar(`La piel no quedó intacta (${cambiada.join(", ")}). Fusión deshecha; revisar fusion.ts.`);
  }
  const pielProtegida = sobran.length + pielAntes.length;

  // 6 · Conflictos en el motor: no se resuelven solos.
  const conflictos = archivos(git(o.dir, ["diff", "-z", "--name-only", "--diff-filter=U"]).out);
  if (conflictos.length > 0) {
    git(o.dir, ["merge", "--abort"], true);
    return parar(
      `Conflictos en el motor, fusión deshecha:\n  ${conflictos.join("\n  ")}\n` +
        `  Se resuelven a mano: git merge ${ref}, arreglar, commit, y volver a correr esto.`,
    );
  }

  git(o.dir, ["commit", "--quiet", "--no-verify", "-m", `Actualización desde la plantilla (${hasta})`]);
  decir(`· Fusión hecha: ${desde} + plantilla ${hasta}. Piel intacta (${pielProtegida} archivos).`);

  // 7 · Frenos. Si fallan, la fusión se deshace y no se empuja nada.
  if (o.frenos) {
    decir(`· Frenos: ${o.frenos}`);
    const r = spawnSync(o.frenos, { cwd: o.dir, stdio: "inherit", shell: true });
    if (r.status !== 0) {
      git(o.dir, ["reset", "--hard", "--quiet", "HEAD~1"]);
      return parar("Los frenos fallaron con la plantilla nueva. Fusión deshecha; develop sigue como estaba.");
    }
  }

  // 8 · A develop: vista previa. Producción, nunca desde aquí.
  if (o.empujar) {
    git(o.dir, ["push", "--quiet", "origin", "develop"]);
    decir("✓ Empujado a develop: Vercel prepara la vista previa. Producción: solo con el «sí» de Ricardo.");
  } else {
    decir("✓ Fusión lista en local (sin empujar).");
  }
  return { estado: "actualizado", desde, hasta, empujado: o.empujar, pielProtegida };
}
