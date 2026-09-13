/**
 * Quién recibe los webhooks — y **cuántos puede haber: ninguno**.
 *
 * RF-115 es explícito: **ningún flujo externo es requisito de la v1**. Sin
 * suscriptor configurado el sistema funciona igual y los eventos **quedan
 * registrados**. Por eso esta función puede devolver una lista vacía sin que
 * nada se rompa, y por eso el registro del evento ocurre antes que el envío.
 *
 * **Secreto POR suscriptor** (RF-113): dos destinos nunca comparten clave. Si la
 * compartieran, revocar la de uno obligaría a rotar la del otro.
 */
export type Suscriptor = { nombre: string; url: string; secreto: string };

export function suscriptores(): Suscriptor[] {
  const lista: Suscriptor[] = [];

  // Forma general: una lista JSON, para más de un destino.
  const crudo = process.env.WEBHOOK_SUBSCRIBERS;
  if (crudo) {
    try {
      for (const s of JSON.parse(crudo) as Suscriptor[]) {
        if (s?.url && s?.secreto) lista.push({ nombre: s.nombre ?? s.url, url: s.url, secreto: s.secreto });
      }
    } catch {
      // Una lista mal escrita NO puede tumbar la captura de un lead: se ignora
      // y el evento queda registrado igual, que es lo que RF-115 garantiza.
    }
  }

  // Forma corta: n8n, que es el único suscriptor previsto de la v1 y es
  // OPCIONAL (§7, RF-115). Nunca es requisito.
  const url = process.env.N8N_WEBHOOK_URL;
  const secreto = process.env.WEBHOOK_SIGNING_SECRET;
  if (url && secreto && !lista.some((s) => s.url === url)) {
    lista.push({ nombre: "n8n", url, secreto });
  }

  return lista;
}
