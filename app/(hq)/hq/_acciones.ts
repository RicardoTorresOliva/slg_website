"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ErrorDeAutorizacion, exigirSuperficie } from "@/lib/auth";
import { exigirSeccion } from "@/lib/app/navegacion";
import { crearEmpresa, DatoInvalido, editarEmpresa } from "@/lib/hq/empresas";
import { crearProyecto, editarProyecto } from "@/lib/hq/proyectos";
import { reintentarCaptura } from "@/lib/hq/reintento";
import { invitarACliente, invitarASlg, reenviar, revocar } from "@/lib/hq/usuarios";

/**
 * Las acciones de escritura de HQ (DU-14).
 *
 * **TODAS PASAN POR `sesionDeHq()` Y NINGUNA CONFÍA EN LA PANTALLA.** Una
 * Server Action es un **endpoint HTTP** con otro nombre: se puede invocar sin
 * haber visto nunca el formulario, así que esconder el botón no protege nada.
 * Por eso cada una vuelve a resolver la sesión, vuelve a exigir la sección, y
 * deja que el servicio de `lib/hq` aplique su fila de B.3 — tres capas que
 * fallan por separado y ninguna que se dé por supuesta.
 *
 * **EL RECHAZO NO SE CUENTA.** Un `ErrorDeAutorizacion` se convierte en 404
 * como en el resto del sistema (D-38, RF-95): decir «no puedes» confirmaría que
 * la acción existe. El intento **queda auditado** por `conAuditoria`, que es
 * donde esa información sí sirve.
 *
 * Un dato inválido, en cambio, **sí se cuenta**: vuelve al formulario con el
 * campo en la URL. Es un error de la persona, no un intento, y callárselo la
 * deja mirando un formulario que no se guarda sin saber por qué.
 */
async function sesionDeHq(seccion: string) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, seccion);
  return sesion;
}

/** Convierte el fallo en lo que toca y **nunca** deja pasar un error crudo. */
function salida(destino: string, e: unknown): never {
  if (e instanceof DatoInvalido) redirect(`${destino}?error=${encodeURIComponent(e.campo)}`);
  if (e instanceof ErrorDeAutorizacion) {
    // El 404 lo produce `notFound()` en la página; aquí basta con no revelar
    // nada: se vuelve a la misma pantalla sin cambiar nada.
    redirect(destino);
  }
  throw e;
}

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opcional = (f: FormData, k: string) => texto(f, k) || null;

/* ── Empresas ─────────────────────────────────────────────────────────────── */

export async function accionCrearEmpresa(datos: FormData) {
  const sesion = await sesionDeHq("orgs");
  try {
    await crearEmpresa(sesion.ctx, {
      nombre: texto(datos, "nombre"),
      slug: texto(datos, "slug"),
      tipo: texto(datos, "tipo"),
      estado: texto(datos, "estado"),
      contactoPrincipal: opcional(datos, "contacto"),
    });
  } catch (e) {
    salida("/hq/empresas", e);
  }
  revalidatePath("/hq/empresas");
  redirect("/hq/empresas");
}

export async function accionEditarEmpresa(datos: FormData) {
  const sesion = await sesionDeHq("orgs");
  const id = texto(datos, "id");
  try {
    await editarEmpresa(sesion.ctx, id, {
      nombre: texto(datos, "nombre"),
      slug: texto(datos, "slug"),
      tipo: texto(datos, "tipo"),
      estado: texto(datos, "estado"),
      contactoPrincipal: opcional(datos, "contacto"),
    });
  } catch (e) {
    salida("/hq/empresas", e);
  }
  revalidatePath("/hq/empresas");
  redirect("/hq/empresas");
}

/* ── Proyectos ────────────────────────────────────────────────────────────── */

export async function accionCrearProyecto(datos: FormData) {
  const sesion = await sesionDeHq("projects");
  try {
    await crearProyecto(sesion.ctx, {
      organizationId: texto(datos, "empresa"),
      nombre: texto(datos, "nombre"),
      servicio: texto(datos, "servicio"),
      estado: texto(datos, "estado"),
      responsableId: opcional(datos, "responsable"),
      empiezaEn: opcional(datos, "empieza"),
      terminaEn: opcional(datos, "termina"),
    });
  } catch (e) {
    salida("/hq/proyectos", e);
  }
  revalidatePath("/hq/proyectos");
  redirect("/hq/proyectos");
}

