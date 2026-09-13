/**
 * check-dns.ts — La lista de «no tocar» del DNS, verificada nombre por nombre.
 *
 * FU-05 criterio 3 y R-25: tras publicar los registros NUEVOS de la raíz, `www`
 * y `staging`, los nombres que YA estaban vivos deben seguir resolviendo IGUAL.
 * `crm`, `n8n` y `evolution` son sistemas en producción sirviendo desde la misma
 * IP; `academy` apunta fuera; los MX sostienen el correo corporativo, que se
 * queda en Microsoft 365 (D-23).
 *
 * Se usa DOS veces, y el orden importa:
 *
 *   1. ANTES de tocar nada:  `npm run check:dns:baseline` → `docs/dns_baseline.txt`
 *   2. DESPUÉS del cambio:   `npm run check:dns`
 *
 * Se consulta a un resolutor PÚBLICO (8.8.8.8 por defecto) y no al del sistema:
 * el resolutor local puede llevar la zona cacheada de antes del cambio y dar un
 * verde falso. Sobreescribible con `DNS_RESOLVER`.
 *
 * ESTO NO LO EJECUTA RICARDO. Antes era un script de bash que exigía `dig`
 * instalado, y eso convertía una verificación en una instalación de paquetes en
 * una terminal que él no tiene. Ahora es Node —que ya está— y lo corre quien
 * construye, o el CI. Lo de Ricardo es el panel de DNS, y nada más.
 */
import fs from "node:fs";
import path from "node:path";
import { Resolver } from "node:dns/promises";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const BASELINE = process.env.DNS_BASELINE ?? path.join(REPO_ROOT, "docs", "dns_baseline.txt");
const RESOLUTOR = process.env.DNS_RESOLVER ?? "8.8.8.8";
const DOMINIO = process.env.DNS_DOMAIN ?? "softlandingglobal.com";

type Tipo = "A" | "CNAME" | "MX" | "TXT";
type Entrada = { nombre: string; tipo: Tipo };

/** Nombres que NO se tocan (architecture §13.2). */
const PROTEGIDOS: Entrada[] = [
  { nombre: `crm.${DOMINIO}`, tipo: "A" },
  { nombre: `crm.${DOMINIO}`, tipo: "CNAME" },
  { nombre: `n8n.${DOMINIO}`, tipo: "A" },
  { nombre: `n8n.${DOMINIO}`, tipo: "CNAME" },
  { nombre: `evolution.${DOMINIO}`, tipo: "A" },
  { nombre: `evolution.${DOMINIO}`, tipo: "CNAME" },
  { nombre: `academy.${DOMINIO}`, tipo: "A" },
  { nombre: `academy.${DOMINIO}`, tipo: "CNAME" },
  { nombre: DOMINIO, tipo: "MX" },
  { nombre: DOMINIO, tipo: "TXT" },
];

/** Nombres que FU-05 añade (architecture §13.1). */
const NUEVOS: Entrada[] = [
  { nombre: DOMINIO, tipo: "A" },
  { nombre: `www.${DOMINIO}`, tipo: "CNAME" },
  { nombre: `staging.${DOMINIO}`, tipo: "A" },
];

const resolver = new Resolver({ timeout: 4_000, tries: 3 });
resolver.setServers([RESOLUTOR]);

const VACIO = "(vacío)";

/**
 * Códigos que son una RESPUESTA: «ese nombre no tiene ese tipo». Cualquier otro
 * —un timeout, un SERVFAIL— es que **no se pudo preguntar**, y eso no es lo
 * mismo.
 *
 * La diferencia no es teórica: la primera ejecución de este freno dio un rojo
 * por un timeout, e interpretarlo como «un nombre protegido cambió» habría
 * mandado a alguien a revertir a mano una entrada que nadie había tocado. Un
 * freno que se pone rojo por la red enseña a ignorar el freno.
 */
const SIN_REGISTRO = new Set(["ENOTFOUND", "ENODATA", "NOTFOUND", "NODATA"]);

async function consulta({ nombre, tipo }: Entrada, intentos = 3): Promise<string> {
  for (let i = 1; i <= intentos; i++) {
    try {
      switch (tipo) {
        case "A":
          return normaliza(await resolver.resolve4(nombre));
        case "CNAME":
          return normaliza(await resolver.resolveCname(nombre));
        case "MX": {
          const mx = await resolver.resolveMx(nombre);
          return normaliza(mx.map((m) => `${m.priority} ${m.exchange}`));
        }
        case "TXT": {
          const txt = await resolver.resolveTxt(nombre);
          return normaliza(txt.map((t) => t.join("")));
        }
      }
    } catch (e) {
      const codigo = (e as NodeJS.ErrnoException).code ?? "";
      if (SIN_REGISTRO.has(codigo)) return VACIO;
      if (i === intentos) {
        throw new Error(
          `No se pudo consultar ${nombre} ${tipo} tras ${intentos} intentos (${codigo}). ` +
            `Esto NO significa que el registro haya cambiado: significa que el resolutor ` +
            `no contestó. Repite la comprobación antes de tocar nada en el panel.`,
        );
      }
      await new Promise((r) => setTimeout(r, 400 * i));
    }
  }
  return VACIO;
}

