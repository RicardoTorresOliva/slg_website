/* eslint-disable */
// FIXTURE NEGATIVO de `check:alcance` (R-26). NO es código del producto: es la
// frontera (b) de `scope.md` cruzada a propósito, para que el freno se vea en
// rojo por el motivo esperado antes de que su verde signifique algo.
//
// Cruza las tres reglas a la vez, y cada una de la forma en que se cruzaría de
// verdad: nadie escribiría «voy a convertir esto en un LMS».

import { deliverable } from "../../../../../../lib/db/schema.ts";

// (1) Vocabulario de plataforma de formación: el «visto» y el porcentaje que
//     parecen una comodidad y son el primer paso.
export type LeccionDelPrograma = {
  lesson_id: string;
  progress: number;
  completion: boolean;
  certificate: string | null;
};

// (2) La lista plana: materiales seleccionados por su tipo, sin el proyecto del
//     que cuelgan. Es exactamente lo que el criterio 2 prohíbe.
export function todosLosMateriales(filas: { tipo: string }[]) {
  return filas.filter((f) => f.tipo === "material");
}

export const consulta = { campo: deliverable.type };

// (3) `membership` convertida en expediente.
export const matricula = { membership_progress: 0, membership_cohort: "2026-A" };
