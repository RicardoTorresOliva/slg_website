import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeTexto } from "@/components/PaginaDeTexto";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("legal-privacidad", "es", "/legal/privacidad");

/**
 * Página legal — **pública y sin autenticación** (DU-06 criterio 3).
 *
 * No es una preferencia: las pantallas de consentimiento de Google y de Entra ID
 * exigen una URL de privacidad que responda **sin sesión** (F.2-1, R-13). Si
 * esta ruta deja de responder 200, el inicio de sesión social deja de poder
 * configurarse.
 */
export default function legalprivacidad() {
  return (
    <ArmazonPublico ruta="/legal/privacidad">
      <PaginaDeTexto slug="legal-privacidad" lang="es" />
    </ArmazonPublico>
  );
}
