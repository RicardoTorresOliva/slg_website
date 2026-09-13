import { notFound } from "next/navigation";

import { Aviso } from "@/components/app/Aviso";
import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie, usaMetodoDeContrasena } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { perfilDeLaSesion } from "@/lib/portal/perfil";

import { accionCambiarContrasena, accionGuardarPerfil } from "../_acciones";

/**
 * `/portal/perfil` — nombre, idioma de interfaz y contraseña (DU-21 · RF-93).
 *
 * **EL FORMULARIO DE CONTRASEÑA SOLO EXISTE SI HAY CONTRASEÑA** (criterio 3). A
 * quien entra con la cuenta de su organización no le existe ninguna que cambiar:
 * enseñarle el formulario sería ofrecerle una operación que no puede terminar y,
 * peor, hacerle creer que aquí se cambia la contraseña de su empresa — que es de
 * su departamento de sistemas y no nuestra. En su lugar se le dice eso.
 *
 * **EL CORREO SE MUESTRA Y NO SE EDITA**: es la identidad con la que se invitó y
 * con la que se entra. Cambiarlo desde aquí sería cambiar de cuenta sin
 * verificar nada.
 *
 * **NO HAY CONMUTADOR DE IDIOMA EN EL ARMAZÓN** (RF-72): el idioma es una
 * preferencia de la cuenta y se cambia **aquí**, una vez, no en cada pantalla.
 */
export const dynamic = "force-dynamic";

export default async function Perfil({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const sesion = await exigirSuperficie("portal");
  exigirSeccion(sesion.ctx, "profile");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const { error, aviso } = await searchParams;
  const perfil = await perfilDeLaSesion(sesion.ctx);
  if (!perfil) notFound();

  const conContrasena = await usaMetodoDeContrasena(String(sesion.ctx.actorId));

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["portal.profile.title"]}
      </h1>

      {aviso === "ok" ? <Aviso>{t["portal.profile.saved"]}</Aviso> : null}
      {aviso === "clave" ? <Aviso>{t["portal.profile.passwordChanged"]}</Aviso> : null}
      {aviso === "claveError" ? <Aviso>{t["portal.profile.passwordError"]}</Aviso> : null}

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <Formulario accion={accionGuardarPerfil}>
          <Campo
            etiqueta={t["portal.profile.name"]}
            error={error === "nombre" ? t["portal.profile.error"] : null}
          >
            <Texto name="nombre" defaultValue={perfil.nombre} required maxLength={120} />
          </Campo>
          <Campo etiqueta={t["portal.profile.email"]} pista={t["portal.profile.emailHint"]}>
            <Texto name="correo" defaultValue={perfil.correo} readOnly disabled />
          </Campo>
          <Campo etiqueta={t["portal.profile.language"]} pista={t["portal.profile.languageHint"]}>
            <Lista
              name="idioma"
              defaultValue={perfil.idioma}
              opciones={[
                { valor: "es", etiqueta: "es" },
                { valor: "en", etiqueta: "en" },
              ]}
            />
          </Campo>
          <Boton type="submit">{t["portal.profile.save"]}</Boton>
        </Formulario>
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={subtitulo}>{t["portal.profile.password"]}</h2>
        {conContrasena ? (
          <Formulario accion={accionCambiarContrasena}>
            <Campo etiqueta={t["portal.profile.passwordCurrent"]}>
              <Texto name="actual" type="password" required autoComplete="current-password" />
            </Campo>
            <Campo etiqueta={t["portal.profile.passwordNew"]} pista={t["portal.profile.passwordHint"]}>
              <Texto name="nueva" type="password" required minLength={12} autoComplete="new-password" />
            </Campo>
            <Boton type="submit">{t["portal.profile.passwordChange"]}</Boton>
          </Formulario>
        ) : (
          <Aviso>{t["portal.profile.passwordExternal"]}</Aviso>
        )}
      </section>
    </div>
  );
}

const subtitulo: React.CSSProperties = { margin: 0, fontSize: "1rem", color: "var(--slg-blue-deep)" };
