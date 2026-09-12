/**
 * test-routes.ts — El conmutador de idioma, probado en las 27 rutas (DU-02,
 * criterios 2 y 3 · RF-03, RF-04).
 *
 * Por qué esta prueba y no una inspección visual: el criterio 2 dice "desde
 * **cualquiera** de las 27 rutas", y comprobarlas a mano en el navegador es
 * justo el tipo de verificación que se hace una vez, se da por buena y luego
 * se rompe sin que nadie se entere. Aquí la regla que importa —ida y vuelta
 * entre idiomas devuelve a la misma página— se comprueba sobre la lista
 * completa, incluidas las rutas de servicio que se derivan del contenido.
 */
import {
  RUTAS_ESTRUCTURALES,
  localeDeRuta,
  navPrincipal,
  rutaAlterna,
} from "../../lib/routes/map.ts";

let fallos = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (c) console.log(`  ✓ ${n}`);
  else {
    fallos++;
    console.error(`  ✗ ${n}${d ? ` — ${d}` : ""}`);
  }
};

console.log("Mapa de rutas públicas — conmutador de idioma\n");

// ─── 1. Las rutas estructurales, ida y vuelta ────────────────────────────────
console.log("Rutas estructurales:");
for (const [nombre, par] of Object.entries(RUTAS_ESTRUCTURALES)) {
  ok(`${nombre}: ${par.es} → ${par.en}`, rutaAlterna(par.es) === par.en, `dio ${rutaAlterna(par.es)}`);
  ok(`${nombre}: ${par.en} → ${par.es}`, rutaAlterna(par.en) === par.es, `dio ${rutaAlterna(par.en)}`);
}

// ─── 2. Las rutas de servicio, derivadas del contenido ───────────────────────
console.log("\nRutas de servicio (derivadas de content/services):");
const SERVICIOS_ES = [
  "/ai/academy/phoenix-peex",
  "/ai/academy/phoenix-teax",
  "/ai/academy/phoenix-retx",
  "/ai/academy/customize-programs",
  "/ai/academy/ai-coaching",
  "/ai/enterprise/readiness",
  "/ai/enterprise/implement",
  "/ai/factory/app-building",
  "/ai/factory/age-building",
  "/ai/factory/coo-as-a-service",
  "/holdings",
];
for (const es of SERVICIOS_ES) {
  const en = `/en${es}`;
  ok(`${es} → ${en}`, rutaAlterna(es) === en, `dio ${rutaAlterna(es)}`);
  ok(`${en} → ${es}`, rutaAlterna(en) === es, `dio ${rutaAlterna(en)}`);
}
ok(
  "las 11 rutas de servicio del mapa de la oferta están cubiertas",
  SERVICIOS_ES.length === 11,
);

// ─── 3. El idioma sale de la ruta, nunca del navegador (RF-03) ───────────────
console.log("\nIdioma deducido de la ruta:");
ok("/ es español", localeDeRuta("/") === "es");
ok("/ai es español", localeDeRuta("/ai") === "es");
ok("/en es inglés", localeDeRuta("/en") === "en");
ok("/en/ai/academy es inglés", localeDeRuta("/en/ai/academy") === "en");
ok(
  "una ruta que solo empieza por 'en' NO es inglés",
  localeDeRuta("/enterprise") === "es",
  "'/enterprise' se estaba tomando por inglés",
);

// ─── 4. Ida y vuelta: volver al idioma original devuelve a la misma página ───
console.log("\nIda y vuelta (el criterio 2, dicho al revés):");
const TODAS = [...Object.values(RUTAS_ESTRUCTURALES).map((p) => p.es), ...SERVICIOS_ES];
let idaYVueltaOk = 0;
for (const origen of TODAS) {
  const ida = rutaAlterna(origen);
  const vuelta = ida ? rutaAlterna(ida) : null;
  if (vuelta === origen) idaYVueltaOk++;
  else console.error(`    ✗ ${origen} → ${ida} → ${vuelta}`);
}
// Ojo con el número: son las rutas SIN parámetro (16 estructurales + 11 de
// servicio). Las 27 del criterio 2 son otra cuenta —incluyen `/blog/[slug]` y
// `/descargas/[slug]`, y no incluyen `/acceder`, que es ruta de sistema— y se
// cubren aquí sumando el bloque 5.
ok(`las ${TODAS.length} rutas sin parámetro vuelven a su origen`, idaYVueltaOk === TODAS.length);

// ─── 5. Rutas con parámetro ──────────────────────────────────────────────────
console.log("\nRutas con parámetro:");
ok(
  "la etiqueta del blog conserva su valor y traduce el segmento",
  rutaAlterna("/blog/etiqueta/gobernanza") === "/en/blog/tag/gobernanza",
  `dio ${rutaAlterna("/blog/etiqueta/gobernanza")}`,
);
ok(
  "y en sentido inverso",
  rutaAlterna("/en/blog/tag/gobernanza") === "/blog/etiqueta/gobernanza",
);
ok(
  "un artículo sin par devuelve null, no la portada",
  rutaAlterna("/blog/autoridad-silenciosa") === null,
  `dio ${rutaAlterna("/blog/autoridad-silenciosa")}`,
);
ok(
  "un documento de descarga resuelve su par por el frontmatter",
  rutaAlterna("/descargas/lo-que-un-director-debe-saber") ===
    "/en/downloads/what-a-director-should-know",
  `dio ${rutaAlterna("/descargas/lo-que-un-director-debe-saber")}`,
);
ok(
  "una ruta inventada no inventa un par",
  rutaAlterna("/no-existe-esta-ruta") === null,
);

// ─── 6. El menú: cinco destinos, ni uno más (RF-01, RF-87) ───────────────────
console.log("\nMenú principal:");
const strings = {
  "nav.ai": "SLG_AI",
  "nav.holdings": "SLG_Holdings",
  "nav.doctrine": "Doctrina",
  "nav.blog": "Blog",
  "nav.about": "Nosotros",
};
const menu = navPrincipal("es", "/ai/academy/phoenix-peex", strings);
ok("expone exactamente cinco destinos", menu.length === 5, `expone ${menu.length}`);
ok(
  "ninguno es una etiqueta genérica de portada",
  !menu.some((d) => /^(inicio|home)$/i.test(d.label)),
);
ok(
  "ninguno enlaza /hq ni /portal (RF-87)",
  !menu.some((d) => d.href.startsWith("/hq") || d.href.startsWith("/portal")),
);
ok(
  "una página de servicio marca activa su rama",
  menu.find((d) => d.href === "/ai")?.activo === true,
);
ok(
  "y no marca activas las demás",
  menu.filter((d) => d.activo).length === 1,
);
ok(
  "el menú en inglés apunta a rutas en inglés",
  navPrincipal("en", "/en", strings).every((d) => d.href.startsWith("/en")),
);

console.log(
  fallos === 0
    ? "\n✅ Mapa de rutas en verde."
    : `\n❌ ${fallos} comprobación(es) fallida(s).`,
);
process.exit(fallos === 0 ? 0 : 1);
