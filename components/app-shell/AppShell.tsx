/**
 * AppShell — la mitad de armazón del componente #8 de C.5: barra lateral +
 * área de contenido. Un solo shell, dos configuraciones (HQ y portal,
 * `design_docs/ui_wireframes.md` §5): cambia la navegación y el alcance de
 * los datos, no el patrón — así que este componente no distingue HQ de
 * portal, solo recibe `items`/`marca` distintos por props (RF-16).
 */

import { TAP_FEEDBACK } from "../shared/interaction.ts";

export type SidebarItem = { href: string; label: string; activo?: boolean };

export type AppShellProps = {
  marca: string;
  items: readonly SidebarItem[];
  pieAccionLabel?: string;
  pieAccionHref?: string;
  usuarioLabel: string;
  tituloScreen: string;
  accionPrimaria?: { label: string; href?: string; onClick?: () => void };
  children: React.ReactNode;
};

export function AppShell({
  marca,
  items,
  pieAccionLabel,
  pieAccionHref,
  usuarioLabel,
  tituloScreen,
  accionPrimaria,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-[32rem] overflow-hidden rounded-lg border border-line">
      <aside className="flex w-56 shrink-0 flex-col gap-4 border-r border-line bg-paper-2 p-4">
        <p className="font-bold text-blue-deep">{marca}</p>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.activo ? "page" : undefined}
              className={`rounded-md px-3 py-2 no-underline ${
                item.activo ? "bg-paper font-semibold text-blue-deep" : "text-ink-2 hover:bg-paper"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
          {pieAccionLabel && pieAccionHref && (
            <a href={pieAccionHref} className={`text-sm no-underline ${TAP_FEEDBACK}`}>
              {pieAccionLabel}
            </a>
          )}
          <p className="text-sm text-ink-2">{usuarioLabel}</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">{tituloScreen}</h2>
          {accionPrimaria && (
            <a
              href={accionPrimaria.href}
              onClick={accionPrimaria.onClick}
              className={`rounded-md bg-blue-primary px-3 py-1.5 text-sm text-paper no-underline ${TAP_FEEDBACK}`}
            >
              {accionPrimaria.label}
            </a>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
