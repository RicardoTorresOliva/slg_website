/**
 * interaction.ts — Reglas de motion compartidas por los nueve componentes de C.5.
 *
 * `TAP_FEEDBACK`: RNF-10 exige feedback visual en `pointerdown` (`scale(0.97)`,
 * 100ms) y CERO retardo artificial. `:active` de CSS es el mecanismo más
 * directo posible — sin JavaScript de por medio, sin esperar a un evento de
 * React — que es exactamente lo que "cero retardo" pide. Una sola definición
 * aquí para que los nueve componentes usen el mismo valor, nunca uno "a ojo"
 * (C.6, principio 7: Craft — "¿sale de un token o de este documento?").
 */
export const TAP_FEEDBACK = "transition-transform duration-100 active:scale-[0.97]";
