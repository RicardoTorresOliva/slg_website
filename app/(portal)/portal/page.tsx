import Link from "next/link";
import type { ReactNode } from "react";

import { Estado } from "@/components/app/EstadosCanonicos";
import { ContenidoEntregado } from "@/components/app/ContenidoEntregado";
import { Markdown } from "@/components/Markdown";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { bloquesDeHoy, type Hoy } from "@/lib/portal/hoy";

import { PasoDeSesionCero } from "./PasoDeSesionCero";

/**
 * `/portal` — «Hoy»: el inicio que el cliente quiere abrir cada día (DU-26 ·
 * RF-149 · RF-150 · RF-88; modifica DU-18).
 *
 * **CINCO BLOQUES, EN ESTE ORDEN Y NINGUNO EN HUECO.** Noticias de hoy con lo
 * que significan para esta empresa · qué sigue (el próximo hito de cada
 * proyecto activo) · pendientes, los que cierra el cliente primero · últimos
 * entregables · avisos. Cada bloque tiene su estado vacío redactado en
 * `content/ui` y **enlaza a su pantalla completa** (RNF-43): Programa,
 * Proyectos, Avisos. Las noticias no tienen otra pantalla —«Hoy» es la suya—,
 * y por eso ese bloque no enlaza a ninguna parte que no sea la fuente.
 *
 * **NO SE LE PASA NINGÚN `organization_id`**, y eso sigue siendo la unidad
 * entera: `bloquesDeHoy()` llama a cinco puertas que acotan por la política de
 * fila con el contexto de la sesión. No hay parámetro que cruzar ni nada en la
 * URL que manipular (criterio 1).
 *
 * **EL COMENTARIO ES EL PRODUCTO** (D-161). Una noticia sin lo que significa
 * para esta empresa es un titular que se encuentra en cualquier sitio; por eso
 * el comentario va destacado —marco propio, fondo propio— y no como un párrafo
 * más. Resumen y comentario se renderizan por `Markdown` dentro de
 * `ContenidoEntregado` (RNF-31): saneados y tal como se entregaron, sin que el
 * navegador los traduzca a espaldas de nadie.
 *
 * **SIN NOTICIAS DE HOY, LAS ÚLTIMAS TRES CON SU FECHA** (criterio 2). El primer
 * bloque de la portada no puede ser un hueco: la fecha dice «esto no es de
 * hoy» sin que haga falta esconderlo.
 *
 * **EL PASO «AGENDA TU SESIÓN CERO» SIGUE AQUÍ Y EN NINGÚN OTRO SITIO** (DU-21 ·
 * RF-94 · RF-96): tras ingreso, nunca en la capa pública.
 *
 * **EL FALLO DE CARGA ES UN ESTADO DE LA PANTALLA**, no un error del servidor
 * (criterio 5): un cartel que dice qué pasa y deja reintentar sin salir de la
 * superficie. La sesión caducada la resuelve `exigirSuperficie` antes de llegar
 * aquí, como en todo el portal.
 */
export const dynamic = "force-dynamic";

