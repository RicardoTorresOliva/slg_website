import Link from "next/link";

import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { proyectosDelCliente } from "@/lib/portal/proyectos";

/**
 * `/portal/proyectos` — los proyectos de la empresa del usuario (DU-19).
 *
 * Como en `/portal`: **no recibe ningún `organization_id`** (D-127). La política
 * de fila acota con el contexto de la sesión, así que la lista no puede traer
 * un proyecto ajeno ni pidiéndolo.
 */
export const dynamic = "force-dynamic";

export default async function Proyectos() {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "deliverables");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const lista = await proyectosDelCliente(sesion.ctx);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["portal.proj.title"]}
      </h1>

      {lista.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["portal.proj.empty"], texto: t["portal.proj.emptyText"] }}
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
          {lista.map((p) => (
            <li key={p.id} className="slg-card" style={ficha}>
              <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <strong>{p.nombre}</strong>
                {/* El nombre del servicio es literal e intraducible (RF-14): se
                    muestra tal cual, no se pasa por `content/ui`. */}
                <code style={{ fontSize: "0.75rem" }}>{p.servicio}</code>
                <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>{p.estado}</span>
              </p>
              <p style={{ margin: "0.5rem 0 0" }}>
                <Link href={`/portal/proyectos/${p.id}`} style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}>
                  {t["portal.proj.open"]}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ficha: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
