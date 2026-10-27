import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { GRUPOS, conexionesPorGrupo, type Grupo } from "@/lib/hq/conexiones";

/**
 * `/hq/conexiones` — el lanzador de HQ (DU-29(a) · RF-154 · D-11).
 *
 * PARA UNA COMPANY OF ONE, no para un equipo. La pantalla no gestiona nada de
 * ningún producto externo: es un sitio único desde el que abrirlos, cada uno en
 * su propia pestaña. El CRM, n8n y el estudio creativo siguen siendo dueños de
 * su propia interfaz; HQ no la reconstruye.
 *
 * **LA LISTA ES LA DEL NEGOCIO, NO LA DE LO QUE YA EXISTE.** Un producto sin
 * URL todavía (el asistente, el superchatbot, la fábrica de contenidos, el
 * estudio) no se esconde: se enseña marcado «pendiente de conectar», para que
 * la pantalla recuerde lo que falta por cablear en vez de fingir que solo
 * existe lo que ya tiene dirección.
 *
 * **LOS DATOS SALEN DE UN ARCHIVO**, `content/conexiones.json`, leído por
 * `lib/hq/conexiones.ts`. Añadir una conexión es añadir un objeto ahí (D-11):
 * no hace falta una pantalla de administración para siete filas que cambian
 * dos veces al año, y `check:cadenas` sigue en verde porque el único texto
 * escrito a mano aquí son los rótulos fijos (título, subtítulos, «Abrir»,
 * «pendiente»), que sí vienen de `content/ui`.
 */
export const dynamic = "force-dynamic";

/** El subtítulo de cada grupo, en el orden fijo de `GRUPOS`. */
const CLAVE_DE_SUBTITULO: Record<Grupo, string> = {
  operacion: "hq.connections.groupOperacion",
  agentes: "hq.connections.groupAgentes",
  creacion: "hq.connections.groupCreacion",
};

export default async function Conexiones() {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "connections");

  const idioma = idiomaDeInterfaz(sesion.locale);
  const t = loadUiStrings()[idioma];
  const porGrupo = conexionesPorGrupo();
  const total = [...porGrupo.values()].reduce((n, lista) => n + lista.length, 0);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["hq.connections.title"]}
      </h1>

      {total === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.connections.empty"], texto: t["hq.connections.emptyText"] }}
        />
      ) : (
        GRUPOS.map((grupo) => {
          const lista = porGrupo.get(grupo) ?? [];
          if (lista.length === 0) return null;
          return (
            <section key={grupo} style={{ display: "grid", gap: "0.75rem" }}>
              <h2 style={subtitulo}>{t[CLAVE_DE_SUBTITULO[grupo]]}</h2>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
                {lista.map((c) => (
                  <li key={c.clave} className="slg-card" style={ficha}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.nombre[idioma]}</p>
                    <p style={descripcion}>{c.descripcion[idioma]}</p>
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noopener" style={enlace}>
                        {t["hq.connections.open"]}
                      </a>
                    ) : (
                      <span style={pendiente}>{t["hq.connections.pending"]}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

const subtitulo: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "var(--slg-ink-2)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};
const ficha: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
const descripcion: React.CSSProperties = {
  margin: "0.375rem 0 0.875rem",
  fontSize: "0.875rem",
  color: "var(--slg-ink-2)",
  lineHeight: 1.5,
};
const enlace: React.CSSProperties = {
  display: "inline-block",
  padding: "0.375rem 0.875rem",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-blue-deep)",
  color: "var(--slg-paper)",
  fontSize: "0.8125rem",
  fontWeight: 600,
  textDecoration: "none",
};
const pendiente: React.CSSProperties = {
  display: "inline-block",
  fontSize: "0.8125rem",
  color: "var(--slg-ink-2)",
  fontStyle: "italic",
};
