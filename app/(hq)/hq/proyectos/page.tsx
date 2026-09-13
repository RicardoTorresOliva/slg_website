import { Estado } from "@/components/app/EstadosCanonicos";
import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { TablaDeApp } from "@/components/app/TablaDeApp";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { empresas } from "@/lib/hq/empresas";
import { ESTADOS_DE_PROYECTO, proyectos } from "@/lib/hq/proyectos";
import { serviciosLiterales } from "@/lib/hq/servicios";

import { accionCrearProyecto } from "../_acciones";

/**
 * `/hq/proyectos` — proyectos ligados a una empresa (DU-14 · RF-79).
 *
 * **EL SERVICIO ES UNA LISTA, NO UNA CAJA DE TEXTO** (criterio 2). Con texto
 * libre salen «Phoenix Peex», «phoenix peex» y «Phoenix PEEX» en tres
 * proyectos, y a partir de ahí no hay forma de agrupar por servicio sin
 * normalizar a mano. Y RF-14 dice que la nomenclatura es literal e
 * intraducible: un nombre mal escrito aquí aparece después en el portal del
 * cliente y en sus entregables. La validación se repite en el servidor
 * (`esServicioLiteral`), porque un `<select>` solo restringe al navegador que
 * lo respeta.
 *
 * **Sin empresas no hay formulario**, y el estado vacío lo dice: un proyecto
 * cuelga siempre de una empresa, así que ofrecer el formulario con el
 * desplegable vacío es ofrecer un callejón.
 */
export const dynamic = "force-dynamic";

export default async function Proyectos({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "projects");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const { error } = await searchParams;
  const [lista, lasEmpresas] = await Promise.all([proyectos(sesion.ctx), empresas(sesion.ctx)]);
  const err = (campo: string) => (error === campo ? t["hq.form.error"] : null);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--slg-blue-deep)" }}>
        {t["hq.projects.title"]}
      </h1>

      {lasEmpresas.length === 0 ? (
        <Estado
          estado="vacio_inicial"
          textos={{ titulo: t["hq.projects.empty"], texto: t["hq.projects.emptyText"] }}
        />
      ) : (
        <Formulario accion={accionCrearProyecto}>
          <Campo etiqueta={t["hq.projects.company"]} error={err("empresa")}>
            <Lista
              name="empresa"
              opciones={lasEmpresas.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
            />
          </Campo>
          <Campo etiqueta={t["hq.projects.name"]} error={err("nombre")}>
            <Texto name="nombre" required maxLength={120} aria-invalid={error === "nombre"} />
          </Campo>
          <Campo
            etiqueta={t["hq.projects.service"]}
            error={err("servicio")}
            pista={t["hq.projects.serviceHint"]}
          >
            <Lista
              name="servicio"
              opciones={serviciosLiterales().map((s) => ({ valor: s, etiqueta: s }))}
            />
          </Campo>
          <Campo etiqueta={t["hq.projects.status"]} error={err("estado")}>
            <Lista
              name="estado"
              defaultValue="active"
              opciones={ESTADOS_DE_PROYECTO.map((v) => ({ valor: v, etiqueta: v }))}
            />
          </Campo>
          <Campo etiqueta={t["hq.projects.startsAt"]} error={err("fechas")}>
            <Texto name="empieza" type="date" />
          </Campo>
          <Campo etiqueta={t["hq.projects.endsAt"]} error={err("fechas")}>
            <Texto name="termina" type="date" />
          </Campo>
          <Boton type="submit">{t["hq.projects.save"]}</Boton>
        </Formulario>
      )}

      {lista.length === 0 ? (
        lasEmpresas.length > 0 ? (
          <Estado
            estado="vacio_inicial"
            textos={{ titulo: t["hq.projects.empty"], texto: t["hq.projects.emptyText"] }}
          />
        ) : null
      ) : (
        <TablaDeApp
          etiqueta={t["hq.projects.title"]}
          columnas={[
            t["hq.projects.name"],
            t["hq.projects.company"],
            t["hq.projects.service"],
            t["hq.projects.status"],
            t["hq.projects.startsAt"],
            t["hq.projects.endsAt"],
          ]}
          filas={lista.map((p) => [
            p.nombre,
            p.empresa,
            p.servicio,
            p.estado,
            p.empiezaEn ?? "—",
            p.terminaEn ?? "—",
          ])}
        />
      )}
    </div>
  );
}
