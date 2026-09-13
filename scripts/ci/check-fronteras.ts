/**
 * check-fronteras.ts — Las fronteras de los módulos encapsulados, como freno.
 *
 * DOS UNIDADES PIDEN LO MISMO, PALABRA POR PALABRA:
 *
 *   · FU-06, criterio 1: «Cero lógica de sesión, rol o `organization_id` escrita
 *     dentro de una página o de un endpoint: toda pasa por el módulo. Una
 *     revisión que encuentre una excepción rechaza la unidad.»
 *   · FU-08, criterio 1: «Ningún caso de uso importa el cliente del proveedor:
 *     todos hablan con la interfaz propia. Una revisión que encuentre una
 *     importación directa rechaza la unidad.»
 *
 * Una revisión humana encuentra la primera excepción y se pierde la tercera. Un
 * freno la encuentra siempre, y por eso los dos criterios son verificables en
 * vez de declarativos. Es la mitigación de R-19 y de R-05: el día que haya que
 * sustituir el proveedor de identidad o el de correo, la garantía de que solo
 * hay un sitio que tocar es este archivo, no la memoria de nadie.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTE FRENO COMPROBABA, Y LO QUE DECÍA COMPROBAR
 *
 * Hasta la revisión final este archivo miraba **solo importaciones**, y citaba
 * un criterio que habla de otra cosa: «cero lógica de sesión, rol o
 * `organization_id` **escrita dentro** de una página o de un endpoint». Un
 * endpoint que no importe nada prohibido y aun así decida por su cuenta si el
 * actor es de SLG, o que sepa cómo se llama la cookie del proveedor, incumple el
 * criterio entero y pasaba en verde. El freno prometía más de lo que comprobaba.
 *
 * Las tres reglas del bloque «la lógica, no solo la importación» cierran esa
 * distancia, y las tres encontraron algo real al escribirse: los nombres de la
 * cookie de sesión estaban a mano en dos rutas de `/api/acceso`, y
 * `lib/invitations/service.ts` reimplementaba `esActorDeSLG` en vez de llamarlo.
 *
 * LO QUE SIGUE SIN COMPROBARSE, dicho para que nadie lo dé por cubierto: una
 * regla de texto ve la forma, no la intención. Un endpoint que llame a `puede()`
 * con la acción equivocada pasa este freno y lo caza `test:permisos`, que recorre
 * la matriz B.3 entera. Los dos hacen falta.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SCAN_ROOT = process.env.FRONTERAS_ROOT
  ? path.resolve(process.env.FRONTERAS_ROOT)
  : REPO_ROOT;

/** Dentro de su módulo todo vale: es el sitio donde esa lógica DEBE estar. */
const MODULOS = ["lib/auth/", "lib/mail/", "lib/files/"];

/**
 * La única ruta del proyecto que puede importar el framework directamente: el
 * manejador que Next exige para los endpoints de Better Auth. No contiene
 * lógica, solo delega. Se le nombra a propósito en vez de permitir un patrón:
 * una excepción con nombre se revisa; un patrón se aprovecha.
 */
const EXCEPCION = "app/api/auth/[...all]/route.ts";

/**
 * La segunda excepción con nombre: **el destino de las copias de seguridad**
 * (FU-14). No es el adaptador de archivos de la aplicación —es **otro
 * proveedor, otras credenciales y otro bucket**, fuera del que aloja el VPS
 * (D-20)— así que no puede entrar por `@/lib/files`: esa puerta habla con
 * MinIO, que es precisamente lo que hay que copiar.
 *
 * Se nombra el archivo y no la carpeta: `lib/backup/destino.ts` puede tocar el
 * cliente de S3, y ningún otro archivo del módulo. Y sigue sin poder listar —
 * eso lo vigila `check:archivos`, que no tiene excepciones.
 */
const EXCEPCION_DE_COPIAS = "lib/backup/destino.ts";

