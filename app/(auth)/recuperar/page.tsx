import { PantallaDeRecuperacion } from "../recuperacion";

export const metadata = { title: "Recuperar · SLG Agency", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Recuperar({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  return <PantallaDeRecuperacion lang="es" estado={estado} />;
}
