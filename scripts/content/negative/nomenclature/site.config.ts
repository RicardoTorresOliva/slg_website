/**
 * Una ficha ROTA A PROPÓSITO, solo con su nomenclatura: la prueba negativa de
 * `check:nomenclature` (`verify-gates.ts`) la carga con `SITIO_FICHA`.
 *
 * Tiene sus propias reglas para que la prueba no dependa de la oferta del sitio
 * que la ejecuta: si leyera las de `site.config.ts`, el fixture fallaría solo
 * mientras la ficha fuera la de quien lo escribió, y en el siguiente cliente
 * el freno parecería roto sin estarlo.
 */
import type { FichaDelSitio } from "../../../../lib/sitio/tipos.ts";

export const sitio: Pick<FichaDelSitio, "nomenclatura"> = {
  nomenclatura: {
    literales: ["Producto Uno"],
    variantesProhibidas: [{ pattern: /\bProducto\s+uno\b/g, correct: "Producto Uno", why: "capitalización alterada" }],
    reglasDeContenido: [
      { pattern: /\bllave\s+en\s+mano\b/gi, correct: "a medida", why: "fórmula que este sitio no usa" },
    ],
    prohibidasEnPublico: [],
  },
};
