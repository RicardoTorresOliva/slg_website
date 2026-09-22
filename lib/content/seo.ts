/**
 * seo.ts — Metadatos, `canonical` y `hreflang` para cada ruta pública.
 *
 * **Una función, un sitio.** Cada página llama a `metadatosDe()` con su ruta y
 * recibe título, descripción, Open Graph, `canonical` propio y los `hreflang`
 * recíprocos. Repartir esto por 58 rutas garantiza que a la tercera alguien
 * olvide el `canonical` — y un `canonical` olvidado apunta a otra página.
 *
 * **`hreflang` RECÍPROCO** (RF-05, gate D4): si `/ai` declara que su versión en
 * inglés es `/en/ai`, `/en/ai` tiene que declarar que la española es `/ai`. Un
 * par que no se corresponde hace que los buscadores ignoren los dos.
 * `x-default` apunta al español, que es la raíz del sitio (§10-5).
 */
import type { Metadata } from "next";

import { loadCollection } from "./loader.ts";
import { idiomaActivo } from "../sitio/index.ts";
import { PAGINAS_DEL_MOTOR, rutaDisponible, type ClaveDelMotor } from "../sitio/motor.ts";
import {
  DESCARGAS,
  EJES,
  idiomaDeLaRuta,
  RAMAS,
  rutaEnDeServicio,
  rutaEnElOtroIdioma,
  rutasDeLaFicha,
  resolverRuta,
  SERVICIOS,
} from "./rutas.ts";
import type { Lang } from "./schema.ts";
import { baseDelSitio } from "./sitio.ts";

/** La imagen de marca de Open Graph. Una sola, servida desde nuestro dominio. */
const IMAGEN_OG = "/og.png";

export function metadatosDe({
  ruta,
  titulo,
  descripcion,
}: {
  ruta: string;
  titulo: string;
  descripcion: string;
}): Metadata {
  const base = baseDelSitio();
  const lang = idiomaDeLaRuta(ruta);
  const otra = rutaEnElOtroIdioma(ruta);

  // El título de la pestaña lleva la marca detrás, no delante: en una lista de
  // pestañas estrechas se ve el principio, y «SLG Agency» repetido diez veces
  // no distingue nada.
  const tituloCompleto = ruta === "/" || ruta === "/en" ? "SLG Agency" : `${titulo} · SLG Agency`;

  const idiomas: Record<string, string> = { "x-default": `${base}/` };
  idiomas[lang === "en" ? "en" : "es"] = `${base}${ruta}`;
  if (otra) idiomas[lang === "en" ? "es" : "en"] = `${base}${otra}`;

  return {
    title: tituloCompleto,
    description: descripcion,
    alternates: {
      canonical: `${base}${ruta}`,
      // Un sitio de un solo idioma no declara `hreflang`: no hay pareja que
      // anunciar, y un `x-default` sin alternativas no le dice nada a nadie.
      ...(idiomaActivo("en") ? { languages: idiomas } : {}),
    },
    openGraph: {
      type: "website",
      siteName: "SLG Agency",
      title: tituloCompleto,
      description: descripcion,
      url: `${base}${ruta}`,
      locale: lang === "en" ? "en_US" : "es_ES",
      images: [{ url: `${base}${IMAGEN_OG}`, width: 1200, height: 630, alt: "SLG Agency" }],
    },
    twitter: {
      card: "summary_large_image",
      title: tituloCompleto,
      description: descripcion,
      images: [`${base}${IMAGEN_OG}`],
    },
  };
}

/** Los metadatos de una página de la colección `page`, por su slug. */
export function metadatosDePagina(slug: string, lang: Lang, ruta: string): Metadata {
  const p = loadCollection<{ title: string; description: string }>("page", lang).find(
    (x) => x.slug === slug,
  );
  return metadatosDe({
    ruta,
    titulo: p?.data.title ?? "SLG Agency",
    descripcion: p?.data.description ?? "",
  });
}

/**
 * `schema.org` de la organización. **Solo hechos verificables**: nombre, tipo,
 * sitio y correo. Sin número de empleados, sin fundación, sin valoraciones:
 * los datos estructurados son afirmaciones legibles por máquina, y RF-11 no
 * distingue entre una cifra en una página y una en un `<script type="ld+json">`.
 */
export function organizacionJsonLd() {
  const base = baseDelSitio();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SLG Agency Inc.",
    url: base,
    logo: `${base}${IMAGEN_OG}`,
    email: "support@softlandingglobal.com",
    address: { "@type": "PostalAddress", addressRegion: "FL", addressCountry: "US" },
  };
}

/** `schema.org` de un servicio, con su proveedor. */
export function servicioJsonLd({
  nombre,
  descripcion,
  ruta,
}: {
  nombre: string;
  descripcion: string;
  ruta: string;
}) {
  const base = baseDelSitio();
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: nombre,
    description: descripcion,
    url: `${base}${ruta}`,
    provider: { "@type": "Organization", name: "SLG Agency Inc.", url: base },
  };
}

/**
 * Las páginas del motor que entran en el sitemap, en este orden. Quedan fuera
 * `gracias` —recibe a quien acaba de enviar algo; indexarla no sirve a nadie—
 * y el acceso, que es del grupo `(auth)` y no se indexa nunca (§2.3).
 */
const DEL_MOTOR_EN_EL_SITEMAP: readonly ClaveDelMotor[] = [
  "doctrina",
  "nosotros",
  "blog",
  "descargas",
  "contacto",
  "servicios",
  "legalPrivacidad",
  "legalTerminos",
];

/**
 * Todas las rutas públicas indexables, para el `sitemap.xml`: la portada, los
 * índices de la oferta, las páginas del motor, los servicios, las páginas
 * sueltas de la ficha y los documentos. Cada una seguida de su par.
 */
export function rutasDelSitemap(): string[] {
  const par = (r: { es: string; en: string }) => [r.es, r.en].filter(Boolean);

  const fijas = [
    ...par(PAGINAS_DEL_MOTOR.inicio.ruta),
    ...EJES.flatMap(par),
    ...RAMAS.flatMap(par),
    ...DEL_MOTOR_EN_EL_SITEMAP.flatMap((c) => par(PAGINAS_DEL_MOTOR[c].ruta)),
  ];
  const servicios = SERVICIOS.flatMap((s) => [s.es, rutaEnDeServicio(s)].filter(Boolean));
  const sueltas = (["es", "en"] as const).flatMap((lang) =>
    rutasDeLaFicha(lang).filter((r) => resolverRuta(r)?.tipo === "pagina"),
  );

  // Las páginas de documento, en los dos idiomas. Los `draft` no entran: no
  // tienen ruta, y un sitemap que las nombre manda al buscador a un 404.
  const documentos = (["es", "en"] as const).flatMap((lang) =>
    loadCollection<{ status: string }>("download", lang)
      .filter((d) => d.data.status !== "draft")
      .map((d) => `${DESCARGAS[lang]}/${d.slug}`),
  );

  // Lo de un idioma o un módulo apagado responde 404: no se anuncia.
  return [...fijas, ...servicios, ...sueltas, ...documentos].filter(rutaDisponible);
}
