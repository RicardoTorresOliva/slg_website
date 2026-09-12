import type { CSSProperties } from "react";

/**
 * 9 · Visor de entregables.
 *
 * **ORIGEN SEPARADO, normativo (D-45).** El HTML de un entregable lo generan a
 * veces agentes Hermes: servido desde nuestro dominio, un script hostil dentro
 * de él leería las cookies de sesión del cliente. Desde un subdominio propio, el
 * navegador lo aísla por política de origen y no puede.
 *
 * El `sandbox` y la CSP se mantienen **además**, como defensa en profundidad, no
 * como alternativa: con solo sandbox, la protección depende de que la
 * configuración sea correcta siempre, y un fallo de configuración expone la
 * sesión.
 *
 * `allow-same-origin` NO aparece, y esa ausencia es la mitad del mecanismo:
 * con él, el documento recupera su origen y el aislamiento se evapora.
 */
export function VisorDeEntregables({
  src,
  titulo,
  descargaHref,
  etiquetaDescarga,
}: {
  /** URL firmada en el subdominio del visor. Siempre caduca (RNF-20). */
  src: string;
  titulo: string;
  descargaHref?: string;
  etiquetaDescarga?: string;
}) {
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={cabecera}>
        <span style={{ fontWeight: 600 }}>{titulo}</span>
        {descargaHref && etiquetaDescarga ? (
          <a href={descargaHref} style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}>
            {etiquetaDescarga}
          </a>
        ) : null}
      </figcaption>
      <iframe
        src={src}
        title={titulo}
        // Lo mínimo para que el documento se lea. Nada más.
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        loading="lazy"
        style={marco}
      />
    </figure>
  );
}

const cabecera: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  padding: "0.75rem 1rem",
  border: "1px solid var(--slg-line)",
  borderBottom: "none",
  borderTopLeftRadius: "var(--slg-radius-md)",
  borderTopRightRadius: "var(--slg-radius-md)",
  background: "var(--slg-paper-2)",
  fontSize: "0.9375rem",
};

const marco: CSSProperties = {
  display: "block",
  width: "100%",
  height: "min(70svh, 40rem)",
  border: "1px solid var(--slg-line)",
  borderBottomLeftRadius: "var(--slg-radius-md)",
  borderBottomRightRadius: "var(--slg-radius-md)",
  background: "var(--slg-paper)",
};
