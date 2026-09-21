/**
 * origen.ts — **El origen separado del visor** (DU-19 · D-45 · RF-90 · RNF-21).
 *
 * EL SUBDOMINIO ES `visor.softlandingglobal.com`, y con esto queda fijado el
 * `[PENDIENTE]` que D-45 dejó abierto para M4. Se llama así y no
 * `entregables.` ni `docs.` por una razón concreta: **nombra el mecanismo, no
 * el contenido**. El día que por ahí se sirva algo que no es un entregable —un
 * informe nativo de `SLG_Readiness`, por ejemplo, que §5.3 deja «previsto»— un
 * subdominio llamado `entregables.` obligaría a elegir entre un nombre que
 * miente o una migración de URLs.
 *
 * POR QUÉ HAY UN ORIGEN SEPARADO Y NO BASTA EL `sandbox`. Parte de los
 * entregables HTML los generan **agentes Hermes**. Servido desde el dominio de
 * la aplicación, un script hostil dentro de uno de esos HTML **comparte origen
 * con la sesión del cliente**: puede leer `document.cookie`, puede llamar a la
 * API con las credenciales del navegador, puede leer el `localStorage`. Desde
 * un subdominio propio no puede, y no porque nosotros lo impidamos: porque **el
 * navegador lo aísla por política de origen**, que es una garantía del
 * navegador y no una configuración nuestra.
 *
 * El `iframe sandbox` sin `allow-same-origin` y la CSP estricta **se
 * mantienen**, y no como alternativa: como defensa en profundidad. Con solo
 * `sandbox`, la protección depende de que una configuración esté bien puesta
 * siempre; con origen separado, sigue en pie aunque esa configuración falle.
 *
 * SI LA VARIABLE NO ESTÁ, EL VISOR NO SIRVE HTML. No cae a servirlo desde el
 * mismo origen «mientras tanto»: ese repliegue es exactamente el fallo que D-45
 * prohíbe, y un repliegue silencioso a la opción insegura es peor que no tener
 * la función. Se enseña un estado de error que dice qué falta.
 */

/** El host del visor, o `null` si no está configurado. */
import { createHmac, timingSafeEqual } from "node:crypto";

export function origenDelVisor(): string | null {
  const v = process.env.DELIVERABLE_VIEWER_ORIGIN?.trim();
  if (!v) return null;
  try {
    return new URL(v).origin;
  } catch {
    return null;
  }
}

/** El host de la aplicación, para poder compararlos. */
export function origenDeLaApp(): string | null {
  const v = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!v) return null;
  try {
    return new URL(v).origin;
  } catch {
    return null;
  }
}

/**
 * ¿Está el visor **de verdad** en otro origen?
 *
 * Esta es la comprobación que el criterio 2 pide con todas las letras: «el
 * origen separado **se verifica como tal, no se da por hecho**». Configurar la
 * variable con el mismo dominio de la aplicación dejaría todo compilando,
 * todos los `sandbox` puestos… y el aislamiento evaporado.
 */
export function visorEstaSeparado(): boolean {
  const visor = origenDelVisor();
  const app = origenDeLaApp();
  return Boolean(visor && app && visor !== app);
}

/* ══════════════════════════════════════════════════════════════════════════
 * El vale del visor — corrige el hallazgo C-3 de la revisión independiente
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * **EL PROBLEMA QUE ESTO RESUELVE, DICHO SIN ADORNOS.** El visor vive en un
 * origen **sin sesión**: el navegador no le manda las cookies de la aplicación,
 * y esa es exactamente su razón de ser. Pero la primera versión construía la URL
 * con el identificador **y nada más**, así que cualquiera que conociera ese
 * identificador leía el entregable **de cualquier empresa**, sin entrar. El
 * identificador es un UUID —no adivinable— pero era un **secreto permanente**
 * que viajaba en el `src` de un `iframe` y acababa en historiales, capturas de
 * pantalla y registros de proxy. Sin caducidad y sin forma de revocarlo.
 *
 * La respuesta no puede ser «comprobar la empresa en el visor», porque ahí no
 * hay quién. La respuesta es que **quien sí tiene sesión firme un vale**: la
 * pantalla del portal ya comprobó la empresa, la visibilidad y el rol, y emite
 * un permiso **con caducidad** para ese entregable concreto. El visor no
 * autoriza: **verifica**.
 *
 * Firma HMAC-SHA256 sobre `<id>.<caducidad>.<ámbito>`, comparada en tiempo
 * constante. La caducidad va **dentro de lo firmado**: sin ella, un vale
 * capturado vale para siempre. Y el ámbito también, por lo que dice el tipo de
 * abajo.
 */
const SECRETO = () => process.env.DELIVERABLE_VIEWER_SECRET ?? "";