/**
 * El módulo tiene DOS puertas públicas, no una: `@/lib/auth` para el servidor y
 * `@/lib/auth/edge` para el middleware, que corre en un runtime donde la
 * instancia de Better Auth y la conexión a PostgreSQL no existen. `edge` es
 * superficie pública declarada, no un atajo a un archivo interno.
 */
const PUERTAS_PUBLICAS = ["@/lib/auth", "@/lib/auth/edge"];

/**
 * Un módulo hermano dentro de `lib/` entra por `../auth/index.ts`, que es la
 * MISMA puerta que `@/lib/auth` escrita en relativo: `lib/` no puede usar el
 * alias `@/` sin volverse dependiente de la configuración de rutas de Next.
 * Lo que sigue prohibido es entrar por cualquier OTRO archivo del módulo.
 */

/** Donde las constructoras del AuthContext se DEFINEN, no se llaman. */
const DEFINE_EL_CONTEXTO = "lib/db/context.ts";

/** `true` cuando se barre el repositorio; `false` cuando se apunta a fixtures. */
const BARRIDO_NORMAL = SCAN_ROOT === REPO_ROOT;

type Regla = {
  readonly nombre: string;
  readonly re: RegExp;
  readonly porQue: string;
  /** Rutas donde la regla no aplica, además del propio módulo. */
  readonly salvo?: readonly string[];
  /**
   * Prefijo al que la regla se limita. Las que hablan de «una página o un
   * endpoint» son literalmente eso: `app/`. Sin esto habría que elegir entre no
   * comprobarlas o marcar en rojo a los servicios de `lib/`, cuyo trabajo **es**
   * razonar sobre la empresa del actor.
   */
  readonly soloEn?: string;
};

