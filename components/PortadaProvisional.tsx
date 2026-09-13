import { loadCollection, loadUiStrings } from "@/lib/content/loader";

import { HeroTipografico } from "./piezas";

/**
 * El interior provisional de la portada, en los dos idiomas.
 *
 * El título y la bajada **se leen de los registros `home` de `content/pages`**, no se
 * escriben aquí: cuando FU-01 cierre su compuerta y ese archivo lleve el copy
 * definitivo, esta pantalla lo muestra sin tocar una línea de código. Y el
 * cuerpo del registro sigue llevando su `[PENDIENTE]`, que es lo que impide que
 * esto llegue a `main` haciéndose pasar por terminado.
 */
export function PortadaProvisional({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const home = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === "home",
  );

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
      <HeroTipografico
        titular={home?.data.title ?? t["footer.rights"]}
        apoyo={home?.data.description ?? ""}
      />
      <p style={{ color: "var(--slg-ink-2)", fontSize: "0.9375rem", paddingBottom: "2rem" }}>
        {home?.body.trim()}
      </p>
    </div>
  );
}
