/**
 * tipos.ts — La forma de `site.config.ts`, la ficha de un sitio (D-165).
 *
 * **UN SITIO ES UNA FICHA MÁS SU CONTENIDO.** Todo lo que cambia de un cliente a
 * otro y no es texto de `content/` vive en la ficha: la marca, el dominio, los
 * idiomas, qué funciones están encendidas y —lo caro— la estructura de la
 * oferta. El motor (`lib/`, `components/`, `app/`, los frenos) lee la ficha y no
 * nombra a ningún cliente. `slg_website` es el primer sitio que se describe así:
 * su ficha reproduce exactamente lo que antes estaba escrito a mano.
 *
 * **AQUÍ SOLO HAY TIPOS Y DATOS PLANOS**, sin funciones ni importaciones de
 * `next/*`: la ficha la leen tanto la aplicación como los guiones de `scripts/`
 * que Node ejecuta directamente, y la leerá el generador del intake. Lo que se
 * calcula a partir de ella vive en `lib/sitio/index.ts`.
 *
 * **LO QUE NO VA EN LA FICHA**: secretos y valores por entorno. La URL pública
 * sale de `NEXT_PUBLIC_SITE_URL` (`lib/content/sitio.ts`), porque staging,
 * vistas previas y producción la tienen distinta; aquí va solo el dominio de
 * producción declarado, que usan los frenos y la documentación.
 */

export type Idioma = "es" | "en";

/**
 * Un valor por idioma. `es` es obligatorio porque hoy el idioma principal del
 * motor es el español y vive en la raíz (`/`); `en` vive bajo `/en`. Un sitio
 * **solo en español** apaga `en` en `idiomas`; un sitio **solo en inglés** no
 * está soportado todavía (exigiría servir el inglés en la raíz).
 */
export type PorIdioma<T = string> = { readonly es: T; readonly en?: T };

/** Un color en hexadecimal: `#2878b4`. */
export type Hex = `#${string}`;

/** Un servicio de la oferta. Su texto es el registro `content/services/<idioma>/<slug>.md`. */
export type ServicioDeLaOferta = {
  /** Slug del registro en español. El inglés es `pagina.en`. */
  readonly slug: string;
  /** Slug de los registros de contenido en cada idioma. */
  readonly pagina: PorIdioma;
  /** Ruta pública en cada idioma. */
  readonly ruta: PorIdioma;
  /** Nombre literal —el mismo que el `name` del registro—; lo usan los frenos de nomenclatura. */
  readonly nombre: string;
  /** Foto de cabecera: `public/fotos/<foto>.webp`. Sin foto, la página va sin imagen. */
  readonly foto?: string;
};

/** Una línea agrupa servicios dentro de un eje y tiene su propia página de índice. */
export type LineaDeLaOferta = {
  readonly clave: string;
  readonly nombre: string;
  /** Slug del registro `content/pages/<idioma>/` con la descripción de la línea. */
  readonly pagina: PorIdioma;
  readonly ruta: PorIdioma;
  readonly foto?: string;
  readonly servicios: readonly ServicioDeLaOferta[];
};

/** Un eje es el nivel más alto de la oferta: una página de índice y sus líneas. */
export type EjeDeLaOferta = {
  readonly clave: string;
  readonly nombre: string;
  readonly pagina: PorIdioma;
  readonly ruta: PorIdioma;
  readonly foto?: string;
  readonly lineas: readonly LineaDeLaOferta[];
};

/**
 * La oferta completa. Dos formas de colgar un servicio: dentro de una línea de
 * un eje (`/ai/academy/phoenix-peex`) o **suelto**, al nivel de los ejes
 * (`/holdings`). Un cliente pequeño puede no tener ejes y solo servicios sueltos.
 */
export type Oferta = {
  readonly ejes: readonly EjeDeLaOferta[];
  readonly sueltos: readonly ServicioDeLaOferta[];
};

