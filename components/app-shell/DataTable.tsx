"use client";

import { useState } from "react";

import { TAP_FEEDBACK } from "../shared/interaction.ts";

/**
 * DataTable — el patrón "tabla" del componente #8 de C.5 (`ui_wireframes.md`
 * §5.1/§5.2): ordenable por columna, fila entera clicable → ficha, y tres de
 * los seis estados de §5.2 (cargando, vacío inicial, vacío por filtro, error
 * de carga — los otros dos, error de acción y permiso/no encontrado, no son
 * estados de LISTA: viven en `AvisoAccion` y `EstadoPermiso`).
 *
 * Distinguir vacío inicial de vacío por filtro no es cosmético (§5.2): el
 * primero invita a crear, el segundo a limpiar el filtro — de ahí que sean
 * dos props separadas, no una sola con una bandera.
 */

export type Columna<T> = {
  key: keyof T & string;
  label: string;
  ordenable?: boolean;
  render?: (fila: T) => React.ReactNode;
};

export type EstadoTabla = "cargando" | "vacio_inicial" | "vacio_filtro" | "error_carga" | "con_datos";

export type DataTableProps<T extends Record<string, unknown>> = {
  columnas: readonly Columna<T>[];
  filas: readonly T[];
  estado: EstadoTabla;
  onFilaClick?: (fila: T) => void;
  vacioInicial: { titulo: string; cuerpo: string; accionLabel?: string; onAccion?: () => void };
  vacioFiltro: { titulo: string; limpiarLabel: string; onLimpiar: () => void };
  errorCarga: { titulo: string; reintentarLabel: string; onReintentar: () => void };
};

export function DataTable<T extends Record<string, unknown>>({
  columnas,
  filas,
  estado,
  onFilaClick,
  vacioInicial,
  vacioFiltro,
  errorCarga,
}: DataTableProps<T>) {
  const [ordenPor, setOrdenPor] = useState<string | null>(null);
  const [ordenAsc, setOrdenAsc] = useState(true);

  if (estado === "cargando") {
    return (
      <div role="status" aria-label="Cargando" className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-paper-2" />
        ))}
      </div>
    );
  }

  if (estado === "vacio_inicial") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-line p-12 text-center">
        <p className="font-semibold text-ink">{vacioInicial.titulo}</p>
        <p className="text-ink-2">{vacioInicial.cuerpo}</p>
        {vacioInicial.accionLabel && (
          <button
            type="button"
            onClick={vacioInicial.onAccion}
            className={`rounded-md bg-blue-primary px-4 py-2 text-paper ${TAP_FEEDBACK}`}
          >
            {vacioInicial.accionLabel}
          </button>
        )}
      </div>
    );
  }

  if (estado === "vacio_filtro") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-line p-12 text-center">
        <p className="font-semibold text-ink">{vacioFiltro.titulo}</p>
        <button
          type="button"
          onClick={vacioFiltro.onLimpiar}
          className={`rounded-md border border-line px-4 py-2 ${TAP_FEEDBACK}`}
        >
          {vacioFiltro.limpiarLabel}
        </button>
      </div>
    );
  }

  if (estado === "error_carga") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-line p-12 text-center">
        <p className="font-semibold text-stop">{errorCarga.titulo}</p>
        <button
          type="button"
          onClick={errorCarga.onReintentar}
          className={`rounded-md border border-line px-4 py-2 ${TAP_FEEDBACK}`}
        >
          {errorCarga.reintentarLabel}
        </button>
      </div>
    );
  }

  function alOrdenar(key: string) {
    if (ordenPor === key) setOrdenAsc(!ordenAsc);
    else {
      setOrdenPor(key);
      setOrdenAsc(true);
    }
  }

  const filasOrdenadas = ordenPor
    ? [...filas].sort((a, b) => {
        const av = a[ordenPor];
        const bv = b[ordenPor];
        if (av === bv) return 0;
        const cmp = (av as string | number) < (bv as string | number) ? -1 : 1;
        return ordenAsc ? cmp : -cmp;
      })
    : filas;

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-line">
          {columnas.map((col) => (
            <th key={col.key} className="px-3 py-2 text-sm text-ink-2">
              {col.ordenable ? (
                <button
                  type="button"
                  onClick={() => alOrdenar(col.key)}
                  className="flex items-center gap-1 font-semibold"
                >
                  {col.label}
                  {ordenPor === col.key && <span aria-hidden="true">{ordenAsc ? "▲" : "▼"}</span>}
                </button>
              ) : (
                col.label
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filasOrdenadas.map((fila, i) => (
          <tr
            key={i}
            onClick={onFilaClick ? () => onFilaClick(fila) : undefined}
            tabIndex={onFilaClick ? 0 : undefined}
            onKeyDown={
              onFilaClick
                ? (e) => {
                    if (e.key === "Enter") onFilaClick(fila);
                  }
                : undefined
            }
            className={
              onFilaClick
                ? `cursor-pointer border-b border-line hover:bg-paper-2 ${TAP_FEEDBACK}`
                : "border-b border-line"
            }
          >
            {columnas.map((col) => (
              <td key={col.key} className="px-3 py-2">
                {col.render ? col.render(fila) : String(fila[col.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
