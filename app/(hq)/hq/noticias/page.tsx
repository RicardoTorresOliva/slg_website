import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { ContenidoEntregado } from "@/components/app/ContenidoEntregado";
import { Estado } from "@/components/app/EstadosCanonicos";
import { Markdown } from "@/components/Markdown";
import { noticias } from "@/lib/academy";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { NEWS_IMPORTANCE } from "@/lib/db/schema";
import { empresasParaInvitar } from "@/lib/hq/usuarios";

import { accionCrearNoticia } from "../_acciones";

/**
 * `/hq/noticias` — una noticia con comentario para **una empresa**
 * (DU-29(c) · RF-150 · RF-152 · RNF-31).
 *
 * **EL COMENTARIO ES EL PRODUCTO.** El resumen es la noticia; el comentario es
 * lo que significa para ESA empresa, y por eso no hay noticia global: la misma
 * noticia para dos empresas son dos filas. El formulario pide las dos cosas y
 * ninguna es opcional.
 *
 * **PUBLICAR ES UNA DECISIÓN EXPLÍCITA**, no una casilla que se olvida: una
 * lista con dos opciones, como el idioma de un aviso. Se preselecciona «sí»
 * porque en esta unidad no hay acción de publicar después: un borrador por
 * defecto sería un borrador para siempre, y la pista lo dice.
 *
 * **LA LISTA MUESTRA LA NOTICIA RENDERIZADA, NO SU FUENTE**, con el mismo
 * componente que el portal (RNF-31): un `<script>` en el comentario sale como
 * texto y un `javascript:` deja de ser enlace. HQ ve también los borradores,
 * marcados; el portal, solo lo publicado.
 */
export const dynamic = "force-dynamic";

export default async function Noticias({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; empresa?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "newsHq");

  const idioma = idiomaDeInterfaz(sesion.locale);
  const t = loadUiStrings()[idioma];
  const q = await searchParams;
  const [lista, lasEmpresas] = await Promise.all([
    noticias(sesion.ctx, { organizationId: q.empresa || undefined, limite: 20 }),
    empresasParaInvitar(sesion.ctx),
  ]);
  const err = (campo: string) => (q.error === campo ? t["hq.form.error"] : null);
  const empresaDe = (id: string) => lasEmpresas.find((e) => e.id === id)?.nombre ?? id;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["hq.news.title"]}
      </h1>

      {lasEmpresas.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.orgs.empty"], texto: t["hq.orgs.emptyText"] }}
          accion={{ href: "/hq/empresas" }}
        />
      ) : (
        <Formulario accion={accionCrearNoticia}>
          <Campo etiqueta={t["hq.news.company"]} error={err("empresa")}>
            <Lista name="empresa" opciones={lasEmpresas.map((e) => ({ valor: e.id, etiqueta: e.nombre }))} />
          </Campo>
          <Campo etiqueta={t["hq.news.subject"]} error={err("titulo")}>
            <Texto name="titulo" required maxLength={200} />
          </Campo>
          <Campo etiqueta={t["hq.news.source"]} error={err("fuente")} pista={t["hq.news.sourceHint"]}>
            <Texto name="fuente" type="url" maxLength={2000} />
          </Campo>
          <Campo etiqueta={t["hq.news.summary"]} error={err("resumen")} pista={t["hq.ann.bodyHint"]}>
            <textarea name="resumen" required rows={6} style={cuerpo} />
          </Campo>
          <Campo etiqueta={t["hq.news.comment"]} error={err("comentario")} pista={t["hq.news.commentHint"]}>
            <textarea name="comentario" required rows={6} style={cuerpo} />
          </Campo>
          {/* Editorial (D-161): la fija quien escribe y no se calcula de nada. */}
          <Campo etiqueta={t["hq.news.importance"]} error={err("importancia")} pista={t["hq.news.importanceHint"]}>
            <Lista
              name="importancia"
              defaultValue="2"
              opciones={NEWS_IMPORTANCE.map((n) => ({ valor: String(n), etiqueta: String(n) }))}
            />
          </Campo>
          <Campo etiqueta={t["hq.news.publish"]} error={err("publicar")} pista={t["hq.news.publishHint"]}>
            <Lista
              name="publicar"
              defaultValue="si"
              opciones={[
                { valor: "si", etiqueta: t["hq.news.publishYes"] },
                { valor: "no", etiqueta: t["hq.news.publishNo"] },
              ]}
            />
          </Campo>
          <Boton type="submit">{t["hq.news.save"]}</Boton>
        </Formulario>
      )}

      {lista.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.news.empty"], texto: t["hq.news.emptyText"] }}
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1rem" }}>
          {lista.map((n) => (
            <li key={n.id} className="slg-card" style={ficha}>
              <p style={{ margin: 0, display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <strong>{n.titulo}</strong>
                <span style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
                  {empresaDe(n.organizationId)} · {t["hq.news.importance"]} {n.importancia} ·{" "}
                  {n.autor ?? "—"} ({n.autorTipo ?? "—"}) ·{" "}
                  {n.publicadaEn ? n.publicadaEn.slice(0, 16).replace("T", " ") : "—"}
                </span>
                {n.publicadaEn ? null : <span style={insigniaBorrador}>{t["hq.news.draft"]}</span>}
              </p>
              {n.fuenteUrl ? (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", overflowWrap: "anywhere" }}>
                  {/* `rel` completo y `target` explícito: la fuente es un sitio
                      ajeno, y sin `noopener` puede manipular esta pestaña. */}
                  <a href={n.fuenteUrl} target="_blank" rel="noreferrer noopener" style={{ color: "var(--slg-link)" }}>
                    {n.fuenteUrl}
                  </a>
                </p>
              ) : null}
              <p style={rotulo}>{t["hq.news.preview"]}</p>
              <ContenidoEntregado idioma={idioma}>
                <p style={subtitulo}>{t["hq.news.summaryLabel"]}</p>
                <Markdown texto={n.resumenMd} />
                <p style={subtitulo}>{t["hq.news.commentLabel"]}</p>
                <Markdown texto={n.comentarioMd} />
              </ContenidoEntregado>
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
const rotulo: React.CSSProperties = {
  margin: "0.75rem 0 0.25rem",
  fontSize: "0.75rem",
  color: "var(--slg-ink-2)",
};
const subtitulo: React.CSSProperties = {
  margin: "0.5rem 0 0",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--slg-ink-2)",
};
const insigniaBorrador: React.CSSProperties = {
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--slg-radius-sm)",
  border: "1px solid var(--slg-red)",
  color: "var(--slg-red)",
  fontSize: "0.6875rem",
};
