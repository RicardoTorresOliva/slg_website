import { redirect } from "next/navigation";

/**
 * `/hq` — la puerta, que no es una pantalla.
 *
 * Lleva al tablero y no lo sirve ella misma: si `/hq` y `/hq/tablero`
 * renderizaran lo mismo, habría **dos URL para una pantalla**, el enlace
 * resaltado de la barra lateral acertaría solo en una de las dos, y la respuesta
 * a «dónde estoy» se rompería justo al entrar.
 */
export default function Hq() {
  redirect("/hq/tablero");
}
