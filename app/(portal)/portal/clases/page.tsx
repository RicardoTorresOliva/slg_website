import Link from "next/link";

import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { esVideo } from "@/lib/portal/clases";
import { materialesPorProyecto } from "@/lib/portal/materiales";

/**
 * `/portal/clases` — los materiales de programa, **agrupados por proyecto**,
 * con los de vídeo distinguidos y abiertos en pestaña nueva (DU-28 · RF-155).
 *
 * ES «MATERIALES» CON UNA SOLA DECISIÓN ENCIMA. La puerta es la misma —
 * `materialesPorProyecto()`, la única que el criterio 2 de DU-20 permite— y el
 * reparto en grupos es el mismo. Lo único que añade esta pantalla es CÓMO se
 * abre cada fila: un vídeo (`esVideo(m.url)`) se abre en pestaña nueva, porque
 * es un enlace a otro origen; lo demás sigue yendo al visor de siempre, en
 * `/portal/entregables/[id]`. Ni el visor cambia, ni la CSP: nada se incrusta.
 *
 * Y lo que sigue sin haber: ni «visto», ni progreso, ni orden obligatorio. Esto
 * es material de un proyecto que se ve por su enlace, no un curso (frontera (b)
 * de `scope.md`).
 */
export const dynamic = "force-dynamic";

export default async function Clases() {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "classes");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const grupos = await materialesPorProyecto(sesion.ctx);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
          {t["portal.classes.title"]}
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--slg-ink-2)", maxWidth: "56ch" }}>
          {t["portal.classes.intro"]}
        </p>
      </header>

      {grupos.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["portal.classes.empty"], texto: t["portal.classes.emptyText"] }}
        />
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {grupos.map((g) => (
            <section key={g.proyecto.id} style={{ display: "grid", gap: "0.75rem" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <Link href={`/portal/proyectos/${g.proyecto.id}`} style={{ color: "var(--slg-link)" }}>
                  {g.proyecto.nombre}
                </Link>
                {/* Literal e intraducible (RF-14): el nombre del servicio va tal cual. */}
                <code style={{ fontSize: "0.75rem", fontWeight: 400 }}>{g.proyecto.servicio}</code>
              </h2>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
                {g.materiales.map((m) => {
                  const video = esVideo(m.url);
                  return (
                    <li key={m.id} className="slg-card" style={ficha}>
                      <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                        <strong>{m.titulo}</strong>
                        {video ? <span style={insignia}>{t["portal.classes.video"]}</span> : null}
                        <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
                          {t["portal.deliv.version"]} {m.version}
                        </span>
                      </p>
                      <p style={{ margin: "0.5rem 0 0" }}>
                        {video && m.url ? (
                          // Un vídeo es un enlace a otro origen: pestaña nueva y
                          // sin `opener`, igual que cualquier enlace externo del
                          // visor (RF-155, sin cambio de CSP ni de visor).
                          <a href={m.url} target="_blank" rel="noopener" style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}>
                            {t["portal.classes.watch"]}
                          </a>
                        ) : (
                          <Link
                            href={`/portal/entregables/${m.id}`}
                            style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}
                          >
                            {t["portal.deliv.open"]}
                          </Link>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const ficha: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
const insignia: React.CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--slg-radius-sm)",
  border: "1px solid var(--slg-line)",
  color: "var(--slg-ink-2)",
  fontSize: "0.6875rem",
};
