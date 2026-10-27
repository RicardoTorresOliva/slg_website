import { PaginaDeError } from "@/components/PaginaDeError";
import { salidasDeError } from "@/lib/content/rutas";

/** 404 (RF-17). Bilingüe por la ruta; el español es el defecto de la raíz. */
export default function NoEncontrada() {
  return <PaginaDeError codigo="404" salidas={salidasDeError().es} />;
}
