/**
 * La IP del cliente, **sin fiarse de lo que el cliente escribe**.
 *
 * `x-forwarded-for` lo AÑADE cada proxy por la derecha: el primer valor es lo
 * que mandó el cliente —cualquiera puede ponerlo— y el último es lo que vio
 * nuestro proxy. Tomar el primero deja que quien rota ese valor tenga contador
 * nuevo en cada petición, y el límite por IP deja de serlo.
 *
 * `TRUSTED_PROXY_HOPS` es cuántos proxies nuestros hay delante (por defecto 1:
 * el de Easypanel). Se toma la entrada que añadió el primero de ellos.
 */
export function ipDelCliente(request: Request): string {
  const saltos = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const cadena = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const elegida = cadena[cadena.length - saltos] ?? request.headers.get("x-real-ip")?.trim() ?? "";
  return elegida.slice(0, 100);
}
