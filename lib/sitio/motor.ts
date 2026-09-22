/**
 * motor.ts — Las rutas que pone el MOTOR, y de qué función depende cada una.
 *
 * **DOS CLASES DE RUTA, Y ESTE ARCHIVO ES LA FRONTERA ENTRE ELLAS.** La oferta
 * —ejes, líneas, servicios— la declara la ficha de cada sitio y la resuelve
 * `app/(public)/[...ruta]`. Todo lo demás —la portada, Servicios, el blog, la
 * doctrina, las descargas, contacto, los legales, el acceso— son páginas del
 * motor: tienen carpeta propia en `app/`, el mismo nombre en todos los sitios y
 * no las decide ningún cliente. Aquí se listan una vez, con su par de idioma, el
 * registro de `content/pages` que las describe y el módulo del que dependen.
 *
 * **POR QUÉ UNA TABLA DE PREFIJOS Y NO UN `notFound()` EN CADA CARPETA.** Un
 * módulo apagado tiene que desaparecer entero: sus páginas, sus manejadores de
 * ruta (`rss.xml`, `/api/contacto`, `/api/v1/**`) y su versión inglesa. Los
 * manejadores no pasan por ningún `layout`, así que la única puerta por la que
 * pasan todos es el middleware, y el middleware necesita una tabla que pueda
 * evaluar en el borde: datos planos, sin `node:fs`. Esta. Lo mismo vale para un
 * idioma apagado: sin inglés, nada bajo `/en` existe.
 *
 * Sin `next/*` ni nada que no pueda ejecutar Node ni el runtime del middleware.
 */
import { idiomaActivo, moduloActivo, sitio } from "./index.ts";
import type { BloqueDeServicios, Idioma, Modulos, PorIdioma } from "./tipos.ts";

type Modulo = keyof Modulos;

/** Una página fija del motor. */
export type PaginaDelMotor = {
  readonly ruta: { readonly es: string; readonly en: string };
  /** El registro de `content/pages` que la describe, si lo tiene. */
  readonly registro?: { readonly es: string; readonly en: string };
  /** Existe si CUALQUIERA de estos módulos está encendido. Sin lista, siempre. */
  readonly modulos?: readonly Modulo[];
};

export const PAGINAS_DEL_MOTOR = {
  /** La portada es el mapa del sitio («Empieza aquí»). */
  inicio: { ruta: { es: "/", en: "/en" }, registro: { es: "empieza-aqui", en: "start-here" } },
  /** La casa comercial: los bloques de `sitio.bloquesDeServicios`. */
  servicios: { ruta: { es: "/servicios", en: "/en/services" }, registro: { es: "servicios", en: "services" } },
  blog: { ruta: { es: "/blog", en: "/en/blog" }, modulos: ["blog"] },
  doctrina: {
    ruta: { es: "/doctrina", en: "/en/doctrine" },
    registro: { es: "doctrina", en: "doctrine" },
    modulos: ["doctrina"],
  },
  nosotros: { ruta: { es: "/nosotros", en: "/en/about" }, registro: { es: "nosotros", en: "about" } },
  descargas: {
    ruta: { es: "/descargas", en: "/en/downloads" },
    registro: { es: "descargas", en: "downloads" },
    modulos: ["descargas"],
  },
  contacto: {
    ruta: { es: "/contacto", en: "/en/contact" },
    registro: { es: "contacto", en: "contact" },
    modulos: ["contacto"],
  },
  /** Recibe a quien acaba de escribir o de pedir un documento: vive si vive cualquiera de los dos. */
  gracias: {
    ruta: { es: "/gracias", en: "/en/thank-you" },
    registro: { es: "gracias", en: "thank-you" },
    modulos: ["contacto", "descargas"],
  },
  /**
   * Los legales son públicos y sin sesión **por obligación externa**: las
   * pantallas de consentimiento de Google y de Entra ID exigen una URL de
   * privacidad que responda sin sesión (F.2-1, R-13).
   */
  legalPrivacidad: {
    ruta: { es: "/legal/privacidad", en: "/en/legal/privacy" },
    registro: { es: "legal-privacidad", en: "legal-privacy" },
  },
  legalTerminos: {
    ruta: { es: "/legal/terminos", en: "/en/legal/terms" },
    registro: { es: "legal-terminos", en: "legal-terms" },
  },
  acceder: { ruta: { es: "/acceder", en: "/en/sign-in" }, modulos: ["intranet"] },
  recuperar: { ruta: { es: "/recuperar", en: "/en/recover" }, modulos: ["intranet"] },
} as const satisfies Record<string, PaginaDelMotor>;

