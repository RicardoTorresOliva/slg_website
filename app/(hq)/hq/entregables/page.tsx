import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { DELIVERABLE_TYPES, VISIBILITY } from "@/lib/db/schema";
import { recogerParaMostrar } from "@/lib/hq/claves";
import { entregables } from "@/lib/hq/entregables";
import { proyectos } from "@/lib/hq/proyectos";

import { accionPublicarEntregable } from "../_acciones";

/**
 * `/hq/entregables` — publicar por archivo o por enlace (DU-15 · RF-80 · RF-143).
 *
 * **LA LISTA SE AGRUPA POR FAMILIA**, no por fila. Un entregable con tres
 * versiones son tres filas en la base y **una sola cosa** para quien lo mira:
 * enseñarlas sueltas haría que la lista creciera con cada corrección y que
 * encontrar «el último» fuera leer números de versión uno a uno.
 *
 * **EL ARCHIVO NO SE SUBE POR AQUÍ.** El formulario manda nombre, tipo y
 * tamaño; el servidor valida los tres **antes de firmar** (RNF-25) y devuelve
 * una URL de subida directa al bucket privado. Que el archivo atravesara el
 * servidor costaría memoria y tiempo sin añadir ninguna comprobación.
 *
 * **`internal` se marca en la lista** (criterio 5): quien publica tiene que ver
 * de un vistazo qué no llega al cliente. La defensa de verdad no es esta
 * etiqueta —es que el portal pide la lista por `entregablesDelCliente()`, que
 * no tiene forma de devolver un `internal`— pero una etiqueta evita el susto de
 * publicar algo interno creyendo que se estaba entregando.
 */
export const dynamic = "force-dynamic";

