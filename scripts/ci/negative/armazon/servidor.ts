/**
 * Prueba negativa de `check:armazon` (R-26).
 *
 * Sirve, en TODAS las rutas, un armazón que incumple lo que DU-02 promete:
 *
 *   · «Inicio» como destino de menú, que RF-01 prohíbe expresamente;
 *   · falta `/holdings` entre los cinco destinos;
 *   · el pie enlaza `/hq`, que RF-87 prohíbe mientras M3 siga abierto;
 *   · el conmutador apunta SIEMPRE a la portada en vez de a la misma página
 *     en el otro idioma, que es el fallo que RF-04 y el DoD #2 persiguen;
 *   · no hay salto al contenido.
 *
 * Si el medidor no se pone en rojo contra esto, el medidor no mide.
 */
import http from "node:http";

const HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Roto</title></head>
<body>
<header>
  <nav aria-label="Navegación principal">
    <a href="/">Inicio</a>
    <a href="/ai">SLG_AI</a>
    <a href="/doctrina">Doctrina</a>
    <a href="/blog">Blog</a>
    <a href="/nosotros">Nosotros</a>
    <a hreflang="en" href="/">English</a>
    <a href="/acceder">Acceder</a>
  </nav>
</header>
<main><h1>Doctrina</h1></main>
<footer><a href="/hq">Intranet</a><a href="/legal-terminos">Términos</a></footer>
</body></html>`;

const puerto = Number(process.env.ARMAZON_FIXTURE_PORT ?? 0);
const servidor = http.createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(HTML);
});

servidor.listen(puerto, "127.0.0.1", () => {
  const dir = servidor.address();
  if (typeof dir === "object" && dir) console.log(`http://127.0.0.1:${dir.port}`);
});
