/**
 * Normalización del markdown en línea que usan los cuerpos de contenido.
 *
 * En `content/` los nombres literales se escriben entre acentos graves —
 * `` `SLG_Academy` `` — siguiendo la convención con la que están escritos
 * `knowledge/` y los `design_docs`. Ahí tiene sentido: distingue un nombre
 * intraducible del texto que lo rodea.
 *
 * En la página **no**: el nombre literal ya es `SLG_Academy`, con su guion
 * bajo, y eso es lo que el visitante tiene que leer. Sin esta limpieza, la
 * portada de la línea mostraba «`SLG_Academy` reúne la formación…» con los
 * acentos graves a la vista.
 *
 * No es un renderizador de markdown y no pretende serlo: estos cuerpos son
 * prosa corta con, como mucho, un nombre entre acentos graves. Convertirlos a
 * `<code>` sería peor — pondría tipografía monoespaciada de programador en
 * medio de una frase de marca.
 */
export function textoPlano(texto: string): string {
  return texto.replace(/`([^`]+)`/g, "$1");
}

/**
 * Trocea un cuerpo markdown por sus encabezados `## `.
 *
 * Lo usan Home (RF-09) y las páginas de servicio (contrato A.3): los dos
 * formatos fijan encabezados literales y en orden, y los dos necesitan leer
 * cada bloque por su nombre. El **orden** no lo valida esta función — lo
 * valida quien la llama, que es quien sabe qué orden le toca.
 */
export function trocearEnSecciones(body: string): Map<string, string> {
  const secciones = new Map<string, string>();
  const partes = body.split(/^##\s+/m).slice(1);
  for (const parte of partes) {
    const salto = parte.indexOf("\n");
    const titulo = (salto === -1 ? parte : parte.slice(0, salto)).trim();
    secciones.set(titulo, (salto === -1 ? "" : parte.slice(salto + 1)).trim());
  }
  return secciones;
}
