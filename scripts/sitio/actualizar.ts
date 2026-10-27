/**
 * actualizar.ts — **Trae el motor de la plantilla a este sitio** (D-167).
 *
 *   npm run sitio:actualizar
 *
 * Añade el remoto `plantilla` si falta, fusiona `plantilla/develop`, deja la piel
 * del cliente como estaba, corre los frenos rápidos y empuja a `develop` (vista
 * previa). Producción, nunca: eso es pasar `develop` a `main`, con el «sí» de
 * Ricardo. El porqué de cada paso está en `fusion.ts`.
 *
 *   --primera-vez   engancha un repositorio que no nació de la plantilla
 *   --sin-empujar   deja la fusión en local
 *   --sin-frenos    no corre los frenos (el CI los correrá igual)
 */
import { parseArgs } from "node:util";

import { FRENOS, PLANTILLA, actualizar } from "./fusion.ts";

const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== "--"),
  options: {
    "primera-vez": { type: "boolean", default: false },
    "sin-empujar": { type: "boolean", default: false },
    "sin-frenos": { type: "boolean", default: false },
    plantilla: { type: "string", default: PLANTILLA },
  },
  strict: true,
});

try {
  const r = actualizar(
    {
      dir: process.cwd(),
      plantilla: values.plantilla ?? PLANTILLA,
      primeraVez: values["primera-vez"] ?? false,
      empujar: !values["sin-empujar"],
      frenos: values["sin-frenos"] ? "" : FRENOS,
    },
    (linea) => console.log(linea),
  );
  process.exitCode = r.estado === "parado" ? 1 : 0;
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  process.exitCode = 1;
}
