/**
 * clases.ts — La única decisión que le falta a «Materiales» para ser «Clases»
 * (DU-28 · RF-155): distinguir cuáles se ven, en vez de leerse.
 *
 * POR QUÉ POR LA URL, Y NO POR UN CAMPO NUEVO EN EL MODELO. La frontera (b) de
 * `scope.md` prohíbe vocabulario de plataforma de formación (`check:alcance`,
 * criterio 4): un campo `es_video` en `deliverable` sería inocente por sí solo,
 * pero es exactamente el primer paso que describe esa frontera — uno que parece
 * cómodo y no lo parece el siguiente. La URL de un material **ya dice** si es un
 * vídeo (un host de vídeo conocido, o una extensión de vídeo), así que se lee de
 * ahí y el modelo no gana nada.
 *
 * ESTA FUNCIÓN NO ABRE NADA NI SABE DE PANTALLAS. Solo responde sí o no; quien
 * la llama decide qué hacer con la respuesta (una insignia, un enlace que abre
 * en pestaña nueva). Así se prueba sin red, sin base de datos y sin el visor —
 * que es, por RF-155, exactamente lo que no cambia aquí.
 */

/** Dominios de vídeo conocidos. Con `www.` o sin él, y sus subdominios. */
const HOSTS_DE_VIDEO = ["youtube.com", "youtu.be", "vimeo.com", "wistia.com", "loom.com"];

/** Extensiones de archivo de vídeo, en la RUTA de la URL (antes de la firma). */
const EXTENSIONES_DE_VIDEO = [".mp4", ".webm", ".mov"];

/**
 * `true` si `url` apunta a un vídeo: un host de vídeo conocido, o una ruta que
 * termina en una extensión de vídeo. Todo lo demás —incluida una URL vacía, nula
 * o que no analiza— es «no», por descarte y sin lanzar.
 *
 * Una URL firmada (bucket) conserva la extensión del archivo original en su
 * RUTA; la firma va en la cadena de consulta, que aquí no se mira. Por eso esto
 * funciona igual para un enlace externo que para un material subido.
 */
export function esVideo(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;

  let analizada: URL;
  try {
    analizada = new URL(url);
  } catch {
    return false;
  }

  const host = analizada.hostname.toLowerCase().replace(/^www\./, "");
  if (HOSTS_DE_VIDEO.some((h) => host === h || host.endsWith(`.${h}`))) return true;

  const ruta = analizada.pathname.toLowerCase();
  return EXTENSIONES_DE_VIDEO.some((ext) => ruta.endsWith(ext));
}
