import { PantallaDeRecuperacion } from "../../recuperacion";

export const metadata = { title: "Recover · SLG Agency", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Recover({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  return <PantallaDeRecuperacion lang="en" estado={estado} />;
}