function normaliza(valores: string[]): string {
  if (valores.length === 0) return VACIO;
  return [...valores].map((v) => v.trim().replace(/\.$/, "")).sort().join("|");
}

function leerBaseline(): Map<string, string> {
  const mapa = new Map<string, string>();
  if (!fs.existsSync(BASELINE)) return mapa;
  for (const linea of fs.readFileSync(BASELINE, "utf8").split("\n")) {
    if (!linea.trim() || linea.startsWith("#")) continue;
    const [nombre, tipo, ...resto] = linea.split(" ");
    mapa.set(`${nombre} ${tipo}`, resto.join(" ") || VACIO);
  }
  return mapa;
}

const rel = (p: string) => path.relative(REPO_ROOT, p);

async function baseline() {
  const lineas: string[] = [
    `# dns_baseline.txt — estado ANTERIOR de la zona de ${DOMINIO}`,
    "# Generado por scripts/ci/check-dns.ts --baseline",
    `# Fecha: ${new Date().toISOString().replace(/\.\d+Z$/, "Z")} · Resolutor: ${RESOLUTOR}`,
    "#",
    "# architecture §13.1: «Zona previa copiada a docs/ como estado anterior antes",
    "# de tocar nada». Este archivo es ese estado anterior.",
    "#",
    "# Formato: <nombre> <tipo> <respuestas separadas por |>",
    "",
  ];
  for (const e of [...PROTEGIDOS, ...NUEVOS]) {
    lineas.push(`${e.nombre} ${e.tipo} ${await consulta(e)}`);
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${lineas.join("\n")}\n`);
  console.log(`✓ DNS: línea base escrita en ${rel(BASELINE)}`);
  console.log("  Queda en el repositorio. SOLO ENTONCES se toca la zona.");
}

async function verificar() {
  const antes = leerBaseline();
  if (antes.size === 0) {
    console.error(`✗ DNS: no existe ${rel(BASELINE)}.`);
    console.error("    Ejecuta `npm run check:dns:baseline` ANTES de tocar la zona.");
    process.exit(1);
  }

  let fallos = 0;
  let comprobaciones = 0;
  console.log(`Resolutor: ${RESOLUTOR} · línea base: ${rel(BASELINE)}\n`);

  console.log("Nombres protegidos (deben seguir IGUAL):");
  for (const e of PROTEGIDOS) {
    const clave = `${e.nombre} ${e.tipo}`;
    const previo = antes.get(clave) ?? VACIO;

    /**
     * Un nombre que es CNAME **no se comprueba por su registro A**.
     *
     * `academy` apunta a Vercel con un CNAME, y Vercel rota las IP que hay
     * detrás: sus `A` cambiaron entre la línea base y la primera verificación
     * sin que nadie tocara la zona. Lo que tiene que seguir igual es **nuestra
     * entrada** —el CNAME—, no la infraestructura de un tercero. Comparar el
     * `A` de un CNAME es un rojo permanente y ajeno.
     */
    if (e.tipo === "A" && (antes.get(`${e.nombre} CNAME`) ?? VACIO) !== VACIO) {
      console.log(
        `  · ${e.nombre.padEnd(34)} ${"A".padEnd(6)} es un CNAME: se compara el CNAME, no sus IP`,
      );
      continue;
    }

    const ahora = await consulta(e);
    comprobaciones++;
    if (previo === ahora) {
      console.log(`  · ${e.nombre.padEnd(34)} ${e.tipo.padEnd(6)} sin cambios`);
    } else {
      fallos++;
      console.error(`  ✗ ${e.nombre.padEnd(34)} ${e.tipo.padEnd(6)} CAMBIÓ`);
      console.error(`      antes: ${previo}\n      ahora: ${ahora}`);
    }
  }

  console.log("\nNombres nuevos (deben resolver a la IP del VPS):");
  for (const e of NUEVOS) {
    const ahora = await consulta(e);
    comprobaciones++;
    if (ahora === VACIO) {
      fallos++;
      console.error(`  ✗ ${e.nombre.padEnd(34)} ${e.tipo.padEnd(6)} no resuelve todavía`);
    } else {
      console.log(`  · ${e.nombre.padEnd(34)} ${e.tipo.padEnd(6)} ${ahora}`);
    }
  }

  if (fallos > 0) {
    console.error(`\n✗ DNS: ${fallos} fallo(s) sobre ${comprobaciones} comprobaciones.`);
    console.error("  Un nombre protegido que cambia es una caída de un sistema vivo (R-25).");
    console.error("  Se revierte esa entrada en el panel del proveedor ANTES de seguir.");
    process.exit(1);
  }
  console.log(`\n✓ DNS: ${comprobaciones} comprobaciones. Los nombres protegidos no se movieron.`);
}

if (process.argv.includes("--baseline")) await baseline();
else await verificar();
