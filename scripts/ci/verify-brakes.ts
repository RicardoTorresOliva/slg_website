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
import { spawn, spawnSync } from "node:child_process";
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
    /**
     * **EL MISMO FRENO, PERO DENTRO DE `public/`.** Esa carpeta estaba exenta
     * —la exención se escribió para las fuentes y el favicon, que no son
     * documentos— y era el único sitio del repositorio donde dejar un
     * entregable lo publica **dos veces**: en el repositorio, que es público, y
     * en el dominio, servido sin autenticación ninguna. Sin este caso, quitar la
     * exención sería una línea sin prueba (R-26).
     */
    freno: "entregable versionado DENTRO de `public/`, que además se sirve sin autenticación",
    script: "check-archivos.ts",
    espera: "public/entregable-en-public.pdf",
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
    freno: "vocabulario de plataforma de formación en el modelo",
    script: "check-alcance.ts",
    espera: "no hay lecciones, progreso, evaluaciones ni certificados",
    env: { ALCANCE_ROOT: path.join(HERE, "negative/alcance") },
  },
  {
    freno: "lista plana de materiales fuera de su proyecto",
    script: "check-alcance.ts",
    espera: "no existe ruta ni entidad que liste materiales fuera",
    env: { ALCANCE_ROOT: path.join(HERE, "negative/alcance") },
  },
  {
    freno: "un gate del Anexo D que se queda en prosa, falta o apunta a un script inexistente",
    script: "check-anexo-d.ts",
    espera: [
      "están los 13 gates",
      "ninguno se queda en prosa",
      "todo `npm run …` que se nombra EXISTE",
      "cada gate declara su estado",
      /**
       * Las tres de la revisión final. La cláusula «no “revisar que se ve
       * bien”» llevaba escrita desde DU-25 **sin mirar una sola palabra**: solo
       * entraba cuando un gate no traía ningún `npm run …`, así que un comando
       * salvaba cualquier cláusula humana por vaga que fuera — y salvaba
       * también a un gate con parte manual y **sin checklist ninguna**, que es
       * lo que le pasaba a D10.
       */
      "todo gate con parte manual trae su",
      "resultado anotable",
      "fórmula vaga",
    ],
    env: { ANEXO_D_PATH: path.join(HERE, "negative/anexo-d/gates.md") },
  },
  {
    freno: "un marcador o una cifra sin fuente en el texto SERVIDO (DoD #10)",
    script: "check-produccion.ts",
    espera: ["marcador [PENDIENTE]", "lorem ipsum", "porcentaje sin fuente", "superlativo sin fuente"],
    env: { PRODUCCION_FIXTURE: path.join(HERE, "negative/produccion") },
  },
  {
    freno: "un documento de diseño que el índice no enlaza",
    script: "check-literacy.ts",
    espera: "los documentos de diseño están todos en",
    env: { LITERACY_ROOT: path.join(HERE, "negative/literacy") },
  },
  {
    /**
     * El barrido de valores miraba **solo el README**, y la documentación donde
     * de verdad se escriben líneas de entorno es `docs/deployment.md`: es la que
     * va paso a paso por Easypanel. El fixture trae las dos formas a propósito
     * —un secreto entre `<ángulos>`, que al pegarse falla en voz alta, y uno
     * copiable, que al pegarse **funciona**— para que el freno demuestre que
     * distingue entre las dos y no marca en rojo la configuración legítima.
     */
    freno: "un secreto con valor COPIABLE en la guía de despliegue",
    script: "check-literacy.ts",
    espera: "APP_DB_PASSWORD",
    env: { LITERACY_ROOT: path.join(HERE, "negative/literacy") },
  },
  {
    freno: "una de las siete tareas del manual que desaparece",
    script: "check-literacy.ts",
    espera: "las 7 tareas están en el README",
    env: { LITERACY_ROOT: path.join(HERE, "negative/literacy") },
  },
  {
    freno: "una variable de entorno sin explicar —o con su valor escrito al lado—",
    script: "check-literacy.ts",
    espera: ["todas las variables de", "ninguna lleva su valor escrito al lado"],
    env: { LITERACY_ROOT: path.join(HERE, "negative/literacy") },
  },
  {
    freno: "la Sesión Cero ofrecida fuera del portal",
    script: "check-alcance.ts",
    espera: "la Sesión Cero NO se ofrece en ninguna superficie pública",
    env: { ALCANCE_ROOT: path.join(HERE, "negative/alcance") },
  },
  {
    freno: "membership usada como matrícula",
    script: "check-alcance.ts",
    espera: "no en qué programas está apuntada",
    env: { ALCANCE_ROOT: path.join(HERE, "negative/alcance") },
  },
  {
    freno: "frontera de módulo cruzada",
    script: "check-fronteras.ts",
    espera: "importa el framework de identidad",
    env: { FRONTERAS_ROOT: path.join(HERE, "negative/fronteras") },
  },
  {
    /**
     * **El freno citaba un criterio que no comprobaba.** El criterio 1 de FU-06
     * dice «cero lógica de sesión, rol o `organization_id` escrita dentro de una
     * página o de un endpoint», y el freno miraba solo importaciones: un endpoint
     * que no importe nada prohibido y aun así decida por su cuenta si el actor es
     * de SLG pasaba en verde. El fixture es justo ese endpoint —importaciones
     * impecables, criterio incumplido tres veces— y las tres reglas nuevas tienen
     * que verlo, cada una por su motivo.
     */
    freno: "la LÓGICA de sesión, rol y empresa escrita dentro de un endpoint",
    script: "check-fronteras.ts",
    espera: [
      "decide por el rol del actor a mano",
      "nombra la cookie de sesión del proveedor",
      "compara la empresa del actor a mano",
    ],
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
    freno: "texto del armazón escrito a mano en vez de leído de content/ui",
    script: "check-cadenas.ts",
    espera: ["texto visible escrito a mano", "atributo que se lee en voz alta"],
    env: { CADENAS_ROOT: path.join(HERE, "negative/cadenas") },
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
  {
    freno: "un tercero en la capa pública · script, fuente o cookie",
    script: "check-terceros.ts",
    /**
     * Tres fragmentos: el fixture carga un script de Google Tag Manager, pide
     * una fuente a un CDN y escribe `_ga`. El freno tiene que ver LAS DOS
     * cosas —peticiones ajenas y cookie—, no una y dar por buena la otra.
     */
    espera: ["ni una sola petición fuera de nuestro origen", "ni una sola cookie", "googletagmanager"],
    env: {
      TERCEROS_FIXTURE: path.join(HERE, "negative/terceros/roto.html"),
    },
  },
  {
    freno: "una pantalla autenticada que se inventa su estado o mete conmutador",
    script: "check-shell.ts",
    /**
     * Dos fragmentos porque el fixture rompe DOS criterios a la vez, y un freno
     * que solo viera uno de los dos daría por bueno el otro.
     */
    espera: ["ninguno con un estado propio", "ningún conmutador"],
    env: { SHELL_ROOT: path.join(HERE, "negative/shell") },
  },
  {
    freno: "HQ cruzando la frontera (a): pipeline, escritura al CRM o clave equivocada",
    script: "check-hq.ts",
    /**
     * Tres fragmentos porque el fixture cruza la frontera de TRES maneras, y un
     * freno que solo viera una daría por buenas las otras dos — que son las que
     * no se notan: escribir en el CRM desde HQ, y leer con la clave que escribe.
     */
    espera: [
      "ninguno con vocabulario de pipeline",
      "ninguna llamada al CRM que no sea GET",
      "nunca la clave de captura",
    ],
    env: { HQ_ROOT: path.join(HERE, "negative/hq") },
  },
  {
    freno: "aislamiento entre empresas · una consulta que toma el `organization_id` del parámetro",
    /**
     * La batería de FU-13 no vive en `scripts/ci/` porque no es un freno
     * estático: necesita PostgreSQL con dos empresas sembradas. Se apunta por
     * ruta relativa y se mide igual que los demás.
     *
     * El fixture construye el contexto **desde el parámetro** en vez de desde la
     * sesión. La política de fila no lo para —desde dentro no hay nada raro:
     * alguien dijo que el actor pertenece a esa empresa— y por eso es el fallo
     * que hay que atrapar arriba, en la aplicación.
     */
    script: "../auth/test-aislamiento.ts",
    espera: "devolvió 1 fila(s)",
    env: { AISLAMIENTO_FIXTURE: "1" },
  },
];

