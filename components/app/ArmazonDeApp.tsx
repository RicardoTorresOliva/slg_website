import type { CSSProperties, ReactNode } from "react";

import type { Seccion } from "@/lib/app/navegacion";

/**
 * El armazón de HQ y del portal (FU-12) — la implementación del octavo
 * componente de C.5, ya con sesión detrás.
 *
 * LAS TRES PREGUNTAS DE WAYFINDING (RNF-43, C.6), respondidas SIEMPRE y sin
 * abrir nada:
 *   1. **Dónde estoy** — el nombre de la superficie y, debajo, el de la sección
 *      activa, marcada además con `aria-current`. No sale de una cadena escrita
 *      en la página: sale de la MISMA tabla que pinta la barra lateral, para
 *      que el título y el enlace resaltado no puedan discrepar.
 *   2. **A dónde puedo ir** — las secciones, permanentes en escritorio y a un
 *      toque en móvil. **Nunca escondidas tras un icono sin nombre.**
 *   3. **Cómo salgo** — «cerrar sesión», visible, en su sitio y siempre el
 *      mismo, no dentro de un menú que hay que descubrir.
 *
 * NO HAY CONMUTADOR DE IDIOMA, Y ES UN REQUISITO (RF-72, criterio 3). La
 * interfaz se muestra en el idioma de la **preferencia del usuario**; el
 * conmutador es de la capa pública, donde el idioma es una propiedad de la URL.
 * Aquí no hay dos URL que conmutar, y ofrecerlo haría creer que el contenido
 * entregado también cambia de idioma. `check:shell` falla si aparece uno.
 *
 * LAS SECCIONES YA LLEGAN FILTRADAS (criterio 5). Este componente **no decide**
 * quién ve qué: recibe la lista que `seccionesVisibles()` ha filtrado con
 * `puede()`. Y esconder no es proteger: la página que hay detrás de cada enlace
 * llama a `exigirSeccion()` de todas formas.
 *
 * EN MÓVIL NO SE PLIEGA: SE TUMBA. La misma lista pasa de columna a **tira
 * horizontal desplazable** arriba, y sigue viéndose entera sin tocar nada.
 *
 * Se probó antes con un `<details>` y se descartó por una razón concreta: para
 * que en escritorio se vea siempre abierto hay que escribir `open` en el
 * marcado, y **`open` no se puede quitar desde CSS** — un `<details open>` es
 * un `<details>` abierto en móvil también. Salir de ahí pedía JavaScript, y esto
 * tiene que funcionar sin hidratar: detrás hay trabajo, no una visita. Una tira
 * que se desplaza no esconde nada y no necesita estado.
 *
 * Todo el marcado es UNO SOLO para las dos vistas, y la diferencia vive en
 * `motion.css`. Dos marcados serían el sitio exacto donde una sección nueva
 * aparece en escritorio y no en el móvil.
 */
export function ArmazonDeApp({
  superficie,
  seccionActiva,
  secciones,
  textos,
  usuario,
  children,
}: {
  /** «HQ» o «Portal», ya traducido por quien llama. */
  superficie: string;
  /** La sección en la que estamos, o `null` si la ruta no cae en ninguna. */
  seccionActiva: Seccion | null;
  secciones: readonly { clave: string; href: string; etiqueta: string }[];
  textos: {
    secciones: string;
    estasEn: string;
    cerrarSesion: string;
    saltar: string;
    cuenta: string;
  };
  usuario: { nombre: string; cerrarSesionHref: string };
  children: ReactNode;
}) {
  const activa = secciones.find((s) => s.clave === seccionActiva?.clave);

  return (
    <div data-slg-armazon style={shell}>
      <a href="#contenido" className="slg-saltar">
        {textos.saltar}
      </a>

      <nav style={lateral} aria-label={textos.secciones}>
        <p style={marca}>{superficie}</p>

        <ul data-slg-lateral style={lista}>
          {secciones.map((s) => {
            const esActiva = s.clave === seccionActiva?.clave;
            return (
              <li key={s.clave}>
                <a
                  href={s.href}
                  aria-current={esActiva ? "page" : undefined}
                  style={{
                    ...enlace,
                    background: esActiva ? "var(--slg-paper)" : "transparent",
                    color: esActiva ? "var(--slg-blue-deep)" : "var(--slg-ink-2)",
                    fontWeight: esActiva ? 600 : 500,
                  }}
                >
                  {s.etiqueta}
                </a>
              </li>
            );
          })}
        </ul>

        {/* «Cómo salgo», al final de la barra y siempre visible.
            ES UN FORMULARIO, no un enlace: un cierre de sesión por GET lo
            dispara cualquier `<img src>` de cualquier página y echa a la
            persona de su sesión desde fuera. Con POST no hay forma. */}
        <div style={pieLateral}>
          <p style={nombreDeUsuario} title={textos.cuenta}>
            {usuario.nombre}
          </p>
          <form method="post" action={usuario.cerrarSesionHref}>
            <button type="submit" data-slg-salida style={salida}>
              {textos.cerrarSesion}
            </button>
          </form>
        </div>
      </nav>

      <div style={{ minWidth: 0, display: "grid", gridTemplateRows: "auto 1fr" }}>
        {/* «Dónde estoy», en texto y no solo como enlace resaltado: quien llega
            por un enlace directo no ha visto la barra lateral moverse. */}
        <header style={cabecera}>
          <p style={migas}>
            <span style={{ color: "var(--slg-ink-2)" }}>{textos.estasEn}</span>{" "}
            <span>{superficie}</span>
            {activa ? (
              <>
                <span aria-hidden="true" style={{ color: "var(--slg-ink-2)" }}>
                  {" / "}
                </span>
                <strong style={{ color: "var(--slg-blue-deep)" }}>{activa.etiqueta}</strong>
              </>
            ) : null}
          </p>
        </header>

        <main id="contenido" style={{ padding: "1.5rem 1.25rem", minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

const shell: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "14rem 1fr",
  minHeight: "100svh",
};

const lateral: CSSProperties = {
  borderRight: "1px solid var(--slg-line)",
  background: "var(--slg-paper-2)",
  padding: "1.25rem 0.75rem",
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  alignContent: "start",
};

const marca: CSSProperties = {
  margin: "0 0 1rem",
  padding: "0 0.5rem",
  fontSize: "0.8125rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--slg-ink-2)",
};

const lista: CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.125rem" };

const enlace: CSSProperties = {
  display: "block",
  padding: "0.5rem 0.75rem",
  borderRadius: "var(--slg-radius-sm)",
  textDecoration: "none",
  fontSize: "0.9375rem",
};

const pieLateral: CSSProperties = {
  marginTop: "1.5rem",
  paddingTop: "1rem",
  borderTop: "1px solid var(--slg-line)",
  display: "grid",
  gap: "0.5rem",
};

const nombreDeUsuario: CSSProperties = {
  margin: 0,
  padding: "0 0.75rem",
  fontSize: "0.8125rem",
  color: "var(--slg-ink-2)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const salida: CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--slg-link)",
  // Un botón que parece un enlace: la acción es de navegación —te saca de
  // aquí—, y un botón con relleno de color al lado del nombre compite con las
  // acciones de la pantalla, que son las que importan.
  background: "none",
  border: "none",
  cursor: "pointer",
  font: "inherit",
  textAlign: "left",
};

const cabecera: CSSProperties = {
  borderBottom: "1px solid var(--slg-line)",
  padding: "0.875rem 1.25rem",
  background: "var(--slg-paper)",
};

const migas: CSSProperties = { margin: 0, fontSize: "0.875rem" };
