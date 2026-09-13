/**
 * FIXTURE NEGATIVO de `check-shell.ts` (R-26).
 *
 * Esta «pantalla» hace, a propósito, las dos cosas que el freno tiene que
 * atrapar en una superficie autenticada:
 *
 *   1. **se inventa su propio estado vacío** en vez de usar el componente
 *      canónico —con su `role="status"` y su `aria-busy` escritos a mano—, que
 *      es exactamente cómo aparece el segundo texto sin traducir;
 *   2. **mete un conmutador de idioma**, que RF-72 prohíbe dentro de HQ y del
 *      portal.
 *
 * Si el freno no se pone ROJO aquí, su verde sobre las pantallas reales no vale
 * nada. No se importa desde ninguna parte y no se compila con la aplicación.
 */
export function PantallaRota({ vacio }: { vacio: boolean }) {
  return (
    <div>
      <a href="/en/hq" data-slg-conmutador>
        English
      </a>

      {vacio ? (
        <div role="status" aria-busy="false" data-slg-estado="vacio_inicial">
          <p>No hay nada todavía</p>
        </div>
      ) : (
        <p>Contenido</p>
      )}
    </div>
  );
}
