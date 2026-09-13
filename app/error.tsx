"use client";

import { PaginaDeError } from "@/components/PaginaDeError";

/**
 * 500 (RF-17).
 *
 * **Cliente por obligación de React**, no por elección: un límite de error solo
 * puede serlo desde el cliente. Y **no se muestra el error**: el mensaje de una
 * excepción puede llevar una ruta de archivo, una consulta o el nombre de una
 * variable de entorno (RNF-32).
 */
export default function Error500() {
  return <PaginaDeError codigo="500" />;
}
