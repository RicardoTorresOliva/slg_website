/**
 * test-visor.ts — **El visor aislado, contra un entregable hostil de verdad**
 * (DU-19 · D-45 · RF-90 · RNF-21 · R-11 · gate D10).
 *
 * EL LABORATORIO. `scripts/ci/negative/visor/entregable-hostil.html` es lo que
 * un agente comprometido podría generar: parece un informe y hace las siete
 * cosas que el visor tiene que impedir —robar la cookie, llamar a la API con
 * las credenciales del navegador, cargar recursos externos, ejecutar por
 * atributo de evento, un enlace `javascript:`, un formulario a otro dominio y
 * un iframe anidado—. **Si el visor lo sirviera tal cual desde el dominio de la
 * aplicación, las siete funcionarían.**
 *
 * QUÉ SE COMPRUEBA AQUÍ, Y QUÉ NO.
 *
 * Aquí se comprueban **las capas 2 y 3**: que el saneado del servidor quita lo
 * que ejecuta, y que la política que el visor emite no deja cargar nada de
 * fuera. También que la **capa 1 está bien declarada**: que el visor se niega a
 * servir si el origen no está separado de verdad, incluido el caso silencioso
 * de configurarlo al mismo dominio.
 *
 * Lo que **no** se comprueba aquí es la capa 1 *en funcionamiento*, porque eso
 * exige el subdominio desplegado: el criterio 3 pide que la prueba corra
 * «contra el visor servido desde su origen separado definitivo». Queda abierto
 * hasta que `visor.softlandingglobal.com` exista, y está dicho en el `work_log`
 * en vez de darlo por hecho.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import postgres from "postgres";

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

const RAIZ = path.resolve(import.meta.dirname, "../..");
const HOSTIL = fs.readFileSync(
  path.join(RAIZ, "scripts/ci/negative/visor/entregable-hostil.html"),
  "utf8",
);

/**
 * **LO QUE ESTA PRUEBA NO MIRABA, Y POR ESO EL VISOR NO PODÍA FUNCIONAR.**
 *
 * Las 25 comprobaciones anteriores pasaban en verde con un visor que devolvía
 * **404 a todo**: se quedaban en el saneado, en la política y en las variables
 * de entorno, y **ninguna tocaba la base**. La consulta de DU-19 usaba
 * `withSystemScope`, que fija `app.actor_role = 'system'` —un rol que la
 * política de fila de `deliverable` no contempla, y no debe contemplar—, así
 * que devolvía cero filas siempre. Lo encontró la revisión independiente
 * leyendo el código, no la prueba.
 *
 * De ahí que esto exista: interroga `app_entregable_para_el_visor` (migraciones
 * 0016 y 0022) contra PostgreSQL real con todas las formas de entregable que
 * hay, y comprueba que devuelve **exactamente la que toca en cada ámbito**: un
 * `internal` sí con vale de HQ y no con vale de portal, que es el arreglo de
 * `ui_wireframes` §6.13 y a la vez lo que ese arreglo no puede romper.
 */
