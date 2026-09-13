import type { ContentRecord } from "@/lib/content/loader";

import { HeroTipografico } from "./piezas";

/**
 * El interior provisional de una página pública.
 *
 * Título y bajada salen del registro de contenido; el cuerpo, tal cual está en
 * el `.md` —hoy, su `[PENDIENTE]`—. Cuando FU-01 cierre su compuerta, estas
 * páginas muestran el copy definitivo **sin tocar código**: es exactamente para
 * eso que el contenido vive en `content/` y no en los componentes (B.4, RF-16).
 *
 * Las páginas de verdad —con los seis bloques del contrato A.3, la descarga y
 * lo demás— las construyen DU-04 y DU-05.
 */
export function PaginaProvisional({
  registro,
  lang,
}: {
  registro: ContentRecord;
  lang: "es" | "en";
}) {
  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }} lang={lang}>
      <HeroTipografico
        titular={registro.data.title as string}
        apoyo={registro.data.description as string}
      />
      <p style={{ color: "var(--slg-ink-2)", fontSize: "0.9375rem", paddingBottom: "2rem" }}>
        {registro.body.trim()}
      </p>
    </div>
  );
}
