/**
 * Prueba negativa de `check:lighthouse` (R-26).
 *
 * **ESTE FRENO NO TENÍA NINGUNA.** Entre la página y el veredicto hay una
 * librería entera: si `resultado.lhr.categories` cambiara de forma, si una
 * categoría se leyera con otro nombre, o si alguien pusiera un `?? 100` para
 * quitarse de encima un `undefined`, el freno anunciaría cuatro cien sobre un
 * sitio inservible y nadie lo notaría. Medir bien no es lo mismo que **leer
 * bien lo medido**, y eso es lo que esto comprueba.
 *
 * La página que sirve es mala **de verdad**, no por configuración:
 *
 *   · Sin `lang` en `<html>` y sin `<title>`: accesibilidad y SEO al suelo.
 *   · Sin `<meta name="viewport">`: Lighthouse móvil lo penaliza fuerte.
 *   · Texto gris clarísimo sobre blanco: contraste por debajo de AA.
 *   · Imágenes sin `alt`, un `<h4>` como primer encabezado y enlaces «aquí».
 *   · Un script que bloquea el hilo principal medio segundo antes de pintar
 *     nada, que es exactamente lo que hunde el rendimiento móvil simulado.
 */
import http from "node:http";

const PAGINA = `<!doctype html>
<html>
<head>
<script>
  // Bloquea el hilo principal ANTES de pintar. No es un bucle artificial de
  // laboratorio: es lo que hace cualquier script de terceros mal metido.
  var fin = Date.now() + 600;
  while (Date.now() < fin) { Math.sqrt(Math.random()); }
</script>
<style>
  body { background: #ffffff; }
  p, h4 { color: #d8d8d8; font-size: 11px; }
</style>
</head>
<body>
<h4>Un encabezado que empieza en h4</h4>
<p>Texto gris clarísimo sobre blanco, que no llega a AA ni de lejos.</p>
<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
<a href="/otra">aquí</a>
<div onclick="void 0">Un div que hace de botón, sin rol ni foco</div>
</body>
</html>`;

const servidor = http.createServer((req, res) => {
  if ((req.url ?? "/") === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGINA);
});

servidor.listen(0, "127.0.0.1", () => {
  const dir = servidor.address();
  console.log(`http://127.0.0.1:${typeof dir === "object" && dir ? dir.port : 0}`);
});
