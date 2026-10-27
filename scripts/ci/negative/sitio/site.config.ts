/**
 * Prueba negativa de `check:sitio` (R-26): una ficha rota a propósito, contra el
 * contenido real del repositorio.
 *
 * Cada fallo es uno de los que el freno promete ver:
 *
 *   · un servicio sin registro de contenido (`no-existe`);
 *   · un servicio colgado de una línea que no es la de su registro (el primer
 *     servicio de la ficha REAL bajo «Otra línea»: su `branch` dice otra cosa);
 *   · una foto que no está en `public/fotos/`;
 *   · dos servicios con el mismo slug y la misma ruta;
 *   · una ruta que cae bajo una carpeta fija de `app/` (`/blog/tapada`);
 *   · un destino del menú que no existe.
 *
 * El servicio con registro sale de la ficha real y no se escribe aquí: el caso
 * necesita un registro de contenido que EXISTA, y el contenido es de cada
 * sitio. Con un nombre fijo, el fixture solo valdría para el sitio de quien lo
 * escribió.
 *
 * Si el freno no se pone en rojo contra esto, no está midiendo nada.
 */
import { serviciosDeLaOferta } from "../../../../lib/sitio/index.ts";
import type { FichaDelSitio } from "../../../../lib/sitio/tipos.ts";

const real = serviciosDeLaOferta()[0];
if (!real) throw new Error("la prueba negativa de check:sitio necesita al menos un servicio en la ficha real");

export const sitio: FichaDelSitio = {
  marca: {
    nombre: "Marca de prueba",
    razonSocial: "Marca de prueba S.A.",
    lema: "Lema.",
    correoPublico: "hola@example.com",
    logo: "/marca/logo.webp",
    isotipo: "/marca/isotipo.svg",
    remitente: "Marca de prueba",
    colores: {
      primario: "#000000",
      profundo: "#000000",
      acento: "#000000",
      tinte: "#000000",
      secundario: "#000000",
      alerta: "#000000",
      tinta: "#000000",
      linea: "#000000",
      papel: "#ffffff",
    },
  },
  dominio: { produccion: "https://example.com", enlaces: {} },
  idiomas: { principal: "es", adicionales: [] },
  modulos: {
    blog: true,
    descargas: true,
    doctrina: true,
    contacto: true,
    intranet: true,
    api: true,
    crm: false,
    analitica: false,
  },
  menu: [
    { clave: "nav.start", ruta: { es: "/" } },
    { clave: "nav.services", ruta: { es: "/no-hay-tal-pagina" } },
  ],
  oferta: {
    ejes: [
      {
        clave: "eje",
        nombre: "Eje",
        pagina: { es: "eje" },
        ruta: { es: "/eje" },
        lineas: [
          {
            clave: "otra",
            nombre: "Otra línea",
            pagina: { es: "otra-linea" },
            ruta: { es: "/eje/otra" },
            foto: "foto-inexistente",
            servicios: [
              { slug: real.slug, nombre: real.nombre, pagina: { es: real.pagina.es }, ruta: { es: "/eje/otra/real" } },
              { slug: "no-existe", nombre: "No existe", pagina: { es: "no-existe" }, ruta: { es: "/eje/otra/no-existe" } },
              { slug: "repetido", nombre: "Repetido", pagina: { es: "repetido" }, ruta: { es: "/blog/tapada" } },
              { slug: "repetido", nombre: "Repetido", pagina: { es: "repetido" }, ruta: { es: "/blog/tapada" } },
            ],
          },
        ],
      },
    ],
    sueltos: [],
  },
  fotos: {},
  bloquesDeServicios: ["puertas", "lineas"],
  nomenclatura: { literales: [], variantesProhibidas: [], reglasDeContenido: [], prohibidasEnPublico: [] },
};
