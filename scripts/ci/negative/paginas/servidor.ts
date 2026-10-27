/**
 * Prueba negativa de `check:paginas` (R-26).
 *
 * Sirve páginas que incumplen los tres criterios que este freno protege:
 *
 *   · la portada trae los bloques **desordenados** (RF-09);
 *   · la página de servicio trae **cinco** secciones en vez de seis (RF-06) y
 *     **dos** llamados a la acción más un formulario (RF-07);
 *   · el overview enlaza un servicio **de otra línea** y embebe un sitio
 *     externo en un `iframe` en vez de enlazarlo como externo (DU-04,
 *     frontera (e)).
 *
 * **LAS RUTAS SALEN DE LA FICHA**, como las del freno: cuáles son índices de
 * línea y qué servicio es ajeno a cada una. Escritas aquí, el fixture solo
 * rompería el sitio de quien lo escribió; en el siguiente cliente, sus rutas no
 * existirían y el freno fallaría por otra razón, que es un falso rojo.
 *
 * Si el medidor no se pone en rojo contra esto, no está midiendo nada.
 */
import http from "node:http";

import { RAMAS, SERVICIOS } from "../../../../lib/content/rutas.ts";

const PORTADA = `<!doctype html><html lang="es"><body><main>
<section id="doctrina"><blockquote>cita</blockquote><a href="/doctrina">d</a></section>
<section id="puertas"></section>
<section id="lineas"></section>
<section id="articulos"></section>
<section id="descarga"></section>
</main></body></html>`;

const SERVICIO = `<!doctype html><html lang="es"><body><main>
<h2>Para quién y qué problema</h2>
<h2>Qué es</h2>
<h2>Qué incluye</h2>
<h2>Cómo trabajamos</h2>
<h2>Descarga</h2>
<a href="/descargas/un-documento">Descargar</a>
<a href="/descargas/otro-documento">Y este otro también</a>
<form action="/contacto"><input name="email" /></form>
<iframe src="https://calendario.example.com"></iframe>
</main></body></html>`;

/** El índice de una línea: sus servicios, uno AJENO y un sitio externo incrustado. */
function overview(ruta: string): string {
  const rama = RAMAS.find((r) => r.es === ruta || r.en === ruta);
  const lang = rama?.en === ruta ? "en" : "es";
  const suyos = SERVICIOS.filter((s) => s.rama === rama?.slug).map((s) => s[lang]);
  const ajeno = SERVICIOS.find((s) => s.rama !== rama?.slug)?.[lang] ?? "/servicio-de-otra-linea";
  return `<!doctype html><html lang="${lang}"><body><main>
${suyos.map((href) => `<a href="${href}">suyo</a>`).join("\n")}
<a href="${ajeno}">de otra línea</a>
<iframe src="https://externo.example.com"></iframe>
</main></body></html>`;
}

const INDICES = new Set(RAMAS.flatMap((r) => [r.es, r.en]).filter(Boolean));

const servidor = http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }
  const cuerpo = url === "/" || url === "/en" ? PORTADA : INDICES.has(url) ? overview(url) : SERVICIO;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(cuerpo);
});

servidor.listen(Number(process.env.PAGINAS_FIXTURE_PORT ?? 0), "127.0.0.1", () => {
  const dir = servidor.address();
  if (typeof dir === "object" && dir) console.log(`http://127.0.0.1:${dir.port}`);
});
