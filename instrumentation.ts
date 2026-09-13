/**
 * `instrumentation.ts` — lo que arranca con el servidor.
 *
 * Next llama a esto **una vez por proceso**, antes de servir la primera
 * petición. Es donde viven los barrenderos de las colas —entrega al CRM y
 * webhooks salientes—, que según
 * A-01 corre **dentro del propio servicio** `slg-web`: sin orquestador externo,
 * sin servicio aparte y sin una URL disparable desde fuera.
 *
 * No arranca en el runtime `edge`: ahí no hay base de datos ni temporizadores
 * largos, y el middleware no tiene nada que barrer.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Sin base de datos no hay cola que barrer: en la compilación, por ejemplo.
  if (!process.env.DATABASE_URL) return;
  // Una salida de escape para las pruebas y para el barrido manual.
  if (process.env.CRM_QUEUE_DISABLED === "1") return;

  const [crm, webhooks] = await Promise.all([
    import("@/lib/crm"),
    import("@/lib/webhooks"),
  ]);
  crm.arrancarBarrendero();
  webhooks.arrancarBarrendero();

  /**
   * `post.published` del contenido ya desplegado (RF-145).
   *
   * APAGADO SALVO QUE SE ENCIENDA A PROPÓSITO, y la razón importa: el evento se
   * dispara comparando el repositorio con lo ya registrado, así que la PRIMERA
   * vez que esto corriera sobre una base sin registros anunciaría **todo el
   * histórico de golpe**. Quien conecte un suscriptor meses después recibiría
   * treinta artículos viejos como si se acabaran de publicar.
   *
   * Con la variable puesta desde el principio, cada despliegue anuncia solo lo
   * que se publicó desde el anterior, que es el comportamiento buscado.
   */
  if (process.env.WEBHOOK_ANNOUNCE_POSTS === "1") {
    // Sin `await`: el arranque del servidor no espera a que esto termine.
    void webhooks.anunciarArticulosPublicados();
  }
}
