/**
 * Armazón de `/prototipo` — **ancho completo, y por eso existe este grupo**.
 *
 * HALLAZGO QUE LO MOTIVA (FU-12, mirando el navegador). La página vivía dentro
 * del grupo `(auth)`, que centra a sus hijos en una tarjeta de **26 rem**: la
 * anchura de un formulario de acceso. Así que la compuerta de revisión de los
 * nueve componentes de C.5 se estaba mirando a **416 px de ancho**. Los
 * componentes de una columna aguantaban; el **armazón de aplicación** y el
 * **visor de entregables** —que existen para una pantalla ancha— nunca se
 * habían visto a su tamaño. Una compuerta que enseña el componente a una
 * anchura que nadie va a usar está revisando otra cosa.
 *
 * Estaba en `(auth)` para heredar su `noindex`, que es la razón correcta. Se
 * conserva sin la tarjeta: `/prototipo` está en la lista `GRUPO_AUTH` del
 * middleware —que pone `X-Robots-Tag` en la respuesta— y la página declara
 * además `robots: { index: false }`. Dos capas, ninguna de las cuales era la
 * anchura.
 */
export default function PrototipoLayout({ children }: { children: React.ReactNode }) {
  return <main style={{ minHeight: "100svh" }}>{children}</main>;
}