export default async function Entregables({
  searchParams,
}: {
  searchParams: Promise<{ subida?: string; error?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "deliverablesHq");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const q = await searchParams;
  const [lista, losProyectos] = await Promise.all([
    entregables(sesion.ctx),
    proyectos(sesion.ctx),
  ]);
  const urlDeSubida = recogerParaMostrar(q.subida);
  const err = (campo: string) => (q.error?.startsWith(campo) ? t["hq.form.error"] : null);

  // Agrupadas por familia, y de cada una la versión más alta arriba.
  const familias = new Map<string, typeof lista>();
  for (const e of lista) familias.set(e.familyId, [...(familias.get(e.familyId) ?? []), e]);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["hq.deliv.title"]}
      </h1>

      {urlDeSubida ? (
        <section style={cajaSubida}>
          <p style={{ margin: 0, fontWeight: 600 }}>{t["hq.deliv.uploadPending"]}</p>
          <textarea readOnly rows={3} value={urlDeSubida} style={secreto} />
        </section>
      ) : null}

      {losProyectos.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.projects.empty"], texto: t["hq.projects.emptyText"] }}
          accion={{ href: "/hq/proyectos" }}
        />
      ) : (
        <Formulario accion={accionPublicarEntregable}>
          <Campo etiqueta={t["hq.deliv.project"]} error={err("proyecto")}>
            <Lista
              name="proyecto"
              opciones={losProyectos.map((p) => ({ valor: p.id, etiqueta: `${p.empresa} · ${p.nombre}` }))}
            />
          </Campo>
          {/* La empresa viaja aparte y no se deduce del proyecto en el cliente:
              deducirla aquí dejaría que el formulario eligiera de quién es el
              entregable. El servidor la usa tal cual para la política de fila. */}
          <Campo etiqueta={t["hq.orgs.title"]} error={err("empresa")}>
            <Lista
              name="empresa"
              opciones={losProyectos.map((p) => ({ valor: p.organizationId, etiqueta: p.empresa }))}
            />
          </Campo>
          <Campo etiqueta={t["hq.deliv.name"]} error={err("titulo")}>
            <Texto name="titulo" required maxLength={200} />
          </Campo>
          <Campo etiqueta={t["hq.deliv.type"]} error={err("tipo")}>
            <Lista
              name="tipo"
              defaultValue="pdf"
              opciones={DELIVERABLE_TYPES.map((v) => ({ valor: v, etiqueta: v }))}
            />
          </Campo>
          <Campo etiqueta={t["hq.deliv.visibility"]} error={err("visibilidad")}>
            <Lista
              name="visibilidad"
              defaultValue="client"
              opciones={VISIBILITY.map((v) => ({ valor: v, etiqueta: v }))}
            />
          </Campo>
          <Campo etiqueta={t["hq.deliv.url"]} error={err("url")} pista={t["hq.deliv.urlHint"]}>
            <Texto name="url" type="url" maxLength={500} />
          </Campo>
          <Campo etiqueta={t["hq.deliv.file"]} error={err("archivo")} pista={t["hq.deliv.fileHint"]}>
            <Texto name="nombre" maxLength={120} placeholder={t["hq.deliv.filePlaceholder"]} />
          </Campo>
          <Campo etiqueta={t["hq.deliv.mime"]} error={err("archivo")}>
            <Texto name="mime" maxLength={120} placeholder={t["hq.deliv.mimePlaceholder"]} />
          </Campo>
          <Campo etiqueta={t["hq.deliv.bytes"]} error={err("archivo")}>
            <Texto name="bytes" type="number" min={1} />
          </Campo>
          <Campo etiqueta={t["hq.deliv.family"]} pista={t["hq.deliv.familyHint"]}>
            <Lista
              name="familia"
              opciones={[
                { valor: "", etiqueta: "—" },
                ...[...familias.entries()].map(([fam, versiones]) => ({
                  valor: fam,
                  etiqueta: `${versiones[0].titulo} (v${Math.max(...versiones.map((v) => v.version))})`,
                })),
              ]}
            />
          </Campo>
          <Boton type="submit">{t["hq.deliv.publish"]}</Boton>
        </Formulario>
      )}

      {lista.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.deliv.empty"], texto: t["hq.deliv.emptyText"] }}
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
          {[...familias.values()].map((versiones) => {
            const ordenadas = [...versiones].sort((a, b) => b.version - a.version);
            const ultima = ordenadas[0];
            return (
              <li key={ultima.familyId} className="slg-card" style={ficha}>
                <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong>{ultima.titulo}</strong>
                  <code style={{ fontSize: "0.75rem" }}>{ultima.tipo}</code>
                  <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
                    {t["hq.deliv.version"]} {ultima.version}
                  </span>
                  {ultima.visibilidad === "internal" ? (
                    <span style={insigniaInterno}>{t["hq.deliv.internal"]}</span>
                  ) : null}
                </p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--slg-ink-2)", overflowWrap: "anywhere" }}>
                  {t["hq.deliv.publishedBy"]}: {ultima.publicadoPor ?? "—"} ({ultima.publicadoPorTipo ?? "—"}) ·{" "}
                  {ultima.publicadoEn ? ultima.publicadoEn.slice(0, 16).replace("T", " ") : "—"}
                  {ultima.url ? ` · ${ultima.url}` : ""}
                </p>
                {/* Las versiones anteriores NO desaparecen (RF-143): se pliegan,
                    que es distinto. La pregunta «¿qué le dimos en marzo?» tiene
                    que tener respuesta. */}
                {ordenadas.length > 1 ? (
                  <details style={{ marginTop: "0.5rem" }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.875rem" }}>
                      {ordenadas.length - 1} · {t["hq.deliv.version"]}
                    </summary>
                    <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.8125rem" }}>
                      {ordenadas.slice(1).map((v) => (
                        <li key={v.id}>
                          v{v.version} · {v.publicadoEn?.slice(0, 16).replace("T", " ") ?? "—"} ·{" "}
                          {v.publicadoPor ?? "—"}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const cajaSubida: React.CSSProperties = {
  display: "grid",
  gap: "0.5rem",
  padding: "1rem",
  border: "1px solid var(--slg-blue-deep)",
  borderRadius: "var(--slg-radius-md)",
  background: "var(--slg-paper-2)",
};
const secreto: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  fontFamily: "ui-monospace, monospace",
  fontSize: "0.75rem",
  resize: "vertical",
  background: "var(--slg-paper)",
};
const ficha: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
const insigniaInterno: React.CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--slg-radius-sm)",
  border: "1px solid var(--slg-red)",
  color: "var(--slg-red)",
  fontSize: "0.6875rem",
};
