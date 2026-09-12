import { loadCollection } from "../content/loader.ts";

/**
 * Mapa de rutas públicas — la fuente única de qué URL existe y cuál es su par
 * en el otro idioma (DU-02, criterios 2 y 3 · RF-03, RF-04).
 *
 * Por qué existe un mapa y no una regla de prefijo: **el slug cambia entre
 * idiomas** en varias rutas (`/doctrina` → `/en/doctrine`, `/nosotros` →
 * `/en/about`, `/descargas` → `/en/downloads`, `/blog/etiqueta` →
 * `/en/blog/tag`). Anteponer `/en` a la ruta actual daría 404 en todas ellas,
 * y el criterio 2 exige llegar a ESA misma página, nunca a la portada.
 *
 * Las rutas de servicio NO se enumeran aquí: se derivan de
 * `content/services/**`. Es lo que hace cierta la promesa de RF-27 — añadir un
 * servicio es añadir su registro de contenido, no tocar código. Lo que sí es
 * código es el esqueleto de ramas y líneas (`/ai`, `/ai/academy`…), que es
 * estructura de la oferta, no un dato que se añada a diario.
 */

export type Locale = "es" | "en";

export type ParDeRutas = { readonly es: string; readonly en: string };

/**
 * Rutas estructurales, en el orden del árbol de `ui_wireframes` §1.3.
 *
 * Las claves de las siete primeras son el **slug del registro `page` en
 * español**: así una página sabe cuál es su URL sin guardarla en su propio
 * frontmatter (que la duplicaría y la dejaría desincronizarse).
 */
export const RUTAS_ESTRUCTURALES = {
  home: { es: "/", en: "/en" },
  "slg-ai": { es: "/ai", en: "/en/ai" },
  "slg-academy": { es: "/ai/academy", en: "/en/ai/academy" },
  "slg-enterprise": { es: "/ai/enterprise", en: "/en/ai/enterprise" },
  "slg-factory": { es: "/ai/factory", en: "/en/ai/factory" },
  doctrina: { es: "/doctrina", en: "/en/doctrine" },
  nosotros: { es: "/nosotros", en: "/en/about" },

  blog: { es: "/blog", en: "/en/blog" },
  blogEtiqueta: { es: "/blog/etiqueta", en: "/en/blog/tag" },
  blogRss: { es: "/blog/rss.xml", en: "/en/blog/rss.xml" },
  descargas: { es: "/descargas", en: "/en/downloads" },
  gracias: { es: "/gracias", en: "/en/thank-you" },
  contacto: { es: "/contacto", en: "/en/contact" },
  legalPrivacidad: { es: "/legal/privacidad", en: "/en/legal/privacy" },
  legalTerminos: { es: "/legal/terminos", en: "/en/legal/terms" },

  /** Ruta de sistema: no es entrada de A.2 ni aparece en el menú de cinco. */
  acceder: { es: "/acceder", en: "/en/sign-in" },
} as const satisfies Record<string, ParDeRutas>;

export type NombreDeRuta = keyof typeof RUTAS_ESTRUCTURALES;

export function ruta(nombre: NombreDeRuta, locale: Locale): string {
  return RUTAS_ESTRUCTURALES[nombre][locale];
}

/**
 * El idioma se deduce **solo de la ruta pedida** (RF-03, criterio 3): nada de
 * `Accept-Language`. Si alguien pide `/en/ai`, recibe inglés aunque su
 * navegador diga español, y al revés — una redirección automática por idioma
 * rompería enlaces compartidos, que es justo lo que una campaña no puede
 * permitirse.
 */
export function localeDeRuta(pathname: string): Locale {
  const p = normalizar(pathname);
  return p === "/en" || p.startsWith("/en/") ? "en" : "es";
}

/** Quita la barra final (salvo en la raíz) y la query, si llegara alguna. */
function normalizar(pathname: string): string {
  const sinQuery = pathname.split("?")[0].split("#")[0];
  if (sinQuery.length > 1 && sinQuery.endsWith("/")) return sinQuery.slice(0, -1);
  return sinQuery || "/";
}

/**
 * Rutas de servicio, derivadas del contenido (RF-27).
 *
 * El **segmento de URL de un servicio es el mismo en los dos idiomas**
 * (`ui_wireframes` §1.3: `/ai/factory/app-building` y
 * `/en/ai/factory/app-building`), aunque el slug del registro EN lleve sufijo
 * `-en` para no chocar con el ES. Por eso el segmento se toma siempre del
 * registro español: es el canónico, y el EN llega a él por su `pair`.
 */
