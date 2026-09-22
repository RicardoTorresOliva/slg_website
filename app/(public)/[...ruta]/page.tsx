import {
  metadatosDeLaFicha,
  PaginaDeLaFicha,
  parametrosDeLaFicha,
  rutaDeLosSegmentos,
} from "@/components/PaginaDeLaFicha";

/**
 * Toda ruta en ESPAÑOL que declara la ficha del sitio (D-166): los índices de
 * los ejes y de las líneas, las páginas de servicio y las páginas sueltas de
 * `content/pages`. Por qué es un comodín y por qué las rutas fijas siguen
 * ganando: `components/PaginaDeLaFicha.tsx`.
 *
 * El contenido se carga y valida en tiempo de build: un frontmatter inválido
 * detiene el despliegue en vez de publicar una página a medias.
 */
export async function generateStaticParams() {
  return parametrosDeLaFicha("es");
}

export const dynamicParams = false;

type Props = { params: Promise<{ ruta: string[] }> };

export async function generateMetadata({ params }: Props) {
  const { ruta } = await params;
  return metadatosDeLaFicha(rutaDeLosSegmentos("es", ruta));
}

export default async function RutaDeLaFicha({ params }: Props) {
  const { ruta } = await params;
  return <PaginaDeLaFicha ruta={rutaDeLosSegmentos("es", ruta)} />;
}
