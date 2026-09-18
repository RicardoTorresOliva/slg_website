/**
 * Fotografía de cabecera de las páginas públicas.
 *
 * POR RUTA Y NO POR FRONTMATTER, a propósito. Meter un campo `imagen` en el
 * esquema obligaría a tocar los 76 registros de contenido y los seis
 * componentes que los pintan, y la fotografía no es contenido editorial: es
 * atmósfera. Vive donde vive el armazón, que es el único sitio por el que pasan
 * todas las páginas.
 *
 * `alt=""` EN TODAS, y no por pereza. Son imágenes decorativas: no aportan
 * información que el texto no dé, y anunciarlas a un lector de pantalla sería
 * ruido. Además, un `alt` con texto sería una cadena escrita en el armazón, que
 * es justo lo que RF-16 prohíbe.
 *
 * Formato WebP y 1600 px de ancho: las originales pesaban 34 MB entre las once
 * y el gate D1 mide LCP. Así pesan 352 KB en total.
 */
const POR_RUTA: Record<string, string> = {
  // La portada es el mapa y va sin fotografía; la escena de la mesa es de Servicios.
  "/servicios": "home",
  "/en/services": "home",
  "/ai": "ai",
  "/en/ai": "ai",
  "/ai/academy": "academy",
  "/en/ai/academy": "academy",
  "/ai/enterprise": "enterprise",
  "/en/ai/enterprise": "enterprise",
  "/ai/factory": "factory",
  "/en/ai/factory": "factory",
  "/holdings": "holdings",
  "/en/holdings": "holdings",
  "/doctrina": "doctrina",
  "/en/doctrine": "doctrina",
  "/nosotros": "nosotros",
  "/en/about": "nosotros",
  "/descargas": "descargas",
  "/en/downloads": "descargas",
  "/blog": "blog",
  "/en/blog": "blog",
  "/contacto": "contacto",
  "/en/contact": "contacto",
};

export function Fotografia({ ruta }: { ruta: string }) {
  const nombre = POR_RUTA[ruta];
  if (!nombre) return null;

  return (
    <div style={marco}>
      {/* eslint-disable-next-line @next/next/no-img-element --
          `next/image` exige el optimizador en servidor; estas ya vienen
          dimensionadas y en WebP desde el build, así que optimizarlas otra vez
          en cada petición es trabajo pagado dos veces. */}
      <img
        src={`/fotos/${nombre}.webp`}
        alt=""
        width={1600}
        height={900}
        // La primera imagen de la página es la candidata a LCP: se pide pronto
        // y no se difiere.
        fetchPriority="high"
        decoding="async"
        style={imagen}
      />
    </div>
  );
}

const marco: React.CSSProperties = {
  maxWidth: "72rem",
  margin: "0 auto",
  padding: "1.5rem 1.25rem 0",
};

const imagen: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  // Recorte estable: la caja no cambia de alto entre páginas, así que el
  // contenido de debajo no salta cuando la imagen termina de cargar.
  aspectRatio: "16 / 7",
  objectFit: "cover",
  borderRadius: "var(--slg-radius-lg)",
  // La misma elevación de dos capas que las tarjetas, para que la fotografía
  // pertenezca al sistema y no parezca pegada encima.
  boxShadow: "var(--slg-elev-1)",
};

export default Fotografia;