export default async function Portal() {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "today");

  const idioma = idiomaDeInterfaz(sesion.locale);
  const t = loadUiStrings()[idioma];

  let hoy: Hoy | null = null;
  try {
    hoy = await bloquesDeHoy(sesion.ctx);
  } catch {
    hoy = null;
  }

  if (hoy === null) {
    return (
      <Estado
        estado="error_de_carga"
        textos={{
          titulo: t["portal.today.error"],
          texto: t["portal.today.errorText"],
          accion: t["app.state.error_de_carga.accion"],
        }}
        accion={{ href: "/portal" }}
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <PasoDeSesionCero textos={t} />

      <header style={{ display: "grid", gap: "0.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
          {t["portal.today.title"]}
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--slg-ink-2)", maxWidth: "56ch" }}>
          {t["portal.today.intro"]}
        </p>
      </header>

      {/* 1 · Noticias de hoy — o las últimas tres, con su fecha. */}
      <Bloque id="noticias" titulo={t["portal.today.news"]}>
        {hoy.noticias.lista.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["portal.today.newsEmpty"], texto: t["portal.today.newsEmptyText"] }}
          />
        ) : (
          <>
            {hoy.noticias.deHoy ? null : <p style={nota}>{t["portal.today.newsLatest"]}</p>}
            <ul style={lista}>
              {hoy.noticias.lista.map((n) => (
                <li key={n.id} className="slg-card" style={ficha}>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", color: "var(--slg-blue-deep)" }}>{n.titulo}</h3>
                  <p style={meta}>
                    {n.publicadaEn ? <time dateTime={n.publicadaEn}>{n.publicadaEn.slice(0, 10)}</time> : null}
                    {n.fuenteUrl ? (
                      <>
                        {" · "}
                        {/* La fuente es otro origen: pestaña nueva y sin `opener`,
                            como cualquier enlace externo del portal. */}
                        <a href={n.fuenteUrl} target="_blank" rel="noopener" style={{ color: "var(--slg-link)" }}>
                          {t["portal.today.newsSource"]}
                        </a>
                      </>
                    ) : null}
                  </p>
                  {/* `news_item` no guarda el idioma en que se escribió (FU-15); el
                      `lang` disponible es el de la cuenta. Lo que RNF-31 exige
                      —saneado, tal como se entregó, sin traducir— se cumple igual. */}
                  <ContenidoEntregado idioma={idioma}>
                    <Markdown texto={n.resumenMd} />
                  </ContenidoEntregado>
                  <div style={comentario}>
                    <p style={etiquetaDeComentario}>{t["portal.today.newsComment"]}</p>
                    <ContenidoEntregado idioma={idioma}>
                      <Markdown texto={n.comentarioMd} />
                    </ContenidoEntregado>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Bloque>

      {/* 2 · Qué sigue — el próximo hito de cada proyecto activo. */}
      <Bloque id="que-sigue" titulo={t["portal.today.next"]} enlace={{ href: "/portal/programa", texto: t["portal.today.nextAll"] }}>
        {hoy.hitos.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["portal.today.nextEmpty"], texto: t["portal.today.nextEmptyText"] }}
          />
        ) : (
          <ul style={lista}>
            {hoy.hitos.map(({ proyecto, hito }) => (
              <li key={hito.id} className="slg-card" style={fila}>
                <div style={{ display: "grid", gap: "0.125rem" }}>
                  <Link href={`/portal/proyectos/${proyecto.id}`} style={enlaceDeProyecto}>
                    {proyecto.nombre}
                  </Link>
                  <strong>{hito.titulo}</strong>
                </div>
                <time dateTime={hito.venceEn} style={fecha}>
                  {hito.venceEn.slice(0, 10)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      {/* 3 · Pendientes — los que cierra el cliente, primero. */}
      <Bloque id="pendientes" titulo={t["portal.today.pending"]} enlace={{ href: "/portal/programa", texto: t["portal.today.pendingAll"] }}>
        {hoy.pendientes.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["portal.today.pendingEmpty"], texto: t["portal.today.pendingEmptyText"] }}
          />
        ) : (
          <ul style={lista}>
            {hoy.pendientes.map(({ proyecto, pendiente }) => (
              <li key={pendiente.id} className="slg-card" style={fila}>
                <div style={{ display: "grid", gap: "0.125rem" }}>
                  {proyecto ? (
                    <Link href={`/portal/proyectos/${proyecto.id}`} style={enlaceDeProyecto}>
                      {proyecto.nombre}
                    </Link>
                  ) : null}
                  <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong>{pendiente.titulo}</strong>
                    <span style={pendiente.cierra === "client" ? insigniaDestacada : insignia}>
                      {pendiente.cierra === "client" ? t["portal.today.pendingYours"] : t["portal.today.pendingSlg"]}
                    </span>
                  </p>
                </div>
                {pendiente.venceEn ? (
                  <p style={{ ...fecha, margin: 0 }}>
                    {t["portal.today.pendingDue"]}{" "}
                    <time dateTime={pendiente.venceEn}>{pendiente.venceEn.slice(0, 10)}</time>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      {/* 4 · Últimos entregables — los tres más recientes. */}
      <Bloque id="entregables" titulo={t["portal.today.deliverables"]} enlace={{ href: "/portal/proyectos", texto: t["portal.today.deliverablesAll"] }}>
        {hoy.entregables.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["portal.today.deliverablesEmpty"], texto: t["portal.today.deliverablesEmptyText"] }}
          />
        ) : (
          <ul style={lista}>
            {hoy.entregables.map(({ proyecto, entregable }) => (
              <li key={entregable.id} className="slg-card" style={fila}>
                <div style={{ display: "grid", gap: "0.125rem" }}>
                  {proyecto ? (
                    <Link href={`/portal/proyectos/${proyecto.id}`} style={enlaceDeProyecto}>
                      {proyecto.nombre}
                    </Link>
                  ) : null}
                  <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong>{entregable.titulo}</strong>
                    <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
                      {t["portal.deliv.version"]} {entregable.version}
                    </span>
                    {entregable.publicadoEn ? (
                      <time dateTime={entregable.publicadoEn} style={fecha}>
                        {entregable.publicadoEn.slice(0, 10)}
                      </time>
                    ) : null}
                  </p>
                </div>
                <Link href={`/portal/entregables/${entregable.id}`} style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}>
                  {t["portal.deliv.open"]}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      {/* 5 · Avisos — los últimos tres, como en su pantalla (RF-88). */}
      <Bloque id="avisos" titulo={t["portal.today.announcements"]} enlace={{ href: "/portal/avisos", texto: t["portal.today.announcementsAll"] }}>
        {hoy.avisos.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["portal.ann.empty"], texto: t["portal.ann.emptyText"] }}
          />
        ) : (
          <ul style={lista}>
            {hoy.avisos.map((a) => (
              <li key={a.id} className="slg-card" style={ficha}>
                <h3 style={{ margin: 0, fontSize: "1.125rem", color: "var(--slg-blue-deep)" }}>{a.titulo}</h3>
                <p style={meta}>
                  {a.publicadoEn ? <time dateTime={a.publicadoEn}>{a.publicadoEn.slice(0, 10)}</time> : null}
                  {a.autor ? ` · ${t["portal.ann.from"]} ${a.autor}` : null}
                </p>
                {/* El idioma del CONTENIDO puede no ser el de la interfaz: el aviso
                    se muestra tal como se entregó, no traducido (RF-72). */}
                <ContenidoEntregado idioma={a.idioma}>
                  <Markdown texto={a.cuerpoMd} />
                </ContenidoEntregado>
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  );
}

/**
 * Un bloque de la portada: título, contenido y —si la tiene— la salida a su
 * pantalla completa. El título nombra al bloque para el lector de pantalla
 * (`aria-labelledby`), así los cinco se recorren como cinco regiones y no como
 * una lista larga.
 */
function Bloque({
  id,
  titulo,
  enlace,
  children,
}: {
  id: string;
  titulo: string;
  enlace?: { href: string; texto: string };
  children: ReactNode;
}) {
  const idDelTitulo = `hoy-${id}`;
  return (
    <section aria-labelledby={idDelTitulo} style={{ display: "grid", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
        <h2 id={idDelTitulo} style={{ margin: 0, fontSize: "1.125rem", color: "var(--slg-blue-deep)" }}>
          {titulo}
        </h2>
        {enlace ? (
          <Link href={enlace.href} style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}>
            {enlace.texto}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const lista: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" };
const ficha: React.CSSProperties = {
  padding: "1.25rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
const fila: React.CSSProperties = {
  ...ficha,
  padding: "1rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "1rem",
  flexWrap: "wrap",
};
const meta: React.CSSProperties = {
  margin: "0.25rem 0 0.75rem",
  fontSize: "0.8125rem",
  color: "var(--slg-ink-2)",
};
const nota: React.CSSProperties = { margin: 0, fontSize: "0.875rem", color: "var(--slg-ink-2)" };
const fecha: React.CSSProperties = { fontSize: "0.8125rem", color: "var(--slg-ink-2)", whiteSpace: "nowrap" };
const enlaceDeProyecto: React.CSSProperties = { color: "var(--slg-link)", fontSize: "0.8125rem" };
/** El comentario para esta empresa: marco y fondo propios, porque es el producto. */
const comentario: React.CSSProperties = {
  marginTop: "0.75rem",
  padding: "0.875rem 1rem",
  borderLeft: "3px solid var(--slg-blue-deep)",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-blue-tint)",
};
const etiquetaDeComentario: React.CSSProperties = {
  margin: "0 0 0.375rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--slg-blue-deep)",
};
const insignia: React.CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--slg-radius-sm)",
  border: "1px solid var(--slg-line)",
  color: "var(--slg-ink-2)",
  fontSize: "0.6875rem",
};
const insigniaDestacada: React.CSSProperties = {
  ...insignia,
  borderColor: "var(--slg-blue-deep)",
  color: "var(--slg-blue-deep)",
};
