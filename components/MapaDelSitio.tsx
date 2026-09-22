import Link from "next/link";

import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { DESTINOS, DOCTRINA, EJES, RAMAS, SERVICIOS, rutaEnDeServicio, slugEnDeServicio } from "@/lib/content/rutas";
import { secciones } from "@/lib/content/secciones";

import { Markdown } from "./Markdown";
import { HeroTipografico } from "./piezas";

/**
 * «Empieza aquí» / «Start here»: el mapa del sitio en una página.
 *
 * **EL ÁRBOL SE GENERA DESDE LA ESTRUCTURA REAL, Y ESO ES LA DECISIÓN.** Los
 * nodos salen de `DESTINOS`, `EJES`, `RAMAS` y `SERVICIOS` —la misma tabla que
 * dibuja la barra y que `check:paginas` compara con el Anexo A.2— y cada línea
 * de explicación sale del `title`/`description` del registro de contenido. No
 * hay una segunda lista escrita a mano que se pueda desincronizar de la
 * primera: añadir un servicio es añadir su fila a la tabla de rutas y su `.md`,
 * y el mapa lo recoge solo.
 *
 * **EL ÁRBOL CRECE DE IZQUIERDA A DERECHA** (Ricardo, 2026-09-21). La raíz a la
 * izquierda; a su derecha, los destinos apilados; y cada nivel se abre hacia la
 * derecha con un conector. Antes era un árbol vertical con cuatro columnas, y
 * como solo una tenía descendencia, tres quedaban vacías y la cuarta era un
 * pozo. Y **las tres líneas cuelgan de `VoltAi by SLG`**, que es donde están en
 * la oferta: antes eran hermanas del eje.
 *
 * ES UN COMPONENTE DE SERVIDOR: CSS puro con conectores (`app/mapa.css`), sin
 * JavaScript de cliente, sin librerías y sin nada animado. Un mapa que se mueve
 * no se lee de un vistazo.
 *
 * NI UNA CADENA DE TEXTO ESCRITA AQUÍ (RF-16): las tres etiquetas propias del
 * mapa viven en `content/ui`, y `check:cadenas` vigila también este archivo. La
 * frase que acompaña a un servicio («para Directores») es su `tagline`, en el
 * registro del servicio: es oferta, no interfaz.
 *
 * El servicio cuyo registro no exista todavía se salta, como en el índice de
 * rama (DU-04, criterio 5), y el resto del mapa se sirve igual.
 */

type Nodo = { nombre: string; linea: string; href: string; nota?: string };
type Rama = Nodo & { hijos: Rama[] };

/** Los slugs de los registros de página, por idioma. */
const SLUGS = {
  es: { servicios: "servicios", ai: "ai", doctrina: "doctrina", nosotros: "nosotros" },
  en: { servicios: "services", ai: "ai", doctrina: "doctrine", nosotros: "about" },
} as const;

/** Descargas y Contacto: accesos transversales, con la ruta del pie. */
const TRANSVERSALES = {
  es: [
    { slug: "descargas", href: "/descargas" },
    { slug: "contacto", href: "/contacto" },
  ],
  en: [
    { slug: "downloads", href: "/en/downloads" },
    { slug: "contact", href: "/en/contact" },
  ],
} as const;

