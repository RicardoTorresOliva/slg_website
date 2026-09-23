/**
 * site.config.ts — La ficha de ESTE sitio: «Cliente Demo», el ejemplo con el
 * que arranca la plantilla (D-165).
 *
 * Todo lo que distingue a un sitio de otro y no es texto de `content/` está
 * aquí; la forma está en `lib/sitio/tipos.ts` y lo que se deriva de ella, en
 * `lib/sitio/index.ts`. Para un cliente nuevo se reescribe este archivo —a
 * mano o desde su formulario de intake (`commands/leer-intake.md`)— y el motor
 * no se toca.
 *
 * **CLIENTE DEMO NO EXISTE.** Es una consultora inventada, con la oferta más
 * pequeña que todavía ejercita toda la estructura del motor: un eje con una
 * línea de dos servicios, y un servicio suelto al nivel de los ejes. Si un
 * cambio del motor rompe algo de esa estructura, lo rompe aquí primero, y los
 * frenos lo ven antes que ningún cliente. Por eso, al copiar la plantilla, se
 * reescribe la ficha entera: no se «ajusta» la de la demo.
 *
 * Los módulos están elegidos para demostrar los dos modos que más cuestan de
 * ver: **sin doctrina** (un módulo apagado desaparece entero, rutas incluidas)
 * y **sin CRM** (cada captura se avisa por correo al buzón del cliente).
 */
import type { FichaDelSitio, ServicioDeLaOferta } from "./lib/sitio/tipos.ts";

/**
 * Un servicio de la oferta. Los cuatro datos van explícitos —sin derivar el
 * inglés del español— porque las rutas inglesas de la demo están en inglés
 * (`/en/consulting/…`), y eso es lo que un cliente bilingüe suele pedir.
 */
const servicio = (
  slug: string,
  nombre: string,
  pagina: { es: string; en: string },
  ruta: { es: string; en: string },
): ServicioDeLaOferta => ({ slug, nombre, pagina, ruta });

