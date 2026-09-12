/**
 * check-runtime.ts — Comprobaciones sobre el servidor REAL, no sobre el código.
 *
 * Arranca la salida `standalone` dos veces —una como producción, otra como
 * staging— y comprueba desde fuera lo que FU-05 promete:
 *
 *   · criterio 1 — staging pide autenticación básica y devuelve `noindex`.
 *   · criterio 7 — CSP, HSTS y `frame-ancestors` activas y verificadas.
 *
 * Se arranca el servidor de verdad porque `next.config.ts` puede decir lo que
 * quiera: lo que protege al usuario es la cabecera que sale por el socket.
 *
 * Requiere `npm run build:standalone` antes. Cubre: RNF-22 · RF-122 · gate D5.
 */
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER = path.join(REPO_ROOT, ".next", "standalone", "server.js");

const USUARIO = "slg-staging";
const CLAVE = "clave-de-prueba-solo-en-memoria";

type Fallo = { caso: string; detalle: string };
const fallos: Fallo[] = [];
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle: string) {
  comprobaciones++;
  if (!ok) fallos.push({ caso, detalle });
}

async function puertoLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const dir = srv.address();
      if (typeof dir === "object" && dir) {
        const p = dir.port;
        srv.close(() => resolve(p));
      } else {
        reject(new Error("no se pudo reservar puerto"));
      }
    });
  });
}

async function esperarArranque(base: string, proc: ChildProcess): Promise<void> {
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    if (proc.exitCode !== null) throw new Error(`el servidor murió con código ${proc.exitCode}`);
    try {
      await fetch(`${base}/api/health`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error("el servidor no respondió en 30 s");
}

async function conServidor(
  env: Record<string, string>,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const port = await puertoLibre();
  const proc = spawn(process.execPath, [SERVER], {
    cwd: path.dirname(SERVER),
    env: { ...process.env, ...env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    await esperarArranque(base, proc);
    await fn(base);
  } finally {
    proc.kill("SIGTERM");
  }
}

/** Cabeceras de seguridad exigidas (B.8, criterio 7). */
const CABECERAS: ReadonlyArray<{ nombre: string; debe: (v: string | null) => boolean; espera: string }> = [
  {
    nombre: "content-security-policy",
    debe: (v) => !!v && v.includes("frame-ancestors 'none'") && v.includes("default-src 'self'"),
    espera: "con default-src 'self' y frame-ancestors 'none'",
  },
  {
    nombre: "strict-transport-security",
    debe: (v) => !!v && /max-age=\d{7,}/.test(v) && v.includes("includeSubDomains"),
    espera: "max-age largo con includeSubDomains",
  },
  { nombre: "x-content-type-options", debe: (v) => v === "nosniff", espera: "nosniff" },
  { nombre: "x-frame-options", debe: (v) => v === "DENY", espera: "DENY" },
  {
    nombre: "referrer-policy",
    debe: (v) => v === "strict-origin-when-cross-origin",
    espera: "strict-origin-when-cross-origin",
  },
  {
    nombre: "permissions-policy",
    debe: (v) => !!v && v.includes("camera=()") && v.includes("microphone=()"),
    espera: "cámara y micrófono denegados",
  },
];

async function produccion(base: string) {
  const r = await fetch(`${base}/`);
  check("producción · la portada responde", r.status === 200, `status ${r.status}, esperado 200`);

  for (const c of CABECERAS) {
    const v = r.headers.get(c.nombre);
    check(`producción · ${c.nombre}`, c.debe(v), `${c.espera}; recibido: ${v ?? "(ausente)"}`);
  }

  check(
    "producción · no revela el framework",
    r.headers.get("x-powered-by") === null,
    `x-powered-by presente: ${r.headers.get("x-powered-by")}`,
  );

  check(
    "producción · NO lleva noindex",
    !(r.headers.get("x-robots-tag") ?? "").includes("noindex"),
    "producción se indexa; el noindex es solo de staging",
  );

  // Las cabeceras deben cubrir también las rutas de API, no solo el HTML.
  const salud = await fetch(`${base}/api/health`);
  check(
    "producción · la sonda de vida responde sin credenciales",
    salud.status === 200,
    `status ${salud.status}`,
  );
}

async function staging(base: string) {
  const sin = await fetch(`${base}/`);
  check("staging · sin credenciales devuelve 401", sin.status === 401, `status ${sin.status}`);
  check(
    "staging · anuncia autenticación básica",
    (sin.headers.get("www-authenticate") ?? "").startsWith("Basic"),
    `www-authenticate: ${sin.headers.get("www-authenticate") ?? "(ausente)"}`,
  );
  check(
    "staging · el 401 lleva noindex",
    (sin.headers.get("x-robots-tag") ?? "").includes("noindex"),
    `x-robots-tag: ${sin.headers.get("x-robots-tag") ?? "(ausente)"}`,
  );

  const mala = await fetch(`${base}/`, {
    headers: { authorization: `Basic ${btoa(`${USUARIO}:incorrecta`)}` },
  });
  check("staging · contraseña incorrecta devuelve 401", mala.status === 401, `status ${mala.status}`);

  const otroUsuario = await fetch(`${base}/`, {
    headers: { authorization: `Basic ${btoa(`otro:${CLAVE}`)}` },
  });
  check("staging · usuario incorrecto devuelve 401", otroUsuario.status === 401, `status ${otroUsuario.status}`);

  const buena = await fetch(`${base}/`, {
    headers: { authorization: `Basic ${btoa(`${USUARIO}:${CLAVE}`)}` },
  });
  check("staging · credencial correcta entra", buena.status === 200, `status ${buena.status}`);
  check(
    "staging · la página autenticada TAMBIÉN lleva noindex",
    (buena.headers.get("x-robots-tag") ?? "").includes("noindex"),
    `x-robots-tag: ${buena.headers.get("x-robots-tag") ?? "(ausente)"}`,
  );
  check(
    "staging · conserva las cabeceras de seguridad",
    (buena.headers.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"),
    "la compuerta no debe tragarse la CSP",
  );

  // La sonda queda abierta a propósito: UptimeRobot no lleva credenciales.
  const salud = await fetch(`${base}/api/health`);
  check(
    "staging · /api/health queda fuera de la compuerta (D-49)",
    salud.status === 200,
    `status ${salud.status}; un monitor externo con 401 mide la compuerta, no el servicio`,
  );
}

async function main() {
  await conServidor({ STAGING_BASIC_AUTH_USER: "", STAGING_BASIC_AUTH_PASSWORD: "" }, produccion);
  await conServidor(
    { STAGING_BASIC_AUTH_USER: USUARIO, STAGING_BASIC_AUTH_PASSWORD: CLAVE },
    staging,
  );

  if (fallos.length > 0) {
    console.error(`✗ runtime: ${fallos.length} fallo(s) sobre ${comprobaciones} comprobaciones.\n`);
    for (const f of fallos) console.error(`  ${f.caso}\n    · ${f.detalle}`);
    console.error("");
    process.exit(1);
  }
  console.log(`✓ runtime: ${comprobaciones} comprobaciones sobre el servidor real, sin fallos.`);
}

main().catch((err) => {
  console.error(`✗ runtime: ${(err as Error).message}`);
  process.exit(1);
});
