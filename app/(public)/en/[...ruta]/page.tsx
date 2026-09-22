import {
  metadatosDeLaFicha,
  PaginaDeLaFicha,
  parametrosDeLaFicha,
  rutaDeLosSegmentos,
} from "@/components/PaginaDeLaFicha";

/**
 * Toda ruta en INGLÉS que declara la ficha del sitio, bajo `/en` (§10-5,
 * D-166). La misma resolución que la española: `components/PaginaDeLaFicha.tsx`.
 */
export async function generateStaticParams() {
  return parametrosDeLaFicha("en");
}

export const dynamicParams = false;

type Props = { params: Promise<{ ruta: string[] }> };

export async function generateMetadata({ params }: Props) {
  const { ruta } = await params;
  return metadatosDeLaFicha(rutaDeLosSegmentos("en", ruta));
}

export default async function RutaDeLaFichaEn({ params }: Props) {
  const { ruta } = await params;
  return <PaginaDeLaFicha ruta={rutaDeLosSegmentos("en", ruta)} />;
}
