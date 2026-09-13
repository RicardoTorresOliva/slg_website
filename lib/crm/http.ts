/**
 * El cliente HTTP del CRM. Uno, compartido por los dos modos.
 *
 * **La clave nunca sale de aquí.** Ni en un error, ni en una traza, ni en la
 * fila de `crm_delivery`: `sanear()` la borra de cualquier texto antes de que
 * salga de este archivo. Un mensaje de error acaba en una pantalla de HQ, y una
 * pantalla de HQ se comparte en una captura.
 */
export type RespuestaCrm = {
  ok: boolean;
  codigo: number | null;
  cuerpo: string | null;
  error: string | null;
};

function baseDelCrm(): string {
  const v = process.env.CRM_BASE_URL;
  if (!v) throw new Error("Falta CRM_BASE_URL. Los nombres están en .env.example.");
  return v.replace(/\/$/, "");
}

function clave(): string {
  const v = process.env.CRM_API_KEY;
  if (!v) throw new Error("Falta CRM_API_KEY. Los nombres están en .env.example.");
  return v;
}

/** Quita de un texto cualquier rastro de la credencial. */
export function sanear(texto: string): string {
  const k = process.env.CRM_API_KEY;
  let salida = texto;
  if (k && k.length > 4) salida = salida.split(k).join("«clave oculta»");
  return salida.replace(/(authorization|api[-_]?key)\s*[:=]\s*\S+/gi, "$1: «clave oculta»").slice(0, 500);
}

export async function llamar(
  metodo: "GET" | "POST",
  ruta: string,
  cuerpo?: Record<string, unknown>,
): Promise<RespuestaCrm> {
  const url = `${baseDelCrm()}${ruta}`;
  const tiempoLimite = Number(process.env.CRM_TIMEOUT_MS ?? 10_000);
  const corte = AbortSignal.timeout(tiempoLimite);

  try {
    const r = await fetch(url, {
      method: metodo,
      headers: {
        authorization: `Bearer ${clave()}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: corte,
    });
    const texto = await r.text();
    return {
      ok: r.ok,
      codigo: r.status,
      cuerpo: texto.slice(0, 2_000),
      error: r.ok ? null : sanear(`HTTP ${r.status}: ${texto.slice(0, 200)}`),
    };
  } catch (e) {
    // Un timeout o una caída de red NO son un fallo del lead: son un fallo del
    // intento, y el intento se repite. Por eso vuelve como `ok: false` con
    // error, y no como una excepción que pararía el barrido entero.
    return { ok: false, codigo: null, cuerpo: null, error: sanear((e as Error).message) };
  }
}
