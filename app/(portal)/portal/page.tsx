import { Estado } from "@/components/app/EstadosCanonicos";
import { ContenidoEntregado } from "@/components/app/ContenidoEntregado";
import { Markdown } from "@/components/Markdown";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { avisos, type Aviso } from "@/lib/hq/avisos";

/**
 * `/portal` — los avisos de **la empresa del usuario** (DU-18 · RF-88).
 *
 * **NO SE LE PASA NINGÚN `organization_id`**, y eso es la unidad entera. El
 * filtrado lo hace la política de fila con el contexto de la sesión: no hay
 * parámetro que cruzar, no hay identificador en la URL y no hay nada que
 * manipular. Es literalmente lo que `test:aislamiento` demuestra —A pidiendo
 * los avisos de B recibe cero— y por eso esta pantalla puede ser tan corta.
 *
 * **EL AVISO SE MUESTRA TAL COMO SE ENTREGÓ** (RF-72). Va dentro de
 * `ContenidoEntregado`: un aviso escrito en inglés se lee en inglés aunque la
 * interfaz esté en español, con su `lang` propio para que un lector de pantalla
 * no lo lea con la fonética equivocada y con `translate="no"` para que el
 * traductor del navegador no lo cambie a espaldas de todos.
 *
 * **EL ESTADO VACÍO ESTÁ REDACTADO** (criterio 2). No es un hueco ni un «0
 * resultados»: dice qué va a pasar y **que no hace falta volver a mirar**,
 * porque el aviso llega por correo. Un portal al que hay que asomarse por si
 * acaso es un portal que nadie abre.
 */
export const dynamic = "force-dynamic";

export default async function Portal() {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "announcements");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];

  /**
   * El fallo de carga es **un estado de la pantalla**, no un error que tumbe la
   * sesión: si la base tarda, el cliente ve un cartel que dice qué pasa y que
   * puede reintentar, no una pantalla de error del servidor (criterio 4).
   */
  let lista: Aviso[] | null = null;
  try {
    lista = await avisos(sesion.ctx);
  } catch {
    lista = null;
  }

  if (lista === null) {
    return (
      <Estado
        estado="error_de_carga"
        textos={{
          titulo: t["portal.ann.error"],
          texto: t["portal.ann.errorText"],
          accion: t["app.state.error_de_carga.accion"],
        }}
        accion={{ href: "/portal" }}
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["portal.ann.title"]}
      </h1>

      {lista.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["portal.ann.empty"], texto: t["portal.ann.emptyText"] }}
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1.5rem" }}>
          {lista.map((a) => (
            <li key={a.id} className="slg-card" style={ficha}>
              <h2 style={{ margin: 0, fontSize: "1.125rem", color: "var(--slg-blue-deep)" }}>{a.titulo}</h2>
              <p style={meta}>
                {a.publicadoEn ? (
                  <time dateTime={a.publicadoEn}>{a.publicadoEn.slice(0, 10)}</time>
                ) : null}
                {a.autor ? ` · ${t["portal.ann.from"]} ${a.autor}` : null}
              </p>
              {/* El idioma del CONTENIDO puede no ser el de la interfaz: el aviso
                  se muestra tal como se entregó, no traducido (RF-72). */}
              <ContenidoEntregado idioma={a.idioma}>
                <Markdown texto={a.cuerpoMd} />
              </ContenidoEntregado>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ficha: React.CSSProperties = {
  padding: "1.25rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
};
const meta: React.CSSProperties = {
  margin: "0.25rem 0 0.75rem",
  fontSize: "0.8125rem",
  color: "var(--slg-ink-2)",
};