/**
 * **DESDE DÓNDE SE EMITIÓ EL VALE**, y por qué esto tenía que existir.
 *
 * Un `html` con visibilidad `internal` —el tablero que un agente Hermes publica
 * para SLG— no se abría en el visor desde ninguna parte: la función de la base
 * servía solo `client`, y con razón, porque en un origen sin sesión no hay a
 * quién preguntarle el rol. El aviso de «esto no se puede abrir» estaba en
 * `/hq/entregables`, o sea en la pantalla de la gente que sí podía verlo.
 *
 * El ámbito arregla eso **sin mover la línea que separa al cliente de lo
 * interno**: no lo declara quien llama a la base, lo declara **la pantalla que
 * tenía sesión** cuando firmó el vale, y viaja dentro del HMAC. El portal firma
 * `cliente` y no tiene forma de firmar otra cosa; HQ firma `hq` sobre lo que
 * `entregables()` le devolvió, que ya viene acotado por la política de fila y
 * por la asignación del operador. Reescribir la letra en la URL rompe la firma.
 *
 * Son dos valores y no un booleano a propósito: `a=hq` en una URL se lee, y un
 * `true` suelto en una firma no se sabe de qué era.
 */
export type AmbitoDelVale = "cliente" | "hq";

/** Cuánto vale un vale. El mismo TTL que la URL firmada del objeto (RNF-20). */
function minutosDeVida(): number {
  const crudo = Number(process.env.SIGNED_URL_TTL_DELIVERABLE_MINUTES ?? "15");
  return Number.isFinite(crudo) && crudo > 0 ? crudo : 15;
}

function firmar(deliverableId: string, caduca: number, ambito: AmbitoDelVale): string {
  return createHmac("sha256", SECRETO())
    .update(`${deliverableId}.${caduca}.${ambito}`)
    .digest("hex");
}

/**
 * Traduce lo que llega en la URL a un ámbito, o `null` si no es ninguno.
 *
 * Existe para que la ruta **no tenga que decidir**: un parámetro ausente no se
 * interpreta como «será del portal» —eso convertiría un vale de HQ mutilado en
 * un vale de cliente— y un valor inventado no cae en la rama estrecha por
 * casualidad, sino que no es un ámbito y no hay vale que verificar.
 */
export function ambitoDeLaPeticion(crudo: string | null): AmbitoDelVale | null {
  return crudo === "cliente" || crudo === "hq" ? crudo : null;
}

/**
 * ¿Es válido este vale para este entregable **y para este ámbito**? **Falla
 * cerrado**: sin secreto configurado no hay vale que valga, y el visor no sirve
 * nada. Es preferible un visor que no funciona a un visor que sirve entregables
 * de cliente a quien conozca un identificador.
 *
 * El ámbito es un argumento obligatorio, no uno con valor por defecto: un vale
 * que se verifica «como sea» es el vale que deja pasar un `internal` a quien
 * traía un permiso de portal.
 */
export function valeValido(
  deliverableId: string,
  caduca: string | null,
  firma: string | null,
  ambito: AmbitoDelVale,
): boolean {
  if (!SECRETO() || !caduca || !firma) return false;
  const instante = Number(caduca);
  if (!Number.isFinite(instante) || instante <= Date.now()) return false;
  const esperada = Buffer.from(firmar(deliverableId, instante, ambito));
  const dada = Buffer.from(firma);
  if (esperada.length !== dada.length) return false;
  return timingSafeEqual(esperada, dada);
}

/**
 * La URL del documento dentro del visor, **con su vale**.
 *
 * Devuelve `null` si no hay origen separado o si falta el secreto: una URL sin
 * vale sería la de antes, y esa es la que había que retirar.
 *
 * **El ámbito lo pone quien llama, y quien llama es una pantalla con sesión.**
 * El portal pasa `"cliente"` sobre lo que `entregablesDelCliente()` le dio —que
 * nunca incluye un `internal`—; HQ pasa `"hq"` sobre lo que `entregables()` le
 * dio, ya acotado por la política de fila y por la asignación del operador. No
 * hay valor por defecto: elegir por omisión es la clase de decisión que después
 * nadie recuerda haber tomado.
 */
export function urlDelVisor(deliverableId: string, ambito: AmbitoDelVale): string | null {
  const base = origenDelVisor();
  if (!base || !visorEstaSeparado() || !SECRETO()) return null;
  const caduca = Date.now() + minutosDeVida() * 60_000;
  const parametros = new URLSearchParams({
    c: String(caduca),
    f: firmar(deliverableId, caduca, ambito),
    a: ambito,
  });
  return `${base}/visor/${encodeURIComponent(deliverableId)}?${parametros.toString()}`;
}

/**
 * La CSP del documento servido por el visor.
 *
 * **`default-src 'none'`**: ni scripts, ni imágenes de fuera, ni tipografías,
 * ni peticiones. Un entregable HTML es un documento, no una aplicación, y todo
 * lo que necesite de fuera es una vía para exfiltrar.
 *
 * `frame-ancestors` deja que **solo la aplicación** lo enmarque: sin eso,
 * cualquier web podría meter el visor en un iframe y montar un clickjacking
 * sobre el contenido de un cliente.
 */
export function politicaDelVisor(): string {
  const app = origenDeLaApp();
  return [
    "default-src 'none'",
    // Los estilos en línea del propio documento: un entregable sin estilos es
    // ilegible, y `style-src` no ejecuta código.
    "style-src 'unsafe-inline'",
    // Imágenes incrustadas en el propio documento, nunca de fuera.
    "img-src data:",
    "script-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    `frame-ancestors ${app ?? "'none'"}`,
    "sandbox allow-popups",
  ].join("; ");
}
