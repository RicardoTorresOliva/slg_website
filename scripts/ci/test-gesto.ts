/**
 * test-gesto.ts — Las cuatro cláusulas de RNF-45, medidas CUADRO A CUADRO.
 *
 * El criterio 10 de FU-10 dice, con todas las letras, que el sheet «se verifica
 * cuadro a cuadro, **no por inspección del código**». Un `grep` no puede ver si
 * el panel va donde va el dedo: eso solo se ve mirando los fotogramas.
 *
 * Así que esto abre un Chromium de verdad, con un viewport de móvil, arrastra
 * el sheet con eventos de puntero reales y **muestrea la matriz de transformación
 * en cada `requestAnimationFrame`**. Las cuatro cláusulas se comprueban contra
 * esas muestras:
 *
 *   1. **1:1** — el valor presentado es el delta del puntero, sin multiplicador
 *      ni retardo. Se compara fotograma contra posición del ratón.
 *   2. **Proyección de momentum** — un lanzamiento rápido y CORTO cierra; un
 *      arrastre lento y más largo no. La decisión no puede ser la posición.
 *   3. **Rubber-band** — pasado el tope, el panel sigue moviéndose con retorno
 *      decreciente, y el fotograma cae sobre la curva `rubberBand()` con 1 px de
 *      tolerancia. Clavarse en 0 es incumplirla.
 *   4. **Velocidad transferida** — el cierre arranca DESDE el valor presentado
 *      (nunca desde 0, que es el salto de RNF-12) y dura menos cuanto más rápido
 *      venía el dedo. Se miden las dos duraciones y se comparan.
 *
 * Prueba negativa (R-26): `GESTO_URL=file://…/negative/gesto/roto.html` apunta el
 * MISMO medidor a un sheet que incumple las cuatro. Si no se pone en rojo ahí,
 * el medidor no mide y su verde no vale nada.
 *
 * Necesita `npm run build:standalone` (salvo con `GESTO_URL`) y el Chromium de
 * Playwright.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import { chromium, type Browser, type Page } from "playwright";

import { rubberBand } from "../../lib/design/motion.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER = path.join(REPO_ROOT, ".next", "standalone", "server.js");
/** Un móvil real, no un escritorio estrecho: el sheet solo existe aquí. */
const VIEWPORT = { width: 390, height: 844 };

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

/**
 * Dónde está el Chromium. Con `CHROMIUM_PATH` manda esa ruta; si no, se busca
 * el binario ya instalado en `PLAYWRIGHT_BROWSERS_PATH` —los entornos que traen
 * el navegador preinstalado no siempre lo traen en la revisión exacta que pide
 * la librería, y descargarlo otra vez no siempre es posible—; y si tampoco,
 * se deja decidir a Playwright, que es lo que ocurre en CI.
 */
function rutaDeChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!raiz || !fs.existsSync(raiz)) return undefined;
  const candidatos = fs
    .readdirSync(raiz)
    .filter((d) => d.startsWith("chromium-"))
    .map((d) => path.join(raiz, d, "chrome-linux", "chrome"))
    .filter((f) => fs.existsSync(f));
  return candidatos[0];
}

/* ── Servidor, cuando se mide la página real ─────────────────────────────── */

async function puertoLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const dir = srv.address();
      if (typeof dir === "object" && dir) {
        const p = dir.port;
        srv.close(() => resolve(p));
      } else reject(new Error("sin puerto"));
    });
  });
}

/**
 * Las DOS páginas donde se mide el sheet.
 *
 * `/prototipo` es la compuerta de FU-10. `/doctrina` es una página PÚBLICA de
 * verdad, prerrenderizada y servida como la verá un visitante: el criterio 4 de
 * DU-02 pide las cuatro cláusulas «en producción», y un componente que se porta
 * bien en su prototipo y mal en la página real es exactamente el fallo que ese
 * criterio existe para atrapar.
 */
const PAGINAS = ["/prototipo", "/doctrina"];