export const sitio: FichaDelSitio = {
  marca: {
    nombre: "Cliente Demo",
    razonSocial: "Cliente Demo S.A.C.",
    lema: "Decisiones claras para empresas que crecen.",
    correoPublico: "hola@demo.example.com",
    logo: "/marca/logo-cliente-demo.svg",
    isotipo: "/marca/isotipo-cliente-demo.svg",
    remitente: "Cliente Demo",
    // Una paleta neutra, pizarra y salvia. Las cifras son el contraste contra
    // el blanco; `check:contraste` mide además los pares cruzados y exige que
    // el acento y el tinte NO sirvan como texto sobre papel (son de fondo).
    colores: {
      primario: "#3a5a6c", //   7,4:1 — enlaces y acciones
      profundo: "#1e2b33", //  14,5:1 — titulares y franjas oscuras
      acento: "#a8c5bd", //     1,8:1 — realce y texto sobre fondo oscuro, nunca texto sobre papel
      tinte: "#94a9b5", //      2,4:1 — solo fondos y filetes
      secundario: "#2f4150", // 10,5:1 — franjas alternativas
      alerta: "#9e3a2c", //     6,8:1 — el botón de descarga y los avisos
      tinta: "#15191d", //     17,7:1 — texto de cuerpo
      linea: "#cfd4d8",
      papel: "#ffffff",
    },
  },

  dominio: {
    produccion: "https://demo.example.com",
    // Sin destinos externos: la demo no enlaza ninguna otra web propia. Un
    // cliente que la tenga la declara aquí y la cita desde una línea con
    // `enlaceExterno` (ver `lib/sitio/tipos.ts`).
    enlaces: {},
  },

  idiomas: { principal: "es", adicionales: ["en"] },

  modulos: {
    blog: true,
    descargas: true,
    // La doctrina es la página de posición de un sitio concreto; la demo la
    // apaga para enseñar que un módulo apagado no deja rastro: ni ruta, ni
    // enlace en el pie, ni bloque en Servicios.
    doctrina: false,
    contacto: true,
    intranet: true,
    api: true,
    // Sin CRM: cada captura llega por correo a `MAIL_LEADS_TO` (paso 5b).
    crm: false,
    analitica: false,
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
        clave: "consultoria",
        nombre: "Consultoría",
        pagina: { es: "consultoria", en: "consulting" },
        ruta: { es: "/consultoria", en: "/en/consulting" },
        lineas: [
          {
            clave: "estrategia",
            nombre: "Estrategia",
            pagina: { es: "estrategia", en: "strategy" },
            ruta: { es: "/consultoria/estrategia", en: "/en/consulting/strategy" },
            servicios: [
              servicio(
                "diagnostico",
                "Diagnóstico",
                { es: "diagnostico", en: "diagnosis" },
                { es: "/consultoria/estrategia/diagnostico", en: "/en/consulting/strategy/diagnosis" },
              ),
              servicio(
                "plan-de-crecimiento",
                "Plan de crecimiento",
                { es: "plan-de-crecimiento", en: "growth-plan" },
                { es: "/consultoria/estrategia/plan-de-crecimiento", en: "/en/consulting/strategy/growth-plan" },
              ),
            ],
          },
        ],
      },
    ],
    // Un servicio suelto: cuelga al nivel de los ejes y su regreso es Servicios.
    sueltos: [
      servicio(
        "formacion",
        "Formación a equipos",
        { es: "formacion", en: "team-training" },
        { es: "/formacion", en: "/en/training" },
      ),
    ],
  },

  // La demo va sin fotografías: el campo es opcional y una página sin foto se
  // sirve sin imagen. Un cliente con fotos las deja en `public/fotos/<clave>.webp`
  // y las nombra aquí (páginas del motor) o en `foto` de su eje, línea o servicio.
  fotos: {},

  bloquesDeServicios: [
    "puertas",
    "lineas",
    // El servicio suelto, desarrollado debajo de los ejes y con su propio enlace.
    { id: "formacion", suelto: "formacion", etiqueta: "home.seeHoldings" },
    "articulos",
    "descarga",
  ],

  nomenclatura: {
    // Los nombres de la oferta se escriben siempre igual, también en inglés:
    // en `/en` se lee «Diagnóstico», no «Diagnosis». Si un cliente quiere un
    // nombre por idioma, es una decisión de intake, no un ajuste de texto.
    literales: ["Consultoría", "Estrategia", "Diagnóstico", "Plan de crecimiento", "Formación a equipos"],
    variantesProhibidas: [
      // EJEMPLOS. Cada cliente trae los suyos: nombres antiguos de un servicio,
      // capitalizaciones que su marca no admite, traducciones que no quiere.
      // `check:nomenclature` los busca en todo `content/`, incluida la interfaz.
      { pattern: /\bPlan\s+de\s+Crecimiento\b/g, correct: "Plan de crecimiento", why: "ejemplo: solo la primera palabra va en mayúscula" },
      { pattern: /\bgrowth\s+plan\b/gi, correct: "Plan de crecimiento", why: "ejemplo: los nombres de la oferta no se traducen" },
    ],
    reglasDeContenido: [
      // EJEMPLO de regla que no es un nombre: una fórmula que el cliente no
      // quiere ver publicada, aunque no sea falsa.
      { pattern: /\bconsultor[ií]a\s+integral\b/gi, why: "ejemplo: fórmula genérica que el cliente pidió no usar" },
    ],
    prohibidasEnPublico: [
      // La Sesión Cero es del portal: la capa pública no la ofrece (RF-96).
      { pattern: /sesi[oó]n\s+cero/gi, why: "«Sesión Cero» en texto público (RF-96)" },
      { pattern: /zero\s+session/gi, why: "«Zero Session» en texto público (RF-96)" },
    ],
  },
};
