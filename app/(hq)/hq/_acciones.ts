"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ErrorDeAutorizacion, exigirSuperficie } from "@/lib/auth";
import { exigirSeccion } from "@/lib/app/navegacion";
import { crearEmpresa, DatoInvalido, editarEmpresa } from "@/lib/hq/empresas";
import { crearProyecto, editarProyecto } from "@/lib/hq/proyectos";
import { publicarAviso } from "@/lib/hq/avisos";
import { crearClave, guardarParaMostrar, revocarClave } from "@/lib/hq/claves";
import { publicarEntregable } from "@/lib/hq/entregables";
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

/* ── Claves de API ────────────────────────────────────────────────────────── */

/**
 * Crear una clave (DU-17 · RF-82).
 *
 * **El secreto NO viaja en la URL.** Lo que vuelve en el redirect es un
 * identificador opaco de un solo uso; el valor se queda en memoria del servidor
 * hasta que la pantalla lo enseña, y al enseñarlo se borra. Una URL con la
 * clave dentro acaba en el historial, en el registro del proxy y en la primera
 * captura de pantalla que alguien comparta.
 */
export async function accionCrearClave(datos: FormData) {
  const sesion = await sesionDeHq("apikeys");
  let vale: string;
  try {
    const { enClaro } = await crearClave(sesion.ctx, {
      nombre: texto(datos, "nombre"),
      organizationId: opcional(datos, "empresa"),
      // `getAll` porque son casillas: varios valores con el mismo nombre.
      alcances: datos.getAll("alcances").map(String),
      limite: Number(texto(datos, "limite")),
      ventanaSegundos: Number(texto(datos, "ventana")),
      caducaEn: texto(datos, "caduca"),
    });
    vale = guardarParaMostrar(enClaro);
  } catch (e) {
    salida("/hq/claves", e);
  }
  revalidatePath("/hq/claves");
  redirect(`/hq/claves?nueva=${encodeURIComponent(vale)}`);
}

export async function accionRevocarClave(datos: FormData) {
  const sesion = await sesionDeHq("apikeys");
  try {
    await revocarClave(sesion.ctx, texto(datos, "id"));
  } catch (e) {
    salida("/hq/claves", e);
  }
  revalidatePath("/hq/claves");
  redirect("/hq/claves?aviso=revocada");
}

/* ── Entregables y avisos ─────────────────────────────────────────────────── */

/**
 * Publicar un entregable (DU-15 · RF-80 · RF-143).
 *
 * **EL ARCHIVO NO PASA POR AQUÍ.** El formulario manda solo su nombre, su tipo
 * y su tamaño; el servidor valida esos tres **antes de firmar** y devuelve una
 * URL de subida directa al bucket. Hacer que el archivo atraviese el servidor
 * costaría memoria y tiempo por cada entregable y no añadiría ninguna
 * comprobación que no se pueda hacer con los metadatos.
 *
 * La URL firmada vuelve por el mismo camino que el secreto de una clave
 * (**D-114**): un identificador de un solo uso, nunca en la barra de
 * direcciones.
 */
export async function accionPublicarEntregable(datos: FormData) {
  const sesion = await sesionDeHq("deliverablesHq");
  let vale: string | null = null;
  try {
    const bytes = Number(texto(datos, "bytes"));
    const resultado = await publicarEntregable(sesion.ctx, {
      projectId: texto(datos, "proyecto"),
      organizationId: texto(datos, "empresa"),
      titulo: texto(datos, "titulo"),
      tipo: texto(datos, "tipo"),
      visibilidad: texto(datos, "visibilidad"),
      url: opcional(datos, "url"),
      archivo: texto(datos, "nombre")
        ? { nombre: texto(datos, "nombre"), mime: texto(datos, "mime"), bytes }
        : null,
      familyId: opcional(datos, "familia"),
    });
    if (resultado.subida) vale = guardarParaMostrar(resultado.subida.url);
  } catch (e) {
    salida("/hq/entregables", e);
  }
  revalidatePath("/hq/entregables");
  redirect(vale ? `/hq/entregables?subida=${encodeURIComponent(vale)}` : "/hq/entregables");
}

export async function accionPublicarAviso(datos: FormData) {
  const sesion = await sesionDeHq("announcementsHq");
  try {
    await publicarAviso(sesion.ctx, {
      organizationId: texto(datos, "empresa"),
      titulo: texto(datos, "titulo"),
      cuerpoMd: String(datos.get("cuerpo") ?? ""),
      // El idioma del AVISO, que no tiene por qué ser el de la interfaz de
      // quien lo escribe: se escribe a clientes internacionales en inglés con
      // el panel en español todos los días.
      idioma: texto(datos, "idioma") === "en" ? "en" : "es",
    });
  } catch (e) {
    salida("/hq/avisos", e);
  }
  revalidatePath("/hq/avisos");
  redirect("/hq/avisos");
}