const REGLAS: readonly Regla[] = [
  {
    nombre: "importa el cliente de almacenamiento",
    re: /from\s+["']@aws-sdk\/(?:client-s3|s3-request-presigner)/,
    porQue:
      "solo lib/files/s3.ts conoce el cliente de S3. Importarlo fuera pone al " +
      "alcance de esa ruta `ListObjects`, y ninguna ruta lista un bucket (RF-123, gate D10).",
    salvo: [EXCEPCION_DE_COPIAS],
  },
  {
    nombre: "importa un archivo interno del módulo de archivos",
    re: /from\s+["'](?:@\/lib\/files\/|(?:\.\.?\/)+(?:lib\/)?files\/)(?!index\.ts["'])[a-z]/,
    porQue:
      "la superficie pública es `@/lib/files`. Entrar por un archivo interno " +
      "convierte un detalle en contrato y el módulo deja de poder reescribirse.",
  },
  {
    nombre: "importa el transporte de correo",
    re: /from\s+["']nodemailer/,
    porQue:
      "solo lib/mail/smtp.ts sabe cómo se transporta un correo. Importarlo fuera " +
      "ata ese caso de uso a un transporte concreto y rompe D-36: cambiar de " +
      "proveedor debe costar cuatro variables de entorno y ninguna línea de código.",
  },
  {
    nombre: "importa un archivo interno del módulo de correo",
    re: /from\s+["'](?:@\/lib\/mail\/|(?:\.\.?\/)+(?:lib\/)?mail\/)(?!index\.ts["'])[a-z]/,
    porQue:
      "la superficie pública es `@/lib/mail`. Entrar por un archivo interno " +
      "convierte un detalle en contrato y el módulo deja de poder reescribirse.",
  },
  {
    nombre: "importa el framework de identidad",
    re: /from\s+["']better-auth/,
    porQue:
      "solo lib/auth/ conoce la librería. Importarla fuera ata esa página a un " +
      "proveedor concreto y rompe la mitigación de R-19.",
    salvo: [EXCEPCION],
  },
  {
    nombre: "importa un archivo interno del módulo",
    // También los relativos que NO llevan el prefijo `lib/`: desde `lib/algo/`,
    // `../auth/db.ts` entra igual de dentro y el gate no lo veía.
    // `matriz` es la segunda puerta pública: la mitad PURA del módulo —la
    // matriz B.3 y su veredicto—, para el código que no puede arrastrar Better
    // Auth ni el pool de PostgreSQL solo para preguntar quién puede qué.
    re: /from\s+["'](?:@\/lib\/auth\/|(?:\.\.?\/)+(?:lib\/)?auth\/)(?!(?:edge|matriz|matriz\.ts|index\.ts)["'])[a-z]/,
    porQue:
      "la superficie pública es `@/lib/auth`. Entrar por un archivo interno " +
      "convierte un detalle en contrato y el módulo deja de poder reescribirse.",
  },
  {
    nombre: "fabrica un contexto autenticado",
    re: /(?<!function\s)\b(?:contextoDeSesion|contextoDeClaveApi)\s*\(/,
    porQue:
      "las dos constructoras del AuthContext son la frontera del aislamiento " +
      "(FU-04). Solo el módulo de identidad, que verifica, puede llamarlas.",
  },
  {
    nombre: "consulta directamente las tablas de identidad",
    re: /\bschema\.(?:session|account|verification|apiKey)\b/,
    porQue:
      "sesión y claves se leen por el módulo, que aplica caducidad, revocación " +
      "y límite. Una consulta directa se salta las tres.",
  },

  /* ── La LÓGICA, no solo la importación ──────────────────────────────────
   * Las tres que hacen que este freno compruebe el criterio que cita.
   */

  {
    nombre: "decide por el rol del actor a mano",
    /**
     * `ctx.actorRole === "slg_admin"` escrito fuera del módulo. La lista de
     * roles que operan por encima de una empresa vive en **un** sitio
     * (`esActorDeSLG`, `cruzaEmpresas`) y el veredicto de quién puede qué vive
     * en la matriz B.3 (`puede`, `exigir`, `exigirSeccion`).
     *
     * Escrita otra vez a mano hay **dos verdades**, y el día que una cambie la
     * otra calla — que es la peor forma de fallo de autorización, porque no hay
     * error: simplemente alguien ve algo que no debía. Ya había una copia, en
     * `lib/invitations/service.ts`, y llevaba desde FU-07.
     */
    re: /\bactorRole\s*(?:===|!==|==|!=)|(?:===|!==|==|!=)\s*\w+\.actorRole\b|\.includes\(\s*\w+\.actorRole\b/,
    porQue:
      "quién es de SLG lo dice `esActorDeSLG`/`cruzaEmpresas`, y quién puede qué " +
      "lo dice la matriz B.3 por `puede`/`exigir`. Comparar el rol a mano crea una " +
      "segunda verdad que nadie actualiza (B.3, FU-06 criterio 1).",
    salvo: [DEFINE_EL_CONTEXTO],
  },
  {
    nombre: "nombra la cookie de sesión del proveedor",
    /**
     * El nombre de la cookie es un detalle **del proveedor**, no del producto.
     * Escrito en una ruta, el día que Better Auth lo cambie —o que se sustituya,
     * que es R-19— esa ruta borra una cookie que ya no existe **sin fallar**:
     * la fila de la base sí se borra, así que parece que funciona.
     */
    /**
     * El literal con **un punto detrás del nombre del proveedor**:
     * `"better-auth.session_token"` y `"__Secure-better-auth.session_token"`. No
     * basta con buscar `session_token`, que además es el nombre de un índice de
     * la base (`uq_session_token`) y marcaba `lib/db/schema.ts` en rojo; ni vale
     * buscar `better-auth` a secas, que es el especificador del módulo y ya lo
     * caza la regla de importación — dos reglas señalando la misma línea enseñan
     * a no leer los hallazgos.
     */
    re: /["'][^"']*better-auth\.[^"']*["']/,
    porQue:
      "cómo se llama la cookie lo sabe `lib/auth` (`COOKIES_DE_SESION`). Escrito " +
      "fuera, cambiar de proveedor rompe el cierre de sesión en silencio (R-19).",
  },
  {
    nombre: "compara la empresa del actor a mano en una página o un endpoint",
    /**
     * `assertMismaEmpresa` existe para esto, y devuelve **404 y no 403** a
     * propósito: un 403 confirma que esa empresa existe. Una comparación escrita
     * a mano en una pantalla acierta con el filtrado y falla con el código, y ese
     * detalle es el que filtra el mapa de clientes de SLG.
     *
     * Solo en `app/`: los servicios de `lib/` sí razonan sobre la empresa del
     * actor —es su trabajo— y ahí la comparación está en su sitio.
     */
    /**
     * **`ctx.` delante, y no cualquier objeto.** La primera versión decía
     * `\w+.organizationId` y marcaba en rojo una pantalla que compara el
     * `organizationId` de un **aviso** con el de una lista de empresas para
     * pintar su nombre. Eso no es lógica de autorización: es pintar. Lo que el
     * criterio prohíbe es razonar sobre **la empresa del actor**, y el actor
     * siempre viaja en un `ctx` (`ctx.organizationId`, `sesion.ctx.organizationId`).
     */
    re: /\bctx\.organizationId\s*(?:===|!==|==|!=)|(?:===|!==|==|!=)\s*[\w.]*\bctx\.organizationId\b/,
    porQue:
      "comparar la empresa del actor contra un id de la ruta es `assertMismaEmpresa`, " +
      "que responde 404 y no 403 (FU-04). A mano se acierta el filtro y se falla el " +
      "código, y el código es el que dice si esa empresa existe.",
    soloEn: "app/",
  },
];

type Hallazgo = { archivo: string; linea: number; regla: Regla };

function archivos(): string[] {
  const extensiones = new Set([".ts", ".tsx"]);
  if (SCAN_ROOT === REPO_ROOT) {
  // `--cached --others --exclude-standard`, y no solo lo indexado: un archivo
  // NUEVO todavía sin `git add` es código que YA corre, y el freno tiene que
  // verlo. Sin esto una unidad entera pasa en verde contra sus propios archivos
  // sin versionar y el CI se pone rojo en el primer push. Pasó con FU-10.
    return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "*.ts", "*.tsx"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean)
      .map((r) => path.join(REPO_ROOT, r));
  }
  const recorrer = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) return recorrer(abs);
      return extensiones.has(path.extname(e.name)) ? [abs] : [];
    });
  return recorrer(SCAN_ROOT);
}

const hallazgos: Hallazgo[] = [];
let revisados = 0;

for (const abs of archivos()) {
  if (!fs.existsSync(abs)) continue;
  const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");

  if (MODULOS.some((m) => rel.startsWith(m))) continue;

  /**
   * Las exenciones de abajo valen para el barrido del repositorio, no cuando
   * `FRONTERAS_ROOT` apunta a los fixtures: si valieran siempre, la prueba
   * negativa escanearía cero archivos y anunciaría verde, que es el falso verde
   * de R-26 —y ya pasó una vez con el escáner de secretos—.
   */
  if (BARRIDO_NORMAL) {
  // Ahí se DEFINEN las constructoras del contexto; definirlas no es llamarlas.
  if (rel === DEFINE_EL_CONTEXTO) continue;
    // Los propios frenos hablan DE las reglas: nombrarlas no es infringirlas.
    if (rel.startsWith("scripts/ci/")) continue;
    /**
     * Las pruebas de un módulo son parte del módulo, no consumidores suyos:
     * tienen que poder entrar por dentro para recorrer la matriz o sembrar un
     * fixture sin levantar Next.
     */
    if (
      rel.startsWith("scripts/auth/") ||
      /**
       * `scripts/app/` entra en la misma categoría: `test-shell.ts` recorre la
       * matriz B.3 rol por rol para demostrar que lo que la barra lateral pinta
       * y lo que el servidor permite **coinciden**. Eso exige fabricar un
       * contexto por rol; hacerlo con sesiones reales convertiría una prueba de
       * tabla en una prueba de red que tarda un minuto y prueba menos.
       */
      rel.startsWith("scripts/app/") ||
      /**
       * `scripts/hq/` igual: `test-tablero.ts` comprueba que `client_*` NO
       * llega al tablero y que `slg_*` sí, y eso es recorrer la matriz con un
       * contexto por rol. Hacerlo con sesiones reales convertiría una prueba
       * de tabla en cuatro inicios de sesión por HTTP.
       */
      rel.startsWith("scripts/hq/") ||
      /**
       * `scripts/portal/` por la misma razón exacta: `test-materiales.ts`
       * comprueba que un material de otra empresa no sale **ni siendo
       * `client_admin`**, y eso es recorrer la política de fila con un contexto
       * por empresa y por rol. Con sesiones reales sería una prueba de red que
       * tarda un minuto y prueba menos.
       */
      rel.startsWith("scripts/portal/") ||
      /**
       * `scripts/api/` por lo mismo, y por un caso concreto: la regresión del
       * hallazgo C-1 tiene que comprobar **las dos capas** del arreglo. La
       * primera —una clave de empresa con `captures:read` ya no lee capturas—
       * se comprueba por HTTP. La segunda —esa combinación ya no se puede ni
       * crear— vive en `crearClave`, que exige un contexto de administrador de
       * SLG, y no hay ruta de API que cree claves: se crean desde HQ. Sin esta
       * excepción, la mitad preventiva del arreglo se queda sin prueba.
       */
      rel.startsWith("scripts/api/") ||
      rel.startsWith("scripts/mail/") ||
      rel.startsWith("scripts/invitations/") ||
      rel.startsWith("scripts/files/")
    ) {
      continue;
    }
  }

  revisados++;
  const lineas = fs.readFileSync(abs, "utf8").split("\n");
  for (const regla of REGLAS) {
    if (regla.salvo?.includes(rel)) continue;
    /**
     * `soloEn` se compara contra la ruta **relativa al barrido**, no al
     * repositorio: con `FRONTERAS_ROOT` apuntando a los fixtures, `app/` es la
     * carpeta `app/` de dentro del fixture. Sin esto, la regla acotada no se
     * podría probar en rojo y sería una regla que nadie ha visto frenar (R-26).
     */
    if (regla.soloEn) {
      const relAlBarrido = path.relative(SCAN_ROOT, abs).split(path.sep).join("/");
      if (!relAlBarrido.startsWith(regla.soloEn)) continue;
    }
    lineas.forEach((linea, i) => {
      if (linea.trimStart().startsWith("*") || linea.trimStart().startsWith("//")) return;
      if (regla.re.test(linea)) hallazgos.push({ archivo: rel, linea: i + 1, regla });
    });
  }
}

if (hallazgos.length > 0) {
  console.error(
    `✗ fronteras de módulo: ${hallazgos.length} infracción(es) sobre ${revisados} archivos.\n`,
  );
  for (const h of hallazgos) {
    console.error(`  ${h.archivo}:${h.linea} · ${h.regla.nombre}`);
    console.error(`      ${h.regla.porQue}`);
  }
  console.error(
    `\n  Todo lo de identidad entra por una de las dos puertas públicas del módulo:\n` +
      [...PUERTAS_PUBLICAS, "@/lib/mail", "@/lib/files"].map((p) => `    ${p}`).join("\n") +
      `\n  (criterio 1 de FU-06 y criterio 1 de FU-08).\n`,
  );
  process.exit(1);
}

console.log(
  `✓ fronteras de módulo: ${revisados} archivos fuera de ${MODULOS.join(" y ")}, ninguno las cruza.`,
);