let fallos = 0;
/**
 * **LOS FRENOS QUE NO ESTÁN EN `CASOS`.** Los cuatro que necesitan un servidor
 * —armazón, páginas, SEO y blog— se ejecutan en bloques propios más abajo, y el
 * resumen los ignoraba: anunciaba 31 cuando se ejecutaban 35. El recuento se
 * lleva aquí y cada bloque se suma a sí mismo, que es la única forma de que no
 * vuelva a desfasarse cuando se añada el quinto. Lo encontró la revisión final.
 */
let frenosConServidor = 0;

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

console.log("\nContraprueba — contra el repositorio real, los nueve deben PASAR:\n");
for (const script of [
  "check-secrets.ts",
  "check-js-budget.ts",
  "check-env-example.ts",
  "check-migrations.ts",
  "check-fronteras.ts",
  "check-archivos.ts",
  "check-contraste.ts",
  "check-motion.ts",
  "check-cadenas.ts",
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

frenosConServidor++;
console.log("\nFreno del armazón público — contra un armazón roto a propósito:\n");
{
  const fixture = spawn(process.execPath, [path.join(HERE, "negative/armazon/servidor.ts")], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = await new Promise<string>((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error("el fixture del armazón no arrancó")), 15_000);
    fixture.stdout.on("data", (c: Buffer) => {
      const m = /http:\/\/127\.0\.0\.1:\d+/.exec(c.toString());
      if (m) {
        clearTimeout(limite);
        resolve(m[0]);
      }
    });
  });
  const res = spawnSync(process.execPath, [path.join(HERE, "check-armazon.ts")], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, ARMAZON_BASE: base },
  });
  fixture.kill("SIGTERM");
  const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const esperados = [
    "la barra en español enlaza /holdings",
    "ninguna etiqueta genérica",
    "cero enlaces a superficies cerradas",
    "el conmutador manda a la portada",
  ];
  const faltan = esperados.filter((e) => !salida.includes(e));
  if (res.status === 1 && faltan.length === 0) {
    console.log("  ✓ armazón público: falló como debía (RF-01, RF-04, RF-87 y el salto al contenido)");
  } else {
    fallos++;
    console.error(`  ✗ armazón público: NO falló como debía (exit ${res.status}).`);
    if (faltan.length) console.error(`      no mencionó: ${faltan.join(" · ")}`);
  }
}

