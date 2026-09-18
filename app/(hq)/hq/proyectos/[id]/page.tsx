import Link from "next/link";
import { notFound } from "next/navigation";

import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { Estado } from "@/components/app/EstadosCanonicos";
import { hitosDeProyecto, pendientesDeProyecto, QUIEN_CIERRA } from "@/lib/academy";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { proyectos } from "@/lib/hq/proyectos";

import {
  accionCambiarEstadoDeHito,
  accionCerrarPendiente,
  accionCrearHito,
  accionCrearPendiente,
  accionReabrirPendiente,
} from "../../_acciones";

/**
 * `/hq/proyectos/[id]` — la ficha de un proyecto: hitos y pendientes
 * (DU-29(b) · RF-151 · RF-152).
 *
 * **UN PROYECTO AJENO ES 404**, no 403 (D-38, RF-95). Se busca dentro de lo que
 * `proyectos()` devuelve con el contexto de la sesión: la política de fila no
 * devuelve lo que no es de este actor, así que no hay comprobación que alguien
 * pueda quitar.
 *
 * **LOS BOTONES NO AUTORIZAN NADA** (criterio 2 de FU-06). Un `slg_operator` ve
 * los dos formularios en cualquier proyecto que lea; es `crearHito()` quien,
 * con `estaAsignado()` resuelto contra la base, rechaza **y audita** el intento
 * sobre uno que no es suyo. Esconder el botón no lo protegería —una Server
 * Action es un endpoint— y enseñarlo no lo abre.
 *
 * **DOS FORMULARIOS, DOS PREFIJOS DE ERROR.** Los campos se llaman igual en los
 * dos («título», «fecha»); el error vuelve como `hito:titulo` o
 * `pendiente:titulo` para que cada formulario señale solo el suyo.
 *
 * Un hito es una fecha de entrega y un pendiente una obligación con plazo. No
 * miden a nadie: frontera (b) de `scope.md`, que `check:alcance` vigila.
 */
export const dynamic = "force-dynamic";

