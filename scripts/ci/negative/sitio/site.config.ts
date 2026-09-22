/**
 * Prueba negativa de `check:sitio` (R-26): una ficha rota a propósito, contra el
 * contenido real del repositorio.
 *
 * Cada fallo es uno de los que el freno promete ver:
 *
 *   · un servicio sin registro de contenido (`no-existe`);
 *   · un servicio colgado de una línea que no es la de su registro
 *     (`phoenix-peex` bajo «Otra línea»: su `branch` dice otra cosa);
 *   · una foto que no está en `public/fotos/`;
 *   · dos servicios con el mismo slug y la misma ruta;
 *   · una ruta que cae bajo una carpeta fija de `app/` (`/blog/tapada`);
 *   · un destino del menú que no existe.
 *
 * Si el freno no se pone en rojo contra esto, no está midiendo nada.
 */
import type { FichaDelSitio } from "../../../../lib/sitio/tipos.ts";

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
        pagina: { es: "ai" },
        ruta: { es: "/eje" },
        lineas: [
          {
            clave: "otra",
            nombre: "Otra línea",
            pagina: { es: "slg-academy" },
            ruta: { es: "/eje/otra" },
            foto: "foto-inexistente",
            servicios: [
              { slug: "phoenix-peex", nombre: "Phoenix PEEx", pagina: { es: "phoenix-peex" }, ruta: { es: "/eje/otra/peex" } },
              { slug: "no-existe", nombre: "No existe", pagina: { es: "no-existe" }, ruta: { es: "/eje/otra/no-existe" } },
              { slug: "readiness", nombre: "SLG_Readiness", pagina: { es: "readiness" }, ruta: { es: "/blog/tapada" } },
              { slug: "readiness", nombre: "SLG_Readiness", pagina: { es: "readiness" }, ruta: { es: "/blog/tapada" } },
            ],
          },
        ],
      },
    ],
    sueltos: [],
  },
  fotos: {},
  bloquesDeServicios: ["puertas", "lineas"],
  nomenclatura: { literales: [], variantesProhibidas: [], reglasDeContenido: [] },
};
