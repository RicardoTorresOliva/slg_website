import type { CSSProperties, ReactNode } from "react";

import { Estado } from "@/components/app/EstadosCanonicos";
import { TablaDeApp } from "@/components/app/TablaDeApp";
import type { EstadoCanonico } from "@/lib/app/estados";
import type { Bloque, Tablero } from "@/lib/hq/tablero";

/**
 * El tablero, pintado (DU-13).
 *
 * **CADA BLOQUE RESUELVE SU PROPIO ESTADO**, con los seis canónicos de FU-12 y
 * sin inventarse ninguno. Es lo que hace cierto el criterio 8: cuando el CRM no
 * responde, ese bloque —y solo ese— enseña su error, y el resto del tablero
 * sigue sirviendo para trabajar. Una pantalla que se cae entera porque un
 * informe tardó es una pantalla que no se puede usar los días que hace falta.
 *
 * **NI UNA CADENA ESCRITA A MANO** (RF-16): el idioma es la preferencia de la
 * cuenta, así que un literal aquí saldría en español a quien eligió inglés y
 * nadie más lo vería. Lo vigila `check:cadenas`.
 *
 * LO QUE NO HAY, Y ES EL CRITERIO 6 (RF-85): ni una etapa, ni una oportunidad,
 * ni un propietario de lead, ni un importe, ni un botón que escriba en el CRM.
 * El pipeline se **mira** desde aquí y se **gestiona** en el CRM, y para eso
 * está el botón «Abrir CRM». Lo vigila `check:hq`.
 */
