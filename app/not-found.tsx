import { PaginaDeError } from "@/components/PaginaDeError";

/** 404 (RF-17). Bilingüe por la ruta; el español es el defecto de la raíz. */
export default function NoEncontrada() {
  return <PaginaDeError codigo="404" />;
}
