"use client";

import { useState } from "react";

import {
  DeliverableViewer,
  type DeliverableType,
  type EstadoEntregable,
} from "@/components/deliverable-viewer/DeliverableViewer.tsx";

/** Vitrina SOLO de esta página: el `<select>` que conmuta tipo/estado no existe en el componente real. */
export function PrototipoVisorDeEntregable({ strings }: { strings: Record<string, string> }) {
  const [tipo, setTipo] = useState<DeliverableType>("md");
  const [estado, setEstado] = useState<EstadoEntregable>("disponible");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          Tipo:
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as DeliverableType)}
            className="rounded border border-line px-2 py-1"
          >
            <option value="pdf">pdf</option>
            <option value="html">html</option>
            <option value="md">md</option>
            <option value="link">link</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          Estado:
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoEntregable)}
            className="rounded border border-line px-2 py-1"
          >
            <option value="disponible">disponible</option>
            <option value="caducado">caducado</option>
            <option value="no_disponible">no disponible</option>
          </select>
        </label>
      </div>

      <DeliverableViewer
        volverLabel="Proyecto A"
        volverHref="#"
        titulo="Informe de Readiness"
        version={2}
        estado={estado}
        descargarLabel="Descargar"
        descargarHref="#"
        tipo={tipo}
        url="/file.svg"
        contenidoHtml="<h3>Resumen</h3><p>Contenido de ejemplo, ya renderizado y saneado por quien lo sirve.</p>"
        linkDestino={{ etiqueta: "Ver en Phoenix Academy", href: "https://example.test/academy" }}
        strings={strings}
        onReabrir={() => setEstado("disponible")}
      />
    </div>
  );
}
