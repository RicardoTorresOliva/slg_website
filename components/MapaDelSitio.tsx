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
 * nodos salen de `DESTINOS`, `RAMAS` y `SERVICIOS` —la misma tabla que dibuja
 * la barra y que `check:paginas` compara con el Anexo A.2— y cada línea de
 * explicación sale del `title`/`description` del registro de contenido. No hay
 * una segunda lista escrita a mano que se pueda desincronizar de la primera:
 * añadir un servicio es añadir su fila a la tabla de rutas y su `.md`, y el
 * mapa lo recoge solo.
 *
 * ES UN COMPONENTE DE SERVIDOR: CSS puro con conectores (`app/mapa.css`), sin
 * JavaScript de cliente, sin librerías y sin nada animado. Un mapa que se mueve
 * no se lee de un vistazo.
 *
 * NI UNA CADENA DE TEXTO ESCRITA AQUÍ (RF-16): las tres etiquetas propias del
 * mapa viven en `content/ui`, y `check:cadenas` vigila también este archivo.
 *
 * Los servicios se enseñan por su nombre, sin línea: su registro no tiene
 * `description` —tiene seis secciones— y la línea de su rama ya dice qué hay
 * debajo. El servicio cuyo registro no exista todavía se salta, como en el
 * índice de rama (DU-04, criterio 5), y el resto del mapa se sirve igual.
 */

type Nodo = { nombre: string; linea: string; href: string };
type Hoja = { nombre: string; href: string };
type Rama = Nodo & { hijos: Hoja[] };

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
  const servicios = loadCollection<{ name: string }>("service", lang);
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

  const ramas: Rama[] = RAMAS.map((r) => {
    const hijos = SERVICIOS.filter((s) => s.rama === r.slug)
      .map((s) => {
        const registro = servicios.find(
          (x) => x.slug === (lang === "en" ? slugEnDeServicio(s) : s.slug),
        );
        if (!registro) return null;
        return { nombre: registro.data.name, href: lang === "en" ? rutaEnDeServicio(s) : s.es };
      })
      .filter((h): h is Hoja => h !== null);
    return { ...nodoDePagina(lang === "en" ? r.slugEn : r.slug, r[lang], r.slug), hijos };
  });

  const holdings = servicios.find(
    (x) => x.slug === (lang === "en" ? "slg-holdings-en" : "slg-holdings"),
  );

  /**
   * Bajo Servicios cuelgan los dos ejes: el de inteligencia artificial con sus
   * tres líneas y sus servicios, y Holdings. Doctrina, Blog y Nosotros van al
   * lado. «Empieza aquí» no aparece como nodo: es esta página.
   */
  const voltai: Rama = { ...nodoDePagina(S.ai, EJES.voltai[lang], t["nav.services"]), hijos: [] };
  const holdingsNodo: Rama = {
    nombre: holdings?.data.name ?? "",
    linea: holdings ? primeraLinea(holdings.body) : "",
    href: EJES.holdings[lang],
    hijos: [],
  };
  const destinos: Array<Nodo & { ramas?: Rama[] }> = [
    { ...nodoDePagina(S.servicios, DESTINOS[1][lang], t["nav.services"]), ramas: [voltai, ...ramas, holdingsNodo] },
    nodoDePagina(S.doctrina, DOCTRINA[lang], t["footer.doctrine"]),
    { nombre: t["nav.blog"], linea: t["blog.metaDescription"], href: DESTINOS[2][lang] },
    nodoDePagina(S.nosotros, DESTINOS[3][lang], t["nav.about"]),
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
        <ul className="slg-mapa-hijos">
          {destinos.map((d) => (
            <li key={d.href} className={d.ramas ? "slg-mapa-ancho" : undefined}>
              <Tarjeta nodo={d} />
              {d.ramas ? (
                <ul className="slg-mapa-lista">
                  {d.ramas.map((r) => (
                    <li key={r.href}>
                      <Link href={r.href} className="slg-mapa-rama">
                        <span className="slg-mapa-nombre">{r.nombre}</span>
                        {r.linea ? <span className="slg-mapa-linea">{r.linea}</span> : null}
                      </Link>
                      {r.hijos.length > 0 ? (
                        <ul className="slg-mapa-lista slg-mapa-servicios">
                          {r.hijos.map((h) => (
                            <li key={h.href}>
                              <Link href={h.href}>{h.nombre}</Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
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

function Tarjeta({ nodo, clase }: { nodo: Nodo; clase?: string }) {
  return (
    <Link href={nodo.href} className={clase ? `slg-mapa-tarjeta ${clase}` : "slg-mapa-tarjeta"}>
      <span className="slg-mapa-nombre">{nodo.nombre}</span>
      {nodo.linea ? <span className="slg-mapa-linea">{nodo.linea}</span> : null}
    </Link>
  );
}
