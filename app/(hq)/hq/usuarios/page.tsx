import { Estado } from "@/components/app/EstadosCanonicos";
import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { TablaDeApp } from "@/components/app/TablaDeApp";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie, puede } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import {
  empresasParaInvitar,
  invitacionesPendientes,
  usuariosDeSlg,
} from "@/lib/hq/usuarios";

import {
  accionInvitarACliente,
  accionInvitarASlg,
  accionReenviarInvitacion,
  accionRevocarInvitacion,
} from "../_acciones";

/**
 * `/hq/usuarios` — equipo de SLG e invitaciones (DU-14 · RF-78 · RF-86).
 *
 * **DOS FORMULARIOS Y NO UNO**, porque son dos actos distintos con dos permisos
 * distintos. Invitar a **SLG** es repartir acceso a todas las empresas a la vez
 * y solo lo puede hacer `slg_admin` (`user.invite.slg`); invitar a una **empresa
 * cliente** lo puede hacer también un operador (`member.invite`). Un solo
 * formulario con un desplegable de rol escondería esa diferencia justo donde
 * más cara sale.
 *
 * **EL FORMULARIO DE SLG NO SE PINTA A QUIEN NO PUEDE** (FU-12, criterio 5) —y
 * la comprobación de verdad sigue estando en el servidor: la Server Action
 * vuelve a exigir la acción, porque una Server Action es un endpoint HTTP y se
 * puede llamar sin haber visto nunca el formulario.
 *
 * **REVOCAR Y REENVIAR SON `POST`**, no enlaces: revocar por GET lo dispara
 * cualquier `<img src>`, y la invitación de alguien se caería sola.
 */
export const dynamic = "force-dynamic";

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "users");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const { error } = await searchParams;
  const [equipo, pendientes, lasEmpresas] = await Promise.all([
    usuariosDeSlg(sesion.ctx),
    invitacionesPendientes(sesion.ctx),
    empresasParaInvitar(sesion.ctx),
  ]);

  const puedeInvitarASlg = puede(sesion.ctx, "user.invite.slg").permitido;
  const internas = lasEmpresas.filter((e) => e.tipo === "slg");
  const clientes = lasEmpresas.filter((e) => e.tipo === "client");
  const idiomas = [
    { valor: "es", etiqueta: "es" },
    { valor: "en", etiqueta: "en" },
  ];

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["hq.users.title"]}
      </h1>

      {puedeInvitarASlg && internas.length > 0 ? (
        <section style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={subtitulo}>{t["hq.users.inviteSlg"]}</h2>
          <Formulario accion={accionInvitarASlg}>
            <Campo etiqueta={t["hq.users.email"]} error={error === "email" ? t["hq.form.error"] : null}>
              <Texto name="email" type="email" required maxLength={200} />
            </Campo>
            <Campo etiqueta={t["hq.users.company"]}>
              <Lista name="empresa" opciones={internas.map((e) => ({ valor: e.id, etiqueta: e.nombre }))} />
            </Campo>
            <Campo etiqueta={t["hq.users.role"]}>
              <Lista
                name="rol"
                defaultValue="slg_operator"
                opciones={[
                  { valor: "slg_operator", etiqueta: "slg_operator" },
                  { valor: "slg_admin", etiqueta: "slg_admin" },
                ]}
              />
            </Campo>
            <Campo etiqueta={t["hq.users.language"]}>
              <Lista name="idioma" defaultValue="es" opciones={idiomas} />
            </Campo>
            <Boton type="submit">{t["hq.users.send"]}</Boton>
          </Formulario>
        </section>
      ) : null}

      {clientes.length > 0 ? (
        <section style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={subtitulo}>{t["hq.users.inviteClient"]}</h2>
          <Formulario accion={accionInvitarACliente}>
            <Campo etiqueta={t["hq.users.email"]}>
              <Texto name="email" type="email" required maxLength={200} />
            </Campo>
            <Campo etiqueta={t["hq.users.company"]}>
              <Lista name="empresa" opciones={clientes.map((e) => ({ valor: e.id, etiqueta: e.nombre }))} />
            </Campo>
            <Campo etiqueta={t["hq.users.role"]}>
              <Lista
                name="rol"
                defaultValue="client_member"
                opciones={[
                  { valor: "client_member", etiqueta: "client_member" },
                  { valor: "client_admin", etiqueta: "client_admin" },
                ]}
              />
            </Campo>
            <Campo etiqueta={t["hq.users.language"]}>
              <Lista name="idioma" defaultValue="es" opciones={idiomas} />
            </Campo>
            <Boton type="submit">{t["hq.users.send"]}</Boton>
          </Formulario>
        </section>
      ) : null}

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={subtitulo}>{t["hq.users.pending"]}</h2>
        {pendientes.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["hq.users.emptyPending"], texto: t["hq.users.emptyPendingText"] }}
          />
        ) : (
          <table data-slg-tabla style={tabla}>
            <caption style={leyenda}>{t["hq.users.pending"]}</caption>
            <thead>
              <tr>
                {[t["hq.users.email"], t["hq.users.company"], t["hq.users.role"], t["hq.users.expiresAt"], ""].map(
                  (c, i) => (
                    <th key={i} scope="col" style={celdaCabecera}>
                      {c}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {pendientes.map((i) => (
                <tr key={i.id}>
                  <td data-label={t["hq.users.email"]} style={celda}>{i.email}</td>
                  <td data-label={t["hq.users.company"]} style={celda}>{i.empresa}</td>
                  <td data-label={t["hq.users.role"]} style={celda}>{i.role}</td>
                  <td data-label={t["hq.users.expiresAt"]} style={celda}>
                    <time dateTime={new Date(i.expiresAt).toISOString()}>
                      {new Date(i.expiresAt).toISOString().slice(0, 16).replace("T", " ")}
                    </time>
                  </td>
                  <td style={{ ...celda, display: "flex", gap: "0.5rem" }}>
                    <form action={accionReenviarInvitacion}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" style={enlaceComoBoton}>
                        {t["hq.users.resend"]}
                      </button>
                    </form>
                    <form action={accionRevocarInvitacion}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" style={{ ...enlaceComoBoton, color: "var(--slg-red)" }}>
                        {t["hq.users.revoke"]}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={subtitulo}>{t["hq.users.slg"]}</h2>
        {equipo.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["hq.users.emptySlg"], texto: t["hq.users.emptySlgText"] }}
          />
        ) : (
          <TablaDeApp
            etiqueta={t["hq.users.slg"]}
            columnas={[t["hq.orgs.name"], t["hq.users.email"], t["hq.users.role"], t["hq.users.language"]]}
            filas={equipo.map((u) => [u.nombre, u.correo, u.rol, u.idioma])}
          />
        )}
      </section>
    </div>
  );
}

const subtitulo: React.CSSProperties = { margin: 0, fontSize: "1rem", color: "var(--slg-blue-deep)" };
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
  color: "var(--slg-link)",
  font: "inherit",
  fontSize: "0.875rem",
  cursor: "pointer",
};
