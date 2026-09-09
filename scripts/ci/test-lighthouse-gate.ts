/**
 * test-lighthouse-gate.ts — Prueba negativa del gate D1 (D-50, R-26).
 *
 * Arrancar Chrome de verdad en cada push solo para probar que el freno PUEDE
 * fallar sería caro y lento sin añadir confianza: lo que puede tener un
 * defecto es la lógica de umbral, no Lighthouse. Por eso `evaluar()` vive
 * separada de Chrome en `check-lighthouse.ts` y aquí se prueba con
 * resultados fabricados — cada categoría por debajo de 90, LCP por encima de
 * 2,5 s, y el caso que debe pasar limpio. `check-lighthouse.ts` en sí ya se
 * demostró en verde contra el build real (98/100/92/100, LCP 2,2 s) el
 * 2026-09-09; esta prueba cubre que el freno también sepa decir que no.
 */
import { evaluar, type ResultadoRuta } from "./check-lighthouse.ts";

const BASE: ResultadoRuta = {
  ruta: "/",
  performance: 0.98,
  accessibility: 1,
  bestPractices: 0.92,
  seo: 1,
  lcpMs: 2200,
};

let fallos = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (c) console.log(`  ✓ ${n}`);
  else { fallos++; console.error(`  ✗ ${n}${d ? ` — ${d}` : ""}`); }
};

console.log("Prueba negativa del gate D1 (Lighthouse)\n");

ok("un resultado limpio no produce fallos", evaluar(BASE).length === 0);

ok(
  "Performance 89 falla",
  evaluar({ ...BASE, performance: 0.89 }).some((f) => f.includes("Performance")),
);
ok(
  "Accessibility 89 falla",
  evaluar({ ...BASE, accessibility: 0.89 }).some((f) => f.includes("Accessibility")),
);
ok(
  "Best Practices 89 falla",
  evaluar({ ...BASE, bestPractices: 0.89 }).some((f) => f.includes("Best Practices")),
);
ok("SEO 89 falla", evaluar({ ...BASE, seo: 0.89 }).some((f) => f.includes("SEO")));
ok(
  "LCP exactamente en el límite (2500 ms) falla — el umbral es estricto",
  evaluar({ ...BASE, lcpMs: 2500 }).some((f) => f.includes("LCP")),
);
ok(
  "LCP justo por debajo del límite (2499 ms) pasa",
  evaluar({ ...BASE, lcpMs: 2499 }).length === 0,
);
ok(
  "Performance exactamente en 90 pasa — el umbral es «≥», no «>»",
  evaluar({ ...BASE, performance: 0.9 }).length === 0,
);
ok(
  "varias categorías por debajo a la vez producen varios fallos, no solo el primero",
  evaluar({ ...BASE, performance: 0.5, seo: 0.5 }).length === 2,
);

if (fallos) { console.error(`\n✗ ${fallos} fallo(s).\n`); process.exit(1); }
console.log("\n✓ El gate D1 falla cuando debe y pasa cuando debe.\n");