frenosConServidor++;
console.log("\nFreno de las páginas — contra páginas con los bloques desordenados:\n");
{
  const fixture = spawn(process.execPath, [path.join(HERE, "negative/paginas/servidor.ts")], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = await new Promise<string>((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error("el fixture de páginas no arrancó")), 15_000);
    fixture.stdout.on("data", (c: Buffer) => {
      const m = /http:\/\/127\.0\.0\.1:\d+/.exec(c.toString());
      if (m) {
        clearTimeout(limite);
        resolve(m[0]);
      }
    });
  });
  const res = spawnSync(process.execPath, [path.join(HERE, "check-paginas.ts")], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, PAGINAS_BASE: base },
  });
  fixture.kill("SIGTERM");
  const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const esperados = [
    "los bloques aparecen en el orden de RF-09",
    "seis secciones del contrato A.3",
    "un solo enlace a su documento",
    "sin formulario en la página",
    "no enlaza ningún servicio de otra línea",
  ];
  const faltan = esperados.filter((e) => !salida.includes(e));
  if (res.status === 1 && faltan.length === 0) {
    console.log("  ✓ páginas: falló como debía (orden, secciones, CTA único y línea ajena)");
  } else {
    fallos++;
    console.error(`  ✗ páginas: NO falló como debía (exit ${res.status}).`);
    if (faltan.length) console.error(`      no mencionó: ${faltan.join(" · ")}`);
  }
}

