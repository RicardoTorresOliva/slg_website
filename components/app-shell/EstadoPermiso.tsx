/**
 * EstadoPermiso — el estado "permiso / no encontrado" de §5.2: siempre 404,
 * nunca 403 (RF-71, RF-95) — no distingue "no existe" de "no tienes acceso",
 * a propósito.
 */

export type EstadoPermisoProps = {
  titulo: string;
  volverLabel: string;
  volverHref: string;
};

export function EstadoPermiso({ titulo, volverLabel, volverHref }: EstadoPermisoProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-16 text-center">
      <p className="text-2xl font-bold text-ink">{titulo}</p>
      <a href={volverHref} className="no-underline">
        ← {volverLabel}
      </a>
    </div>
  );
}
