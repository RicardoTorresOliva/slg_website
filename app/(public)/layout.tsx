import { loadUiStrings } from "@/lib/content/loader";

/**
 * Armazón de la capa pública.
 *
 * Aquí se cargan las cadenas de interfaz, y esa carga es deliberada: valida la
 * paridad de claves ES/EN **en tiempo de build**. Una clave presente en
 * `content/ui/es.json` y ausente en `content/ui/en.json` detiene el despliegue
 * en vez de dejar un hueco en pantalla (FU-03, criterio 5 · RF-140).
 *
 * Si esta llamada desaparece, el gate desaparece con ella. No es decorativa.
 */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  loadUiStrings();
  return <>{children}</>;
}
