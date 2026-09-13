import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { Estado } from "@/components/app/EstadosCanonicos";
import { Markdown } from "@/components/Markdown";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { avisos } from "@/lib/hq/avisos";
import { empresasParaInvitar } from "@/lib/hq/usuarios";

import { accionPublicarAviso } from "../_acciones";

/**
 * `/hq/avisos` — un aviso dirigido a **una empresa** (DU-15 · RF-81 · RNF-31).
 *
 * **LA LISTA MUESTRA EL AVISO RENDERIZADO, NO SU FUENTE.** Es lo que el cliente
 * va a leer, y quien lo publica tiene que ver exactamente eso: un `**` mal
 * cerrado se nota mirando el resultado y no se nota mirando el texto. Se
 * renderiza con el mismo componente que el portal, así que lo que se ve aquí
 * **es** lo que se verá allí.
 *
 * **EL SANEADO ESTÁ EN EL RENDERIZADOR** (RNF-31). `Markdown` no produce HTML
 * arbitrario —construye elementos de React—, así que un `<script>` dentro del
 * cuerpo sale como texto; y desde DU-15 restringe además el esquema de los
 * enlaces, porque este Markdown ya no viene del repositorio: lo escribe una
 * persona en un formulario y lo lee un cliente. Se guarda el texto **tal como
 * se escribió**: una limpieza en la escritura se pierde para siempre.
 */
export const dynamic = "force-dynamic";

export default async function Avisos({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; empresa?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "announcementsHq");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const q = await searchParams;
  const [lista, lasEmpresas] = await Promise.all([
    avisos(sesion.ctx, q.empresa || undefined),
    empresasParaInvitar(sesion.ctx),
  ]);
  const err = (campo: string) => (q.error === campo ? t["hq.form.error"] : null);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["hq.ann.title"]}
      </h1>

      {lasEmpresas.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.orgs.empty"], texto: t["hq.orgs.emptyText"] }}
          accion={{ href: "/hq/empresas" }}
        />
      ) : (
        <Formulario accion={accionPublicarAviso}>
          <Campo etiqueta={t["hq.ann.company"]} error={err("empresa")}>
            <Lista name="empresa" opciones={lasEmpresas.map((e) => ({ valor: e.id, etiqueta: e.nombre }))} />
          </Campo>
          <Campo etiqueta={t["hq.ann.subject"]} error={err("titulo")}>
            <Texto name="titulo" required maxLength={200} />
          </Campo>
          <Campo etiqueta={t["hq.ann.body"]} error={err("cuerpo")} pista={t["hq.ann.bodyHint"]}>
            <textarea name="cuerpo" required rows={8} style={cuerpo} />
          </Campo>
          <Boton type="submit">{t["hq.ann.publish"]}</Boton>
        </Formulario>
      )}

      {lista.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.ann.empty"], texto: t["hq.ann.emptyText"] }}
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1rem" }}>
          {lista.map((a) => (
            <li key={a.id} className="slg-card" style={ficha}>
              <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <strong>{a.titulo}</strong>
                <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
                  {lasEmpresas.find((e) => e.id === a.organizationId)?.nombre ?? a.organizationId} ·{" "}
                  {a.autor ?? "—"} ({a.autorTipo ?? "—"}) ·{" "}
                  {a.publicadoEn ? a.publicadoEn.slice(0, 16).replace("T", " ") : "—"}
                </span>
              </p>
              <p style={{ margin: "0.75rem 0 0.25rem", fontSize: "0.75rem", color: "var(--slg-ink-2)" }}>
                {t["hq.ann.preview"]}
              </p>
              <Markdown texto={a.cuerpoMd} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const cuerpo: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.625rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  fontSize: "0.9375rem",
  fontFamily: "inherit",
  background: "var(--slg-paper)",
  resize: "vertical",
  minWidth: 0,
};
const ficha: React.CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