frenosConServidor++;
console.log("\nFreno del SEO — contra canonical copiado y hreflang sin vuelta:\n");
{
  const fixture = spawn(process.execPath, [path.join(HERE, "negative/seo/servidor.ts")], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = await new Promise<string>((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error("el fixture de SEO no arrancó")), 15_000);
    fixture.stdout.on("data", (c: Buffer) => {
      const m = /http:\/\/127\.0\.0\.1:\d+/.exec(c.toString());
      if (m) {
        clearTimeout(limite);
        resolve(m[0]);
      }
    });
  });
  const res = spawnSync(process.execPath, [path.join(HERE, "check-seo.ts")], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, SEO_BASE: base },
  });
  fixture.kill("SIGTERM");
  const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const esperados = [
    "canonical propio",
    "hreflang recíproco",
    "título único",
    "una ruta inexistente devuelve 404",
  ];
  const faltan = esperados.filter((e) => !salida.includes(e));
  if (res.status === 1 && faltan.length === 0) {
    console.log("  ✓ seo: falló como debía (canonical, hreflang, títulos y 404)");
  } else {
    fallos++;
    console.error(`  ✗ seo: NO falló como debía (exit ${res.status}).`);
    if (faltan.length) console.error(`      no mencionó: ${faltan.join(" · ")}`);
  }
}

frenosConServidor++;
console.log("\nFreno del blog — contra un blog que publica sus borradores:\n");
{
  const fixture = spawn(process.execPath, [path.join(HERE, "negative/blog/servidor.ts")], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = await new Promise<string>((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error("el fixture del blog no arrancó")), 15_000);
    fixture.stdout.on("data", (c: Buffer) => {
      const m = /http:\/\/127\.0\.0\.1:\d+/.exec(c.toString());
      if (m) {
        clearTimeout(limite);
        resolve(m[0]);
      }
    });
  });
  const res = spawnSync(process.execPath, [path.join(HERE, "check-blog.ts")], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, BLOG_BASE: base },
  });
  fixture.kill("SIGTERM");
  const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const esperados = [
    "NO tiene URL",
    "NO aparece en el índice",
    "NO aparece en el RSS",
    "artículo inexistente devuelve 404",
  ];
  const faltan = esperados.filter((e) => !salida.includes(`✗ ${e}`) && !salida.includes(e));
  if (res.status === 1 && faltan.length === 0) {
    console.log("  ✓ blog: falló como debía (el borrador servido en URL, índice y RSS)");
  } else {
    fallos++;
    console.error(`  ✗ blog: NO falló como debía (exit ${res.status}).`);
    if (faltan.length) console.error(`      no mencionó: ${faltan.join(" · ")}`);
  }
}

frenosConServidor++;
console.log("\nFreno del entorno de ejecución — contra un despliegue mal hecho:\n");
{
  /**
   * **ESTE FRENO NO TENÍA PRUEBA NEGATIVA**, y es de los que más prometen: mide
   * las cabeceras de seguridad, la compuerta de staging y la puerta de
   * `/api/ops` sobre el servidor de verdad. Nadie lo había visto en rojo, así
   * que su verde no significaba nada (R-26). Lo encontró la revisión final.
   *
   * El fixture es el despliegue mal hecho: sin cabeceras, con `x-powered-by`,
   * con `noindex` en producción, con `/api/ops` abierto y ejecutando por GET, y
   * con una CSP que promete un nonce que el HTML no lleva — el fallo silencioso
   * que dio origen a `politicaPorSuperficie`, donde el sitio se ve y no funciona.
   */
  const fixture = spawn(process.execPath, [path.join(HERE, "negative/runtime/servidor.ts")], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = await new Promise<string>((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error("el fixture de runtime no arrancó")), 15_000);
    fixture.stdout.on("data", (c: Buffer) => {
      const m = /http:\/\/127\.0\.0\.1:\d+/.exec(c.toString());
      if (m) {
        clearTimeout(limite);
        resolve(m[0]);
      }
    });
  });
  const res = spawnSync(process.execPath, [path.join(HERE, "check-runtime.ts")], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, RUNTIME_BASE: base },
  });
  fixture.kill("SIGTERM");
  const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const esperados = [
    "strict-transport-security",
    "no revela el framework",
    "NO lleva noindex",
    "/api/ops NO existe sin OPS_TOKEN",
    "staging · sin credenciales devuelve 401",
    "una acción pedida por GET NO se ejecuta",
    "el nonce cambia en cada petición",
  ];
  const faltan = esperados.filter((e) => !salida.includes(e));
  if (res.status === 1 && faltan.length === 0) {
    console.log(
      "  ✓ runtime: falló como debía (cabeceras, ops abierto, staging sin compuerta y nonce fijo)",
    );
  } else {
    fallos++;
    console.error(`  ✗ runtime: NO falló como debía (exit ${res.status}).`);
    if (faltan.length) console.error(`      no mencionó: ${faltan.join(" · ")}`);
  }
}

