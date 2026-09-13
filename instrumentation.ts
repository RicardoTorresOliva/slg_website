/**
 * `instrumentation.ts` — lo que arranca con el servidor.
 *
 * Next llama a esto **una vez por proceso**, antes de servir la primera
 * petición. Es donde vive el barrendero de la cola de entrega al CRM, que según
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

  const { arrancarBarrendero } = await import("@/lib/crm");
  arrancarBarrendero();
}
