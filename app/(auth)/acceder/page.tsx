import { sitio } from "@/lib/sitio";

import { PantallaDeAcceso } from "../acceso";

export const metadata = { title: `Acceder · ${sitio.marca.nombre}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Acceder({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; volver?: string }>;
}) {
  const { error, volver } = await searchParams;
  return <PantallaDeAcceso lang="es" error={error} volver={volver} />;
}
