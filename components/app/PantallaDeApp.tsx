import { loadUiStrings } from "@/lib/content/loader";
import { idiomaDeInterfaz } from "@/lib/app/idioma";
import { seccionDeLaRuta, seccionesVisibles } from "@/lib/app/navegacion";
import type { Superficie } from "@/lib/auth";

import { ArmazonDeApp } from "./ArmazonDeApp";

/**
 * El puente entre la sesión y el armazón (FU-12).
 *
 * EXISTE PARA QUE NINGUNA PANTALLA TENGA QUE ACORDARSE DE NADA. Las tres cosas
 * que el criterio exige —idioma de la preferencia, secciones filtradas por rol,
 * y las tres preguntas de wayfinding respondidas— se resuelven aquí una vez. Si
 * cada pantalla de M3 y M4 las montara por su cuenta, la primera que se
 * olvidara de filtrar enseñaría un enlace que no debe existir.
 *
 * `ruta` llega como prop y no se lee de una cabecera: leer cabeceras es lo que
 * ya obliga a estas superficies a renderizarse por petición, y además el layout
 * no siempre sabe la ruta hija. La pantalla sí la sabe.
 */
export function PantallaDeApp({
  superficie,
  ruta,
  sesion,
  children,
}: {
  superficie: Superficie;
  ruta: string;
  sesion: { ctx: Parameters<typeof seccionesVisibles>[0]; locale: string; nombre: string };
  children: React.ReactNode;
}) {
  const idioma = idiomaDeInterfaz(sesion.locale);
  const t = loadUiStrings()[idioma];

  const secciones = seccionesVisibles(sesion.ctx, superficie).map((s) => ({
    clave: s.clave,
    href: s.href,
    etiqueta: t[`app.nav.${s.clave}`] ?? s.clave,
  }));

  return (
    <ArmazonDeApp
      superficie={superficie === "hq" ? t["app.shell.hq"] : t["app.shell.portal"]}
      seccionActiva={seccionDeLaRuta(ruta)}
      secciones={secciones}
      textos={{
        secciones: t["app.shell.sections"],
        estasEn: t["app.shell.youAreHere"],
        cerrarSesion: t["app.shell.signout"],
        saltar: t["app.shell.skip"],
        cuenta: t["app.shell.account"],
      }}
      usuario={{ nombre: sesion.nombre, cerrarSesionHref: "/api/acceso/salir" }}
    >
      {children}
    </ArmazonDeApp>
  );
}