async function arrancarServidor(): Promise<{ url: string; parar: () => void }> {
  const port = await puertoLibre();
  const base = `http://127.0.0.1:${port}`;
  const proc: ChildProcess = spawn(process.execPath, [SERVER], {
    cwd: path.dirname(SERVER),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      BETTER_AUTH_URL: base,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "solo-para-medir-el-gesto",
      NEXT_PUBLIC_SITE_URL: base,
      // Sin compuerta de staging: aquí se mide el sitio, no la compuerta.
      STAGING_BASIC_AUTH_USER: "",
      STAGING_BASIC_AUTH_PASSWORD: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    if (proc.exitCode !== null) throw new Error(`el servidor murió con código ${proc.exitCode}`);
    try {
      const r = await fetch(`${base}${PAGINAS[0]}`);
      if (r.ok) return { url: base, parar: () => proc.kill("SIGTERM") };
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill("SIGTERM");
  throw new Error("el servidor no respondió en 30 s");
}

/* ── El medidor: un muestreo por fotograma ───────────────────────────────── */

type Cuadro = { t: number; ty: number; alto: number; ancho: number };

/**
 * Instala un bucle de `requestAnimationFrame` que anota, en cada fotograma, la
 * traslación vertical REALMENTE presentada —`m42` de la matriz calculada, no la
 * propiedad que el código creía haber escrito— junto con el tamaño del panel.
 * El tamaño va en la muestra para poder afirmar que NADA provoca reflow durante
 * la animación (RNF-11): si `alto` o `ancho` cambian a mitad de gesto, se está
 * animando algo que no es `transform` ni `opacity`.
 */
async function instalarMuestreo(page: Page) {
  await page.evaluate(() => {
    const telon = document.querySelector('[role="dialog"]');
    const panel = telon?.firstElementChild as HTMLElement | null;
    if (!panel) throw new Error("no hay panel que medir");
    const w = window as unknown as { __cuadros: Cuadro[] };
    w.__cuadros = [];
    const leer = () => {
      if (!document.contains(panel)) return;
      const bruto = getComputedStyle(panel).transform;
      const ty = bruto === "none" ? 0 : new DOMMatrixReadOnly(bruto).m42;
      const caja = panel.getBoundingClientRect();
      w.__cuadros.push({ t: performance.now(), ty, alto: caja.height, ancho: caja.width });
      requestAnimationFrame(leer);
    };
    requestAnimationFrame(leer);
  });
}

const cuadros = (page: Page) =>
  page.evaluate(() => (window as unknown as { __cuadros: Cuadro[] }).__cuadros) as Promise<Cuadro[]>;

/**
 * La traslación presentada AHORA MISMO y el instante en que se leyó, **en una
 * sola ida y vuelta**. Van juntas porque esta lectura ocurre entre el último
 * movimiento del dedo y el `pointerup`, y la ventana de caducidad de la
 * velocidad son 100 ms: dos viajes al navegador se comerían parte de ella.
 */
const estado = (page: Page) =>
  page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"]')?.firstElementChild as HTMLElement | null;
    const bruto = panel ? getComputedStyle(panel).transform : "none";
    return { ty: bruto === "none" ? 0 : new DOMMatrixReadOnly(bruto).m42, t: performance.now() };
  });

const presentado = async (page: Page) => (await estado(page)).ty;

const haySheet = (page: Page) => page.evaluate(() => !!document.querySelector('[role="dialog"]'));

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function abrirSheet(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load" });
  // El botón existe en el HTML servido antes de que React lo hidrate: hacer
  // clic demasiado pronto no abre nada y no da error. Se reintenta hasta que
  // el manejador está vivo, que es exactamente lo que vive un visitante que
  // toca el menú nada más cargar.
  const boton = page.locator('button[aria-haspopup="dialog"]').first();
  await boton.waitFor({ state: "visible", timeout: 10_000 });
  const limite = Date.now() + 15_000;
  while (Date.now() < limite) {
    await boton.click();
    try {
      await page.waitForSelector('[role="dialog"]', { state: "visible", timeout: 1_000 });
      break;
    } catch {
      /* todavía sin hidratar */
    }
  }
  await page.waitForSelector('[role="dialog"]', { state: "visible", timeout: 2_000 });
  await instalarMuestreo(page);
  const caja = await page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"]')?.firstElementChild as HTMLElement;
    const r = panel.getBoundingClientRect();
    return { top: r.top, alto: r.height, centroX: r.left + r.width / 2 };
  });
  return caja;
}

/* ── Las mediciones ──────────────────────────────────────────────────────── */