export function TableroDeHq({ datos, t }: { datos: Tablero; t: Record<string, string> }) {
  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={titulo}>{t["hq.board.title"]}</h1>
        {datos.urlDelCrm ? (
          <a href={datos.urlDelCrm} rel="noreferrer" style={botonCrm}>
            {t["hq.board.openCrm"]}
          </a>
        ) : null}
      </header>

      {/* ── Modo del adaptador (criterio 7) ─────────────────────────────── */}
      <Seccion titulo={t["hq.board.captureMode"]}>
        <Contenido bloque={datos.captura} t={t}>
          {(c) => (
            <p style={parrafo}>
              <code>{c.modo}</code>{" "}
              {c.pidenOportunidad > 0 ? (
                <strong>
                  · {c.pidenOportunidad} {t["hq.board.needsOpportunity"]}
                </strong>
              ) : (
                <span style={{ color: "var(--slg-ink-2)" }}>· {t["hq.board.needsOpportunityNone"]}</span>
              )}
            </p>
          )}
        </Contenido>
      </Seccion>

      {/* ── Capturas (criterios 1 y 2) ──────────────────────────────────── */}
      <Seccion titulo={t["hq.board.captures"]}>
        <Contenido bloque={datos.capturas} t={t}>
          {(filas) => (
            <table data-slg-tabla style={tabla}>
              <caption style={leyenda}>{t["hq.board.capturesCaption"]}</caption>
              <thead>
                <tr>
                  {[
                    t["hq.board.colEmail"],
                    t["hq.board.colSource"],
                    t["hq.board.colDocument"],
                    t["hq.board.colPage"],
                    t["hq.board.colStatus"],
                    t["hq.board.colAttempts"],
                    t["hq.board.colCrm"],
                  ].map((c) => (
                    <th key={c} scope="col" style={celdaCabecera}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td data-label={t["hq.board.colEmail"]} style={celda}>{f.email}</td>
                    <td data-label={t["hq.board.colSource"]} style={celda}>{f.origen}</td>
                    <td data-label={t["hq.board.colDocument"]} style={celda}>{f.documento ?? "—"}</td>
                    <td data-label={t["hq.board.colPage"]} style={celda}>{f.pagina}</td>
                    <td data-label={t["hq.board.colStatus"]} style={celda}>{f.estado}</td>
                    <td data-label={t["hq.board.colAttempts"]} style={celda}>{f.intentos}</td>
                    <td data-label={t["hq.board.colCrm"]} style={celda}>
                      {/* Sin plantilla configurada o sin contacto todavía, NO se
                          pinta un enlace: uno inventado lleva a un 404 que parece
                          culpa del CRM (RF-54). */}
                      {f.enlaceAlCrm ? (
                        <a href={f.enlaceAlCrm} rel="noreferrer" style={{ color: "var(--slg-link)" }}>
                          {t["hq.board.openContact"]}
                        </a>
                      ) : (
                        <span style={{ color: "var(--slg-ink-2)" }}>{t["hq.board.noLink"]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Contenido>
      </Seccion>

      {/* ── Métricas del CRM (criterio 3) ───────────────────────────────── */}
      <Seccion titulo={t["hq.board.metrics"]}>
        <Contenido bloque={datos.metricas} t={t}>
          {(m) => (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {/* La procedencia y la antigüedad van JUNTAS y encima del dato:
                  un número del CRM y uno calculado por nosotros no se auditan
                  igual, y sin marca de tiempo «14 leads» afirma sobre ahora
                  algo que puede tener cinco minutos (RF-74). */}
              <p style={{ ...parrafo, color: "var(--slg-ink-2)" }}>
                <span style={etiquetaOrigen}>{t["hq.board.fromCrm"]}</span> · {t["hq.board.cachedAt"]}{" "}
                <time dateTime={m.obtenidoEn}>{m.obtenidoEn}</time> ·{" "}
                {m.deLaCache ? t["hq.board.cacheHit"] : t["hq.board.cacheMiss"]}
              </p>
              {m.fallos.length > 0 ? (
                <Estado
                  estado="error_de_carga"
                  textos={{
                    titulo: t["app.state.error_de_carga.titulo"],
                    texto: t["app.state.error_de_carga.texto"],
                  }}
                  identificador={m.fallos.map((f) => `${f.informe}: ${f.motivo}`).join(" · ")}
                />
              ) : null}
              {Object.entries(m.datos).map(([informe, valor]) => (
                <details key={informe}>
                  <summary style={{ cursor: "pointer", fontSize: "0.875rem" }}>{informe}</summary>
                  <pre style={crudo}>{JSON.stringify(valor, null, 2)}</pre>
                </details>
              ))}
            </div>
          )}
        </Contenido>
      </Seccion>

      {/* ── Los seis bloques restantes de RF-76 ─────────────────────────── */}
      <Seccion titulo={t["hq.board.orgs"]}>
        <Contenido bloque={datos.empresas} t={t}>
          {(filas) => (
            <TablaDeApp
              etiqueta={t["hq.board.orgs"]}
              columnas={[t["hq.board.colName"], t["hq.board.colType"]]}
              filas={filas.map((f) => [f.nombre, f.tipo])}
            />
          )}
        </Contenido>
      </Seccion>

      <Seccion titulo={t["hq.board.projects"]}>
        <Contenido bloque={datos.proyectos} t={t}>
          {(filas) => (
            <TablaDeApp
              etiqueta={t["hq.board.projects"]}
              columnas={[t["hq.board.colName"], t["hq.board.colCompany"], t["hq.board.colStatus"]]}
              filas={filas.map((f) => [f.nombre, f.empresa, f.estado])}
            />
          )}
        </Contenido>
      </Seccion>

      <Seccion titulo={t["hq.board.deliverables"]}>
        <Contenido bloque={datos.entregables} t={t}>
          {(filas) => (
            <TablaDeApp
              etiqueta={t["hq.board.deliverables"]}
              columnas={[t["hq.board.colTitle"], t["hq.board.colType"], t["hq.board.colDate"]]}
              filas={filas.map((f) => [f.titulo, f.tipo, f.publicadoEn ?? "—"])}
            />
          )}
        </Contenido>
      </Seccion>

      {/* ── Artículos, con los extractos listos para copiar (criterio 5) ── */}
      <Seccion titulo={t["hq.board.posts"]}>
        <Contenido bloque={datos.articulos} t={t}>
          {(filas) => (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1rem" }}>
              {filas.map((a) => (
                <li key={`${a.idioma}/${a.slug}`} className="slg-card" style={fichaArticulo}>
                  <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong>{a.titulo}</strong>
                    <span style={a.borrador ? insigniaBorrador : insigniaPublicado}>
                      {a.borrador ? t["hq.board.draft"] : t["hq.board.published"]}
                    </span>
                    <span style={{ color: "var(--slg-ink-2)", fontSize: "0.8125rem" }}>
                      {a.idioma} · {a.fecha}
                    </span>
                  </p>
                  {/* Los tres extractos en un `<textarea readonly>` y no en un
                      `<p>`: «listos para copiar» (RF-25) quiere decir que se
                      seleccionan de una pasada, sin arrastrar el ratón por un
                      párrafo que corta donde no toca. */}
                  <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
                    {[
                      [t["hq.board.socialHook"], a.social.hook],
                      [t["hq.board.socialLinkedin"], a.social.linkedin],
                      [t["hq.board.socialX"], a.social.x],
                    ].map(([etiqueta, valor]) => (
                      <label key={etiqueta} style={{ display: "grid", gap: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--slg-ink-2)" }}>{etiqueta}</span>
                        <textarea readOnly rows={2} value={valor} style={extracto} />
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Contenido>
      </Seccion>

      <Seccion titulo={t["hq.board.agents"]}>
        <Contenido bloque={datos.agentes} t={t}>
          {(filas) => (
            <TablaDeApp
              etiqueta={t["hq.board.agents"]}
              columnas={[t["hq.board.colType"], t["hq.board.colDate"]]}
              filas={filas.map((f) => [f.tipo, f.creadoEn])}
            />
          )}
        </Contenido>
      </Seccion>

      <Seccion titulo={t["hq.board.audit"]}>
        <Contenido bloque={datos.auditoria} t={t}>
          {(filas) => (
            <TablaDeApp
              etiqueta={t["hq.board.audit"]}
              columnas={[t["hq.board.colActor"], t["hq.board.colAction"], t["hq.board.colEntity"], t["hq.board.colDate"]]}
              filas={filas.map((f) => [f.actor, f.accion, f.entidad, f.creadoEn])}
            />
          )}
        </Contenido>
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <h2 style={subtitulo}>{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * El puente entre un `Bloque<T>` y los seis estados canónicos.
 *
 * Aquí está la razón de que `Bloque` distinga «trae datos» de «trae motivo» en
 * vez de devolver un array vacío en los dos casos: **vacío y error se pintan
 * distinto**, y son dos estados distintos de FU-12. Con un array vacío para las
 * dos cosas, el día que el CRM falle el tablero diría «todavía no hay nada»,
 * que es una mentira tranquilizadora.
 */
function Contenido<T>({
  bloque,
  t,
  children,
}: {
  bloque: Bloque<T>;
  t: Record<string, string>;
  children: (datos: T) => ReactNode;
}) {
  const texto = (estado: EstadoCanonico) => ({
    titulo: t[`app.state.${estado}.titulo`],
    texto: t[`app.state.${estado}.texto`],
  });

  if (!bloque.ok) {
    return <Estado estado="error_de_carga" textos={texto("error_de_carga")} identificador={bloque.motivo} />;
  }
  const datos = bloque.datos;
  if (Array.isArray(datos) && datos.length === 0) {
    return <Estado estado="vacio_inicial" textos={texto("vacio_inicial")} />;
  }
  return <>{children(datos)}</>;
}

const titulo: CSSProperties = { margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" };
const subtitulo: CSSProperties = { margin: 0, fontSize: "1rem", color: "var(--slg-blue-deep)" };
const parrafo: CSSProperties = { margin: 0, fontSize: "0.9375rem" };
const botonCrm: CSSProperties = {
  padding: "0.5rem 1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  textDecoration: "none",
  color: "var(--slg-link)",
  fontSize: "0.875rem",
};
const etiquetaOrigen: CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-paper-2)",
  border: "1px solid var(--slg-line)",
  fontSize: "0.75rem",
};
const tabla: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" };
const leyenda: CSSProperties = { textAlign: "left", paddingBottom: "0.75rem", color: "var(--slg-ink-2)", fontSize: "0.875rem" };
const celdaCabecera: CSSProperties = {
  textAlign: "left",
  padding: "0.625rem 0.75rem",
  borderBottom: "1px solid var(--slg-line)",
  color: "var(--slg-ink-2)",
  fontWeight: 600,
  fontSize: "0.8125rem",
};
const celda: CSSProperties = { padding: "0.75rem", borderBottom: "1px solid var(--slg-line)" };
const crudo: CSSProperties = {
  margin: 0,
  padding: "0.75rem",
  background: "var(--slg-paper-2)",
  borderRadius: "var(--slg-radius-sm)",
  fontSize: "0.75rem",
  overflowX: "auto",
};
const fichaArticulo: CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
const insigniaBorrador: CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-paper-2)",
  border: "1px solid var(--slg-red)",
  color: "var(--slg-red)",
  fontSize: "0.6875rem",
};
const insigniaPublicado: CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-paper-2)",
  border: "1px solid var(--slg-line)",
  color: "var(--slg-ink-2)",
  fontSize: "0.6875rem",
};
const extracto: CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  fontSize: "0.8125rem",
  fontFamily: "inherit",
  resize: "vertical",
  background: "var(--slg-paper)",
};
