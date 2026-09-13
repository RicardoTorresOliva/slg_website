import { exigirSuperficie } from "@/lib/auth";
import { exigirSeccion } from "@/lib/app/navegacion";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { loadUiStrings } from "@/lib/content/loader";
import { tableroDeHq } from "@/lib/hq/tablero";

import { TableroDeHq } from "./TableroDeHq";

/**
 * `/hq/tablero` — el tablero de HQ (DU-13).
 *
 * DOS COMPROBACIONES Y NO UNA, y ninguna sobra. `exigirSuperficie("hq")`
 * resuelve la sesión y el paso 6 de §2.4 —existe, no expiró, no está revocada,
 * el rol corresponde—. `exigirSeccion(ctx, "dashboard")` aplica **la fila de
 * B.3 de esta sección concreta**: es la mitad de servidor del criterio 5 de
 * FU-12, la que hace que esconder el enlace no sea la única defensa. Un
 * `client_admin` que teclee esta URL no llega aquí por la primera; un
 * `slg_operator` sin `hq.dashboard.read` no llegaría por la segunda.
 *
 * Los filtros llegan por la URL (`?documento=`, `?pagina=`, `?dia=`) y no por
 * estado de cliente: un tablero filtrado tiene que poder **pegarse en un
 * mensaje** y abrirse igual al otro lado.
 */
export const dynamic = "force-dynamic";

export default async function Tablero({
  searchParams,
}: {
  searchParams: Promise<{ documento?: string; pagina?: string; dia?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "dashboard");

  const q = await searchParams;
  const datos = await tableroDeHq(sesion.ctx, {
    documento: q.documento ?? null,
    pagina: q.pagina ?? null,
    dia: q.dia ?? null,
  });

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  return <TableroDeHq datos={datos} t={t} />;
}