async function contraLaBase() {
  const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
  if (!URL_DUENO) {
    throw new Error(
      "Falta DATABASE_URL_MIGRATIONS: la capa 4 del visor se comprueba contra PostgreSQL real " +
        "(`bash scripts/db/local-pg.sh up`). Sin base no se comprueba nada: es justo el agujero " +
        "que dejó pasar que el visor no pudiera devolver contenido.",
    );
  }
  const dueno = postgres(URL_DUENO, { max: 2 });
  const ORG = "org-du19-visor";
  const PROY = "p-du19-visor";

  async function limpiar() {
    await dueno`delete from deliverable where organization_id = ${ORG}`;
    await dueno`delete from project where organization_id = ${ORG}`;
    await dueno`delete from organization where id = ${ORG}`;
  }

  try {
    await limpiar();
    await dueno`insert into organization (id, name, slug, type, status)
                values (${ORG}, 'Empresa del visor', 'du19-visor', 'client', 'active')`;
    await dueno`insert into project (id, organization_id, name, service, status)
                values (${PROY}, ${ORG}, 'Proyecto del visor', 'Phoenix PEEx', 'active')`;

    const meter = async (
      id: string,
      tipo: string,
      visibilidad: string,
      publicado: boolean,
      clave: string | null,
    ) =>
      dueno`insert into deliverable (id, project_id, organization_id, title, type, version,
                                     family_id, visibility, published_at, file_key)
            values (${id}, ${PROY}, ${ORG}, ${`Doc ${id}`}, ${tipo}, 1, ${`fam-${id}`},
                    ${visibilidad}, ${publicado ? new Date() : null}, ${clave})`;

    await meter("d-visor-ok", "html", "client", true, "deliverables/ok.html");
    await meter("d-visor-interno", "html", "internal", true, "deliverables/interno.html");
    // Un `internal` SIN publicar: hace falta para que «desde HQ se abre» no se
    // confunda con «desde HQ se abre todo». Publicar sigue siendo un paso.
    await meter("d-visor-interno-borrador", "html", "internal", false, "deliverables/int-bor.html");
    await meter("d-visor-borrador", "html", "client", false, "deliverables/borrador.html");
    await meter("d-visor-pdf", "pdf", "client", true, "deliverables/informe.pdf");
    await meter("d-visor-sin-archivo", "html", "client", true, null);

    const { documentoParaElVisor } = await import("../../lib/visor/servicio.ts");

    console.log("\nCapa 4 — la consulta contra PostgreSQL REAL (hallazgo C-2):\n");

    const bueno = await documentoParaElVisor("d-visor-ok", "cliente");
    check(
      "EL ENTREGABLE PUBLICADO, HTML Y DE CLIENTE SÍ VUELVE — con `withSystemScope` volvían CERO filas",
      bueno !== null && bueno.claveDeArchivo === "deliverables/ok.html",
      JSON.stringify(bueno),
    );
    check("y trae su título, no solo el identificador", bueno?.titulo === "Doc d-visor-ok", String(bueno?.titulo));

    check(
      "un entregable `internal` NO vuelve con vale de PORTAL: en un origen sin sesión esa es la única línea",
      (await documentoParaElVisor("d-visor-interno", "cliente")) === null,
    );
    check("uno SIN PUBLICAR tampoco", (await documentoParaElVisor("d-visor-borrador", "cliente")) === null);
    check("un PDF tampoco: el visor sirve HTML", (await documentoParaElVisor("d-visor-pdf", "cliente")) === null);
    check("uno sin archivo tampoco", (await documentoParaElVisor("d-visor-sin-archivo", "cliente")) === null);
    check(
      "y un identificador que no existe devuelve null, no un error",
      (await documentoParaElVisor("no-existe", "cliente")) === null,
    );

    /* ──────────────────────────────────────────────────────────────────────
     * El ámbito `hq` (migración 0022): el tablero interno se abre desde HQ.
     *
     * **ESTE ERA EL DEFECTO.** Un `html` `internal` —lo que un agente Hermes
     * publica para SLG— no se abría desde `/hq/entregables`, porque la función
     * de 0016 servía solo `client`. Las dos comprobaciones que siguen son las
     * dos mitades del arreglo, y ninguna vale sin la otra: **sí desde HQ, no
     * desde el portal.**
     * ────────────────────────────────────────────────────────────────────── */
    const interno = await documentoParaElVisor("d-visor-interno", "hq");
    check(
      "UN `internal` PUBLICADO SÍ SE ABRE CON VALE DE HQ — este era el defecto de §6.13",
      interno !== null && interno.claveDeArchivo === "deliverables/interno.html",
      JSON.stringify(interno),
    );
    check(
      "y el MISMO entregable sigue sin volver con vale de portal: el ámbito es la línea entera",
      (await documentoParaElVisor("d-visor-interno", "cliente")) === null,
      "si volviera, abrir el interno desde HQ habría abierto también el portal del cliente",
    );
    check(
      "un `internal` SIN PUBLICAR no se abre ni desde HQ: publicar sigue siendo un paso",
      (await documentoParaElVisor("d-visor-interno-borrador", "hq")) === null,
    );
    check(
      "un PDF no se abre desde HQ tampoco: el ámbito amplía la visibilidad, no el tipo",
      (await documentoParaElVisor("d-visor-pdf", "hq")) === null,
    );
    check(
      "un `client` se abre también desde HQ: no hay un segundo visor para SLG",
      (await documentoParaElVisor("d-visor-ok", "hq"))?.claveDeArchivo === "deliverables/ok.html",
    );

    /**
     * **NO SE PUEDE AMPLIAR LO QUE DEVUELVE DESDE FUERA.** Las condiciones viven
     * dentro de la función `SECURITY DEFINER`: quien la llame no puede
     * relajarlas, y lo único que puede decir es desde qué superficie pregunta
     * —respaldado por un vale firmado, no por una variable—. Se comprueba
     * interrogando el esquema, no leyendo el código.
     */
    const cuerpo = await dueno`select pg_get_functiondef(oid) as def from pg_proc
                               where proname = 'app_entregable_para_el_visor'`;
    check(
      "y existe UNA sola función con ese nombre: 0022 retira la de un argumento, que no sabía de ámbitos",
      cuerpo.length === 1,
      `hay ${cuerpo.length} versiones; la vieja seguiría siendo llamable`,
    );
    const def = String(cuerpo[0]?.def ?? "");
    const plano = def.toLowerCase();
    check(
      "la función lleva las condiciones dentro, no las recibe por parámetro",
      plano.includes("visibility = 'client'") &&
        plano.includes("type = 'html'") &&
        plano.includes("published_at is not null"),
      def.slice(0, 400),
    );
    check(
      "y el `internal` está atado al ámbito `hq` DENTRO del `WHERE`, no en el código que llama",
      /p_ambito\s*=\s*'hq'/i.test(def) && plano.includes("visibility = 'internal'"),
      def.slice(0, 600),
    );
    check(
      "el ámbito es OBLIGATORIO: un `DEFAULT` sería el filtro que alguien olvida pasar",
      !/p_ambito[^,)]*default/i.test(def),
      def.slice(0, 300),
    );
    check(
      "y es `SECURITY DEFINER` con `search_path` fijado: si no, se podría secuestrar por esquema",
      /security\s+definer/i.test(def) && /search_path/i.test(def),
      def.slice(0, 300),
    );
  } finally {
    await limpiar();
    await dueno.end({ timeout: 5 });
    const { cerrarConexion } = await import("../../lib/db/scope.ts");
    await cerrarConexion();
  }
}

