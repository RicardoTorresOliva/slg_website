import { Aviso } from "@/components/app/Aviso";
import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { capturasDeHq } from "@/lib/hq/capturas";
import { modoActivo } from "@/lib/crm";
import { intentosDeCaptura } from "@/lib/hq/reintento";

import { accionReintentarCaptura } from "../_acciones";

/**
 * `/hq/capturas` — la lista, el detalle de intentos y el reintento manual
 * (DU-16 · RF-51 · RF-52 · RF-84).
 *
 * **NO FILTRA POR DÍA, y el tablero sí**, a propósito. El tablero pregunta «qué
 * ha pasado hoy»; esta pantalla pregunta «qué hay pendiente», y una captura
 * fallida de hace tres días es justo la que hay que ver. Con el día puesto no
 * saldría nunca, que es como se pierde un lead sin que nadie haga nada mal.
 *
 * **EL DETALLE VA EN LA MISMA PÁGINA**, dentro de un `<details>` por fila, y no
 * en una ruta aparte. Mirar por qué falló una entrega es algo que se hace
 * mientras se mira la lista: sacarlo a otra pantalla obliga a ir y volver por
 * cada captura, y con cinco fallidas eso son diez navegaciones. `<details>` no
 * necesita JavaScript, así que funciona aunque la hidratación no llegue.
 *
 * **Reintentar es `POST`**: por GET lo dispararía cualquier prefetch del
 * navegador, y un reintento no es una lectura.
 */
export const dynamic = "force-dynamic";

const ESTADOS = ["pending", "delivered", "failed"] as const;

