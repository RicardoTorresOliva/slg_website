import { Aviso } from "@/components/app/Aviso";
import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { Estado } from "@/components/app/EstadosCanonicos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { claves, recogerParaMostrar } from "@/lib/hq/claves";
import { empresasParaInvitar } from "@/lib/hq/usuarios";
import { API_SCOPES } from "@/lib/db/schema";

import { accionCrearClave, accionRevocarClave } from "../_acciones";

/**
 * `/hq/claves` — crear y revocar claves de API (DU-17 · RF-82 · RF-147).
 *
 * **LOS ALCANCES SON CASILLAS, NO UN DESPLEGABLE MÚLTIPLE.** Con casillas se ve
 * de un vistazo **cuáles hay y cuáles están marcadas**; un `<select multiple>`
 * esconde la mitad de la lista y se desmarca solo al hacer clic sin `Ctrl`, que
 * es como se crea una clave con un alcance de menos sin enterarse. Y ninguno
 * implica a otro (RF-147): `deliverables:write` **no** da `deliverables:read`,
 * así que hay que marcar los dos si se quieren los dos.
 *
 * **NINGÚN CAMPO DE LOS TRES TIENE VALOR POR DEFECTO ÚTIL** (criterio 1): el
 * límite y la ventana vienen con un número razonable porque un número es
 * obligatorio, pero **la caducidad se deja vacía a propósito**. Rellenarla con
 * «dentro de un año» sería el defecto silencioso que hace que todas las claves
 * duren un año porque nadie lo cambió.
 *
 * **LA CLAVE SE ENSEÑA UNA VEZ** (criterio 2) y no viaja por la URL: lo que
 * viaja es un identificador de un solo uso. Recargar la página no la vuelve a
 * mostrar, y eso es el comportamiento correcto, no un fallo.
 */
export const dynamic = "force-dynamic";

export default async function Claves({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string; aviso?: string; error?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "apikeys");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const q = await searchParams;
  const [lista, lasEmpresas] = await Promise.all([
    claves(sesion.ctx),
    empresasParaInvitar(sesion.ctx),
  ]);
  const enClaro = recogerParaMostrar(q.nueva);
  const err = (campo: string) => (q.error === campo ? t["hq.form.error"] : null);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["hq.keys.title"]}
      </h1>

      {q.aviso === "revocada" ? <Aviso>{t["hq.keys.revokedNotice"]}</Aviso> : null}

      {enClaro ? (
        <section style={cajaSecreto}>
          <p style={{ margin: 0, fontWeight: 600 }}>{t["hq.keys.onceTitle"]}</p>
          {/* `readOnly` y no texto suelto: se selecciona de una pasada. */}
          <textarea readOnly rows={2} value={enClaro} style={secreto} />
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>
            {t["hq.keys.onceText"]}
          </p>
        </section>
      ) : null}

      <Formulario accion={accionCrearClave}>
        <Campo etiqueta={t["hq.keys.name"]} error={err("nombre")}>
          <Texto name="nombre" required maxLength={120} />
        </Campo>
        <Campo etiqueta={t["hq.keys.company"]}>
          <Lista
            name="empresa"
            opciones={[
              { valor: "", etiqueta: t["hq.keys.companyNone"] },
              ...lasEmpresas.map((e) => ({ valor: e.id, etiqueta: e.nombre })),
            ]}
          />
        </Campo>
        <Campo etiqueta={t["hq.keys.limit"]} error={err("limite")}>
          <Texto name="limite" type="number" min={1} max={10000} defaultValue={60} required />
        </Campo>
        <Campo etiqueta={t["hq.keys.window"]} error={err("ventana")}>
          <Texto name="ventana" type="number" min={1} defaultValue={60} required />
        </Campo>
        <Campo etiqueta={t["hq.keys.expiresAt"]} error={err("caduca")} pista={t["hq.keys.expiresHint"]}>
          <Texto name="caduca" type="date" required />
        </Campo>
        <Campo etiqueta={t["hq.keys.scopes"]} error={err("alcances")} pista={t["hq.keys.scopesHint"]}>
          <span style={{ display: "grid", gap: "0.25rem" }}>
            {API_SCOPES.map((a) => (
              <label key={a} style={casilla}>
                <input type="checkbox" name="alcances" value={a} />
                <code>{a}</code>
              </label>
            ))}
          </span>
        </Campo>
        <Boton type="submit">{t["hq.keys.create"]}</Boton>
      </Formulario>

      {lista.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.keys.empty"], texto: t["hq.keys.emptyText"] }}
        />
      ) : (
        <table data-slg-tabla style={tabla}>
          <caption style={leyenda}>{t["hq.keys.title"]}</caption>
          <thead>
            <tr>
              {[
                t["hq.keys.name"],
                t["hq.keys.scopes"],
                t["hq.keys.limit"],
                t["hq.keys.expiresAt"],
                t["hq.keys.lastUsed"],
                t["hq.keys.status"],
                "",
              ].map((c, i) => (
                <th key={i} scope="col" style={celdaCabecera}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td data-label={t["hq.keys.name"]} style={celda}>{c.nombre}</td>
                <td data-label={t["hq.keys.scopes"]} style={celda}>
                  <code style={{ fontSize: "0.75rem" }}>{c.alcances.join(" · ")}</code>
                </td>
                <td data-label={t["hq.keys.limit"]} style={celda}>
                  {c.limite}/{c.ventanaSegundos}s
                </td>
                <td data-label={t["hq.keys.expiresAt"]} style={celda}>
                  {c.caducaEn ? c.caducaEn.slice(0, 10) : "—"}
                </td>
                <td data-label={t["hq.keys.lastUsed"]} style={celda}>
                  {c.usadaEn ? c.usadaEn.slice(0, 16).replace("T", " ") : t["hq.keys.never"]}
                </td>
                <td data-label={t["hq.keys.status"]} style={celda}>
                  {c.revocadaEn ? t["hq.keys.revoked"] : c.muerta ? t["hq.keys.expired"] : t["hq.keys.active"]}
                </td>
                <td style={celda}>
                  {/* Una clave ya muerta no se revoca otra vez: el botón no
                      existe donde no procede, y el servidor lo comprueba igual. */}
                  {c.muerta ? null : (
                    <form action={accionRevocarClave}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" style={enlaceComoBoton}>
                        {t["hq.keys.revoke"]}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const cajaSecreto: React.CSSProperties = {
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
  fontSize: "0.8125rem",
  resize: "vertical",
  background: "var(--slg-paper)",
};
const casilla: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  fontSize: "0.8125rem",
};
const tabla: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" };
const leyenda: React.CSSProperties = {
  textAlign: "left",
  paddingBottom: "0.75rem",
  color: "var(--slg-ink-2)",
  fontSize: "0.875rem",
};
const celdaCabecera: React.CSSProperties = {
  textAlign: "left",
  padding: "0.625rem 0.75rem",
  borderBottom: "1px solid var(--slg-line)",
  color: "var(--slg-ink-2)",
  fontWeight: 600,
  fontSize: "0.8125rem",
};
const celda: React.CSSProperties = { padding: "0.75rem", borderBottom: "1px solid var(--slg-line)" };
const enlaceComoBoton: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--slg-red)",
  font: "inherit",
  fontSize: "0.875rem",
  cursor: "pointer",
};
