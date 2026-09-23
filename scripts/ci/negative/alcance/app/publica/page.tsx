/* eslint-disable */
// FIXTURE NEGATIVO de `check:alcance` (R-26). NO es una página del producto.
//
// Es RF-96 incumplido de la forma en que se incumpliría de verdad: nadie
// escribiría «voy a romper el posicionamiento de la marca». Alguien añadiría un
// botón de agenda a una página de servicio porque «convierte mejor», y con eso
// la firma que vende criterio pasa a vender una llamada.
export default function PaginaPublica() {
  return (
    <main>
      <h1>Un servicio</h1>
      <a href="https://calendario.example/agenda">Agenda tu Sesión Cero</a>
    </main>
  );
}
