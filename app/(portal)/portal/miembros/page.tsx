import { Aviso } from "@/components/app/Aviso";
import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { Estado } from "@/components/app/EstadosCanonicos";
import { TablaDeApp } from "@/components/app/TablaDeApp";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie, puede } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { invitacionesDeLaEmpresa, miembrosDeLaEmpresa } from "@/lib/portal/miembros";

import { accionInvitarMiembro } from "../_acciones";

/**
 * `/portal/miembros` — quién más está, y quién puede invitar (DU-21 · RF-92).
 *
 * **LA SECCIÓN LA GOBIERNA `member.read`; EL FORMULARIO, `member.invite`.** Los
 * dos roles de cliente ven la lista (criterio 2) y solo `client_admin` ve el
 * formulario (criterio 1). Con una sola acción para las dos cosas, la pantalla
 * entera desaparecería para `client_member` — justo a quien el criterio manda
 * enseñársela.
 *
 * **NO HAY SELECTOR DE EMPRESA, Y ESA ES LA DEFENSA.** `invitarMiembro()` no
 * acepta `organization_id`: la empresa sale del contexto de la sesión. El
 * intento de invitar a otra no se rechaza en esta pantalla porque **no se puede
 * escribir** — y si llegara por otro camino, `lib/invitations` lo rechaza con
 * 404 y lo audita.
 *
 * **Esconder no es proteger**: `accionInvitarMiembro` vuelve a exigir la sección
 * y el servicio vuelve a exigir `member.invite`.
 */
export const dynamic = "force-dynamic";

export default async function Miembros({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "members");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const { error, aviso } = await searchParams;
  const [miembros, pendientes] = await Promise.all([
    miembrosDeLaEmpresa(sesion.ctx),
    invitacionesDeLaEmpresa(sesion.ctx),
  ]);
  const puedeInvitar = puede(sesion.ctx, "member.invite").permitido;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
          {t["portal.members.title"]}
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--slg-ink-2)" }}>
          {t["portal.members.intro"]}
        </p>
      </header>

      {aviso === "ok" ? <Aviso>{t["portal.members.sent"]}</Aviso> : null}
      {aviso === "sincorreo" ? <Aviso>{t["portal.members.sentNoMail"]}</Aviso> : null}

      {puedeInvitar ? (
        <section style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={subtitulo}>{t["portal.members.invite"]}</h2>
          <Formulario accion={accionInvitarMiembro}>
            <Campo
              etiqueta={t["portal.members.email"]}
              pista={t["portal.members.inviteHint"]}
              error={error === "correo" ? t["portal.members.error"] : null}
            >
              <Texto name="correo" type="email" required maxLength={200} />
            </Campo>
            <Campo etiqueta={t["portal.members.role"]}>
              <Lista
                name="rol"
                defaultValue="client_member"
                opciones={[
                  { valor: "client_member", etiqueta: "client_member" },
                  { valor: "client_admin", etiqueta: "client_admin" },
                ]}
              />
            </Campo>
            <Campo etiqueta={t["portal.members.language"]}>
              <Lista
                name="idioma"
                defaultValue="es"
                opciones={[
                  { valor: "es", etiqueta: "es" },
                  { valor: "en", etiqueta: "en" },
                ]}
              />
            </Campo>
            <Boton type="submit">{t["portal.members.send"]}</Boton>
          </Formulario>
        </section>
      ) : (
        // El estado «sin permiso para invitar» (criterio 7) se cuenta, no se
        // deja en blanco: quien no puede tiene que saber a quién pedírselo.
        <Aviso>{t["portal.members.readOnly"]}</Aviso>
      )}

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={subtitulo}>{t["portal.members.title"]}</h2>
        {miembros.length <= 1 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["portal.members.alone"], texto: t["portal.members.aloneText"] }}
          />
        ) : null}
        {miembros.length > 0 ? (
          <TablaDeApp
            etiqueta={t["portal.members.title"]}
            columnas={[t["portal.members.name"], t["portal.members.email"], t["portal.members.role"]]}
            filas={miembros.map((m) => [m.nombre, m.correo, m.rol])}
          />
        ) : null}
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={subtitulo}>{t["portal.members.pending"]}</h2>
        {pendientes.length === 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{
              titulo: t["portal.members.emptyPending"],
              texto: t["portal.members.emptyPendingText"],
            }}
          />
        ) : (
          <TablaDeApp
            etiqueta={t["portal.members.pending"]}
            columnas={[t["portal.members.email"], t["portal.members.role"], t["portal.members.expiresAt"]]}
            filas={pendientes.map((i) => [
              i.correo,
              i.rol,
              i.caducaEn.slice(0, 16).replace("T", " "),
            ])}
          />
        )}
      </section>
    </div>
  );
}

const subtitulo: React.CSSProperties = { margin: 0, fontSize: "1rem", color: "var(--slg-blue-deep)" };
