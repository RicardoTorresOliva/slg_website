/**
 * site.config.ts — La ficha de ESTE sitio: SLG Agency (D-165).
 *
 * Todo lo que distingue a un sitio de otro y no es texto de `content/` está
 * aquí; la forma está en `lib/sitio/tipos.ts` y lo que se deriva de ella, en
 * `lib/sitio/index.ts`. Para un cliente nuevo se reescribe este archivo —a
 * mano o desde su formulario de intake— y el motor no se toca.
 *
 * **ESTA FICHA REPRODUCE EXACTAMENTE LO QUE ANTES ESTABA ESCRITO A MANO** en
 * `lib/content/rutas.ts`, `lib/content/nomenclature.ts`, `lib/content/schema.ts`,
 * `components/Fotografia.tsx`, `app/tokens.css` y los frenos. Pasar a la ficha
 * no puede cambiar ni un byte de lo que `softlandingglobal.com` sirve: los
 * frenos que miden el HTML servido (`check:paginas`, `check:seo`,
 * `check:armazon`, `check:produccion`) son la prueba.
 */
import type { FichaDelSitio, ServicioDeLaOferta } from "./lib/sitio/tipos.ts";

/** Un servicio con las convenciones del sitio: inglés en `/en…` y registro `<slug>-en`. */
const servicio = (slug: string, nombre: string, ruta: string, foto?: string): ServicioDeLaOferta => ({
  slug,
  nombre,
  pagina: { es: slug, en: `${slug}-en` },
  ruta: { es: ruta, en: `/en${ruta}` },
  foto,
});

