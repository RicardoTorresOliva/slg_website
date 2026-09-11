/**
 * DeliverableViewer — componente #9 y último de C.5 (`ui_wireframes.md`
 * §7.3, RF-90/RF-142). El tipo es un DATO, no una rama de código propia de
 * este componente: cada `tipo` solo decide QUÉ sub-renderizador usar, no
 * altera la cabecera ni los estados — así "añadir un tipo es añadir un
 * registro" (RF-142) se cumple en quien construya ese mapa, no aquí.
 *
 * `html` va SIEMPRE sin `allow-same-origin` en el `sandbox` — reforzado en
 * código, no solo por convención: el prop `sandboxPermisos` nunca puede
 * colarlo (D-45, RNF-21, R-11: origen separado + sandbox son defensa en
 * profundidad, no alternativas entre sí).
 *
 * `md` llega ya renderizado y saneado (RNF-31: sanear es responsabilidad de
 * quien construya `contenidoHtml` —DU-19—, no de este componente; se
 * documenta como contrato, no se sanea dos veces).
 *
 * `link` nunca incrusta el destino externo: solo lo anuncia y abre en
 * pestaña nueva.
 */

export type DeliverableType = "pdf" | "html" | "md" | "link";
export type EstadoEntregable = "disponible" | "caducado" | "no_disponible";

export type DeliverableViewerProps = {
  volverLabel: string;
  volverHref: string;
  titulo: string;
  version: number;
  estado: EstadoEntregable;
  descargarLabel: string;
  descargarHref?: string;
  tipo: DeliverableType;
  /** URL firmada, con caducidad — pdf y html. */
  url?: string;
  /** Ya renderizado y saneado por quien llama (DU-19, RNF-31) — solo tipo `md`. */
  contenidoHtml?: string;
  /** Solo tipo `link`: el destino que se anuncia, nunca se incrusta. */
  linkDestino?: { etiqueta: string; href: string };
  sandboxPermisos?: string;
  strings: Record<string, string>;
  onReabrir?: () => void;
};

export function DeliverableViewer({
  volverLabel,
  volverHref,
  titulo,
  version,
  estado,
  descargarLabel,
  descargarHref,
  tipo,
  url,
  contenidoHtml,
  linkDestino,
  sandboxPermisos = "allow-scripts",
  strings: t,
  onReabrir,
}: DeliverableViewerProps) {
  const sandboxSeguro = sandboxPermisos
    .split(/\s+/)
    .filter((token) => token !== "allow-same-origin")
    .join(" ");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4">
        <a href={volverHref} className="no-underline">
          ← {volverLabel} · {titulo} · v{version}
        </a>
        {descargarHref && estado === "disponible" && (
          <a href={descargarHref} className="rounded-md border border-line px-3 py-1.5 text-sm no-underline">
            {descargarLabel}
          </a>
        )}
      </div>

      <div className="p-4">
        {estado === "caducado" && (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="font-semibold text-ink">{t["viewer.expiredTitle"]}</p>
            <button
              type="button"
              onClick={onReabrir}
              className="rounded-md bg-blue-primary px-4 py-2 text-sm text-paper"
            >
              {t["viewer.reopen"]}
            </button>
          </div>
        )}

        {estado === "no_disponible" && (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="font-semibold text-ink">{t["viewer.unavailableTitle"]}</p>
            <p className="text-sm text-ink-2">{t["viewer.contactSupport"]}</p>
          </div>
        )}

        {estado === "disponible" && tipo === "pdf" && url && (
          <iframe src={url} title={titulo} className="h-[32rem] w-full rounded-md border border-line" />
        )}

        {estado === "disponible" && tipo === "html" && url && (
          <iframe
            src={url}
            title={titulo}
            sandbox={sandboxSeguro}
            className="h-[32rem] w-full rounded-md border border-line"
          />
        )}

        {estado === "disponible" && tipo === "md" && contenidoHtml && (
          // Contrato de RNF-31: `contenidoHtml` ya viene saneado por quien lo construye.
          <div className="flex flex-col gap-4 text-ink" dangerouslySetInnerHTML={{ __html: contenidoHtml }} />
        )}

        {estado === "disponible" && tipo === "link" && linkDestino && (
          <a
            href={linkDestino.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-1 rounded-lg border border-line p-6 no-underline"
          >
            <p className="font-semibold text-blue-deep">{linkDestino.etiqueta}</p>
            <p className="text-sm text-ink-2">{linkDestino.href} ↗</p>
          </a>
        )}
      </div>
    </div>
  );
}
