import { permanentRedirect } from "next/navigation";

/** `/empieza-aqui` fue la ruta del mapa durante un día; ahora el mapa ES la portada. */
export default function EmpiezaAqui() {
  permanentRedirect("/");
}
