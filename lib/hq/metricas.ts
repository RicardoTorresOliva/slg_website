/**
 * metricas.ts — Las métricas del pipeline, **leídas del CRM** (RF-55, RF-74).
 *
 * LO QUE ESTE ARCHIVO NO HACE, Y ES LA MITAD DE SU RAZÓN DE SER. No calcula
 * ninguna métrica, no guarda ninguna, y no tiene forma de modificar nada del
 * CRM: solo `GET`, con la clave de **solo lectura** (RF-56). El pipeline vive
 * en el CRM y HQ lo **mira** (RF-85). El día que alguien quiera editar una
 * etapa desde aquí, no encontrará por dónde, que es exactamente lo que la
 * frontera (a) del alcance pide.
 *
 * TODO LO QUE SALE DE AQUÍ VIENE MARCADO: `origen: "crm"` y la marca de tiempo
 * de la caché. RF-74 lo exige y no es un detalle de presentación — un número
 * del CRM y un número calculado por nosotros **no se auditan igual**, y en una
 * pantalla sin marcar son indistinguibles. La marca de tiempo, además, es lo
 * que hace honesto el dato: «14 leads» sin fecha es una afirmación sobre ahora
 * que puede tener cinco minutos.
 *
 * LA CACHÉ ES EN MEMORIA Y DEL PROCESO, y eso basta aquí. Con dos instancias
 * habría dos cachés y, como mucho, el doble de llamadas al CRM: 24 por hora en
 * vez de 12. Guardarla en la base de datos añadiría una tabla y una escritura
 * por lectura para ahorrar doce peticiones al día.
 */
import { llamar } from "../crm/http.ts";

/** Los tres informes de B.6, tal como el CRM los publica. */
export const INFORMES = {
  metricas: "/dashboard/metrics",
  embudo: "/reports/funnel",
  // La moneda va en la petición, no en la interpretación: leer importes sin
  // decir en qué moneda están es cómo se suman euros con dólares.
  fuentes: "/reports/sources?currency=USD",
} as const;

export type Informe = keyof typeof INFORMES;

export type Metricas = {
  /** Siempre `"crm"`. Está en el dato, no en el componente, para que viaje con él. */
  readonly origen: "crm";
  /** Cuándo se pidió de verdad al CRM. No cuándo se pintó la pantalla. */
  readonly obtenidoEn: string;
  readonly caducaEn: string;
  /** `true` si esta respuesta salió de la caché y no de una llamada nueva. */
  readonly deLaCache: boolean;
  readonly datos: Readonly<Partial<Record<Informe, unknown>>>;
  /**
   * Qué informes no se pudieron leer, con su motivo **ya saneado**. Que esto
   * tenga contenido NO es un fallo del tablero: es un dato más que la pantalla
   * enseña (criterio 8), porque un tablero en blanco cuando el CRM no responde
   * esconde también lo que sí funciona.
   */
  readonly fallos: readonly { readonly informe: Informe; readonly motivo: string }[];
};

const SEGUNDOS = () => Number(process.env.CRM_METRICS_CACHE_SECONDS ?? 300);

let cache: Metricas | null = null;

/** Para las pruebas y para el «forzar recarga» del tablero. */
export function olvidarCache(): void {
  cache = null;
}

function vigente(m: Metricas | null): boolean {
  return Boolean(m && Date.parse(m.caducaEn) > Date.now());
}

async function leerInforme(informe: Informe): Promise<{ datos?: unknown; motivo?: string }> {
  // `uso: "tablero"` es la clave de SOLO LECTURA. Es el único sitio del código
  // que la usa, y no hay ningún camino desde aquí a un método que escriba.
  const r = await llamar("GET", INFORMES[informe], undefined, "tablero");
  if (!r.ok) return { motivo: r.error ?? `HTTP ${r.codigo ?? "?"}` };
  try {
    return { datos: r.cuerpo ? JSON.parse(r.cuerpo) : null };
  } catch {
    // Un cuerpo que no es JSON es casi siempre una pasarela devolviendo HTML.
    // Decirlo así ahorra media hora de buscar el fallo en el sitio equivocado.
    return { motivo: "el CRM respondió algo que no es JSON" };
  }
}

/**
 * Las métricas, de la caché si sigue vigente. **Nunca lanza**: si el CRM entero
 * está caído, devuelve lo que tenga con sus fallos apuntados, y el tablero se
 * degrada en vez de quedarse en blanco (criterio 8).
 */
export async function metricasDelCrm(opciones?: { forzar?: boolean }): Promise<Metricas> {
  if (!opciones?.forzar && vigente(cache)) return { ...cache!, deLaCache: true };

  const ahora = new Date();
  const datos: Partial<Record<Informe, unknown>> = {};
  const fallos: { informe: Informe; motivo: string }[] = [];

  for (const informe of Object.keys(INFORMES) as Informe[]) {
    try {
      const r = await leerInforme(informe);
      if (r.motivo) fallos.push({ informe, motivo: r.motivo });
      else datos[informe] = r.datos;
    } catch (e) {
      // Falta la clave, la base no está configurada… nada de eso puede tumbar
      // el tablero entero: es un informe que hoy no se puede leer.
      fallos.push({ informe, motivo: (e as Error).message.slice(0, 200) });
    }
  }

  const fresco: Metricas = {
    origen: "crm",
    obtenidoEn: ahora.toISOString(),
    caducaEn: new Date(ahora.getTime() + SEGUNDOS() * 1_000).toISOString(),
    deLaCache: false,
    datos,
    fallos,
  };

  /**
   * **Un fallo total NO se cachea.** Si el CRM está caído cinco segundos,
   * guardar ese vacío cinco minutos convierte un tropiezo en una avería larga
   * que además parece del tablero. Se cachea lo que trae algo.
   */
  if (Object.keys(datos).length > 0) cache = fresco;
  return fresco;
}

/** A dónde lleva «Abrir CRM» (RF-75). Configurable, como el enlace profundo. */
export function urlDelCrm(): string | null {
  return process.env.CRM_APP_URL?.replace(/\/$/, "") ?? null;
}
