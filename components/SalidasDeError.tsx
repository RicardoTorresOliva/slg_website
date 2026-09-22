"use client";

import { createContext } from "react";

import type { SalidaDeError } from "@/lib/content/rutas";

/**
 * Las salidas de la página de error, al alcance de `app/error.tsx`.
 *
 * **POR QUÉ UN CONTEXTO.** Las salidas salen de la ficha del sitio (D-166): la
 * segunda es el primer eje de la oferta, y eso no lo sabe el motor. La 404 las
 * recibe por props, porque `not-found.tsx` es de servidor. La 500 no puede: un
 * límite de error es de cliente por obligación de React, e importar la ficha
 * desde el cliente mandaría la ficha entera —patrones de nomenclatura
 * incluidos— al navegador en cada página, con el presupuesto de JS (gate D1)
 * ya cerca del límite. Así viajan solo las tres rutas, desde el layout raíz,
 * que envuelve al límite de error.
 */
export const SalidasDelSitio = createContext<Record<"es" | "en", SalidaDeError[]> | null>(null);

export function ProveedorDeSalidas({
  salidas,
  children,
}: {
  salidas: Record<"es" | "en", SalidaDeError[]>;
  children: React.ReactNode;
}) {
  return <SalidasDelSitio.Provider value={salidas}>{children}</SalidasDelSitio.Provider>;
}
