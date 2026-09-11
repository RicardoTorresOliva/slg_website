/**
 * free-email-domains.ts — Lista de dominios de correo gratuito, PROVISIONAL.
 *
 * RF-32 exige que esta lista sea **dato editable sin desplegar**, no código —
 * eso es `FREE_EMAIL_DOMAINS_SOURCE` (`api_contracts` §11.8), que fija FU-11
 * (anti-abuso propio), todavía sin construir. Esta constante existe SOLO para
 * que el prototipo de FU-10 pueda demostrar la validación en el navegador
 * (criterio 2); el día que FU-11 exista, esta lista se sustituye por la
 * fuente editable real — no se amplía a mano aquí.
 */
export const DOMINIOS_DE_CORREO_GRATUITO_PROVISIONAL: ReadonlySet<string> = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "live.com",
  "yandex.com",
]);

export function esCorreoCorporativo(correo: string): boolean {
  const dominio = correo.split("@")[1]?.toLowerCase().trim();
  if (!dominio) return false;
  return !DOMINIOS_DE_CORREO_GRATUITO_PROVISIONAL.has(dominio);
}
