import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { Estado } from "@/components/app/EstadosCanonicos";
import { Boton, Campo, Formulario, Lista, Texto } from "@/components/app/Campos";
import { TablaDeApp } from "@/components/app/TablaDeApp";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { exigirSeccion } from "@/lib/app/navegacion";
import { exigirSuperficie } from "@/lib/auth";
import { loadUiStrings } from "@/lib/content/loader";
import { empresas, ESTADOS_DE_EMPRESA, TIPOS_DE_EMPRESA, type Empresa } from "@/lib/hq/empresas";

import { accionArchivarEmpresa, accionCrearEmpresa, accionReactivarEmpresa } from "../_acciones";

/**
 * `/hq/empresas` — crear y editar empresas cliente (DU-14 · RF-77).
 *
 * El formulario está **arriba y siempre abierto**, no detrás de un botón
 * «Nueva». Esta pantalla se abre para dos cosas: mirar la lista o dar de alta
 * una empresa, y esconder la segunda tras un clic cuesta un clic en el 100 % de
 * las veces que alguien viene a eso. Con dos empresas en la lista el formulario
 * ni siquiera compite por el espacio.
 *
 * **ARCHIVAR ES DOS PASOS POR URL, SIN JAVASCRIPT.** «Archivar» es un enlace a
 * `?archivar=<id>`; con ese parámetro, la fila enseña la pregunta y el botón
 * que de verdad archiva. Un `confirm()` de cliente no sobreviviría a una
 * pantalla sin hidratar, y una URL con la pregunta sí: se recarga, se copia y
 * se vuelve atrás con el navegador. Las archivadas **no desaparecen**: bajan
 * al final, atenuadas y con su estado escrito, porque una empresa archivada
 * con entregables es la prueba de lo que se le entregó (data_model §2.5).
 */
export const dynamic = "force-dynamic";

export default async function Empresas({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; archivar?: string }>;
}) {
  const sesion = await exigirSuperficie("hq");
  exigirSeccion(sesion.ctx, "orgs");

  const t = loadUiStrings()[idiomaDeInterfaz(sesion.locale)];
  const { error, archivar } = await searchParams;
  const lista = archivadasAlFinal(await empresas(sesion.ctx));
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
          columnas={[
            t["hq.orgs.name"],
            t["hq.orgs.slug"],
            t["hq.orgs.type"],
            t["hq.orgs.status"],
            t["hq.orgs.contact"],
            t["hq.orgs.actions"],
          ]}
          filas={lista.map((e) => {
            const archivada = e.estado === "archived";
            // La tabla no sabe de filas atenuadas: se atenúa el contenido de
            // cada celda, y la de acciones se queda legible a propósito.
            const celda = (v: ReactNode) => (archivada ? <span style={atenuado}>{v}</span> : v);
            return [
              celda(e.nombre),
              celda(e.slug),
              celda(e.tipo),
              celda(e.estado),
              celda(e.contactoPrincipal ?? "—"),
              <AccionesDeEmpresa key={e.id} empresa={e} pendiente={archivar} t={t} />,
            ];
          })}
        />
      )}
    </div>
  );
}

/** Las activas primero, en su orden; las archivadas después, en el suyo. */
function archivadasAlFinal(lista: readonly Empresa[]): Empresa[] {
  return [...lista].sort((a, b) => Number(a.estado === "archived") - Number(b.estado === "archived"));
}

/**
 * La celda de acciones: «Archivar» → pregunta → «Sí, archivar» | «Cancelar»;
 * o «Reactivar» si ya está archivada. El servidor vuelve a comprobar quién
 * puede aunque el botón esté a la vista (`_acciones.ts`).
 */
function AccionesDeEmpresa({
  empresa,
  pendiente,
  t,
}: {
  empresa: Empresa;
  pendiente: string | undefined;
  t: Record<string, string>;
}) {
  if (empresa.estado === "archived") {
    return (
      <form action={accionReactivarEmpresa}>
        <input type="hidden" name="id" value={empresa.id} />
        <button type="submit" style={enlaceComoBoton}>
          {t["hq.orgs.reactivate"]}
        </button>
      </form>
    );
  }
  if (pendiente === empresa.id) {
    return (
      <div style={pregunta}>
        <span>{t["hq.orgs.archiveConfirm"]}</span>
        <form action={accionArchivarEmpresa} style={{ display: "inline" }}>
          <input type="hidden" name="id" value={empresa.id} />
          <button type="submit" style={{ ...enlaceComoBoton, fontWeight: 600 }}>
            {t["hq.orgs.archiveYes"]}
          </button>
        </form>
        <Link href="/hq/empresas" style={enlace}>
          {t["hq.orgs.archiveCancel"]}
        </Link>
      </div>
    );
  }
  return (
    <Link href={`/hq/empresas?archivar=${encodeURIComponent(empresa.id)}`} style={enlace}>
      {t["hq.orgs.archive"]}
    </Link>
  );
}

const atenuado: CSSProperties = { opacity: 0.55 };
const enlace: CSSProperties = { color: "var(--slg-link)", fontSize: "0.875rem" };
const enlaceComoBoton: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--slg-red)",
  font: "inherit",
  fontSize: "0.875rem",
  cursor: "pointer",
};
const pregunta: CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  alignItems: "baseline",
  flexWrap: "wrap",
  fontSize: "0.875rem",
};
