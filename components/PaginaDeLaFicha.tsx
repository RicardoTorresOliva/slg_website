import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadCollection } from "@/lib/content/loader";
import { resolverRuta, rutasDeLaFicha, type DestinoDeLaFicha } from "@/lib/content/rutas";
import type { Lang } from "@/lib/content/schema";
import { secciones } from "@/lib/content/secciones";
import { metadatosDe, metadatosDePagina } from "@/lib/content/seo";
import { sitio } from "@/lib/sitio";

import { ArmazonPublico } from "./ArmazonPublico";
import { OverviewDeRama } from "./OverviewDeRama";
import { PaginaDeServicio } from "./PaginaDeServicio";
import { PaginaProvisional } from "./PaginaProvisional";
import { PuertaDeAI } from "./PuertaDeAI";

/**
 * Lo que sirven `app/(public)/[...ruta]` y `app/(public)/en/[...ruta]`: toda
 * ruta que declara la ficha del sitio (D-166).
 *
 * **POR QUÉ UNA RUTA COMODÍN Y NO CARPETAS.** La oferta del primer sitio vivía
 * en carpetas escritas a mano —una por eje, línea y servicio suelto, y su copia
 * bajo `en/`—: dieciocho archivos que decían dos veces lo que ya decía la tabla
 * de rutas, y que un cliente con otra oferta no podría usar sin reescribirlos.
 * Ahora la estructura la dice la ficha y una sola ruta la sirve entera: el
 * índice de un eje, el de una línea, la página de un servicio y cualquier
 * página suelta de `content/pages`.
 *
 * **LAS RUTAS FIJAS SIGUEN GANANDO, Y NO POR CONVENCIÓN.** Next resuelve un
 * segmento estático antes que uno dinámico, y uno dinámico antes que un
 * comodín: `/blog`, `/contacto`, `/descargas/[slug]`, `/legal/…` o `/en/about`
 * se sirven desde su carpeta aunque el comodín pudiera emparejarlos. Que la
 * ficha no declare una ruta que caiga bajo una de ellas lo comprueba
 * `check:sitio`: si la declarara, nunca se serviría.
 *
 * **`dynamicParams = false` EN LAS DOS PÁGINAS.** Solo existen las rutas que
 * `generateStaticParams` enumera desde la ficha; cualquier otra devuelve 404
 * y no una página vacía. Y todas se prerrenderizan: el sitio público sigue
 * siendo estático.
 */

/** Los parámetros de `[...ruta]` para un idioma: la ruta sin la barra ni el `/en`. */
export function parametrosDeLaFicha(lang: Lang): { ruta: string[] }[] {
  const prefijo = lang === "en" ? "/en/" : "/";
  return rutasDeLaFicha(lang).map((r) => ({ ruta: r.slice(prefijo.length).split("/") }));
}

/** La ruta pública a partir de los segmentos del comodín. */
export function rutaDeLosSegmentos(lang: Lang, segmentos: string[]): string {
  return `${lang === "en" ? "/en" : ""}/${segmentos.join("/")}`;
}

/** La primera línea de la PRIMERA sección del contrato A.3: para quién es esto. */
function resumenDeServicio(cuerpo: string): string {
  return secciones(cuerpo)[0]?.cuerpo.split("\n")[0] ?? "";
}

function registroDeServicio(d: Extract<DestinoDeLaFicha, { tipo: "servicio" }>) {
  const slug = d.lang === "en" ? d.servicio.slugEn : d.servicio.slug;
  return loadCollection<{ name: string }>("service", d.lang).find((r) => r.slug === slug);
}

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export function metadatosDeLaFicha(ruta: string): Metadata {
  const d = resolverRuta(ruta);
  if (!d) return {};
  switch (d.tipo) {
    case "eje":
      return metadatosDePagina(d.lang === "en" ? d.eje.slugEn : d.eje.slug, d.lang, ruta);
    case "linea":
      return metadatosDePagina(d.lang === "en" ? d.linea.slugEn : d.linea.slug, d.lang, ruta);
    case "servicio": {
      // La descripción sale de la PRIMERA sección del contrato A.3 —«para quién
      // y qué problema»—, que es exactamente lo que un resultado de búsqueda
      // tiene que decir: para quién es esto.
      const registro = registroDeServicio(d);
      return metadatosDe({
        ruta,
        titulo: registro?.data.name ?? sitio.marca.nombre,
        descripcion: resumenDeServicio(registro?.body ?? ""),
      });
    }
    case "pagina": {
      const p = loadCollection<{ title: string; description: string }>("page", d.lang).find(
        (x) => x.slug === d.slug,
      );
      return metadatosDe({
        ruta,
        titulo: p?.data.title ?? sitio.marca.nombre,
        descripcion: p?.data.description ?? "",
      });
    }
  }
}

/**
 * La página. Un servicio suelto —`/formacion` en la demo— es **destino Y página de
 * servicio**: lo sirve su registro de `service`, con el contrato A.3, no uno de
 * `page`. Un segundo registro para la misma URL serían dos fuentes para un solo
 * texto.
 */
export function PaginaDeLaFicha({ ruta }: { ruta: string }) {
  const d = resolverRuta(ruta);
  if (!d) notFound();

  return <ArmazonPublico ruta={ruta}>{contenido(d, ruta)}</ArmazonPublico>;
}

function contenido(d: DestinoDeLaFicha, ruta: string) {
  switch (d.tipo) {
    case "eje":
      return <PuertaDeAI eje={d.eje} lang={d.lang} />;
    case "linea":
      return <OverviewDeRama slug={d.linea.slug} lang={d.lang} />;
    case "servicio":
      return (
        <PaginaDeServicio
          slug={d.lang === "en" ? d.servicio.slugEn : d.servicio.slug}
          lang={d.lang}
          ruta={ruta}
        />
      );
    case "pagina": {
      const page = loadCollection("page", d.lang).find((p) => p.slug === d.slug);
      if (!page) notFound();
      return <PaginaProvisional registro={page} lang={d.lang} />;
    }
  }
}
