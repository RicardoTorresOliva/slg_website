/**
 * Prueba negativa de `check:paginas` (R-26).
 *
 * Sirve páginas que incumplen los tres criterios que este freno protege:
 *
 *   · la portada trae los bloques **desordenados** (RF-09);
 *   · la página de servicio trae **cinco** secciones en vez de seis (RF-06) y
 *     **dos** llamados a la acción más un formulario (RF-07);
 *   · el overview enlaza un servicio **de otra línea** y embebe Phoenix Academy
 *     en un `iframe` en vez de enlazarla como externa (DU-04, frontera (e)).
 *
 * Si el medidor no se pone en rojo contra esto, no está midiendo nada.
 */
import http from "node:http";

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
<a href="/descargas/d-06">Descargar</a>
<a href="/descargas/d-01">Y este otro también</a>
<form action="/contacto"><input name="email" /></form>
<iframe src="https://calendario.example.com"></iframe>
</main></body></html>`;

const OVERVIEW = `<!doctype html><html lang="es"><body><main>
<a href="/ai/academy/phoenix-peex">uno</a>
<a href="/ai/factory/app-building">de otra línea</a>
<iframe src="https://academy.softlandingglobal.com"></iframe>
</main></body></html>`;

const servidor = http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }
  const cuerpo = url === "/" || url === "/en" ? PORTADA : /\/ai\/[a-z]+$/.test(url) ? OVERVIEW : SERVICIO;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(cuerpo);
});

servidor.listen(Number(process.env.PAGINAS_FIXTURE_PORT ?? 0), "127.0.0.1", () => {
  const dir = servidor.address();
  if (typeof dir === "object" && dir) console.log(`http://127.0.0.1:${dir.port}`);
});
