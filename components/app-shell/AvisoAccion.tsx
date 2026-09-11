/**
 * AvisoAccion — el estado "error de acción" de §5.2: sobre el contenido
 * afectado, no como notificación flotante que se pierde. Los datos ya
 * escritos se conservan — este componente no los toca, solo avisa.
 */

import { TAP_FEEDBACK } from "../shared/interaction.ts";

export type AvisoAccionProps = {
  titulo: string;
  cuerpo: string;
  reintentarLabel: string;
  onReintentar: () => void;
};

export function AvisoAccion({ titulo, cuerpo, reintentarLabel, onReintentar }: AvisoAccionProps) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-md border border-stop p-4">
      <p className="font-semibold text-stop">⚠ {titulo}</p>
      <p className="text-sm text-ink-2">{cuerpo}</p>
      <button
        type="button"
        onClick={onReintentar}
        className={`self-start rounded-md border border-line px-3 py-1.5 text-sm ${TAP_FEEDBACK}`}
      >
        {reintentarLabel}
      </button>
    </div>
  );
}
