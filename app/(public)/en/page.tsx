import type { Metadata } from "next";

import { Home } from "@/components/home/Home";
import { cargarHome } from "@/lib/content/home";

/** Portada en INGLÉS, bajo `/en` (§10-5, RF-03). */
export async function generateMetadata(): Promise<Metadata> {
  const home = cargarHome("en");
  return { title: home.titulo, description: home.descripcion };
}

export default function EnglishHomePage() {
  return <Home locale="en" />;
}