export default async function ProyectoDeHq({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "projects");

  const { id } = await params;
  const proyecto = (await proyectos(sesion.ctx)).find((p) => p.id === id);
  if (!proyecto) notFound();

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const { error } = await searchParams;
  const [hitos, pendientes] = await Promise.all([
    hitosDeProyecto(sesion.ctx, id),
    pendientesDeProyecto(sesion.ctx, id),
  ]);
  const err = (campo: string) => (error === campo ? t["hq.form.error"] : null);
  const dia = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");
  const instante = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");
  const quienCierra = (v: string) =>
    v === "client" ? t["hq.actionItems.closesByClient"] : t["hq.actionItems.closesBySlg"];

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <p style={{ margin: 0, fontSize: "0.8125rem" }}>
          <Link href="/hq/proyectos" style={{ color: "var(--slg-link)" }}>
            {t["app.nav.projects"]}
          </Link>
        </p>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>{proyecto.nombre}</h1>
        <p style={meta}>
          {proyecto.empresa} · {proyecto.servicio} · {proyecto.estado}
        </p>
      </header>

      <section style={bloque}>
        <h2 style={h2}>{t["hq.milestones.title"]}</h2>
        <Formulario accion={accionCrearHito}>
          <input type="hidden" name="proyecto" value={id} />
          <Campo etiqueta={t["hq.milestones.name"]} error={err("hito:titulo")}>
            <Texto name="titulo" required maxLength={200} />
          </Campo>
          <Campo etiqueta={t["hq.milestones.dueAt"]} error={err("hito:fecha")}>
            <Texto name="fecha" type="date" required />
          </Campo>
          <Campo
            etiqueta={t["hq.milestones.position"]}
            error={err("hito:posicion")}
            pista={t["hq.milestones.positionHint"]}
          >
            <Texto name="orden" type="number" min={0} max={10000} step={1} />
          </Campo>
          <Boton type="submit">{t["hq.milestones.add"]}</Boton>
        </Formulario>

        {hitos.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["hq.milestones.empty"], texto: t["hq.milestones.emptyText"] }}
          />
        ) : (
          <ul style={lista}>
            {hitos.map((h) => (
              <li key={h.id} className="slg-card" style={ficha}>
                <div style={{ display: "grid", gap: "0.25rem", minWidth: 0 }}>
                  <p style={{ margin: 0 }}>
                    <strong>{h.titulo}</strong>
                  </p>
                  <p style={meta}>
                    {t["hq.milestones.dueAt"]}: {dia(h.venceEn)} · {t["hq.milestones.position"]}: {h.posicion} ·{" "}
                    {t["hq.milestones.status"]}:{" "}
                    {h.estado === "done" ? t["hq.milestones.statusDone"] : t["hq.milestones.statusPending"]}
                    {h.hechoEn ? ` (${instante(h.hechoEn)})` : ""}
                  </p>
                </div>
                {/* Hecho ⇔ con fecha lo impone el servicio (y la base): aquí
                    solo se pide el estado contrario al actual. */}
                <form action={accionCambiarEstadoDeHito} style={{ margin: 0 }}>
                  <input type="hidden" name="proyecto" value={id} />
                  <input type="hidden" name="id" value={h.id} />
                  <input type="hidden" name="estado" value={h.estado === "done" ? "pending" : "done"} />
                  <Boton type="submit">
                    {h.estado === "done" ? t["hq.milestones.reopen"] : t["hq.milestones.markDone"]}
                  </Boton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={bloque}>
        <h2 style={h2}>{t["hq.actionItems.title"]}</h2>
        <Formulario accion={accionCrearPendiente}>
          <input type="hidden" name="proyecto" value={id} />
          <Campo etiqueta={t["hq.actionItems.name"]} error={err("pendiente:titulo")}>
            <Texto name="titulo" required maxLength={200} />
          </Campo>
          <Campo
            etiqueta={t["hq.actionItems.dueAt"]}
            error={err("pendiente:fecha")}
            pista={t["hq.actionItems.dueAtHint"]}
          >
            <Texto name="fecha" type="date" />
          </Campo>
          {/* Quién puede cerrarlo se elige aquí y lo impone `cerrarPendiente`
              (RF-151): el portal enseña «hecho» solo en los del cliente, y el
              servidor rechaza —y audita— el resto. */}
          <Campo etiqueta={t["hq.actionItems.closesBy"]} error={err("pendiente:cierra")}>
            <Lista
              name="cierra"
              defaultValue="client"
              opciones={QUIEN_CIERRA.map((v) => ({ valor: v, etiqueta: quienCierra(v) }))}
            />
          </Campo>
          <Boton type="submit">{t["hq.actionItems.add"]}</Boton>
        </Formulario>

        {pendientes.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["hq.actionItems.empty"], texto: t["hq.actionItems.emptyText"] }}
          />
        ) : (
          <ul style={lista}>
            {pendientes.map((p) => (
              <li key={p.id} className="slg-card" style={ficha}>
                <div style={{ display: "grid", gap: "0.25rem", minWidth: 0 }}>
                  <p style={{ margin: 0 }}>
                    <strong>{p.titulo}</strong>
                  </p>
                  <p style={meta}>
                    {t["hq.actionItems.dueAt"]}: {dia(p.venceEn)} · {t["hq.actionItems.closesBy"]}:{" "}
                    {quienCierra(p.cierra)} · {t["hq.actionItems.status"]}:{" "}
                    {p.estado === "done" ? t["hq.actionItems.statusDone"] : t["hq.actionItems.statusOpen"]}
                  </p>
                  {p.estado === "done" ? (
                    <p style={meta}>
                      {t["hq.actionItems.closedBy"]}: {p.hechoPor ?? "—"} ({p.hechoPorTipo ?? "—"}) ·{" "}
                      {instante(p.hechoEn)}
                    </p>
                  ) : null}
                </div>
                <form
                  action={p.estado === "done" ? accionReabrirPendiente : accionCerrarPendiente}
                  style={{ margin: 0 }}
                >
                  <input type="hidden" name="proyecto" value={id} />
                  <input type="hidden" name="id" value={p.id} />
                  <Boton type="submit">
                    {p.estado === "done" ? t["hq.actionItems.reopen"] : t["hq.actionItems.close"]}
                  </Boton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const bloque: React.CSSProperties = { display: "grid", gap: "1rem" };
const h2: React.CSSProperties = { margin: 0, fontSize: "1.125rem", color: "var(--slg-blue-deep)" };
const lista: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" };
const ficha: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
  display: "flex",
  gap: "1rem",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
};
const meta: React.CSSProperties = { margin: 0, fontSize: "0.8125rem", color: "var(--slg-ink-2)" };
