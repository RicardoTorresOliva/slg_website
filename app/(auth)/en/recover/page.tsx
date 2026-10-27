import { sitio } from "@/lib/sitio";

import { PantallaDeRecuperacion } from "../../recuperacion";

export const metadata = { title: `Recover · ${sitio.marca.nombre}`, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Recover({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  return <PantallaDeRecuperacion lang="en" estado={estado} />;
}