/**
 * Funciones que un sitio puede tener encendidas o apagadas. Apagada = sus rutas
 * no existen (404), no salen en el menú, en el mapa ni en el sitemap, y sus
 * frenos no se ejecutan.
 */
export type Modulos = {
  readonly blog: boolean;
  readonly descargas: boolean;
  readonly doctrina: boolean;
  readonly contacto: boolean;
  /** Portal de clientes (`/portal`) y su contraparte de operación (`/hq`). */
  readonly intranet: boolean;
  /** API v1 para agentes (`/api/v1`). Requiere `intranet`. */
  readonly api: boolean;
  /**
   * Entrega de capturas a un CRM externo. Apagado: cada captura se avisa por
   * correo al buzón del cliente y no se intenta ninguna entrega (paso 5b).
   */
  readonly crm: boolean;
  /** Analítica autoalojada (Umami). Encendida solo carga si están sus variables. */
  readonly analitica: boolean;
};

export type Marca = {
  /** Nombre público: títulos, `siteName`, correos. */
  readonly nombre: string;
  /** Razón social, para el JSON-LD y los legales. */
  readonly razonSocial: string;
  /** Frase corta: descripción por defecto del sitio. */
  readonly lema: string;
  /** Correo público de contacto (JSON-LD, legales). No es el remitente. */
  readonly correoPublico: string;
  /** Logotipo completo, ruta dentro de `public/`. */
  readonly logo: string;
  /** Isotipo (la marca sin texto), ruta dentro de `public/`. */
  readonly isotipo: string;
  /** Nombre del remitente de los correos si falta `MAIL_FROM_NAME`. */
  readonly remitente: string;
  /**
   * Los colores de marca. Son las variables `--slg-*` de `app/tokens.css`:
   * la ficha manda y el CSS las recibe.
   */
  readonly colores: {
    readonly primario: Hex;
    readonly profundo: Hex;
    readonly acento: Hex;
    readonly tinte: Hex;
    readonly secundario: Hex;
    readonly alerta: Hex;
    readonly tinta: Hex;
    readonly linea: Hex;
    readonly papel: Hex;
  };
};

/** Un destino del menú principal: su etiqueta es una clave de `content/ui`. */
export type DestinoDelMenu = { readonly clave: string; readonly ruta: PorIdioma };

/** Una regla de nomenclatura: el patrón prohibido y cómo se dice bien. */
export type VarianteProhibida = { readonly pattern: RegExp; readonly correct: string; readonly why: string };

/** Una regla de contenido que no es un nombre (p. ej. «Destrucción», no «Disrupción»). */
export type ReglaDeContenido = { readonly pattern: RegExp; readonly why: string };

export type FichaDelSitio = {
  readonly marca: Marca;
  readonly dominio: {
    /** Dominio de producción, con esquema. Solo documentación y frenos: la app usa `NEXT_PUBLIC_SITE_URL`. */
    readonly produccion: string;
    /** Enlaces externos que la oferta cita (p. ej. otra web del cliente). */
    readonly enlaces: Readonly<Record<string, string>>;
  };
  readonly idiomas: { readonly principal: "es"; readonly adicionales: readonly Idioma[] };
  readonly modulos: Modulos;
  readonly menu: readonly DestinoDelMenu[];
  readonly oferta: Oferta;
  /**
   * Fotos de las páginas fijas (fuera de la oferta), por clave de página:
   * `servicios`, `doctrina`, `nosotros`, `descargas`, `blog`, `contacto`.
   */
  readonly fotos: Readonly<Record<string, string>>;
  /**
   * Bloques de la página de Servicios, en orden (RF-09). Los que dependen de un
   * módulo apagado se omiten solos.
   */
  readonly bloquesDeServicios: readonly string[];
  readonly nomenclatura: {
    /** Nombres que se escriben siempre igual. Vacío es válido. */
    readonly literales: readonly string[];
    readonly variantesProhibidas: readonly VarianteProhibida[];
    readonly reglasDeContenido: readonly ReglaDeContenido[];
  };
};
