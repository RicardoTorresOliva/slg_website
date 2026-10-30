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

import { sitio } from "../sitio/index.ts";
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

/** La imagen de marca de Open Graph por defecto, servida desde nuestro dominio. */
const IMAGEN_OG = "/og.png";

/**
 * La vista previa propia de las páginas que se comparten en LinkedIn: imagen,
 * título, descripción y texto alternativo por ruta e idioma. Solo cambia lo que
 * leen las redes (`og:*`, `twitter:*`); el `<title>` y la `description` de la
 * página siguen saliendo de su contenido. Título ≤ 60 y descripción ≤ 150
 * caracteres, para que LinkedIn no los corte.
 *
 * `VERSION_OG` va en la URL de la imagen: LinkedIn guarda la miniatura por URL,
 * así que cambiar una imagen sin cambiar la versión no se ve nunca.
 */
const VERSION_OG = "2026-10-30";

type VistaPrevia = { imagen: string; titulo: string; descripcion: string; alt: string };

const EMPIEZA_AQUI: VistaPrevia = {
  imagen: "/og/start-here-es.png",
  titulo: "SLG Agency · Transformación de negocio AI-first, Human-first",
  descripcion:
    "Diseñamos, construimos y desplegamos estructuras para el escenario de negocios que crea la IA. Primero criterio, después construcción.",
  alt: "SLG Agency: primero criterio, después construcción",
};

const START_HERE: VistaPrevia = {
  imagen: "/og/start-here-en.png",
  titulo: "SLG Agency · AI-first, Human-first business transformation",
  descripcion:
    "We design, build and deploy structures for the business landscape that AI creates. Judgment first, then we build.",
  alt: "SLG Agency: judgment first, then we build",
};

const OG_POR_RUTA: Record<string, VistaPrevia> = {
  "/": EMPIEZA_AQUI,
  "/empieza-aqui": EMPIEZA_AQUI,
  "/en": START_HERE,
  "/en/start-here": START_HERE,
  "/ai/academy/phoenix-peex": {
    imagen: "/og/phoenix-peex-es.png",
    titulo: "Phoenix PEEx · Programa de IA para directores",
    descripcion:
      "Para directores que deben decidir sobre IA sin depender de quien la vende: qué preguntar, qué exigir, qué no comprar y cómo saber si funciona.",
    alt: "Phoenix PEEx, programa de IA para directores",
  },
  "/en/ai/academy/phoenix-peex": {
    imagen: "/og/phoenix-peex-en.png",
    titulo: "Phoenix PEEx · AI program for directors",
    descripcion:
      "For directors who must decide on AI without relying on whoever sells it: what to ask, what to demand, what not to buy, and how to know it works.",
    alt: "Phoenix PEEx, AI program for directors",
  },
  "/ai/academy/phoenix-teax": {
    imagen: "/og/phoenix-teax-es.png",
    titulo: "Phoenix TEAx · Programa de IA para la alta gerencia",
    descripcion:
      "Para la alta gerencia que recibe la decisión del directorio y debe convertirla en operación. Un equipo gerencial que decide con los mismos criterios.",
    alt: "Phoenix TEAx, programa de IA para la alta gerencia",
  },
  "/en/ai/academy/phoenix-teax": {
    imagen: "/og/phoenix-teax-en.png",
    titulo: "Phoenix TEAx · AI program for senior management",
    descripcion:
      "For senior management teams that receive the board's AI decision and must turn it into operations. One leadership team, one shared set of criteria.",
    alt: "Phoenix TEAx, AI program for senior management",
  },
  "/ai/enterprise/readiness": {
    imagen: "/og/readiness-es.png",
    titulo: "SLG_Readiness · Diagnóstico de preparación para la IA",
    descripcion:
      "Antes de invertir, sabe dónde está tu empresa frente a la IA: once dimensiones, evidencia en cada una y prioridades defendibles ante el directorio.",
    alt: "SLG_Readiness, diagnóstico de preparación para la IA en 11 dimensiones",
  },
  "/en/ai/enterprise/readiness": {
    imagen: "/og/readiness-en.png",
    titulo: "SLG_Readiness · AI readiness diagnostic",
    descripcion:
      "Before you invest, know where your company really stands on AI: eleven dimensions, evidence for each, and priorities you can defend to the board.",
    alt: "SLG_Readiness, 11-dimension AI readiness diagnostic",
  },
  "/ai/enterprise/implement": {
    imagen: "/og/implement-es.png",
    titulo: "SLG_Implement · Implementación de IA por fases",
    descripcion:
      "Cuando el piloto funcionó y el despliegue no avanza: implementación por fases sobre tu stack, con compuertas de aprobación tuyas y sin lock-in.",
    alt: "SLG_Implement, implementación de IA por fases",
  },
  "/en/ai/enterprise/implement": {
    imagen: "/og/implement-en.png",
    titulo: "SLG_Implement · Phased AI implementation",
    descripcion:
      "When the pilot worked and the rollout is stuck: phased implementation on your stack, with your approval gates and no lock-in.",
    alt: "SLG_Implement, phased AI implementation",
  },
};

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
  // pestañas estrechas se ve el principio, y la marca repetida diez veces no
  // distingue nada.
  const marca = sitio.marca.nombre;
  const tituloCompleto = ruta === "/" || ruta === "/en" ? marca : `${titulo} · ${marca}`;

  const propia = OG_POR_RUTA[ruta];
  const tituloSocial = propia?.titulo ?? tituloCompleto;
  const descripcionSocial = propia?.descripcion ?? descripcion;
  const imagen = propia
    ? { url: `${base}${propia.imagen}?v=${VERSION_OG}`, alt: propia.alt }
    : { url: `${base}${IMAGEN_OG}`, alt: marca };

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
      siteName: marca,
      title: tituloSocial,
      description: descripcionSocial,
      url: `${base}${ruta}`,
      locale: lang === "en" ? "en_US" : "es_ES",
      images: [{ ...imagen, width: 1200, height: 627, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: tituloSocial,
      description: descripcionSocial,
      images: [imagen],
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
    titulo: p?.data.title ?? sitio.marca.nombre,
    descripcion: p?.data.description ?? "",
  });
}

/**
 * `schema.org` de la organización. **Solo hechos verificables**: nombre, tipo,
 * sitio y correo. El nombre es la **razón social** de la ficha, no la marca
 * pública: es la entidad que responde por el sitio. Sin número de empleados, sin fundación, sin valoraciones:
 * los datos estructurados son afirmaciones legibles por máquina, y RF-11 no
 * distingue entre una cifra en una página y una en un `<script type="ld+json">`.
 */
export function organizacionJsonLd() {
  const base = baseDelSitio();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: sitio.marca.razonSocial,
    url: base,
    logo: `${base}${IMAGEN_OG}`,
    email: sitio.marca.correoPublico,
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
    provider: { "@type": "Organization", name: sitio.marca.razonSocial, url: base },
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
  "mapa",
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
