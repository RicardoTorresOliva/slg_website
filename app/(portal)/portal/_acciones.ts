"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirSeccion } from "@/lib/app/navegacion";
import { ErrorDeAutorizacion, cambiarContrasenaDeLaSesion, exigirSuperficie } from "@/lib/auth";
import { MiembroInvalido, invitarMiembro } from "@/lib/portal/miembros";
import { PerfilInvalido, guardarPerfil } from "@/lib/portal/perfil";

/**
 * Las acciones de escritura del portal (DU-21).
 *
 * **UNA SERVER ACTION ES UN ENDPOINT HTTP**, y por eso cada una vuelve a
 * resolver la sesión y a exigir su sección: se puede invocar sin haber visto
 * nunca el formulario, así que esconder el botón a `client_member` no protege
 * nada. Es la misma regla que en HQ, y aquí importa más: el portal lo usan
 * personas de fuera de SLG.
 *
 * **EL RECHAZO NO SE CUENTA** (D-38, RF-95): un `ErrorDeAutorizacion` vuelve a
 * la misma pantalla sin decir qué faltaba. Queda auditado donde sí sirve, que es
 * `conAuditoria` dentro del servicio. Un dato inválido **sí** se cuenta: es un
 * error de la persona, y callárselo la deja mirando un formulario que no guarda.
 */
async function sesionDelPortal(seccion: string) {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, seccion);
  return sesion;
}

function salida(destino: string, e: unknown): never {
  if (e instanceof MiembroInvalido || e instanceof PerfilInvalido) {
    redirect(`${destino}?error=${encodeURIComponent(e.campo)}`);
  }
  if (e instanceof ErrorDeAutorizacion) redirect(destino);
  throw e;
}

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function accionInvitarMiembro(datos: FormData) {
  const sesion = await sesionDelPortal("members");
  let aviso = "ok";
  try {
    const r = await invitarMiembro(sesion.ctx, {
      correo: texto(datos, "correo"),
      rol: texto(datos, "rol"),
      idioma: texto(datos, "idioma") === "en" ? "en" : "es",
    });
    // RF-119: la invitación existe aunque el correo no salga. La pantalla lo
    // dice en vez de dar por hecho que llegó.
    if (!r.correoEnviado) aviso = "sincorreo";
  } catch (e) {
    salida("/portal/miembros", e);
  }
  revalidatePath("/portal/miembros");
  redirect(`/portal/miembros?aviso=${aviso}`);
}

export async function accionGuardarPerfil(datos: FormData) {
  const sesion = await sesionDelPortal("profile");
  try {
    await guardarPerfil(sesion.ctx, {
      nombre: texto(datos, "nombre"),
      idioma: texto(datos, "idioma"),
    });
  } catch (e) {
    salida("/portal/perfil", e);
  }
  revalidatePath("/portal/perfil");
  redirect("/portal/perfil?aviso=ok");
}

/**
 * El cambio de contraseña. **No pasa por `lib/portal`**: lo hace `lib/auth`, que
 * es quien conoce `account`. Aquí solo llega el formulario.
 *
 * El resultado es booleano y sin motivo a propósito: distinguir «la actual no
 * coincide» de «esta cuenta no usa contraseña» le diría a quien tenga una sesión
 * ajena delante con qué método entra su dueño.
 */
export async function accionCambiarContrasena(datos: FormData) {
  await sesionDelPortal("profile");
  const ok = await cambiarContrasenaDeLaSesion(
    await headers(),
    String(datos.get("actual") ?? ""),
    String(datos.get("nueva") ?? ""),
  );
  redirect(`/portal/perfil?aviso=${ok ? "clave" : "claveError"}`);
}
