import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { auditoria } from "@/lib/hq/claves";

/**
 * `/hq/auditoria` — el registro, consultable y filtrable (DU-17 · RF-83 · RNF-29).
 *
 * **SOLO `slg_admin`** (criterio 5). `exigirSeccion` lo para antes de leer nada,
 * y el intento de un `slg_operator` **queda auditado**: quien mira la auditoría
 * puede ver quién intentó mirarla. Es la propiedad que hace que este registro
 * sirva para algo más que para reconstruir un incidente.
 *
 * **NO HAY BOTÓN DE EDITAR NI DE BORRAR, Y NO ES QUE FALTE** (criterio 6). No
 * existe la función en `lib/hq/claves.ts`, y aunque existiera no funcionaría: un
 * disparador de la migración 0003 rechaza `UPDATE` y `DELETE` sobre `audit_log`
 * **incluso al usuario dueño de la base**. La pantalla lo dice en voz alta, y no
 * por transparencia: porque quien opera tiene que saber que lo que hace aquí
 * **queda**, y esa expectativa es la mitad del valor de un registro.
 *
 * **Los intentos rechazados tienen su propio filtro.** Llevan sufijo `.denied`
 * en la misma columna (D-106), así que «enséñame solo lo que alguien intentó y
 * no pudo» es una casilla, no una consulta que haya que escribir.
 */
export const dynamic = "force-dynamic";

export default async function Auditoria({
  searchParams,
}: {
  searchParams: Promise<{ accion?: string; entidad?: string; actor?: string; rechazos?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "audit");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const q = await searchParams;
  const filtrando = Boolean(q.accion || q.entidad || q.actor || q.rechazos);

  const apuntes = await auditoria(sesion.ctx, {
    accion: q.accion || null,
    entidad: q.entidad || null,
    actor: q.actor || null,
    soloRechazos: q.rechazos === "1",
    limite: 200,
  });

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
          {t["hq.audit.title"]}
        </h1>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
          {t["hq.audit.immutable"]}
        </p>
      </header>

      <form method="get" style={filtros}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span style={etiqueta}>{t["hq.audit.filterAction"]}</span>
          <input name="accion" defaultValue={q.accion ?? ""} style={campo} />
        </label>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span style={etiqueta}>{t["hq.audit.filterEntity"]}</span>
          <input name="entidad" defaultValue={q.entidad ?? ""} style={campo} />
        </label>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span style={etiqueta}>{t["hq.audit.filterActor"]}</span>
          <input name="actor" defaultValue={q.actor ?? ""} style={campo} />
        </label>
        <label style={{ ...etiqueta, display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input type="checkbox" name="rechazos" value="1" defaultChecked={q.rechazos === "1"} />
          {t["hq.audit.onlyDenied"]}
        </label>
        <button type="submit" style={boton}>
          {t["hq.audit.apply"]}
        </button>
      </form>

      {apuntes.length === 0 ? (
        filtrando ? (
          <Estado
            estado="vacio_por_filtro"
            textos={{
              titulo: t["hq.audit.emptyFiltered"],
              texto: t["hq.audit.emptyFilteredText"],
              accion: t["hq.audit.clear"],
            }}
            accion={{ href: "/hq/auditoria" }}
          />
        ) : (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["hq.audit.empty"], texto: t["hq.audit.emptyText"] }}
          />
        )
      ) : (
        <table data-slg-tabla style={tabla}>
          <caption style={leyenda}>{t["hq.audit.title"]}</caption>
          <thead>
            <tr>
              {[
                t["hq.audit.when"],
                t["hq.audit.filterActor"],
                t["hq.audit.filterAction"],
                t["hq.audit.filterEntity"],
              ].map((c) => (
                <th key={c} scope="col" style={celdaCabecera}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apuntes.map((a) => (
              <tr key={a.id}>
                <td data-label={t["hq.audit.when"]} style={celda}>
                  <time dateTime={a.creadoEn}>{a.creadoEn.slice(0, 19).replace("T", " ")}</time>
                </td>
                <td data-label={t["hq.audit.filterActor"]} style={celda}>
                  {a.actor} <span style={{ color: "var(--slg-ink-2)", fontSize: "0.75rem" }}>({a.actorTipo})</span>
                </td>
                <td data-label={t["hq.audit.filterAction"]} style={celda}>
                  <code style={{ fontSize: "0.8125rem" }}>{a.accion}</code>
                  {a.rechazo ? <span style={insigniaRechazo}>{t["hq.audit.denied"]}</span> : null}
                </td>
                <td data-label={t["hq.audit.filterEntity"]} style={celda}>
                  {a.entidad}
                  {a.entidadId ? (
                    <span style={{ color: "var(--slg-ink-2)", fontSize: "0.75rem" }}> · {a.entidadId}</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
const tabla: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" };
const leyenda: React.CSSProperties = {
  textAlign: "left",
  paddingBottom: "0.75rem",
  color: "var(--slg-ink-2)",
  fontSize: "0.875rem",
};
const celdaCabecera: React.CSSProperties = {
  textAlign: "left",
  padding: "0.625rem 0.75rem",
  borderBottom: "1px solid var(--slg-line)",
  color: "var(--slg-ink-2)",
  fontWeight: 600,
  fontSize: "0.8125rem",
};
const celda: React.CSSProperties = { padding: "0.75rem", borderBottom: "1px solid var(--slg-line)" };
const insigniaRechazo: React.CSSProperties = {
  marginLeft: "0.5rem",
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--slg-radius-sm)",
  border: "1px solid var(--slg-red)",
  color: "var(--slg-red)",
  fontSize: "0.6875rem",
};
