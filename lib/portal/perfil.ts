/**
 * perfil.ts — El perfil de **quien está en la sesión** (DU-21 · RF-93).
 *
 * **EL IDENTIFICADOR NO ES UN PARÁMETRO.** Todo lo de aquí opera sobre
 * `ctx.actorId` y nada más. No es comodidad: una función de perfil que acepta un
 * `userId` es una función que alguien acabará llamando con el identificador que
 * venga en un formulario, y ese día cualquiera cambia el nombre —o el idioma, o
 * el correo— de otra persona. Como el parámetro no existe, el fallo no se puede
 * escribir.
 *
 * La tabla `user` **no lleva `organization_id`** y por eso no está bajo política
 * de fila: la política no puede protegerla, así que la protección es esta forma.
 *
 * **LA CONTRASEÑA NO SE TOCA DESDE AQUÍ**: la cambia `lib/auth`, que es quien
 * conoce `account`. Lo único que este módulo sabe es **si existe**, y lo
 * pregunta (criterio 3).
 */
import { eq } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import type { AuthContext } from "../db/context.ts";
import { user } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";

export type Perfil = {
  readonly nombre: string;
  readonly correo: string;
  readonly idioma: string;
  readonly rol: string;
};

export class PerfilInvalido extends Error {
  // Sin propiedad de parámetro: Node ejecuta estos archivos quitando tipos, sin
  // compilarlos, y `constructor(readonly campo)` no sobrevive a eso.
  readonly campo: string;
  constructor(campo: string) {
    super(`dato inválido: ${campo}`);
    this.name = "PerfilInvalido";
    this.campo = campo;
  }
}

export async function perfilDeLaSesion(ctx: AuthContext): Promise<Perfil | null> {
  exigir(ctx, "profile.self");
  if (ctx.actorType !== "user" || !ctx.actorId) return null;
  const filas = await withScope(ctx, (db) =>
    db
      .select({ nombre: user.name, correo: user.email, idioma: user.locale, rol: user.role })
      .from(user)
      .where(eq(user.id, ctx.actorId as string))
      .limit(1),
  );
  return filas[0] ?? null;
}

/**
 * Guarda nombre e idioma de interfaz. **El correo no se edita**: es la identidad
 * con la que se invitó y con la que se entra, y cambiarlo desde aquí sería
 * cambiar de cuenta sin verificar nada.
 */
export async function guardarPerfil(
  ctx: AuthContext,
  datos: { nombre: string; idioma: string },
): Promise<void> {
  exigir(ctx, "profile.self");
  if (ctx.actorType !== "user" || !ctx.actorId) throw new PerfilInvalido("sesion");

  const nombre = datos.nombre.trim();
  if (nombre.length === 0 || nombre.length > 120) throw new PerfilInvalido("nombre");
  // Los dos idiomas del proyecto, escritos aquí porque el esquema los fija con
  // un CHECK y no con una constante exportable. Si alguna vez son tres, el
  // `CHECK` de la base rechaza antes que esto: no hay forma de que discrepen sin
  // que la escritura falle.
  if (datos.idioma !== "es" && datos.idioma !== "en") throw new PerfilInvalido("idioma");

  const id = ctx.actorId;
  await withScope(ctx, (db) =>
    db
      .update(user)
      .set({ name: nombre, locale: datos.idioma, updatedAt: new Date() })
      .where(eq(user.id, id)),
  );
}
