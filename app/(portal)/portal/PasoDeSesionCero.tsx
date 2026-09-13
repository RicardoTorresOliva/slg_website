import { pasoDeSesionCero } from "@/lib/portal/sesion-cero";

/**
 * El paso «Agenda tu Sesión Cero» (DU-21 · RF-94 · RF-96).
 *
 * **VIVE AQUÍ DENTRO, COLOCADO CON LA PANTALLA QUE LO USA, Y NO EN
 * `components/`.** No es organización: `check:alcance` frena cualquier
 * referencia a la Sesión Cero fuera de `app/(portal)/` y `lib/portal/`, así que
 * un componente compartido sería el primer sitio desde el que se podría colar a
 * una página pública. RF-96 dice que la Sesión Cero **no se ofrece en público**,
 * y la forma de que eso siga siendo cierto dentro de un año es que el código que
 * la nombra no pueda importarse desde fuera.
 *
 * **SIN URL, «PRÓXIMAMENTE», Y LA PANTALLA SIGUE ENTERA** (criterio 4). No hay
 * enlace muerto, no hay hueco y no desaparece el paso: quien lo lee se entera de
 * que existe y de que todavía no hay agenda abierta.
 */
export function PasoDeSesionCero({ textos }: { textos: Record<string, string> }) {
  const paso = pasoDeSesionCero(textos);

  return (
    <section className="slg-card" style={caja}>
      <h2 style={{ margin: 0, fontSize: "1.125rem", color: "var(--slg-blue-deep)" }}>
        {textos["portal.sesion0.title"]}
      </h2>
      <p style={{ margin: "0.375rem 0 0", fontSize: "0.9375rem" }}>
        {textos["portal.sesion0.text"]}
      </p>
      {paso.estado === "disponible" ? (
        <p style={{ margin: "0.75rem 0 0" }}>
          {/* `rel` completo: el destino es una herramienta de terceros, y una
              pestaña nueva sin `noopener` le deja tocar la nuestra. */}
          <a
            href={paso.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--slg-link)", fontSize: "0.9375rem" }}
          >
            {textos["portal.sesion0.cta"]}
          </a>
        </p>
      ) : (
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", color: "var(--slg-ink-2)" }}>
          <strong>{textos["portal.sesion0.soon"]}</strong> · {textos["portal.sesion0.soonText"]}
        </p>
      )}
    </section>
  );
}

const caja: React.CSSProperties = {
  padding: "1.25rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