export type ClaveDelMotor = keyof typeof PAGINAS_DEL_MOTOR;

/**
 * Los prefijos de ruta de cada módulo, además de sus páginas: los manejadores
 * de ruta y las superficies que no tienen par de idioma. Una ruta es de un
 * módulo si es el prefijo o cuelga de él.
 */
const PREFIJOS_DE_MODULO: ReadonlyArray<{ prefijo: string; modulos: readonly Modulo[] }> = [
  ...Object.values(PAGINAS_DEL_MOTOR as Record<string, PaginaDelMotor>).flatMap((p) =>
    p.modulos ? [{ prefijo: p.ruta.es, modulos: p.modulos }, { prefijo: p.ruta.en, modulos: p.modulos }] : [],
  ),
  { prefijo: "/api/descargas", modulos: ["descargas"] },
  { prefijo: "/api/contacto", modulos: ["contacto"] },
  // La intranet: sus dos superficies, el acceso y el visor de entregables.
  { prefijo: "/hq", modulos: ["intranet"] },
  { prefijo: "/portal", modulos: ["intranet"] },
  { prefijo: "/restablecer", modulos: ["intranet"] },
  { prefijo: "/invitacion", modulos: ["intranet"] },
  { prefijo: "/visor", modulos: ["intranet"] },
  { prefijo: "/api/acceso", modulos: ["intranet"] },
  { prefijo: "/api/auth", modulos: ["intranet"] },
];

/** La API v1 opera sobre la intranet: sin intranet no hay nada que exponer. */
const PREFIJO_API = "/api/v1";

const cuelga = (ruta: string, prefijo: string) =>
  prefijo === "/" ? ruta === "/" : ruta === prefijo || ruta.startsWith(`${prefijo}/`);

/**
 * ¿Existe esta ruta en ESTE sitio? `false` si es de un idioma apagado o de un
 * módulo apagado. No dice si la ruta existe en `app/`: eso lo dice Next.
 */
export function rutaDisponible(ruta: string): boolean {
  if (!idiomaActivo("en") && cuelga(ruta, "/en")) return false;
  if (cuelga(ruta, PREFIJO_API)) return moduloActivo("api") && moduloActivo("intranet");
  for (const { prefijo, modulos } of PREFIJOS_DE_MODULO) {
    if (cuelga(ruta, prefijo) && !modulos.some(moduloActivo)) return false;
  }
  return true;
}

/** ¿Existe esta página del motor en este sitio? */
export function paginaDelMotorActiva(clave: ClaveDelMotor): boolean {
  const p: PaginaDelMotor = PAGINAS_DEL_MOTOR[clave];
  return !p.modulos || p.modulos.some(moduloActivo);
}

/**
 * Los bloques de la página de Servicios que dependen de un módulo. Apagado el
 * módulo, el bloque no se pinta y `check:paginas` no lo espera.
 */
const MODULO_DEL_BLOQUE: Partial<Record<string, Modulo>> = {
  doctrina: "doctrina",
  articulos: "blog",
  descarga: "descargas",
};

/** Los bloques de Servicios que se pintan en este sitio, en el orden de la ficha. */
export function bloquesDeServiciosActivos(): readonly BloqueDeServicios[] {
  return sitio.bloquesDeServicios.filter((b) => {
    const modulo = typeof b === "string" ? MODULO_DEL_BLOQUE[b] : undefined;
    return !modulo || moduloActivo(modulo);
  });
}

/** Los idiomas que sirve este sitio, el principal primero. */
export function idiomasActivos(): readonly Idioma[] {
  return [sitio.idiomas.principal, ...sitio.idiomas.adicionales.filter((i) => i !== sitio.idiomas.principal)];
}

/**
 * El valor de un `PorIdioma` en un idioma. `""` si la ficha no lo declara: solo
 * pasa en un idioma apagado, que no tiene rutas, y `check:sitio` exige el valor
 * en todo idioma encendido.
 */
export function enIdioma(valor: PorIdioma, idioma: Idioma): string {
  return valor[idioma] ?? "";
}
