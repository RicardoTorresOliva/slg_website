import Link from "next/link";

import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { materialesPorProyecto } from "@/lib/portal/materiales";

/**
 * `/portal/materiales` — los materiales de programa, **agrupados por proyecto**
 * (DU-20 · RF-91 · RF-144).
 *
 * LA PANTALLA NO PUEDE ENSEÑAR UN MATERIAL SUELTO aunque quiera: lo que recibe
 * de `materialesPorProyecto()` son grupos, y un grupo es un proyecto con sus
 * materiales dentro (criterio 2). El encabezado de cada grupo **es un enlace al
 * proyecto**, así que desde aquí siempre se puede ir al sitio del que cuelga.
 *
 * Y lo que no hay: ni «visto», ni barra de progreso, ni orden obligatorio, ni
 * certificado al terminar. Esto es una lista de archivos de un proyecto, no un
 * curso (criterio 4, frontera (b) de `scope.md`).
 */
export const dynamic = "force-dynamic";

export default async function Materiales() {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "materials");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const grupos = await materialesPorProyecto(sesion.ctx);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
          {t["portal.mat.title"]}
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--slg-ink-2)", maxWidth: "56ch" }}>
          {t["portal.mat.intro"]}
        </p>
      </header>

      {grupos.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["portal.mat.empty"], texto: t["portal.mat.emptyText"] }}
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
                {g.materiales.map((m) => (
                  <li key={m.id} className="slg-card" style={ficha}>
                    <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                      <strong>{m.titulo}</strong>
                      <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
                        {t["portal.deliv.version"]} {m.version}
                      </span>
                    </p>
                    <p style={{ margin: "0.5rem 0 0" }}>
                      <Link
                        href={`/portal/entregables/${m.id}`}
                        style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}
                      >
                        {t["portal.deliv.open"]}
                      </Link>
                    </p>
                  </li>
                ))}
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
