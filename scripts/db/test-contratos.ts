/**
 * test-contratos.ts — Criterios 6 y 7 de FU-04.
 *
 *  · 6 (RF-142): `deliverable.type` se resuelve por un mapa declarado. Añadir
 *    un tipo es añadir una entrada, no un `if`.
 *  · 7 (RF-146): `agent_event` acepta un `kind` no enumerado con `payload_json`
 *    arbitrario, VALIDADO EN LA ESCRITURA, sin migración de esquema.
 */
import { RENDERIZADORES, validarSubida } from "../../lib/deliverables/renderers.ts";
import { validarEventoDeAgente } from "../../lib/db/events.ts";
import { DELIVERABLE_TYPES } from "../../lib/db/schema.ts";
import { UPLOAD_LIMITS } from "../../lib/db/limits.ts";

let fallos = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (c) console.log(`  ✓ ${n}`);
  else { fallos++; console.error(`  ✗ ${n}${d ? ` — ${d}` : ""}`); }
};

console.log("Criterio 6 · el tipo de entregable es dato, no rama de código\n");

ok("cada tipo del esquema tiene entrada en el mapa",
   DELIVERABLE_TYPES.every((t) => t in RENDERIZADORES),
   `faltan: ${DELIVERABLE_TYPES.filter((t) => !(t in RENDERIZADORES)).join(", ")}`);

ok("el mapa no declara tipos que el esquema no conoce",
   Object.keys(RENDERIZADORES).every((k) => (DELIVERABLE_TYPES as readonly string[]).includes(k)));

ok("`html` va a visor aislado con contenido activo (D-45)",
   RENDERIZADORES.html.modo === "visor-aislado" && RENDERIZADORES.html.contenidoActivo === true);

ok("`link` no admite archivo",
   RENDERIZADORES.link.limiteDeSubidaBytes === null);

ok("el límite se lee de limits.ts, no está repetido (criterio 8)",
   RENDERIZADORES.deliverablePdfCheck === undefined &&
   RENDERIZADORES.pdf.limiteDeSubidaBytes === UPLOAD_LIMITS.deliverablePdf);

const grande = validarSubida("pdf", UPLOAD_LIMITS.deliverablePdf + 1, "application/pdf");
ok("una subida por encima del límite se rechaza", grande.ok === false);

const mimeMalo = validarSubida("pdf", 1000, "image/png");
ok("un MIME no aceptado se rechaza", mimeMalo.ok === false);

ok("ninguna subida supera el tope duro",
   Object.values(RENDERIZADORES).every(
     (s) => s.limiteDeSubidaBytes === null || s.limiteDeSubidaBytes <= UPLOAD_LIMITS.hardCap));

console.log("\nCriterio 7 · agent_event abierto pero validado en la escritura\n");

ok("un `kind` NUEVO no enumerado se acepta (sin migración)",
   validarEventoDeAgente("informe.generado", { x: 1 }).ok === true);

ok("un `kind` con forma incorrecta se rechaza",
   validarEventoDeAgente("ActividadRara", {}).ok === false);

ok("un `kind` sin punto se rechaza",
   validarEventoDeAgente("actividad", {}).ok === false);

ok("un tipo CONOCIDO sin sus campos obligatorios se rechaza",
   validarEventoDeAgente("deliverable.published", { soloEsto: 1 }).ok === false);

ok("un tipo conocido con sus campos se acepta",
   validarEventoDeAgente("deliverable.published", { deliverableId: "d1", projectId: "p1" }).ok === true);

const enorme = { texto: "x".repeat(20000) };
ok("un payload desmesurado se rechaza",
   validarEventoDeAgente("algo.pasa", enorme).ok === false);

let hondo: Record<string, unknown> = { fin: true };
for (let i = 0; i < 10; i++) hondo = { nivel: hondo };
ok("un payload demasiado anidado se rechaza",
   validarEventoDeAgente("algo.pasa", hondo).ok === false);

if (fallos) { console.error(`\n✗ ${fallos} fallo(s).\n`); process.exit(1); }
console.log("\n✓ Criterios 6 y 7 verificados.\n");