async function clausula1y3(page: Page, url: string) {
  console.log("\nCláusulas 1 y 3 — seguimiento 1:1 y rubber-band, fotograma a fotograma:\n");
  const caja = await abrirSheet(page, url);
  const x = caja.centroX;
  const y0 = caja.top + 20;
  await page.mouse.move(x, y0);
  await page.mouse.down();

  // Hacia abajo: el panel va DONDE VA EL DEDO. Sin multiplicador, sin retardo.
  const desviaciones: number[] = [];
  for (const delta of [24, 48, 72, 96, 120]) {
    await page.mouse.move(x, y0 + delta);
    await esperar(60); // deja pasar dos fotogramas: si hay transición, se nota.
    const ty = (await presentado(page)) ?? NaN;
    desviaciones.push(Math.abs(ty - delta));
  }
  const peor = Math.max(...desviaciones);
  check(
    "1:1 — el valor presentado es el delta del puntero (≤ 1 px de desviación)",
    peor <= 1,
    `peor desviación: ${peor.toFixed(2)} px sobre los cinco puntos [${desviaciones
      .map((d) => d.toFixed(2))
      .join(", ")}]`,
  );

  // Hacia arriba, más allá del tope: resiste, no se clava.
  let tyBanda = 0;
  for (const delta of [-30, -60, -100]) {
    await page.mouse.move(x, y0 + delta);
    await esperar(60);
    tyBanda = (await presentado(page)) ?? NaN;
  }
  const esperadoBanda = rubberBand(-100, caja.alto);
  check(
    "rubber-band — el fotograma cae sobre la curva de iOS (≤ 1 px)",
    Math.abs(tyBanda - esperadoBanda) <= 1,
    `presentado ${tyBanda.toFixed(2)} px, curva ${esperadoBanda.toFixed(2)} px (alto ${caja.alto.toFixed(0)} px)`,
  );
  check(
    "rubber-band — resiste sin bloquearse: se mueve, y menos que el dedo",
    tyBanda < -1 && Math.abs(tyBanda) < 100,
    `presentado ${tyBanda.toFixed(2)} px frente a un dedo en -100 px`,
  );

  // Nada de lo que cambia provoca reflow: el panel no cambia de tamaño.
  const muestras = await cuadros(page);
  const altos = new Set(muestras.map((c) => Math.round(c.alto)));
  const anchos = new Set(muestras.map((c) => Math.round(c.ancho)));
  check(
    "solo transform: el panel no cambia de tamaño en ningún fotograma (RNF-11)",
    altos.size === 1 && anchos.size === 1,
    `altos vistos: ${[...altos].join(", ")} · anchos: ${[...anchos].join(", ")}`,
  );

  // Soltar tras un segundo quieto: la velocidad ha CADUCADO, no cierra.
  await esperar(400);
  await page.mouse.up();
  await esperar(700);
  check(
    "la velocidad caduca: arrastrar rápido, pararse y soltar NO cierra",
    await haySheet(page),
    "el sheet se cerró con el dedo detenido",
  );
}

/**
 * Arrastra hacia abajo y suelta.
 *
 *   · `deslizar` — un LANZAMIENTO: todo el recorrido de golpe, en pasos
 *     seguidos sin espera entre ellos. Es el gesto con el que la gente cierra
 *     de verdad: rápido y corto.
 *   · `paso`/`dt`/`pasos` — un arrastre deliberado: la misma distancia, o más,
 *     repartida en el tiempo. Sin momentum.
 */
async function lanzar(
  page: Page,
  url: string,
  opciones: { fraccion: number; dt: number; pasos: number } | { deslizar: number },
) {
  const caja = await abrirSheet(page, url);
  const x = caja.centroX;
  const y0 = caja.top + 20;
  await page.mouse.move(x, y0);
  await page.mouse.down();
  if ("deslizar" in opciones) {
    // Un lanzamiento: el recorrido entero en tres muestras seguidas. Las
    // distancias van en FRACCIÓN DEL ALTO del panel y no en píxeles, para que
    // la medición siga valiendo cuando el contenido del sheet cambie.
    await page.mouse.move(x, y0 + opciones.deslizar * caja.alto, { steps: 3 });
  } else {
    const paso = (opciones.fraccion * caja.alto) / opciones.pasos;
    // La espera va ANTES de cada movimiento, nunca después del último: soltar
    // 150 ms después de la última muestra caduca la velocidad (ver
    // `VENTANA_DE_VELOCIDAD_MS` en el componente) y mediríamos otra cosa.
    for (let i = 1; i <= opciones.pasos; i++) {
      await esperar(opciones.dt);
      await page.mouse.move(x, y0 + paso * i);
    }
  }
  const { ty: yAlSoltar, t: tSuelta } = await estado(page);
  await page.mouse.up();
  await esperar(1_100);
  return { caja, yAlSoltar, tSuelta, sigue: await haySheet(page), muestras: await cuadros(page) };
}

