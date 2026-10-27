import Link from "next/link";

import { Aviso } from "@/components/app/Aviso";
import { Boton } from "@/components/app/Campos";
import { Estado } from "@/components/app/EstadosCanonicos";
import type { Hito, Pendiente } from "@/lib/academy";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { programaDelCliente } from "@/lib/portal/programa";

import { accionCerrarPendiente } from "../_acciones";

/**
 * `/portal/programa` — hitos y pendientes de cada proyecto activo, con cero
 * incertidumbre (DU-27 · RF-151 · RF-156).
 *
 * **CADA PROYECTO DICE «QUÉ SIGUE», SIEMPRE.** El próximo hito destacado o, si
 * no hay ninguno, la frase «sin hitos programados: contacta a SLG». Nunca un
 * proyecto en silencio: el cliente que abre esto tiene que salir sabiendo qué
 * pasa después y qué le toca a él.
 *
 * **EL BOTÓN «MARCAR COMO HECHO» SOLO SE PINTA EN LOS PENDIENTES QUE CIERRA EL
 * CLIENTE, Y ESO NO ES LA PROTECCIÓN.** La protección es `cerrarPendiente` en
 * `lib/academy`, que decide por `closes_by` en el servidor y audita el intento
 * como `.denied`. Aquí se esconde el botón para no invitar a pulsarlo; la
 * Server Action lo vuelve a exigir aunque alguien lo invoque sin verlo.
 *
 * Como en `/portal`: **no recibe ningún `organization_id`** (D-127). La
 * política de fila acota con el contexto de la sesión.
 */
export const dynamic = "force-dynamic";

export default async function Programa({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "program");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const q = await searchParams;
  const bloques = await programaDelCliente(sesion.ctx);

  // El resultado de la acción, por el componente canónico (criterio 1 de FU-12):
  // una pantalla no inventa su propio `role="status"`.
  const mensaje =
    q.aviso === "ok"
      ? t["portal.program.done"]
      : q.error === "permiso"
        ? t["portal.program.notYours"]
        : q.error === "pendiente"
          ? t["portal.program.notFound"]
          : null;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["portal.program.title"]}
      </h1>
      <p style={{ margin: 0, color: "var(--slg-ink-2)" }}>{t["portal.program.intro"]}</p>

      {mensaje ? <Aviso>{mensaje}</Aviso> : null}

      {bloques.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["portal.program.empty"], texto: t["portal.program.emptyText"] }}
          accion={{ href: "/portal/proyectos" }}
        />
      ) : (
        bloques.map(({ proyecto, hitos, pendientes }) => (
          <section key={proyecto.id} className="slg-card" style={ficha} aria-labelledby={`programa-${proyecto.id}`}>
            <h2 id={`programa-${proyecto.id}`} style={{ margin: 0, fontSize: "1.125rem", display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
              {proyecto.nombre}
              {/* Nombre literal e intraducible del servicio (RF-14). */}
              <code style={{ fontSize: "0.75rem" }}>{proyecto.servicio}</code>
            </h2>

            {/* ── Qué sigue ─────────────────────────────────────────────── */}
            <h3 style={subtitulo}>{t["portal.program.next"]}</h3>
            {hitos.siguiente ? (
              <p style={{ margin: 0, padding: "0.75rem 1rem", borderLeft: "3px solid var(--slg-blue)", background: "var(--slg-paper-2)" }}>
                <strong>{hitos.siguiente.titulo}</strong>{" "}
                <span style={fecha}>{t["portal.program.dueOn"]} {dia(hitos.siguiente.venceEn)}</span>
              </p>
            ) : (
              <p style={{ margin: 0, color: "var(--slg-ink-2)" }}>{t["portal.program.noMilestones"]}</p>
            )}

            {/* ── La línea de hitos ─────────────────────────────────────── */}
            {hitos.hechos.length + hitos.futuros.length > 0 ? (
              <ol style={lista} aria-label={t["portal.program.milestones"]}>
                {hitos.hechos.map((h) => (
                  <li key={h.id} style={filaHito}>
                    <span style={{ color: "var(--slg-green)" }} aria-hidden="true">✓</span>
                    <span>{h.titulo}</span>
                    <span style={fecha}>{t["portal.program.doneOn"]} {dia(h.hechoEn ?? h.venceEn)}</span>
                  </li>
                ))}
                {hitos.futuros.map((h) => (
                  <li key={h.id} style={filaHito}>
                    <span style={{ color: "var(--slg-ink-2)" }} aria-hidden="true">○</span>
                    <span>{h.titulo}</span>
                    <span style={fecha}>{t["portal.program.dueOn"]} {dia(h.venceEn)}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {/* ── Pendientes ────────────────────────────────────────────── */}
            <h3 style={subtitulo}>{t["portal.program.pending"]}</h3>
            {pendientes.abiertos.length === 0 && pendientes.cerrados.length === 0 ? (
              <p style={{ margin: 0, color: "var(--slg-ink-2)" }}>{t["portal.program.noPending"]}</p>
            ) : (
              <ul style={lista}>
                {pendientes.abiertos.map((p) => (
                  <li key={p.id} style={filaPendiente}>
                    <div>
                      <strong>{p.titulo}</strong>
                      <div style={fecha}>
                        {p.venceEn ? `${t["portal.program.dueOn"]} ${dia(p.venceEn)} · ` : ""}
                        {p.cierra === "client" ? t["portal.program.yours"] : t["portal.program.slgs"]}
                      </div>
                    </div>
                    {p.cierra === "client" ? (
                      <form action={accionCerrarPendiente}>
                        <input type="hidden" name="id" value={p.id} />
                        <Boton type="submit">{t["portal.program.markDone"]}</Boton>
                      </form>
                    ) : null}
                  </li>
                ))}
                {pendientes.cerrados.map((p) => (
                  <li key={p.id} style={{ ...filaPendiente, color: "var(--slg-ink-2)" }}>
                    <div>
                      <span aria-hidden="true">✓ </span>
                      <span>{p.titulo}</span>
                      <div style={fecha}>
                        {t["portal.program.closedOn"]} {dia(p.hechoEn ?? p.actualizadoEn)}
                        {p.hechoPor ? ` · ${p.hechoPor}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p style={{ margin: "0.25rem 0 0" }}>
              <Link href={`/portal/proyectos/${proyecto.id}`} style={{ color: "var(--slg-link)", fontSize: "0.875rem" }}>
                {t["portal.program.openProject"]}
              </Link>
            </p>
          </section>
        ))
      )}
    </div>
  );
}

/** Solo el día: es lo que el cliente tiene en el calendario. Mismo criterio que «Hoy». */
const dia = (iso: string) => iso.slice(0, 10);

/** Los tipos se importan para que el archivo no compile si `lib/academy` cambia la forma. */
export type { Hito, Pendiente };

const ficha: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
  display: "grid",
  gap: "0.75rem",
};
const subtitulo: React.CSSProperties = { margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "var(--slg-ink-2)", textTransform: "uppercase", letterSpacing: "0.04em" };
const lista: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" };
const filaHito: React.CSSProperties = { display: "grid", gridTemplateColumns: "1.25rem 1fr auto", gap: "0.5rem", alignItems: "baseline" };
const filaPendiente: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" };
const fecha: React.CSSProperties = { fontSize: "0.8125rem", color: "var(--slg-ink-2)" };
