/**
 * Prueba negativa de `check:runtime` (R-26).
 *
 * **ESTE FRENO NO TENÍA NINGUNA**, y es de los que más prometen: mide las
 * cabeceras de seguridad, la compuerta de staging y la puerta de `/api/ops`
 * **sobre el servidor de verdad**. Nadie lo había visto en rojo, así que su
 * verde no significaba nada — que es literalmente lo que dice R-26. Un `fetch`
 * a una ruta que no existe, una cabecera renombrada o un `check` que compara
 * algo contra sí mismo lo habrían dejado anunciando «sin fallos» sobre un sitio
 * sin CSP. Lo encontró la revisión final.
 *
 * Este servidor es **el despliegue mal hecho**, y todos sus fallos son los que
 * de verdad ocurren:
 *
 *   · Sin cabeceras de seguridad: el `next.config.ts` decía una cosa y el proxy
 *     de delante se comió las cabeceras. El sitio responde 200 y parece bien.
 *   · Con `x-powered-by`: la plantilla por defecto lo trae.
 *   · `noindex` en producción: alguien copió las variables de staging.
 *   · `/api/ops` abierto sin testigo, y ejecutando por GET: es la ruta que manda
 *     correo y cambia la contraseña de un rol de la base.
 *   · Sin compuerta de staging: las dos variables se olvidaron, y el sitio a
 *     medio hacer queda indexable.
 *   · CSP con `nonce-` prometido y un HTML que no lo lleva: el navegador
 *     bloquea todos los scripts y la página **se ve y no funciona**. Es el fallo
 *     silencioso que dio origen a `politicaPorSuperficie`.
 */
import http from "node:http";

const HTML = (cuerpo: string) =>
  `<!doctype html><html lang="es"><head><title>Mal desplegado</title></head>` +
  `<body><main>${cuerpo}</main><script>console.log(1)</script></body></html>`;

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

  if (url.pathname === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }

  /**
   * `/api/ops` abierto: responde 200 sin testigo y con uno incorrecto, ofrece
   * sus acciones por GET y las ejecuta. Las cuatro cosas que el freno prohíbe.
   */
  if (url.pathname === "/api/ops") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(
      HTML(
        '<h1>Operaciones</h1><a href="/api/ops?accion=clave-de-app">Cambiar la clave</a>' +
          "<pre>ALTER ROLE slg_app WITH PASSWORD</pre>",
      ),
    );
    return;
  }

  /**
   * Todo lo demás: 200 **sin una sola cabecera de seguridad**, con
   * `x-powered-by`, con `noindex` en producción y con una CSP que promete un
   * nonce fijo que el HTML no lleva — y que además no cambia entre peticiones.
   */
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "x-powered-by": "Next.js",
    "x-robots-tag": "noindex, nofollow",
    "content-security-policy": "script-src 'nonce-siempre-el-mismo'",
  });
  res.end(HTML(`<p>${url.pathname}</p>`));
});

servidor.listen(0, "127.0.0.1", () => {
  const dir = servidor.address();
  const puerto = typeof dir === "object" && dir ? dir.port : 0;
  console.log(`http://127.0.0.1:${puerto}`);
});
