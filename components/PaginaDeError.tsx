import Link from "next/link";

import en from "@/content/ui/error.en.json";
import es from "@/content/ui/error.es.json";
import type { SalidaDeError } from "@/lib/content/rutas";

/**
 * 404 y 500 — **propias, bilingües y con navegación de vuelta** (RF-17).
 *
 * Las tres salidas son las que `ui_wireframes` fija: la portada, la oferta y el
 * blog. Un error sin salidas deja al visitante con el botón «atrás» como única
 * opción, y el botón «atrás» lo devuelve a la página rota. **Las rutas llegan
 * por props** (`salidasDeError()`, de la ficha del sitio): este componente lo
 * pinta también la 500, que es de cliente, y la ficha no viaja al navegador.
 *
 * **El idioma se decide por la RUTA** cuando existe; si no se puede saber —un
 * 404 profundo no siempre la trae—, el español es el defecto, porque es el que
 * vive en la raíz (§10-5).
 *
 * **Las cadenas se importan de `content/ui/error.<lang>.json`**, que tiene SOLO
 * las siete de esta pantalla, y no del archivo grande. La diferencia la destapó
 * `check:js-budget` poniéndose rojo: importando el JSON completo, **cada cadena
 * nueva de HQ o del portal viajaba al navegador de cada página pública**, y las
 * pantallas de M3 metieron ciento cincuenta. Un límite de error tiene que ser
 * componente de cliente, así que lo que importe pesa en todas partes.
 *
 * **Las cadenas se importan del JSON, no del cargador de contenido**, y es
 * obligado: `error.tsx` tiene que ser un componente de CLIENTE —un límite de
 * error solo puede serlo— y el cargador usa `node:fs`, que no existe en el
 * navegador. Arrastrarlo hasta aquí rompía la compilación entera. El texto
 * sigue viviendo en `content/ui` y sigue cumpliendo RF-16.
 */
export function PaginaDeError({
  codigo,
  lang = "es",
  salidas: destinos,
}: {
  codigo: "404" | "500";
  lang?: "es" | "en";
  salidas: readonly SalidaDeError[];
}) {
  const t: Record<string, string> = lang === "en" ? en : es;

  return (
    <div style={contenedor} lang={lang}>
      <p style={numero}>{codigo}</p>
      <h1 style={titulo}>{t[`error.${codigo}.title`]}</h1>
      <p style={texto}>{t[`error.${codigo}.body`]}</p>
      <ul style={salidas}>
        {destinos.map((d) => (
          <li key={d.clave}>
            <Link href={d.href} style={enlace}>
              {t[d.clave]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const contenedor: React.CSSProperties = {
  maxWidth: "36rem",
  margin: "0 auto",
  padding: "5rem 1.25rem",
  textAlign: "center",
};

const numero: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  letterSpacing: "0.12em",
  color: "var(--slg-ink-2)",
};

const titulo: React.CSSProperties = {
  margin: "0.75rem 0 1rem",
  fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
  lineHeight: 1.1,
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const texto: React.CSSProperties = { margin: "0 0 2rem", color: "var(--slg-ink-2)" };

const salidas: React.CSSProperties = {
  display: "flex",
  gap: "1.5rem",
  justifyContent: "center",
  listStyle: "none",
  margin: 0,
  padding: 0,
  flexWrap: "wrap",
};

const enlace: React.CSSProperties = { color: "var(--slg-link)", fontSize: "0.9375rem" };
