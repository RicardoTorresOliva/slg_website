import { EJES, RAMAS, SERVICIOS } from "@/lib/content/rutas";
import { sitio } from "@/lib/sitio";
import { PAGINAS_DEL_MOTOR, type ClaveDelMotor } from "@/lib/sitio/motor";

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
const POR_RUTA: Record<string, string> = porRuta();

/**
 * La foto de cada ruta, **desde la ficha**: la que declara cada eje, línea y
 * servicio de la oferta (`foto`), y la de las páginas fijas del motor
 * (`sitio.fotos`, por clave de página). Las dos rutas de un par llevan la
 * misma escena. La portada es el mapa y va sin fotografía salvo que la ficha le
 * dé una.
 */
function porRuta(): Record<string, string> {
  const m: Record<string, string> = {};
  const poner = (ruta: { es: string; en: string }, foto: string | undefined) => {
    if (!foto) return;
    m[ruta.es] = foto;
    if (ruta.en) m[ruta.en] = foto;
  };
  for (const [clave, foto] of Object.entries(sitio.fotos)) {
    if (clave in PAGINAS_DEL_MOTOR) poner(PAGINAS_DEL_MOTOR[clave as ClaveDelMotor].ruta, foto);
  }
  for (const x of [...EJES, ...RAMAS, ...SERVICIOS]) poner(x, x.foto);
  return m;
}

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
