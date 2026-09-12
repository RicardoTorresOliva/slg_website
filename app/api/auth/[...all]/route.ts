import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/**
 * Los endpoints de Better Auth: acceso, cierre de sesión, callbacks de OAuth,
 * recuperación.
 *
 * Vive aquí porque el framework exige una ruta, pero **no contiene lógica**:
 * delega en la instancia del módulo. Es la única ruta del proyecto que toca
 * autenticación directamente, y por eso `check-auth-boundary` la conoce por
 * nombre en vez de prohibirla a ciegas.
 *
 * Las PANTALLAS de acceso, recuperación e invitación son de DU-01.
 */
export const { GET, POST } = toNextJsHandler(auth);
