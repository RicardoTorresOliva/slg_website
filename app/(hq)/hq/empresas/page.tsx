import { Estado } from "@/components/app/EstadosCanonicos";
import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { TablaDeApp } from "@/components/app/TablaDeApp";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { empresas, ESTADOS_DE_EMPRESA, TIPOS_DE_EMPRESA } from "@/lib/hq/empresas";

import { accionCrearEmpresa } from "../_acciones";

/**
 * `/hq/empresas` — crear y editar empresas cliente (DU-14 · RF-77).
 *
 * El formulario está **arriba y siempre abierto**, no detrás de un botón
 * «Nueva». Esta pantalla se abre para dos cosas: mirar la lista o dar de alta
 * una empresa, y esconder la segunda tras un clic cuesta un clic en el 100 % de
 * las veces que alguien viene a eso. Con dos empresas en la lista el formulario
 * ni siquiera compite por el espacio.
 */
export const dynamic = "force-dynamic";

export default async function Empresas({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "orgs");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const { error } = await searchParams;
  const lista = await empresas(sesion.ctx);
  const err = (campo: string) => (error === campo ? t["hq.form.error"] : null);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["hq.orgs.title"]}
      </h1>

      <Formulario accion={accionCrearEmpresa}>
        <Campo etiqueta={t["hq.orgs.name"]} error={err("nombre")}>
          <Texto name="nombre" required maxLength={120} aria-invalid={error === "nombre"} />
        </Campo>
        <Campo etiqueta={t["hq.orgs.slug"]} error={err("slug")}>
          {/* Vacío se deriva del nombre: pedir dos veces lo mismo es cómo se
              acaban teniendo nombres y slugs que no se parecen. */}
          <Texto name="slug" maxLength={60} aria-invalid={error === "slug"} />
        </Campo>
        <Campo etiqueta={t["hq.orgs.type"]} error={err("tipo")}>
          <Lista name="tipo" defaultValue="client" opciones={TIPOS_DE_EMPRESA.map((v) => ({ valor: v, etiqueta: v }))} />
        </Campo>
        <Campo etiqueta={t["hq.orgs.status"]} error={err("estado")}>
          <Lista name="estado" defaultValue="active" opciones={ESTADOS_DE_EMPRESA.map((v) => ({ valor: v, etiqueta: v }))} />
        </Campo>
        <Campo etiqueta={t["hq.orgs.contact"]}>
          <Texto name="contacto" type="email" maxLength={200} />
        </Campo>
        <Boton type="submit">{t["hq.orgs.save"]}</Boton>
      </Formulario>

      {lista.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.orgs.empty"], texto: t["hq.orgs.emptyText"] }}
        />
      ) : (
        <TablaDeApp
          etiqueta={t["hq.orgs.title"]}
          columnas={[t["hq.orgs.name"], t["hq.orgs.slug"], t["hq.orgs.type"], t["hq.orgs.status"], t["hq.orgs.contact"]]}
          filas={lista.map((e) => [e.nombre, e.slug, e.tipo, e.estado, e.contactoPrincipal ?? "—"])}
        />
      )}
    </div>
  );
}
