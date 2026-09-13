// FIXTURE NEGATIVO — la LÓGICA, no la importación.
//
// Este endpoint no importa nada prohibido: pasaría las seis reglas de
// importación en verde. Y aun así incumple el criterio 1 de FU-06 entero, que
// es lo que decía comprobarse y no se comprobaba. Las tres reglas del bloque
// «la lógica, no solo la importación» tienen que verlo.
import { NextResponse } from "next/server";

import { sesionActual } from "@/lib/auth";

export async function GET(peticion: Request) {
  const sesion = await sesionActual();
  if (!sesion) return new NextResponse("no", { status: 401 });

  // (1) Decide por el rol A MANO en vez de preguntar a la matriz B.3.
  const mandaEnTodo = sesion.ctx.actorRole === "slg_admin";

  // (2) Compara la empresa del actor a mano en vez de `assertMismaEmpresa`,
  //     y encima responde 403, que confirma que esa empresa existe.
  const pedida = new URL(peticion.url).searchParams.get("empresa");
  if (!mandaEnTodo && sesion.ctx.organizationId !== pedida) {
    return new NextResponse("no es tuya", { status: 403 });
  }

  // (3) Sabe cómo se llama la cookie del proveedor.
  const salida = NextResponse.json({ ok: true });
  salida.cookies.delete("better-auth.session_token");
  return salida;
}