export const sitio: FichaDelSitio = {
  marca: {
    nombre: "SLG Agency",
    razonSocial: "SLG Agency Inc.",
    lema: "Precision with Purpose.",
    correoPublico: "support@softlandingglobal.com",
    logo: "/marca/logo-softlanding-global.webp",
    isotipo: "/marca/isotipo-slg.svg",
    remitente: "SLG Agency",
    colores: {
      primario: "#2878b4",
      profundo: "#24394d",
      acento: "#50b4dc",
      tinte: "#78b4dc",
      secundario: "#282878",
      alerta: "#dc141e",
      tinta: "#0a0a14",
      linea: "#c8ccd3",
      papel: "#ffffff",
    },
  },

  dominio: {
    produccion: "https://softlandingglobal.com",
    enlaces: {
      /** La Academy anterior, en otro proyecto (frontera (e)): se enlaza como externa. */
      academiaExterna: "https://academy.softlandingglobal.com",
    },
  },

  idiomas: { principal: "es", adicionales: ["en"] },

  modulos: {
    blog: true,
    descargas: true,
    doctrina: true,
    contacto: true,
    intranet: true,
    api: true,
    crm: true,
    analitica: true,
  },

  menu: [
    { clave: "nav.start", ruta: { es: "/", en: "/en" } },
    { clave: "nav.services", ruta: { es: "/servicios", en: "/en/services" } },
    { clave: "nav.blog", ruta: { es: "/blog", en: "/en/blog" } },
    { clave: "nav.about", ruta: { es: "/nosotros", en: "/en/about" } },
  ],

  oferta: {
    ejes: [
      {
        clave: "voltai",
        nombre: "VoltAi by SLG",
        pagina: { es: "ai", en: "ai" },
        ruta: { es: "/ai", en: "/en/ai" },
        foto: "ai",
        lineas: [
          {
            clave: "slg-academy",
            nombre: "VoltAi Academy",
            pagina: { es: "slg-academy", en: "slg-academy-en" },
            ruta: { es: "/ai/academy", en: "/en/ai/academy" },
            foto: "academy",
            // La Academy anterior, en otro proyecto (frontera (e)).
            enlaceExterno: { enlace: "academiaExterna", etiqueta: "overview.phoenixAcademy" },
            servicios: [
              servicio("phoenix-peex", "Phoenix PEEx", "/ai/academy/phoenix-peex", "phoenix-peex"),
              servicio("phoenix-teax", "Phoenix TEAx", "/ai/academy/phoenix-teax", "phoenix-teax"),
              servicio("phoenix-retx", "Phoenix RETx", "/ai/academy/phoenix-retx", "phoenix-retx"),
              servicio("customize-programs", "Customize Programs", "/ai/academy/customize-programs", "customize-programs"),
              servicio("ai-coaching", "AI Coaching for Directors", "/ai/academy/ai-coaching", "ai-coaching"),
            ],
          },
          {
            clave: "slg-enterprise",
            nombre: "VoltAi Enterprise",
            pagina: { es: "slg-enterprise", en: "slg-enterprise-en" },
            ruta: { es: "/ai/enterprise", en: "/en/ai/enterprise" },
            foto: "enterprise",
            servicios: [
              servicio("readiness", "SLG_Readiness", "/ai/enterprise/readiness", "readiness"),
              servicio("implement", "SLG_Implement", "/ai/enterprise/implement", "implement"),
            ],
          },
          {
            clave: "slg-factory",
            nombre: "VoltAi Factory",
            pagina: { es: "slg-factory", en: "slg-factory-en" },
            ruta: { es: "/ai/factory", en: "/en/ai/factory" },
            foto: "factory",
            servicios: [
              servicio("app-building", "APP_Building", "/ai/factory/app-building", "app-building"),
              servicio("age-building", "AGE_Building", "/ai/factory/age-building", "age-building"),
              servicio("coo-as-a-service", "CoO as a Service", "/ai/factory/coo-as-a-service", "coo-as-a-service"),
            ],
          },
        ],
      },
    ],
    sueltos: [servicio("slg-holdings", "Holdings by SLG", "/holdings", "holdings")],
  },

  fotos: {
    servicios: "home",
    doctrina: "doctrina",
    nosotros: "nosotros",
    descargas: "descargas",
    blog: "blog",
    contacto: "contacto",
  },

  bloquesDeServicios: [
    "puertas",
    "lineas",
    { id: "holdings", suelto: "slg-holdings", etiqueta: "home.seeHoldings" },
    "doctrina",
    "articulos",
    "descarga",
  ],

  nomenclatura: {
    literales: [
      "VoltAi by SLG",
      "Holdings by SLG",
      "VoltAi Academy",
      "VoltAi Enterprise",
      "VoltAi Factory",
      "SLG_Readiness",
      "SLG_Implement",
      "APP_Building",
      "AGE_Building",
      "CoO as a Service",
      "Phoenix PEEx",
      "Phoenix TEAx",
      "Phoenix RETx",
    ],
    variantesProhibidas: [
      // Nombres anteriores del eje y formas partidas.
      { pattern: /\bSLG\s+VoltAi\b/g, correct: "VoltAi by SLG", why: "nombre anterior sin guion bajo" },
      { pattern: /\bSLG-VoltAi\b/g, correct: "VoltAi by SLG", why: "nombre anterior con guion" },
      { pattern: /\bSLG_AI\b/g, correct: "VoltAi by SLG", why: "nombre anterior del eje (hasta 2026-09-17)" },
      { pattern: /\bSLG\s+AI\b/g, correct: "VoltAi by SLG", why: "nombre anterior del eje, además sin guion bajo" },
      { pattern: /\bSLG-AI\b/g, correct: "VoltAi by SLG", why: "nombre anterior del eje, además con guion" },
      { pattern: /\bSLG_VOLTAI\b/g, correct: "VoltAi by SLG", why: "capitalización alterada" },
      { pattern: /\bSLG_VoltAI\b/g, correct: "VoltAi by SLG", why: "capitalización alterada (la i final es minúscula)" },
      { pattern: /\bSLG_Voltai\b/g, correct: "VoltAi by SLG", why: "capitalización alterada" },
      { pattern: /\bSLG_voltai\b/g, correct: "VoltAi by SLG", why: "capitalización alterada" },
      { pattern: /\bVolt\s+Ai\b/gi, correct: "VoltAi by SLG", why: "espacio dentro del nombre" },
      { pattern: /\bSLG\s+Holdings\b/g, correct: "Holdings by SLG", why: "espacio en vez de guion bajo" },
      { pattern: /\bSLG\s+Academy\b/g, correct: "VoltAi Academy", why: "espacio en vez de guion bajo" },
      { pattern: /\bSLG\s+Enterprise\b/g, correct: "VoltAi Enterprise", why: "espacio en vez de guion bajo" },
      { pattern: /\bSLG\s+Factory\b/g, correct: "VoltAi Factory", why: "espacio en vez de guion bajo" },
      { pattern: /\bSLG\s+Readiness\b/g, correct: "SLG_Readiness", why: "espacio en vez de guion bajo" },
      { pattern: /\bSLG\s+Implement\b/g, correct: "SLG_Implement", why: "espacio en vez de guion bajo" },
      { pattern: /\bAPP\s+Building\b/g, correct: "APP_Building", why: "espacio en vez de guion bajo" },
      { pattern: /\bAGE\s+Building\b/g, correct: "AGE_Building", why: "espacio en vez de guion bajo" },
      // Traducciones: los nombres no se traducen.
      { pattern: /\bIA\s+SLG\b/g, correct: "VoltAi by SLG", why: "traducido al español" },
      { pattern: /\bSLG_IA\b/g, correct: "VoltAi by SLG", why: "traducido al español" },
      { pattern: /\bSLG_VoltIA\b/g, correct: "VoltAi by SLG", why: "traducido al español" },
      { pattern: /\bAcademia\s+SLG\b/gi, correct: "VoltAi Academy", why: "traducido al español" },
      { pattern: /\bFábrica\s+SLG\b/gi, correct: "VoltAi Factory", why: "traducido al español" },
      { pattern: /\bSLG_Fábrica\b/gi, correct: "VoltAi Factory", why: "traducido al español" },
      { pattern: /\bCoO\s+como\s+Servicio\b/gi, correct: "CoO as a Service", why: "traducido al español" },
      { pattern: /\bDirector\s+de\s+Operaciones\s+como\s+Servicio\b/gi, correct: "CoO as a Service", why: "traducido al español" },
      // Capitalización de la familia Phoenix.
      { pattern: /\bPhoenix\s+PEEX\b/g, correct: "Phoenix PEEx", why: "capitalización alterada" },
      { pattern: /\bPhoenix\s+Peex\b/g, correct: "Phoenix PEEx", why: "capitalización alterada" },
      { pattern: /\bPhoenix\s+TEAX\b/g, correct: "Phoenix TEAx", why: "capitalización alterada" },
      { pattern: /\bPhoenix\s+Teax\b/g, correct: "Phoenix TEAx", why: "capitalización alterada" },
      { pattern: /\bPhoenix\s+RETX\b/g, correct: "Phoenix RETx", why: "capitalización alterada" },
      { pattern: /\bPhoenix\s+Retx\b/g, correct: "Phoenix RETx", why: "capitalización alterada" },
    ],
    reglasDeContenido: [
      { pattern: /\bDisrupci[óo]n\s+Creativa\b/gi, why: "la «D» de DAL OS es «Destrucción Creativa», no «Disrupción Creativa»" },
      { pattern: /\bDAL\s+OS[^.\n]{0,40}\bDisrupci[óo]n\b/gi, why: "la «D» de DAL OS es «Destrucción Creativa»" },
      { pattern: /\bCreative\s+Disruption\b/gi, why: "la «D» de DAL OS es «Destrucción Creativa» / «Creative Destruction»" },
    ],
  },
};