async function main() {
  const { sanearHtml } = await import("../../lib/visor/documento.ts");
  const { ambitoDeLaPeticion, origenDelVisor, politicaDelVisor, urlDelVisor, valeValido, visorEstaSeparado } =
    await import("../../lib/visor/origen.ts");

  console.log("\nCapa 1 — el visor se NIEGA a servir si el origen no está separado (D-45):\n");

  delete process.env.DELIVERABLE_VIEWER_ORIGIN;
  process.env.NEXT_PUBLIC_SITE_URL = "https://softlandingglobal.com";
  check("sin variable, no hay origen de visor", origenDelVisor() === null);
  check("y el visor no se da por separado", !visorEstaSeparado());
  check("así que no hay URL que enseñar", urlDelVisor("abc", "cliente") === null);

  process.env.DELIVERABLE_VIEWER_ORIGIN = "https://softlandingglobal.com";
  check(
    "CONFIGURADO AL MISMO DOMINIO, tampoco se da por separado: es el fallo silencioso",
    !visorEstaSeparado(),
    "un visor en el mismo origen deja el sandbox como única defensa, que es lo que D-45 prohíbe",
  );
  check("y sigue sin haber URL", urlDelVisor("abc", "cliente") === null);

  process.env.DELIVERABLE_VIEWER_ORIGIN = "https://visor.softlandingglobal.com";
  check("con un subdominio propio, sí", visorEstaSeparado());

  /**
   * **SIN SECRETO NO HAY URL, aunque el origen esté perfecto.** Es el repliegue
   * que había que cerrar: la primera versión devolvía
   * `https://visor…/visor/<id>` a secas, y ese identificador era la única
   * credencial para leer el entregable **de cualquier empresa**. Aquí se
   * comprueba que ese enlace ya no existe.
   */
  delete process.env.DELIVERABLE_VIEWER_SECRET;
  check(
    "SIN SECRETO no hay URL, aunque el origen esté bien: el enlace sin vale ya no existe",
    urlDelVisor("abc", "cliente") === null,
    String(urlDelVisor("abc", "cliente")),
  );

  /**
   * **NO ES UN LITERAL, y no por esconderlo.** `check:secrets` marca en rojo
   * todo `SECRET = "…"` y hace bien: el repositorio es público. Se compone en
   * marcha, que además da un secreto distinto por corrida — y así la prueba de
   * «rotar el secreto revoca los vales vivos» no depende de una constante.
   */
  process.env.DELIVERABLE_VIEWER_SECRET = ["visor", "prueba", randomUUID()].join("-");
  const enlace = urlDelVisor("abc", "cliente");
  check("con secreto, la URL apunta al subdominio del visor, no al del sitio",
    enlace !== null && enlace.startsWith("https://visor.softlandingglobal.com/visor/abc?"), String(enlace));
  const parametros = new URL(enlace!).searchParams;
  check("y lleva caducidad y firma, no solo el identificador",
    Boolean(parametros.get("c")) && Boolean(parametros.get("f")), enlace!);
  check(
    "y el ÁMBITO, que es lo que desde 0022 decide si un `internal` se abre",
    parametros.get("a") === "cliente",
    enlace!,
  );
  check(
    "el de HQ se emite con el suyo, y las dos URLs no son la misma",
    new URL(urlDelVisor("abc", "hq")!).searchParams.get("a") === "hq" &&
      new URL(urlDelVisor("abc", "hq")!).searchParams.get("f") !== parametros.get("f"),
    String(urlDelVisor("abc", "hq")),
  );

  console.log("\nCapa 2 — la política del documento no deja cargar NADA de fuera:\n");
  const csp = politicaDelVisor();
  check("`default-src 'none'`", csp.includes("default-src 'none'"), csp);
  check("`script-src 'none'`: aunque quedara un script, no se ejecuta", csp.includes("script-src 'none'"));
  check("las imágenes solo `data:`, nunca de un dominio externo", csp.includes("img-src data:"));
  check("`form-action 'none'`: un formulario no puede mandar nada", csp.includes("form-action 'none'"));
  check("`object-src 'none'` y `base-uri 'none'`", csp.includes("object-src 'none'") && csp.includes("base-uri 'none'"));
  check(
    "`frame-ancestors` deja enmarcar SOLO a la aplicación",
    csp.includes("frame-ancestors https://softlandingglobal.com"),
    csp,
  );
  check("y el propio documento va en `sandbox`", csp.includes("sandbox"), csp);

  console.log("\nCapa 3 — el saneado del servidor, contra el entregable hostil:\n");
  const { html, retirado } = sanearHtml(HOSTIL);

  check("el entregable hostil trae scripts antes de sanear", /<script/i.test(HOSTIL));
  check("después NO queda ni una etiqueta `script`", !/<script/i.test(html), html.slice(0, 200));
  check("ni `iframe` anidado", !/<iframe/i.test(html));
  check("ni `meta` de redirección", !/<meta/i.test(html));
  check("ni `link` a una hoja de estilos externa", !/<link/i.test(html));
  check("ni `form` que mande a otro dominio", !/<form/i.test(html));
  check("ni un solo atributo `on…`", !/\son[a-z]+\s*=/i.test(html), (html.match(/\son[a-z]+\s*=/i) ?? [])[0] ?? "");
  check(
    "el enlace `javascript:` deja de ejecutar",
    !/href\s*=\s*["']?javascript:/i.test(html),
    (html.match(/href[^>]{0,40}/i) ?? [])[0] ?? "",
  );
  check(
    "y se registra QUÉ se quitó: un entregable que trae scripts es una señal",
    retirado.includes("<script>") && retirado.includes("atributos on*"),
    retirado.join(" · "),
  );

  check(
    "el `<img>` externo sobrevive al saneado, y lo corta la política",
    /<img/i.test(html) && csp.includes("img-src data:"),
    "las tres capas no son redundantes: cada una para lo suyo",
  );

  check(
    "y el texto legítimo del informe sigue ahí: sanear no es vaciar",
    html.includes("Informe trimestral") && html.includes("Resumen de actividad"),
    html.slice(0, 200),
  );

  /* ══════════════════════════════════════════════════════════════════════
   * Capa 0 — el vale. Lo que la revisión independiente encontró abierto.
   * ══════════════════════════════════════════════════════════════════════ */
  console.log("\nCapa 0 — el vale: caducidad y falsificación (hallazgo C-3):\n");

  const conVale = (id: string, ambito: "cliente" | "hq") => {
    const u = new URL(urlDelVisor(id, ambito)!);
    return { c: u.searchParams.get("c")!, f: u.searchParams.get("f")! };
  };

  const valeA = conVale("ent-uno", "cliente");
  check("un vale recién emitido vale para SU entregable", valeValido("ent-uno", valeA.c, valeA.f, "cliente"));
  check(
    "EL MISMO VALE NO SIRVE PARA OTRO ENTREGABLE: el identificador va firmado",
    !valeValido("ent-dos", valeA.c, valeA.f, "cliente"),
    "si sirviera, un cliente con acceso a uno leería todos",
  );
  check(
    "un vale CADUCADO no vale: la caducidad va dentro de lo firmado",
    !valeValido("ent-uno", String(Date.now() - 1000), valeA.f, "cliente"),
  );
  check(
    "y estirar la caducidad sin volver a firmar tampoco: la firma no cuadra",
    !valeValido("ent-uno", String(Date.now() + 86_400_000), valeA.f, "cliente"),
    "esta es la comprobación que dice que la caducidad no es decorativa",
  );
  check("una firma inventada no vale", !valeValido("ent-uno", valeA.c, "0".repeat(64), "cliente"));
  check("ni una firma de otra longitud", !valeValido("ent-uno", valeA.c, "abc", "cliente"));
  check("ni la ausencia de vale", !valeValido("ent-uno", null, null, "cliente"));

  /* ──────────────────────────────────────────────────────────────────────
   * El ámbito, dentro de la firma (migración 0022).
   *
   * **ESTA ES LA PIEZA QUE DEJA ABRIR UN `internal` SIN ABRÍRSELO AL
   * CLIENTE.** El visor no tiene sesión y no puede preguntar el rol; lo que
   * tiene es un vale que firmó una pantalla que sí la tenía. Si el ámbito no
   * fuera parte de lo firmado, un vale de portal se convertiría en uno de HQ
   * cambiando una letra de la URL, y el arreglo habría abierto la puerta que
   * venía a dejar cerrada.
   * ────────────────────────────────────────────────────────────────────── */
  const valeHq = conVale("ent-uno", "hq");
  check("un vale de HQ vale como vale de HQ", valeValido("ent-uno", valeHq.c, valeHq.f, "hq"));
  check(
    "UN VALE DE PORTAL NO VALE COMO VALE DE HQ: escribir `a=hq` en la URL rompe la firma",
    !valeValido("ent-uno", valeA.c, valeA.f, "hq"),
    "si valiera, cualquiera con un enlace del portal leería los entregables internos",
  );
  check(
    "y uno de HQ tampoco pasa por uno de portal: la equivalencia no va en ninguna dirección",
    !valeValido("ent-uno", valeHq.c, valeHq.f, "cliente"),
  );
  check(
    "un `a` ausente o inventado no es ningún ámbito, y no se supone el estrecho",
    ambitoDeLaPeticion(null) === null &&
      ambitoDeLaPeticion("") === null &&
      ambitoDeLaPeticion("HQ") === null &&
      ambitoDeLaPeticion("interno") === null,
    "suponerlo convertiría un vale de HQ mutilado en un vale de portal válido",
  );
  check(
    "y los dos que sí son ámbito se reconocen tal cual",
    ambitoDeLaPeticion("cliente") === "cliente" && ambitoDeLaPeticion("hq") === "hq",
  );

  const otroSecreto = process.env.DELIVERABLE_VIEWER_SECRET;
  process.env.DELIVERABLE_VIEWER_SECRET = ["visor", "rotado", randomUUID()].join("-");
  check(
    "un vale firmado con OTRO secreto no vale: rotar el secreto revoca los vales vivos",
    !valeValido("ent-uno", valeA.c, valeA.f, "cliente"),
  );
  check(
    "y rotarlo revoca también los de HQ: no hay un secreto aparte para lo interno",
    !valeValido("ent-uno", valeHq.c, valeHq.f, "hq"),
  );
  delete process.env.DELIVERABLE_VIEWER_SECRET;
  check(
    "y SIN secreto no vale ninguno: FALLA CERRADO, no abre",
    !valeValido("ent-uno", valeA.c, valeA.f, "cliente") && !valeValido("ent-uno", valeHq.c, valeHq.f, "hq"),
    "un visor que no funciona es preferible a uno que sirve documentos de cliente a quien pase",
  );
  process.env.DELIVERABLE_VIEWER_SECRET = otroSecreto;

  /* ══════════════════════════════════════════════════════════════════════
   * Capa 4 — la consulta, contra PostgreSQL de verdad.
   * ══════════════════════════════════════════════════════════════════════ */
  await contraLaBase();

  if (fallos > 0) {
    console.error(`\n✗ visor: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ visor: ${comprobaciones} comprobaciones contra un entregable hostil, sin fallos.`);
}

await main();
