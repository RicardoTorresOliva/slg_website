/**
 * Wordmark — La marca en la barra: el isotipo del sitio y su nombre.
 *
 * Isotipo + nombre tipográfico. Se usa el ISOTIPO y no el logotipo completo
 * porque la barra es estrecha y el nombre ya va escrito al lado: el logotipo
 * completo, con su propio texto, firma en el pie (`ArmazonPublico`).
 *
 * Está aislado en un componente y un token justamente para que sustituirlo por
 * el logo real sea cambiar un archivo, sin tocar ninguna página (R-35).
 *
 * Reglas del kit que este componente hereda (gate D2b):
 *   · El logo solo va sobre `--slg-paper` o `--slg-paper-2`. Nunca sobre
 *     fondo oscuro, ni dentro de una sección en `--slg-blue-deep` o
 *     `--slg-indigo`.
 *   · Margen de respeto = 1 altura de la «S». Se aplica con `padding`, no con
 *     márgenes externos, para que no colapse.
 *   · Nunca deformado: sin `scale` no uniforme, sin `transform` de anchura.
 *
 * **EL NOMBRE Y EL ISOTIPO LLEGAN POR PROPS**, desde la ficha (`sitio.marca`,
 * D-165), y no se leen aquí. El único que pinta este componente es
 * `BarraDeNavegacion`, que es de cliente: importar `@/lib/sitio` desde aquí
 * metería la ficha entera —oferta, patrones de nomenclatura— en el JavaScript
 * que se descarga cada visitante, para usar dos cadenas. Las pone
 * `ArmazonPublico`, que es de servidor.
 */

type WordmarkProps = {
  /** El nombre de la marca (`sitio.marca.nombre`): el texto y la etiqueta accesible. */
  label: string;
  /** El isotipo (`sitio.marca.isotipo`), ruta dentro de `public/`. */
  isotipo: string;
  /** Clases adicionales del contenedor. No usar para recolorear la marca. */
  className?: string;
};

export function Wordmark({ label, isotipo, className = "" }: WordmarkProps) {
  return (
    <span
      className={`slg-wordmark ${className}`.trim()}
      style={{
        // El margen de respeto del kit: 1 altura de la «S» ≈ 0.72em. A la
        // derecha la mitad: ahí van las banderas de idioma, que traen el suyo,
        // y en un teléfono de 360 px esos 7 px son los que evitan que se monten.
        padding: "0.72em 0.36em 0.72em 0.72em",
        color: "var(--slg-blue-deep)",
        fontFamily: "var(--slg-font-sans)",
        fontWeight: 700,
        fontSize: "1.25rem",
        letterSpacing: "-0.01em",
        lineHeight: 1,
        // Sin deformación: la caja se adapta al contenido, no al revés
        whiteSpace: "nowrap",
        // El isotipo y el texto, en una sola línea óptica
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45em",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element --
          `next/image` no optimiza SVG (lo sirve tal cual) y añadiría un
          componente cliente y una petición al optimizador para un archivo
          vectorial de 3,5 KB. Aquí `<img>` es la opción correcta, no el atajo.
          `alt=""` porque es decorativo: el nombre accesible lo da el texto de
          al lado, y anunciarlo dos veces sería ruido para un lector. */}
      <img
        src={isotipo}
        alt=""
        style={{ height: "1.15em", width: "auto", display: "block" }}
      />
      {label}
    </span>
  );
}

export default Wordmark;
