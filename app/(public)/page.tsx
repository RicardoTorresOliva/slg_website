import type { Metadata } from "next";

import { Home } from "@/components/home/Home";
import { cargarHome } from "@/lib/content/home";

/** Portada en ESPAÑOL, servida desde la raíz (§10-5, RF-03). */
export async function generateMetadata(): Promise<Metadata> {
  const home = cargarHome("es");
  return { title: home.titulo, description: home.descripcion };
}

export default function PaginaDeInicio() {
  return <Home locale="es" />;
}