frenosConServidor++;
console.log("\nFreno de Lighthouse — contra una página mala de verdad:\n");
{
  /**
   * **TAMPOCO TENÍA PRUEBA NEGATIVA.** Y aquí importa más que en otros: entre la
   * página y el veredicto hay una librería entera. Si `lhr.categories` cambiara
   * de forma, si una categoría se leyera con otro nombre, o si alguien tapara un
   * `undefined` con un `?? 100`, este freno anunciaría cuatro cien sobre un sitio
   * inservible. Medir bien no es lo mismo que **leer bien lo medido**.
   *
   * Se comprueba contra **accesibilidad y SEO**, no contra rendimiento: la
   * página mala saca 44 y 58, que están lejos de cualquier umbral, mientras que
   * el rendimiento queda rozando el 90 y variaría de una corrida a otra. Un
   * freno que a veces pasa y a veces no es peor que no tenerlo.
   */
  const fixture = spawn(process.execPath, [path.join(HERE, "negative/lighthouse/servidor.ts")], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = await new Promise<string>((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error("el fixture de lighthouse no arrancó")), 15_000);
    fixture.stdout.on("data", (c: Buffer) => {
      const m = /http:\/\/127\.0\.0\.1:\d+/.exec(c.toString());
      if (m) {
        clearTimeout(limite);
        resolve(m[0]);
      }
    });
  });
  const res = spawnSync(process.execPath, [path.join(HERE, "check-lighthouse.ts")], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, LH_BASE: base, LH_PAGINAS: "/" },
  });
  fixture.kill("SIGTERM");
  const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  /**
   * Se leen los NÚMEROS, no solo el exit 1: que salga rojo podría deberse a que
   * la medición no llegó a correr, y eso no prueba que el freno sepa medir.
   * Accesibilidad y SEO por debajo de 70 solo pueden venir de una auditoría de
   * verdad sobre una página sin `lang`, sin `title` y sin contraste.
   */
  const acce = Number(/acce\s+(\d+)/.exec(salida)?.[1] ?? "100");
  const seo = Number(/seo\s+(\d+)/.exec(salida)?.[1] ?? "100");
  const midioDeVerdad = acce < 70 && seo < 70;
  const sePudoMedir = !salida.includes("NO SE PUDO MEDIR");
  if (res.status === 1 && midioDeVerdad && sePudoMedir) {
    console.log(`  ✓ lighthouse: falló como debía (accesibilidad ${acce}, SEO ${seo}, medidos de verdad)`);
  } else {
    fallos++;
    console.error(`  ✗ lighthouse: NO falló como debía (exit ${res.status}, acce ${acce}, seo ${seo}).`);
    if (!sePudoMedir) console.error("      la medición no llegó a correr: eso no prueba el freno.");
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
/**
 * El número SE CUENTA, no se escribe. Estuvo escrito en letra —«los veintidós
 * frenos»— y quedó desfasado en cuanto DU-20 añadió tres: el resumen anunciaba
 * veintidós mientras se ejecutaban veinticinco. Un recuento que miente en el
 * único sitio donde alguien lo lee es peor que no tenerlo.
 */
const GATES_DE_CONTENIDO = 5; // los de `verify-gates.ts`, que se ejecutan arriba.
const TOTAL = CASOS.length + frenosConServidor + GATES_DE_CONTENIDO;
console.log(
  `\n✓ Los ${TOTAL} frenos ` +
    `(${CASOS.length} por script + ${frenosConServidor} contra un servidor + ` +
    `${GATES_DE_CONTENIDO} de contenido) ` +
    `fallan cuando deben y pasan cuando deben.\n`,
);
