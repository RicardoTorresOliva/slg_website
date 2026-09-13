/**
 * Prueba negativa de `check:seo` (R-26).
 *
 * Sirve páginas con los tres fallos que este freno existe para atrapar, y que
 * son invisibles mirando la página:
 *
 *   · **`canonical` copiado**: todas apuntan a la portada, que es lo que pasa
 *     al duplicar un archivo y olvidar la línea.
 *   · **`hreflang` NO recíproco**: la española declara pareja, la inglesa no.
 *     Los buscadores ignoran las dos y nadie se entera.
 *   · **Título repetido** dentro del mismo idioma.
 *
 * Y además: sin sitemap, sin robots y con una 404 que responde 200.
 */
import http from "node:http";

const PAGINA = (ruta: string) => `<!doctype html><html lang="es"><head>
<title>SLG Agency</title>
<meta name="description" content="La misma descripción en todas.">
<link rel="canonical" href="https://ejemplo.test/">
${ruta.startsWith("/en") ? "" : '<link rel="alternate" hreflang="en" href="https://ejemplo.test/en/ai">'}
</head><body><main>${ruta}</main></body></html>`;

const servidor = http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }
  if (url === "/sitemap.xml") {
    res.writeHead(200, { "content-type": "application/xml" });
    res.end('<?xml version="1.0"?><urlset></urlset>');
    return;
  }
  if (url === "/robots.txt") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("User-agent: *\nAllow: /\n");
    return;
  }
  // Hasta la 404 responde 200: el fallo más caro de todos.
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGINA(url));
});

servidor.listen(Number(process.env.SEO_FIXTURE_PORT ?? 0), "127.0.0.1", () => {
  const dir = servidor.address();
  if (typeof dir === "object" && dir) console.log(`http://127.0.0.1:${dir.port}`);
});
