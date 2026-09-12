/**
 * test-permisos.ts — La matriz B.3, recorrida entera.
 *
 * Cubre, sin tocar la base de datos:
 *   · criterio 2 — la matriz se comprueba en el SERVIDOR, invocando la acción
 *     sin pasar por ninguna interfaz.
 *   · criterio 4 — los alcances NO se implican entre sí. Probado alcance por
 *     alcance, no con un ejemplo.
 *   · criterio 7 — los mensajes de error no revelan qué faltaba.
 *
 * La matriz se recorre COMPLETA —15 acciones × 4 roles, más los seis alcances
 * contra las 15 acciones— porque probar tres casos de una matriz de permisos es
 * no probarla: lo que se escapa siempre es la celda que nadie miró.
 */
import { contextoDeClaveApi, contextoDeSesion } from "../../lib/db/context.ts";
import { API_SCOPES, type ApiScope } from "../../lib/db/schema.ts";
/**
 * Se importan los archivos INTERNOS del módulo, no su superficie pública: es la
 * prueba del propio módulo, no un consumidor. `index.ts` arrastra `session.ts`,
 * que usa `next/headers` y solo existe dentro del runtime de Next; exigirlo
 * aquí obligaría a levantar el servidor para probar una tabla de permisos.
 * `check-auth-boundary` exceptúa `scripts/auth/` por esta razón y solo por ella.
 */