export function MapaDelSitio({ slug, lang }: { slug: string; lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const paginas = loadCollection<{ title: string; description: string }>("page", lang);
  const servicios = loadCollection<{ name: string; tagline?: string }>("service", lang);
  const S = SLUGS[lang];

  const pagina = (s: string) => paginas.find((p) => p.slug === s);
  const nodoDePagina = (s: string, href: string, nombrePorDefecto: string): Nodo => {
    const p = pagina(s);
    return { nombre: p?.data.title ?? nombrePorDefecto, linea: p?.data.description ?? "", href };
  };
  const primeraLinea = (cuerpo: string) => secciones(cuerpo)[0]?.cuerpo.split("\n")[0] ?? "";

  const esta = pagina(slug);

  // La raíz enlaza a Servicios, la casa comercial: el mapa ES esta página.
  const raiz: Nodo = {
    nombre: t["mapa.root"],
    linea: pagina(S.servicios)?.data.description ?? "",
    href: DESTINOS[1][lang],
  };

  /** Las tres líneas, cada una con sus servicios y la frase de cada uno. */
  const lineas: Rama[] = RAMAS.map((r) => {
    const hijos = SERVICIOS.filter((s) => s.rama === r.slug)
      .map((s): Rama | null => {
        const registro = servicios.find(
          (x) => x.slug === (lang === "en" ? slugEnDeServicio(s) : s.slug),
        );
        if (!registro) return null;
        return {
          nombre: registro.data.name,
          linea: "",
          nota: registro.data.tagline,
          href: lang === "en" ? rutaEnDeServicio(s) : s.es,
          hijos: [],
        };
      })
      .filter((h): h is Rama => h !== null);
    return { ...nodoDePagina(lang === "en" ? r.slugEn : r.slug, r[lang], r.slug), hijos };
  });

  const holdings = servicios.find(
    (x) => x.slug === (lang === "en" ? "slg-holdings-en" : "slg-holdings"),
  );

  /**
   * Los dos ejes cuelgan de la raíz: el de inteligencia artificial —con sus
   * tres líneas debajo, y los servicios debajo de cada línea— y Holdings.
   * Doctrina, Blog y Nosotros van al lado. «Empieza aquí» no aparece como nodo:
   * es esta página.
   *
   * **SERVICIOS NO ES UN NODO, Y NO ES UN OLVIDO** (Ricardo, 2026-09-21). Lo
   * era, entre la raíz y los dos ejes, y decía **exactamente la misma frase que
   * la raíz**: las dos leían la `description` del registro `servicios`, porque
   * la raíz enlaza ahí —el mapa ES la portada, y la casa comercial vive en
   * `/servicios`—. Un nodo que repite a su padre no ordena nada; se retira y
   * los dos ejes suben un nivel, que es donde el lector los buscaba. La página
   * sigue existiendo y sigue siendo el destino de la raíz.
   */
  const voltai: Rama = { ...nodoDePagina(S.ai, EJES.voltai[lang], t["nav.services"]), hijos: lineas };
  const holdingsNodo: Rama = {
    nombre: holdings?.data.name ?? "",
    linea: holdings ? primeraLinea(holdings.body) : "",
    href: EJES.holdings[lang],
    hijos: [],
  };
  const destinos: Rama[] = [
    voltai,
    holdingsNodo,
    { ...nodoDePagina(S.doctrina, DOCTRINA[lang], t["footer.doctrine"]), hijos: [] },
    { nombre: t["nav.blog"], linea: t["blog.metaDescription"], href: DESTINOS[2][lang], hijos: [] },
    { ...nodoDePagina(S.nosotros, DESTINOS[3][lang], t["nav.about"]), hijos: [] },
  ];

  const transversales = TRANSVERSALES[lang].map((x) => nodoDePagina(x.slug, x.href, x.slug));

  return (
    <div className="slg-mapa" lang={lang}>
      <HeroTipografico titular={esta?.data.title ?? ""} apoyo={esta?.data.description ?? ""} />
      <Markdown texto={esta?.body ?? ""} />

      <nav aria-label={t["mapa.aria"]} className="slg-mapa-arbol">
        <div className="slg-mapa-raiz-wrap">
          <Tarjeta nodo={raiz} clase="slg-mapa-raiz" />
        </div>
        <ul className="slg-mapa-lista slg-mapa-destinos">
          {destinos.map((d) => (
            <li key={d.href}>
              <Tarjeta nodo={d} />
              <Ramas ramas={d.hijos} nivel={1} />
            </li>
          ))}
        </ul>
      </nav>

      <section className="slg-mapa-transversal" aria-labelledby="mapa-transversal">
        <h2 id="mapa-transversal">{t["mapa.transversal"]}</h2>
        <ul>
          {transversales.map((n) => (
            <li key={n.href}>
              <Tarjeta nodo={n} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Un nivel del árbol, y los que cuelguen de él. `nivel` solo sirve al CSS para
 * graduar el tamaño: eje, línea y servicio se leen distinto sin que el código
 * sepa cuál es cuál.
 */
function Ramas({ ramas, nivel }: { ramas: Rama[]; nivel: number }) {
  if (ramas.length === 0) return null;
  return (
    <ul className={`slg-mapa-lista slg-mapa-nivel-${nivel}`}>
      {ramas.map((r) => (
        <li key={r.href}>
          <Link href={r.href} className="slg-mapa-rama">
            <span className="slg-mapa-nombre">{r.nombre}</span>
            {r.nota ? <span className="slg-mapa-nota">{r.nota}</span> : null}
            {r.linea ? <span className="slg-mapa-linea">{r.linea}</span> : null}
          </Link>
          <Ramas ramas={r.hijos} nivel={nivel + 1} />
        </li>
      ))}
    </ul>
  );
}

function Tarjeta({ nodo, clase }: { nodo: Nodo; clase?: string }) {
  return (
    <Link href={nodo.href} className={clase ? `slg-mapa-tarjeta ${clase}` : "slg-mapa-tarjeta"}>
      <span className="slg-mapa-nombre">{nodo.nombre}</span>
      {nodo.linea ? <span className="slg-mapa-linea">{nodo.linea}</span> : null}
    </Link>
  );
}
