import { PantallaDeAcceso } from "../../acceso";

export const metadata = { title: "Sign in · SLG Agency", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; volver?: string }>;
}) {
  const { error, volver } = await searchParams;
  return <PantallaDeAcceso lang="en" error={error} volver={volver} />;
}
