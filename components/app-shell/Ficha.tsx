/**
 * Ficha — el patrón "ficha" del componente #8 de C.5 (`ui_wireframes.md`
 * §5.1): cabecera con nombre + estado + acciones, secciones, y al fondo los
 * metadatos (creado, por quién).
 */

import { TAP_FEEDBACK } from "../shared/interaction.ts";

export type FichaAccion = { label: string; href?: string; onClick?: () => void };
export type FichaSeccion = { titulo: string; contenido: React.ReactNode };

export type FichaProps = {
  volverLabel: string;
  volverHref: string;
  nombre: string;
  estado: string;
  acciones?: readonly FichaAccion[];
  secciones: readonly FichaSeccion[];
  metadatos: string;
};

export function Ficha({ volverLabel, volverHref, nombre, estado, acciones, secciones, metadatos }: FichaProps) {
  return (
    <div className="flex flex-col gap-4">
      <a href={volverHref} className="self-start text-sm no-underline">
        ← {volverLabel}
      </a>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-blue-deep">{nombre}</h3>
          <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-2">{estado}</span>
        </div>
        {acciones && acciones.length > 0 && (
          <div className="flex gap-2">
            {acciones.map((a) => (
              <a
                key={a.label}
                href={a.href}
                onClick={a.onClick}
                className={`rounded-md border border-line px-3 py-1.5 text-sm no-underline ${TAP_FEEDBACK}`}
              >
                {a.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {secciones.map((s) => (
        <section key={s.titulo} className="flex flex-col gap-2 border-t border-line pt-4">
          <h4 className="font-semibold text-ink">{s.titulo}</h4>
          {s.contenido}
        </section>
      ))}

      <p className="border-t border-line pt-4 text-xs text-ink-2">{metadatos}</p>
    </div>
  );
}