export async function accionEditarProyecto(datos: FormData) {
  const sesion = await sesionDeHq("projects");
  const id = texto(datos, "id");
  try {
    await editarProyecto(sesion.ctx, id, {
      organizationId: texto(datos, "empresa"),
      nombre: texto(datos, "nombre"),
      servicio: texto(datos, "servicio"),
      estado: texto(datos, "estado"),
      responsableId: opcional(datos, "responsable"),
      empiezaEn: opcional(datos, "empieza"),
      terminaEn: opcional(datos, "termina"),
    });
  } catch (e) {
    salida("/hq/proyectos", e);
  }
  revalidatePath("/hq/proyectos");
  redirect("/hq/proyectos");
}

/* ── Usuarios e invitaciones ──────────────────────────────────────────────── */

export async function accionInvitarASlg(datos: FormData) {
  const sesion = await sesionDeHq("users");
  const rol = texto(datos, "rol");
  try {
    await invitarASlg(sesion.ctx, {
      email: texto(datos, "email"),
      organizationId: texto(datos, "empresa"),
      role: rol === "slg_admin" ? "slg_admin" : "slg_operator",
      idioma: texto(datos, "idioma") === "en" ? "en" : "es",
    });
  } catch (e) {
    salida("/hq/usuarios", e);
  }
  revalidatePath("/hq/usuarios");
  redirect("/hq/usuarios");
}

export async function accionInvitarACliente(datos: FormData) {
  const sesion = await sesionDeHq("users");
  const rol = texto(datos, "rol");
  try {
    await invitarACliente(sesion.ctx, {
      email: texto(datos, "email"),
      organizationId: texto(datos, "empresa"),
      role: rol === "client_admin" ? "client_admin" : "client_member",
      idioma: texto(datos, "idioma") === "en" ? "en" : "es",
    });
  } catch (e) {
    salida("/hq/usuarios", e);
  }
  revalidatePath("/hq/usuarios");
  redirect("/hq/usuarios");
}

export async function accionReenviarInvitacion(datos: FormData) {
  const sesion = await sesionDeHq("users");
  try {
    await reenviar(sesion.ctx, texto(datos, "id"), texto(datos, "idioma") === "en" ? "en" : "es");
  } catch (e) {
    salida("/hq/usuarios", e);
  }
  revalidatePath("/hq/usuarios");
  redirect("/hq/usuarios");
}

export async function accionRevocarInvitacion(datos: FormData) {
  const sesion = await sesionDeHq("users");
  try {
    await revocar(sesion.ctx, texto(datos, "id"));
  } catch (e) {
    salida("/hq/usuarios", e);
  }
  revalidatePath("/hq/usuarios");
  redirect("/hq/usuarios");
}

/* ── Capturas ─────────────────────────────────────────────────────────────── */

/**
 * El reintento manual (DU-16 · RF-52).
 *
 * **El resultado vuelve en la URL**, no en un estado de cliente: así la
 * pantalla puede decir «reintento abierto», «ya estaba entregada» o «sigue en
 * cola» sin hidratar nada, y el mensaje sobrevive a recargar la página. Los
 * tres son resultados legítimos, no errores: reintentar algo ya entregado
 * crearía un contacto duplicado, y callarlo sería peor que decirlo.
 */
export async function accionReintentarCaptura(datos: FormData) {
  const sesion = await sesionDeHq("captures");
  const id = texto(datos, "id");
  let resultado;
  try {
    resultado = await reintentarCaptura(sesion.ctx, id);
  } catch (e) {
    salida("/hq/capturas", e);
  }
  revalidatePath("/hq/capturas");
  const aviso = resultado.ok ? "reintentada" : resultado.motivo;
  redirect(`/hq/capturas?aviso=${encodeURIComponent(aviso)}#${encodeURIComponent(id)}`);
}