async function clausula2(page: Page, url: string) {
  console.log("\nCláusula 2 — decide la PROYECCIÓN, no la posición:\n");

  // Lanzamiento rápido y CORTO: se suelta muy por encima de la mitad.
  const rapido = await lanzar(page, url, { deslizar: 0.25 });
  check(
    "un lanzamiento rápido y corto CIERRA, aunque no pase de la mitad",
    !rapido.sigue && rapido.yAlSoltar < rapido.caja.alto / 2,
    `soltado en ${rapido.yAlSoltar.toFixed(0)} px de ${rapido.caja.alto.toFixed(0)} ` +
      `(la mitad son ${(rapido.caja.alto / 2).toFixed(0)}); ${rapido.sigue ? "NO cerró" : "cerró"}`,
  );

  // Arrastre deliberado: llega MÁS LEJOS que el lanzamiento y aun así no
  // cierra, porque no proyecta. Si mandara la posición, este cerraría antes.
  const lento = await lanzar(page, url, { fraccion: 0.35, dt: 120, pasos: 20 });
  check(
    "un arrastre lento NO cierra, aunque llegue más lejos que el lanzamiento",
    lento.sigue && lento.yAlSoltar > rapido.yAlSoltar,
    `soltado en ${lento.yAlSoltar.toFixed(0)} px frente a ${rapido.yAlSoltar.toFixed(0)} del ` +
      `lanzamiento; la mitad son ${(lento.caja.alto / 2).toFixed(0)}; ` +
      `${lento.sigue ? "no cerró" : "CERRÓ"}`,
  );

  return rapido;
}

/** Milisegundos de cierre, leídos de los fotogramas: de soltar al último cuadro. */
function duracionDeCierre(muestras: Cuadro[], tSuelta: number): number {
  const despues = muestras.filter((c) => c.t >= tSuelta);
  if (despues.length < 2) return NaN;
  return despues[despues.length - 1].t - despues[0].t;
}

async function clausula4(page: Page, url: string, rapido: Awaited<ReturnType<typeof lanzar>>) {
  console.log("\nCláusula 4 — el cierre arranca desde lo presentado y hereda la velocidad:\n");

  // (a) El primer fotograma después de soltar sigue donde estaba el dedo.
  const primero = rapido.muestras.find((c) => c.t >= rapido.tSuelta);
  check(
    "el cierre arranca DESDE el valor presentado, no desde 0 (RNF-12)",
    !!primero && Math.abs(primero.ty - rapido.yAlSoltar) <= 8,
    primero
      ? `primer fotograma tras soltar: ${primero.ty.toFixed(1)} px; el dedo lo dejó en ` +
        `${rapido.yAlSoltar.toFixed(1)} px`
      : "no se registró ningún fotograma después de soltar",
  );

  // (b) Más velocidad, cierre más corto. Se miden las dos.
  const msRapido = duracionDeCierre(rapido.muestras, rapido.tSuelta);
  // Un arrastre largo y pausado que TAMBIÉN cierra —pasa de la mitad— pero sin
  // momentum: su cierre tiene que durar bastante más que el lanzamiento.
  const pausado = await lanzar(page, url, { fraccion: 0.65, dt: 150, pasos: 9 });
  const msPausado = duracionDeCierre(pausado.muestras, pausado.tSuelta);
  check(
    "un arrastre pausado que pasa de la mitad también cierra",
    !pausado.sigue,
    `soltado en ${pausado.yAlSoltar.toFixed(0)} px de ${pausado.caja.alto.toFixed(0)}`,
  );
  check(
    "la velocidad se transfiere: más rápido el dedo, más corto el cierre",
    Number.isFinite(msRapido) && Number.isFinite(msPausado) && msPausado > msRapido * 1.4,
    `lanzamiento: ${msRapido.toFixed(0)} ms · pausado: ${msPausado.toFixed(0)} ms`,
  );
}

/* ── Ejecución ───────────────────────────────────────────────────────────── */

const urlExterna = process.env.GESTO_URL;
let parar: (() => void) | null = null;
let navegador: Browser | null = null;

try {
  let urls: string[];
  if (urlExterna) {
    urls = [urlExterna];
  } else {
    const servidor = await arrancarServidor();
    parar = servidor.parar;
    urls = PAGINAS.map((p) => `${servidor.url}${p}`);
  }

  console.log(`Viewport ${VIEWPORT.width}×${VIEWPORT.height} — el sheet solo existe en móvil.`);

  navegador = await chromium.launch({
    executablePath: rutaDeChromium(),
    args: ["--no-sandbox"],
  });
  const contexto = await navegador.newContext({ viewport: VIEWPORT, hasTouch: true, isMobile: true });
  const page = await contexto.newPage();

  for (const url of urls) {
    console.log(`\n══ ${url}`);
    await clausula1y3(page, url);
    const rapido = await clausula2(page, url);
    await clausula4(page, url, rapido);
  }
} finally {
  await navegador?.close();
  parar?.();
}

if (fallos > 0) {
  console.error(`\n✗ gesto: ${fallos} de ${comprobaciones} comprobaciones fallaron.`);
  process.exit(1);
}
console.log(`\n✓ gesto: ${comprobaciones} comprobaciones cuadro a cuadro sobre un Chromium real, sin fallos.`);