function rutasDeServicio(): ParDeRutas[] {
  const servicios = loadCollection<{ parent: string | null }>("service", "es");

  return servicios.map((servicio) => {
    const padre = servicio.data.parent;
    if (padre === null) {
      // Caso legítimo y hoy real: `SLG_Holdings` es una rama, no cuelga de
      // ningún overview — vive en la raíz (`/holdings`).
      return { es: `/${servicio.slug}`, en: `/en/${servicio.slug}` };
    }

    const base = RUTAS_ESTRUCTURALES[padre as NombreDeRuta];
    if (!base) {
      throw new Error(
        `${servicio.file}: 'parent: ${padre}' no corresponde a ninguna ruta estructural. ` +
          `Si es una línea nueva, añádela a RUTAS_ESTRUCTURALES en lib/routes/map.ts; ` +
          `si es una errata, corrige el frontmatter.`,
      );
    }
    return { es: `${base.es}/${servicio.slug}`, en: `${base.en}/${servicio.slug}` };
  });
}

/** Par de un registro de contenido, por su slug. `null` cuando no lo tiene. */
function parDeRegistro(
  coleccion: "post" | "download",
  locale: Locale,
  slug: string,
): string | null {
  const registro = loadCollection<{ pair: string | null }>(coleccion, locale).find(
    (r) => r.slug === slug,
  );
  return registro ? (registro.data.pair ?? null) : null;
}

/**
 * La misma página en el otro idioma, o `null` si no la hay.
 *
 * `null` **no es un fallo**: un `post` puede existir solo en un idioma (A.5,
 * RF-26, única excepción de paridad). Quien renderice decide qué mostrar —
 * `NavBar` y `Footer` degradan a un indicador inerte con explicación, nunca a
 * un enlace que lleve a la portada. Llevar a la portada sería peor que no
 * ofrecer nada: promete una traducción que no existe.
 */
export function rutaAlterna(pathname: string): string | null {
  const actual = normalizar(pathname);
  const locale = localeDeRuta(actual);
  const otro: Locale = locale === "es" ? "en" : "es";

  for (const par of Object.values(RUTAS_ESTRUCTURALES)) {
    if (par[locale] === actual) return par[otro];
  }

  for (const par of rutasDeServicio()) {
    if (par[locale] === actual) return par[otro];
  }

  // Etiquetas del blog: la etiqueta en sí **no se traduce** (es un dato del
  // frontmatter del artículo, no una cadena de interfaz), solo el segmento.
  const etiqueta = RUTAS_ESTRUCTURALES.blogEtiqueta;
  if (actual.startsWith(`${etiqueta[locale]}/`)) {
    return `${etiqueta[otro]}/${actual.slice(etiqueta[locale].length + 1)}`;
  }

  const conParDeContenido = [
    { base: RUTAS_ESTRUCTURALES.blog, coleccion: "post" as const },
    { base: RUTAS_ESTRUCTURALES.descargas, coleccion: "download" as const },
  ];
  for (const { base, coleccion } of conParDeContenido) {
    if (actual.startsWith(`${base[locale]}/`)) {
      const slug = actual.slice(base[locale].length + 1);
      const par = parDeRegistro(coleccion, locale, slug);
      return par ? `${base[otro]}/${par}` : null;
    }
  }

  return null;
}

/**
 * Lleva una ruta a su forma canónica en español, venga en el idioma que venga.
 *
 * Existe porque el contenido **no es consistente**: unos registros ingleses
 * escriben la ruta canónica española (`→ /ai/academy`) y otros la inglesa ya
 * resuelta (`→ /en/ai/academy`). Las dos formas son razonables de escribir a
 * mano, y ninguna es incorrecta; lo que no puede es depender de cuál usó quien
 * redactó el archivo. Normalizar aquí hace que dé igual.
 */
export function canonicalizarRuta(href: string): string {
  return localeDeRuta(href) === "en" ? (rutaAlterna(href) ?? href) : href;
}

/** La ruta que corresponde a `href` en `locale`, sea cual sea el idioma en que venga escrita. */
export function localizarRuta(href: string, locale: Locale): string {
  const canonica = canonicalizarRuta(href);
  if (locale === "es") return canonica;
  return rutaAlterna(canonica) ?? canonica;
}

export type DestinoDeNav = { href: string; label: string; activo?: boolean };

/**
 * Los **cinco** destinos del menú, más nada (RF-01, criterio 1).
 *
 * No hay entrada "Inicio/Home": el logo lleva a Home. Y no hay ni puede haber
 * enlace a `/hq` ni `/portal` mientras M3 y M4 sigan abiertos (RF-87,
 * criterio 5) — no es que estén ocultos por CSS: no existen en esta lista.
 */
export function navPrincipal(
  locale: Locale,
  pathnameActual: string,
  strings: Record<string, string>,
): DestinoDeNav[] {
  const actual = normalizar(pathnameActual);
  const holdings = locale === "es" ? "/holdings" : "/en/holdings";

  const destinos: { href: string; clave: string }[] = [
    { href: ruta("slg-ai", locale), clave: "nav.ai" },
    { href: holdings, clave: "nav.holdings" },
    { href: ruta("doctrina", locale), clave: "nav.doctrine" },
    { href: ruta("blog", locale), clave: "nav.blog" },
    { href: ruta("nosotros", locale), clave: "nav.about" },
  ];

  return destinos.map(({ href, clave }) => ({
    href,
    label: strings[clave],
    activo: actual === href || actual.startsWith(`${href}/`),
  }));
}
