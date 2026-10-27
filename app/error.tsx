"use client";

import { useContext } from "react";

import { PaginaDeError } from "@/components/PaginaDeError";
import { SalidasDelSitio } from "@/components/SalidasDeError";

/**
 * 500 (RF-17).
 *
 * **Cliente por obligación de React**, no por elección: un límite de error solo
 * puede serlo desde el cliente. Y **no se muestra el error**: el mensaje de una
 * excepción puede llevar una ruta de archivo, una consulta o el nombre de una
 * variable de entorno (RNF-32).
 */
export default function Error500() {
  // Sin proveedor —no debería pasar: lo pone el layout raíz— queda la portada.
  const salidas = useContext(SalidasDelSitio)?.es ?? [{ href: "/", clave: "error.home" }];
  return <PaginaDeError codigo="500" salidas={salidas} />;
}
