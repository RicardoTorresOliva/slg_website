import { notFound } from "next/navigation";

import { ContenidoEntregado } from "@/components/app/ContenidoEntregado";
import { Estado } from "@/components/app/EstadosCanonicos";
import { Markdown } from "@/components/Markdown";
import { VisorDeEntregables } from "@/components/VisorDeEntregables";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import type { DeliverableType } from "@/lib/db/schema";
import { especificacionDe } from "@/lib/deliverables/renderers";
import { enlaceDeDescarga, entregablesDelCliente } from "@/lib/hq/entregables";
import { textoDeMarkdown } from "@/lib/portal/contenido";
import { urlDelVisor, visorEstaSeparado } from "@/lib/visor/origen";

/**
 * `/portal/entregables/[id]` — **el despacho por tipo** (DU-19 · RF-142).
 *
 * **EL TIPO NO DECIDE AQUÍ: DECIDE EL MAPA.** Esta pantalla lee
 * `especificacionDe(tipo).modo` y pinta el modo, sin saber qué tipos existen.
 * Añadir un tipo —el informe nativo de `SLG_Readiness` que §5.3 deja
 * «previsto»— es añadir una entrada a `RENDERIZADORES` y, si estrena modo, una
 * rama aquí; añadir un tipo con un modo que ya existe **no toca este archivo**.
 * Una decisión de tipo repartida por la interfaz rechaza la unidad en revisión.
 *
 * **EL ENTREGABLE SE PIDE POR LA PUERTA DEL CLIENTE** y se busca por id dentro
 * de lo que esa puerta devuelve. Un `internal` no está en esa lista, así que
 * pedirlo por su identificador da 404 — no por una comprobación de visibilidad
 * que alguien pueda quitar, sino porque **nunca estuvo entre los candidatos**.
 */
export const dynamic = "force-dynamic";

export default async function Entregable({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "deliverables");

  const { id } = await params;
  const mios = await entregablesDelCliente(sesion.ctx);
  const e = mios.find((x) => x.id === id);
  if (!e) notFound();

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const spec = especificacionDe(e.tipo as DeliverableType);
  const idioma = idiomaDeInterfaz(sesion.locale);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>{e.titulo}</h1>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
          {t[spec.claveDeEtiqueta]} · {t["portal.deliv.version"]} {e.version}
        </p>
      </header>

      {spec.modo === "descarga" ? <Descarga id={e.id} t={t} /> : null}

      {spec.modo === "enlace-externo" ? (
        <p style={{ margin: 0 }}>
          {/* `rel` completo y `target` explícito: un enlace externo se abre
              fuera, y sin `noopener` la página de destino puede manipular la
              nuestra por `window.opener`. */}
          <a href={e.url ?? "#"} target="_blank" rel="noreferrer noopener" style={{ color: "var(--slg-link)" }}>
            {e.url}
          </a>
          <br />
          <small style={{ color: "var(--slg-ink-2)" }}>{t["portal.deliv.external"]}</small>
        </p>
      ) : null}

      {spec.modo === "render-en-portal" ? <EnPortal id={e.id} idioma={idioma} /> : null}

      {spec.modo === "visor-aislado" ? <Aislado id={e.id} titulo={e.titulo} t={t} /> : null}
    </div>
  );
}

/**
 * PDF y material: **URL firmada, siempre con caducidad** (criterio 5, RNF-20).
 * La firma se emite al pintar la página, así que el enlace que el cliente ve es
 * fresco; si se queda con la pestaña abierta una hora, caduca — y el texto lo
 * dice, porque un enlace que deja de funcionar sin explicación parece un fallo.
 */
async function Descarga({ id, t }: { id: string; t: Record<string, string> }) {
  const firmada = await enlaceDeDescargaSegura(id);
  if (!firmada) {
    return (
      <Estado
        estado="error_de_carga"
        textos={{ titulo: t["app.state.error_de_carga.titulo"], texto: t["app.state.error_de_carga.texto"] }}
      />
    );
  }
  return (
    <p style={{ margin: 0 }}>
      <a href={firmada.url} style={{ color: "var(--slg-link)" }}>
        {t["portal.deliv.download"]}
      </a>
      <br />
      <small style={{ color: "var(--slg-ink-2)" }}>{t["portal.deliv.expires"]}</small>
    </p>
  );
}

/** Markdown: se trae del bucket y se renderiza con el conversor saneado (RNF-31). */
async function EnPortal({ id, idioma }: { id: string; idioma: string }) {
  const texto = await textoDeMarkdown(id);
  if (texto === null) return null;
  return (
    <ContenidoEntregado idioma={idioma}>
      <Markdown texto={texto} />
    </ContenidoEntregado>
  );
}

/**
 * HTML: **visor en origen separado** (criterio 2, D-45).
 *
 * Si el origen no está configurado —o está puesto al mismo dominio de la
 * aplicación, que es el fallo silencioso— **no se enseña nada**: se enseña un
 * estado que lo dice. Servirlo desde el mismo origen «mientras tanto» es
 * exactamente lo que D-45 prohíbe.
 */
function Aislado({ id, titulo, t }: { id: string; titulo: string; t: Record<string, string> }) {
  const src = visorEstaSeparado() ? urlDelVisor(id) : null;
  if (!src) {
    return (
      <Estado
        estado="error_de_carga"
        textos={{ titulo: t["portal.deliv.viewerMissing"], texto: t["portal.deliv.viewerMissingText"] }}
      />
    );
  }
  return <VisorDeEntregables src={src} titulo={titulo} />;
}

/** Envuelve la firma para que un fallo sea un estado, no una excepción. */
async function enlaceDeDescargaSegura(id: string) {
  const { exigirSuperficie: exigir } = await import("@/lib/auth");
  try {
    const sesion = await exigir("portal");
    return await enlaceDeDescarga(sesion.ctx, id);
  } catch {
    return null;
  }
}