import { ACCIONES, MATRIZ_B3, ROLES_DE_PERSONA, type Accion } from "../../lib/auth/roles.ts";
import { ErrorDeAutorizacion, exigir, puede } from "../../lib/auth/permissions.ts";

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (!ok) {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

const ctxDe = (rol: (typeof ROLES_DE_PERSONA)[number], organizationId: string | null = "org-1") =>
  contextoDeSesion({ userId: "u-1", userName: "Prueba", role: rol, organizationId });

const ctxClave = (scopes: readonly ApiScope[]) =>
  contextoDeClaveApi({ apiKeyId: "k-1", name: "Prueba", organizationId: "org-1", scopes });

/* ── 1 · Las 15 acciones × los 4 roles, celda por celda ──────────────────── */
console.log("Matriz B.3 — 15 acciones × 4 roles de persona:\n");

for (const accion of ACCIONES) {
  const regla = MATRIZ_B3[accion];
  for (const rol of ROLES_DE_PERSONA) {
    const declarado = regla.porRol[rol];
    const ctx = ctxDe(rol);

    const sinAsignacion = puede(ctx, accion);
    const conAsignacion = puede(ctx, accion, { asignado: true });

    if (declarado === "si") {
      check(`${accion} · ${rol} debe poder`, sinAsignacion.permitido);
    } else if (declarado === "no") {
      check(`${accion} · ${rol} NO debe poder`, !sinAsignacion.permitido);
      check(
        `${accion} · ${rol} sigue sin poder aunque alegue asignación`,
        !conAsignacion.permitido,
        "la asignación no concede lo que B.3 niega",
      );
    } else {
      check(
        `${accion} · ${rol} sin demostrar asignación NO debe poder`,
        !sinAsignacion.permitido,
        "el silencio es «no»: quien llama debe demostrar la asignación",
      );
      check(`${accion} · ${rol} con asignación debe poder`, conAsignacion.permitido);
    }
  }
}
console.log(`  · ${ACCIONES.length * ROLES_DE_PERSONA.length} celdas recorridas`);

/* ── 2 · Criterio 4: los alcances no se implican entre sí ────────────────── */
console.log("\nAlcances — cada uno habilita EXACTAMENTE lo suyo (RF-147):\n");

for (const alcance of API_SCOPES) {
  const ctx = ctxClave([alcance]);
  const habilitadas = ACCIONES.filter((a) => MATRIZ_B3[a].alcanceDeAgente === alcance);

  for (const accion of ACCIONES) {
    const debePoder = habilitadas.includes(accion);
    const v = puede(ctx, accion);
    check(
      `clave con solo «${alcance}» ${debePoder ? "debe" : "NO debe"} poder ${accion}`,
      v.permitido === debePoder,
    );
  }
}

// El caso que RF-147 nombra por su nombre.
check(
  "una clave con events:write NO puede crear un entregable",
  !puede(ctxClave(["events:write"]), "deliverable.publish").permitido,
  "si esto pasa, los alcances se implican y el modelo de permisos es decorativo",
);
check(
  "una clave con deliverables:read NO puede publicar un entregable",
  !puede(ctxClave(["deliverables:read"]), "deliverable.publish").permitido,
  "leer no implica escribir",
);
check(
  "una clave con deliverables:write NO puede leer entregables sin deliverables:read",
  !puede(ctxClave(["deliverables:write"]), "deliverable.read").permitido,
  "escribir tampoco implica leer: no hay jerarquía",
);

/* ── 3 · Lo que NINGUNA clave puede hacer, tenga los alcances que tenga ──── */
console.log("\nAcciones sin alcance en B.3 — cerradas a toda clave:\n");

const conTodos = ctxClave([...API_SCOPES]);
const sinAlcance = ACCIONES.filter((a) => MATRIZ_B3[a].alcanceDeAgente === null);
for (const accion of sinAlcance) {
  check(
    `ni con los seis alcances una clave puede ${accion}`,
    !puede(conTodos, accion).permitido,
    "B.3 no le asigna alcance: eso significa «ninguna clave», no «falta uno»",
  );
}
console.log(`  · ${sinAlcance.length} acciones cerradas: ${sinAlcance.join(", ")}`);

/* ── 4 · Criterio 7: el error no dice qué faltaba ────────────────────────── */
console.log("\nMensajes de error — no revelan nada (RNF-32):\n");

const prohibidas: [string, () => void][] = [
  ["rol sin permiso", () => exigir(ctxDe("client_member"), "audit.read")],
  ["clave sin alcance", () => exigir(ctxClave(["events:write"]), "deliverable.publish")],
  ["acción cerrada a claves", () => exigir(conTodos, "apikey.manage")],
  ["asignación no demostrada", () => exigir(ctxDe("slg_operator"), "deliverable.publish")],
];

const PALABRAS_PROHIBIDAS = [
  ...API_SCOPES,
  ...ROLES_DE_PERSONA,
  ...ACCIONES,
  "alcance",
  "scope",
  "asignad",
];

for (const [caso, invocar] of prohibidas) {
  try {
    invocar();
    check(`${caso} · debe lanzar`, false, "la acción se permitió y no debía");
  } catch (e) {
    const err = e as ErrorDeAutorizacion;
    check(`${caso} · es ErrorDeAutorizacion`, err instanceof ErrorDeAutorizacion);
    check(`${caso} · estado 403`, err.status === 403, `estado ${err.status}`);

    const publico = err.message.toLowerCase();
    const filtra = PALABRAS_PROHIBIDAS.filter((p) => publico.includes(p.toLowerCase()));
    check(
      `${caso} · el mensaje público no nombra alcance, rol ni acción`,
      filtra.length === 0,
      `el mensaje «${err.message}» contiene: ${filtra.join(", ")}`,
    );

    // Y la contraparte: el motivo interno SÍ es útil, porque va al registro.
    check(`${caso} · el motivo interno es concreto`, err.motivoInterno.length > 20);

    // Lo que sale por HTTP no lleva el motivo interno.
    const cuerpo = JSON.stringify(err);
    check(
      `${caso} · el motivo interno no se serializa por accidente`,
      !cuerpo.includes(err.motivoInterno) || cuerpo === "{}",
      `JSON.stringify del error expone: ${cuerpo}`,
    );
  }
}

/* ── 5 · Un contexto incoherente no autoriza ─────────────────────────────── */
const incoherente = contextoDeSesion({
  userId: "u-x",
  userName: "x",
  // @ts-expect-error a propósito: un rol que el vocabulario no admite
  role: "agent",
  organizationId: null,
});
check(
  "un contexto con rol 'agent' pero sin clave no autoriza nada",
  !puede(incoherente, "deliverable.read" as Accion).permitido,
  "degradar un contexto corrupto a permisos de lectura es convertir un dato malo en acceso",
);

/* ── Resultado ───────────────────────────────────────────────────────────── */
console.log("");
if (fallos > 0) {
  console.error(`✗ matriz B.3: ${fallos} fallo(s) sobre ${comprobaciones} comprobaciones.\n`);
  process.exit(1);
}
console.log(`✓ matriz B.3: ${comprobaciones} comprobaciones, sin fallos.\n`);
