import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/config";

/**
 * Rutas del módulo de identidad (`/api/auth/**`): sesión, credenciales, y los
 * callbacks OAuth de F.2-2/F.2-3 cuando existan. Distinto de `api/v1/**`
 * (agentes) y `api/internal/**` (architecture.md, "tres precisiones").
 */
export const { GET, POST } = toNextJsHandler(auth);