export default async function Capturas({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; documento?: string; pagina?: string; aviso?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "captures");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const q = await searchParams;
  const filtrando = Boolean(q.estado || q.documento || q.pagina);

  const lista = await capturasDeHq(sesion.ctx, {
    todosLosDias: true,
    estado: (ESTADOS as readonly string[]).includes(q.estado ?? "") ? q.estado : null,
    documento: q.documento ?? null,
    pagina: q.pagina ?? null,
    limite: 200,
  });

  // Los intentos solo de lo que se enseña, y en paralelo: una consulta por fila
  // en serie sobre doscientas capturas es una pantalla que tarda un segundo.
  const intentos = new Map(
    await Promise.all(
      lista.map(async (c) => [c.id, await intentosDeCaptura(sesion.ctx, c.id)] as const),
    ),
  );

  const aviso = q.aviso
    ? {
        reintentada: t["hq.captures.retried"],
        ya_entregada: t["hq.captures.alreadyDelivered"],
        en_curso: t["hq.captures.inProgress"],
      }[q.aviso] ?? null
    : null;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
          {t["hq.captures.title"]}
        </h1>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
          <code>{modoActivo()}</code>
        </p>
      </header>

      {aviso ? <Aviso>{aviso}</Aviso> : null}

      {/* Filtros por GET: una lista filtrada se pega en un mensaje y se abre
          igual al otro lado. Con estado de cliente, el enlace no lleva nada. */}
      <form method="get" style={filtros}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span style={etiqueta}>{t["hq.captures.filterStatus"]}</span>
          <select name="estado" defaultValue={q.estado ?? ""} style={campo}>
            <option value="">{t["hq.captures.all"]}</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span style={etiqueta}>{t["hq.captures.filterDocument"]}</span>
          <input name="documento" defaultValue={q.documento ?? ""} style={campo} />
        </label>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span style={etiqueta}>{t["hq.captures.filterPage"]}</span>
          <input name="pagina" defaultValue={q.pagina ?? ""} style={campo} />
        </label>
        <button type="submit" style={boton}>
          {t["hq.captures.apply"]}
        </button>
      </form>

      {lista.length === 0 ? (
        /* Vacío por filtro y vacío inicial son DOS estados distintos (FU-12):
           uno se arregla quitando el filtro y el otro esperando. */
        filtrando ? (
          <Estado
            estado="vacio_por_filtro"
            textos={{
              titulo: t["hq.captures.emptyFiltered"],
              texto: t["hq.captures.emptyFilteredText"],
              accion: t["hq.captures.clear"],
            }}
            accion={{ href: "/hq/capturas" }}
          />
        ) : (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["hq.captures.empty"], texto: t["hq.captures.emptyText"] }}
          />
        )
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
          {lista.map((c) => (
            <li key={c.id} id={c.id} className="slg-card" style={ficha}>
              <div style={cabeceraFila}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, overflowWrap: "anywhere" }}>{c.email}</p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--slg-ink-2)", overflowWrap: "anywhere" }}>
                    {c.origen} · {c.documento ?? "—"} · {c.pagina} · {c.idioma} ·{" "}
                    <time dateTime={c.creadaEn}>{c.creadaEn.slice(0, 16).replace("T", " ")}</time>
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={insignia(c.estado)}>{c.estado}</span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
                    {t["hq.captures.attempts"]}: {c.intentos}
                  </span>
                  {c.enlaceAlCrm ? (
                    <a href={c.enlaceAlCrm} rel="noreferrer" style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}>
                      {t["hq.board.openContact"]}
                    </a>
                  ) : null}
                  {/* Solo sobre una fallida: el botón no existe donde no
                      procede, y el servidor lo vuelve a comprobar igual. */}
                  {c.estado === "failed" ? (
                    <form action={accionReintentarCaptura}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" style={botonPequeno}>
                        {t["hq.captures.retry"]}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              {c.pideTrabajoManual ? (
                <p style={avisoManual}>{t["hq.captures.manualWork"]}</p>
              ) : null}

              {c.ultimoError ? (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "var(--slg-red)", overflowWrap: "anywhere" }}>
                  {t["hq.captures.lastError"]}: {c.ultimoError}
                </p>
              ) : null}

              <details style={{ marginTop: "0.75rem" }}>
                <summary style={{ cursor: "pointer", fontSize: "0.875rem" }}>
                  {t["hq.captures.detail"]}
                </summary>
                {(intentos.get(c.id) ?? []).length === 0 ? (
                  <div style={{ marginTop: "0.75rem" }}>
                    <Estado
                      estado="vacio_inicial"
                      textos={{ titulo: t["hq.captures.noAttempts"], texto: t["hq.captures.noAttemptsText"] }}
                    />
                  </div>
                ) : (
                  <table data-slg-tabla style={tabla}>
                    <thead>
                      <tr>
                        {[
                          t["hq.captures.cycle"],
                          t["hq.captures.attempt"],
                          t["hq.captures.endpoint"],
                          t["hq.captures.code"],
                          t["hq.captures.response"],
                          t["hq.captures.when"],
                        ].map((h) => (
                          <th key={h} scope="col" style={celdaCabecera}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(intentos.get(c.id) ?? []).map((i) => (
                        <tr key={`${i.ciclo}-${i.intento}-${i.endpoint}`}>
                          <td data-label={t["hq.captures.cycle"]} style={celda}>{i.ciclo}</td>
                          <td data-label={t["hq.captures.attempt"]} style={celda}>{i.intento}</td>
                          <td data-label={t["hq.captures.endpoint"]} style={celda}>{i.endpoint}</td>
                          <td data-label={t["hq.captures.code"]} style={celda}>{i.codigo ?? "—"}</td>
                          <td data-label={t["hq.captures.response"]} style={{ ...celda, overflowWrap: "anywhere" }}>
                            {i.cuerpoRecibido?.slice(0, 160) ?? "—"}
                          </td>
                          <td data-label={t["hq.captures.when"]} style={celda}>
                            <time dateTime={i.creadoEn}>{i.creadoEn.slice(0, 16).replace("T", " ")}</time>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const etiqueta: React.CSSProperties = { fontSize: "0.8125rem", color: "var(--slg-ink-2)" };
const campo: React.CSSProperties = {
  padding: "0.5rem 0.625rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  fontSize: "0.9375rem",
  fontFamily: "inherit",
  background: "var(--slg-paper)",
  minWidth: 0,
};
const filtros: React.CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
  alignItems: "end",
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
  background: "var(--slg-paper-2)",
};
const boton: React.CSSProperties = {
  padding: "0.5rem 1rem",
  border: "1px solid var(--slg-blue-deep)",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-blue-deep)",
  color: "var(--slg-paper)",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  cursor: "pointer",
};
const botonPequeno: React.CSSProperties = {
  padding: "0.375rem 0.75rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-paper)",
  color: "var(--slg-link)",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  cursor: "pointer",
};
const ficha: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
const cabeceraFila: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
  justifyContent: "space-between",
  alignItems: "flex-start",
};
const avisoManual: React.CSSProperties = {
  margin: "0.5rem 0 0",
  fontSize: "0.8125rem",
  color: "var(--slg-blue-deep)",
};
const tabla: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.875rem",
  marginTop: "0.75rem",
};
const celdaCabecera: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem",
  borderBottom: "1px solid var(--slg-line)",
  color: "var(--slg-ink-2)",
  fontWeight: 600,
  fontSize: "0.75rem",
};
const celda: React.CSSProperties = { padding: "0.5rem", borderBottom: "1px solid var(--slg-line)" };

function insignia(estado: string): React.CSSProperties {
  const color =
    estado === "delivered" ? "var(--slg-ink-2)" : estado === "failed" ? "var(--slg-red)" : "var(--slg-blue-deep)";
  return {
    padding: "0.125rem 0.5rem",
    borderRadius: "var(--slg-radius-sm)",
    border: `1px solid ${color}`,
    color,
    fontSize: "0.6875rem",
  };
}
