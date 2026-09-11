"use client";

import { useState } from "react";

import { AppShell, type SidebarItem } from "@/components/app-shell/AppShell.tsx";
import { DataTable, type EstadoTabla } from "@/components/app-shell/DataTable.tsx";
import { Ficha } from "@/components/app-shell/Ficha.tsx";
import { Drawer } from "@/components/app-shell/Drawer.tsx";
import { AvisoAccion } from "@/components/app-shell/AvisoAccion.tsx";
import { EstadoPermiso } from "@/components/app-shell/EstadoPermiso.tsx";

const SIDEBAR: SidebarItem[] = [
  { href: "#", label: "Tablero" },
  { href: "#", label: "Empresas", activo: true },
  { href: "#", label: "Usuarios" },
  { href: "#", label: "Proyectos" },
];

type Empresa = { nombre: string; estado: string; proyectos: number; contacto: string };

const EMPRESAS: Empresa[] = [
  { nombre: "Cliente Demo", estado: "activa", proyectos: 3, contacto: "j@ejemplo.com" },
  { nombre: "Acme Corp", estado: "activa", proyectos: 1, contacto: "acme@ejemplo.com" },
  { nombre: "Contoso", estado: "archivada", proyectos: 0, contacto: "contoso@ejemplo.com" },
];

/**
 * Vitrina SOLO de esta página: la conmutación de estado por `<select>` y el
 * `<Drawer>` con "guardar falla" simulado no existen en `AppShell`,
 * `DataTable` ni `Drawer` — cada uno recibe exactamente las mismas props que
 * recibiría de una pantalla real de HQ (DU futura), nada aquí es un atajo
 * del propio componente.
 */
export function PrototipoAppShell() {
  const [estadoTabla, setEstadoTabla] = useState<EstadoTabla>("con_datos");
  const [fichaAbierta, setFichaAbierta] = useState<Empresa | null>(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [nombreDrawer, setNombreDrawer] = useState("");
  const [avisoAccion, setAvisoAccion] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <label className="flex items-center gap-2 text-sm text-ink-2">
        Simular estado de la tabla:
        <select
          value={estadoTabla}
          onChange={(e) => {
            setEstadoTabla(e.target.value as EstadoTabla);
            setFichaAbierta(null);
          }}
          className="rounded border border-line px-2 py-1"
        >
          <option value="con_datos">Con datos</option>
          <option value="cargando">Cargando</option>
          <option value="vacio_inicial">Vacío inicial</option>
          <option value="vacio_filtro">Vacío por filtro</option>
          <option value="error_carga">Error de carga</option>
        </select>
      </label>

      {/* onClickCapture: solo esta vitrina simula varias "páginas" en un único componente
          cliente sin enrutador real — intercepta el enlace "← Empresas" de `Ficha` (que en
          producción sería una navegación real a `/hq/empresas`) para volver a la tabla. */}
      <div
        onClickCapture={(e) => {
          if (!fichaAbierta) return;
          const enlace = (e.target as HTMLElement).closest("a");
          if (enlace?.getAttribute("href") === "#" && enlace.textContent?.trim() === "← Empresas") {
            e.preventDefault();
            setFichaAbierta(null);
          }
        }}
      >
      <AppShell
        marca="SLG Agency · HQ"
        items={SIDEBAR}
        pieAccionLabel="Abrir CRM ↗"
        pieAccionHref="#"
        usuarioLabel="Ricardo ▾"
        tituloScreen={fichaAbierta ? fichaAbierta.nombre : "Empresas"}
        accionPrimaria={fichaAbierta ? undefined : { label: "+ Nueva empresa", onClick: () => setDrawerAbierto(true) }}
      >
        {fichaAbierta ? (
          <Ficha
            volverLabel="Empresas"
            volverHref="#"
            nombre={fichaAbierta.nombre}
            estado={fichaAbierta.estado}
            acciones={[{ label: "Invitar usuario" }, { label: "Archivar" }]}
            secciones={[
              { titulo: "Proyectos", contenido: <p className="text-ink-2">{fichaAbierta.proyectos} proyectos activos</p> },
              { titulo: "Contacto", contenido: <p className="text-ink-2">{fichaAbierta.contacto}</p> },
            ]}
            metadatos="Creado el 2026-01-15 por Ricardo"
          />
        ) : (
          <DataTable<Empresa>
            estado={estadoTabla}
            filas={EMPRESAS}
            onFilaClick={(fila) => setFichaAbierta(fila)}
            columnas={[
              { key: "nombre", label: "Nombre", ordenable: true },
              { key: "estado", label: "Estado", ordenable: true },
              { key: "proyectos", label: "Proyectos", ordenable: true },
              { key: "contacto", label: "Contacto" },
            ]}
            vacioInicial={{
              titulo: "Todavía no hay empresas",
              cuerpo: "Una empresa aparece aquí en cuanto se crea la primera.",
              accionLabel: "+ Crear la primera",
              onAccion: () => setDrawerAbierto(true),
            }}
            vacioFiltro={{ titulo: 'Ningún resultado para "acme"', limpiarLabel: "Limpiar filtros", onLimpiar: () => setEstadoTabla("con_datos") }}
            errorCarga={{ titulo: "No se pudo cargar", reintentarLabel: "Reintentar", onReintentar: () => setEstadoTabla("con_datos") }}
          />
        )}
      </AppShell>
      </div>

      <Drawer
        abierto={drawerAbierto}
        onCerrar={() => setDrawerAbierto(false)}
        titulo="Nueva empresa"
        cerrarLabel="Cerrar"
        sucio={nombreDrawer.length > 0}
        confirmarCierreLabel="Hay cambios sin guardar. ¿Cerrar de todas formas?"
      >
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Nombre
          <input
            value={nombreDrawer}
            onChange={(e) => setNombreDrawer(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-ink"
          />
        </label>
        <button
          type="button"
          onClick={() => setAvisoAccion(true)}
          className="self-start rounded-md bg-blue-primary px-4 py-2 text-sm text-paper"
        >
          Guardar (simula fallo)
        </button>
        {avisoAccion && (
          <AvisoAccion
            titulo="No se pudo guardar"
            cuerpo="Los datos siguen en el formulario."
            reintentarLabel="Reintentar"
            onReintentar={() => setAvisoAccion(false)}
          />
        )}
      </Drawer>

      <div className="rounded-lg border border-line">
        <EstadoPermiso titulo="Esta página no existe" volverLabel="Volver al inicio" volverHref="#" />
      </div>
    </div>
  );
}
