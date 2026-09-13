/**
 * Prueba negativa de `check:blog` (R-26).
 *
 * Sirve un blog que incumple lo que DU-11 promete: **el borrador se sirve**.
 * Responde 200 en cualquier URL de artículo —incluida la del borrador—, lo
 * lista en el índice y lo mete en el canal RSS. Además mezcla idiomas en el
 * canal, que es el fallo silencioso de un blog bilingüe.
 *
 * Si el medidor no se pone en rojo contra esto, no está midiendo el criterio 2.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");

/** Todos los slugs del repositorio, borradores incluidos. Ahí está la infracción. */
function slugs(lang: string): string[] {
  const dir = path.join(REPO_ROOT, "content", "blog", lang);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
}

const servidor = http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }

  const en = url.startsWith("/en");
  const lang = en ? "en" : "es";
  const prefijo = en ? "/en" : "";
  const todos = [...slugs("es"), ...slugs("en")];

  if (url.endsWith("/rss.xml")) {
    const items = todos
      .map((s) => `<item><link>${prefijo}/blog/${s}</link><title>${s}</title></item>`)
      .join("");
    res.writeHead(200, { "content-type": "application/rss+xml; charset=utf-8" });
    res.end(`<?xml version="1.0"?><rss version="2.0"><channel><language>${lang}</language>${items}</channel></rss>`);
    return;
  }

  // Índice: lista TODO, borradores incluidos.
  if (url === `${prefijo}/blog` || url === `${prefijo}/blog/`) {
    const enlaces = todos.map((s) => `<a href="${prefijo}/blog/${s}">${s}</a>`).join("");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html><body>${enlaces}<a href="${prefijo}/blog/${en ? "tag" : "etiqueta"}/inventada">t</a></body></html>`);
    return;
  }

  // Cualquier otra URL responde 200, incluidas las que no existen.
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end("<!doctype html><html><body>ok</body></html>");
});

servidor.listen(Number(process.env.BLOG_FIXTURE_PORT ?? 0), "127.0.0.1", () => {
  const dir = servidor.address();
  if (typeof dir === "object" && dir) console.log(`http://127.0.0.1:${dir.port}`);
});
