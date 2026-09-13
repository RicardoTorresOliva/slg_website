/**
 * Prueba negativa de `check:cadenas`. Las dos formas de romper RF-16:
 * un texto visible escrito a mano y un `aria-label` escrito a mano.
 */
export function Roto() {
  return (
    <nav aria-label="Navegación principal">
      <a href="/doctrina">Doctrina</a>
    </nav>
  );
}
