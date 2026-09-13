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
import fs from "node:fs";
import path from "node:path";

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

async function main() {
  const { sanearHtml } = await import("../../lib/visor/documento.ts");
  const { origenDelVisor, politicaDelVisor, urlDelVisor, visorEstaSeparado } = await import(
    "../../lib/visor/origen.ts"
  );

  console.log("\nCapa 1 — el visor se NIEGA a servir si el origen no está separado (D-45):\n");

  delete process.env.DELIVERABLE_VIEWER_ORIGIN;
  process.env.NEXT_PUBLIC_SITE_URL = "https://softlandingglobal.com";
  check("sin variable, no hay origen de visor", origenDelVisor() === null);
  check("y el visor no se da por separado", !visorEstaSeparado());
  check("así que no hay URL que enseñar", urlDelVisor("abc") === null);

  process.env.DELIVERABLE_VIEWER_ORIGIN = "https://softlandingglobal.com";
  check(
    "CONFIGURADO AL MISMO DOMINIO, tampoco se da por separado: es el fallo silencioso",
    !visorEstaSeparado(),
    "un visor en el mismo origen deja el sandbox como única defensa, que es lo que D-45 prohíbe",
  );
  check("y sigue sin haber URL", urlDelVisor("abc") === null);

  process.env.DELIVERABLE_VIEWER_ORIGIN = "https://visor.softlandingglobal.com";
  check("con un subdominio propio, sí", visorEstaSeparado());
  check(
    "y la URL apunta a ese subdominio, no al del sitio",
    urlDelVisor("abc") === "https://visor.softlandingglobal.com/visor/abc",
    String(urlDelVisor("abc")),
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

  if (fallos > 0) {
    console.error(`\n✗ visor: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ visor: ${comprobaciones} comprobaciones contra un entregable hostil, sin fallos.`);
}

await main();
