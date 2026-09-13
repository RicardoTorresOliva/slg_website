import Link from "next/link";
import { notFound } from "next/navigation";

import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { especificacionDe } from "@/lib/deliverables/renderers";
import type { DeliverableType } from "@/lib/db/schema";
import { type Entregable, entregablesDelCliente } from "@/lib/hq/entregables";
import { separarMateriales } from "@/lib/portal/materiales";
import { proyectoDelCliente } from "@/lib/portal/proyectos";

/**
 * `/portal/proyectos/[id]` — los entregables **de visibilidad `client`** de ese
 * proyecto (DU-19 · RF-89, criterio 1), **en dos bloques** (DU-20, criterio 1).
 *
 * **SE PIDE POR LA PUERTA DEL CLIENTE**, `entregablesDelCliente()`, que no tiene
 * forma de devolver un `internal` (D-118). No hay filtro que olvidar aquí, y por
 * eso «los `internal` no aparecen ni por enlace directo» es cierto sin
 * comprobación extra: no hay identificador que pueda aparecer en esta pantalla.
 *
 * **DOS BLOQUES, NO DOS PANTALLAS.** DU-20 pide que los materiales de programa
 * se vean separados de los entregables de trabajo; lo que NO pide —y la frontera
 * (b) prohíbe— es que vivan fuera de su proyecto. Por eso el reparto es visual y
 * pasa por `separarMateriales()`, la misma función que usa `/portal/materiales`:
 * dos pantallas que reparten igual porque reparten con el mismo código.
 *
 * **Un proyecto ajeno es 404**, no un 403: decir «no puedes» confirmaría que ese
 * proyecto existe (D-38, RF-95). Y ni siquiera hace falta comprobarlo a mano:
 * `proyectoDelCliente` consulta con el contexto de la sesión y la política de
 * fila no lo devuelve.
 *
 * **El tipo decide con el MAPA, no con un `if`** (RF-142, criterio 4). La
 * etiqueta de cada entregable sale de `especificacionDe(tipo).claveDeEtiqueta`.
 */
export const dynamic = "force-dynamic";

export default async function Proyecto({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "deliverables");

  const { id } = await params;
  const proyecto = await proyectoDelCliente(sesion.ctx, id);
  if (!proyecto) notFound();

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const lista = await entregablesDelCliente(sesion.ctx, id);
  const { deProyecto, materiales } = separarMateriales(lista);

  const bloque = (titulo: string, entregables: readonly Entregable[]) => (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <h2 style={{ margin: 0, fontSize: "1rem", color: "var(--slg-blue-deep)" }}>{titulo}</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
        {entregables.map((e) => (
          <li key={e.id} className="slg-card" style={ficha}>
            <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
              <strong>{e.titulo}</strong>
              <span style={insignia}>{t[especificacionDe(e.tipo as DeliverableType).claveDeEtiqueta]}</span>
              <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
                {t["portal.deliv.version"]} {e.version}
              </span>
            </p>
            <p style={{ margin: "0.5rem 0 0" }}>
              <Link href={`/portal/entregables/${e.id}`} style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}>
                {t["portal.deliv.open"]}
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>{proyecto.nombre}</h1>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
          {t["portal.proj.service"]}: <code>{proyecto.servicio}</code> · {t["portal.proj.status"]}:{" "}
          {proyecto.estado}
        </p>
      </header>

      {lista.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["portal.deliv.empty"], texto: t["portal.deliv.emptyText"] }}
        />
      ) : (
        <>
          {deProyecto.length > 0 && bloque(t["portal.deliv.work"], deProyecto)}
          {materiales.length > 0 && bloque(t["portal.mat.title"], materiales)}
        </>
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
