/**
 * sitio.ts — La dirección pública del sitio. **Una sola función, y sin respaldo.**
 *
 * POR QUÉ NO HAY VALOR POR DEFECTO, que es lo único que importa de este archivo.
 * Hasta hoy esto estaba escrito dos veces —`seo.ts` y `rss.ts`, más una tercera
 * copia en `/api/ops`— y las tres caían al dominio del primer sitio.
 * Con ese respaldo, olvidarse de `NEXT_PUBLIC_SITE_URL` **no rompe nada**: el
 * sitio compila, despliega y sirve — publicando el dominio de OTRO en su
 * `canonical`, en sus etiquetas de Open Graph, en su `sitemap.xml`, en su
 * `robots.txt` y en los enlaces de su RSS. Es el peor tipo de fallo: no avisa
 * nadie, lo descubre un buscador, y para cuando se nota ya está indexado.
 *
 * Un respaldo solo es bueno cuando el valor inventado es **mejor que nada**.
 * Aquí es peor: «nada» se ve al instante, y un dominio ajeno se ve tarde y en
 * público.
 *
 * DÓNDE FALLA, Y POR QUÉ AHÍ. Al **compilar**, no al servir. `app/sitemap.ts`,
 * `app/robots.ts` y el `metadatosDe()` de las 58 rutas públicas llaman a esta
 * función mientras `next build` prerenderiza, así que un despliegue sin la
 * variable muere en la consola de quien lo lanza, con el nombre de la variable
 * escrito. La alternativa —comprobarlo al arrancar— deja pasar la compilación y
 * convierte el error en un 500 que ve el visitante; y `NEXT_PUBLIC_*` se
 * **incrusta en el momento de compilar**, así que ponerla después del build no
 * la arregla: comprobarla más tarde sería comprobarla cuando ya no sirve.
 *
 * NO HACE FALTA UN FRENO NUEVO, y por eso no lo hay. `lib/ops/variables.ts` ya
 * la declara `obligatoria: true` —lo dice `/api/health` cuando falta—, `.env.example`
 * ya la lista, `check:env` ya exige que toda variable que el código lea esté en
 * esa plantilla y `check:literacy` ya exige que el manual la explique. Lo único
 * que faltaba era que el CÓDIGO se creyera lo que el proyecto ya declaraba.
 */

/** El nombre, una vez, para que el mensaje de error y la lectura no diverjan. */
const VARIABLE = "NEXT_PUBLIC_SITE_URL";

/**
 * La base absoluta del sitio, sin barra final.
 *
 * **También valida la forma**, no solo la presencia: un valor sin esquema
 * (`demo.example.com`) o con uno que no sirve páginas produce exactamente
 * las mismas etiquetas rotas que no ponerlo, y en silencio igual. Si va a
 * fallar, que falle entero y en el mismo sitio.
 */
export function baseDelSitio(): string {
  const crudo = process.env[VARIABLE]?.trim();

  if (!crudo) {
    throw new Error(
      `Falta ${VARIABLE}. Es la dirección pública de ESTE sitio (por ejemplo, ` +
        "la que se abre en el navegador), y de ella salen el `canonical`, las " +
        "etiquetas sociales, el `sitemap.xml`, el `robots.txt` y los enlaces del " +
        "RSS. No tiene valor por defecto a propósito: inventarle uno publicaría " +
        "el dominio de otro. Los valores viven en `.env` (ignorado por git) o en " +
        "las variables de entorno del proveedor; los nombres, en `.env.example`.",
    );
  }

  let url: URL;
  try {
    url = new URL(crudo);
  } catch {
    throw new Error(
      `${VARIABLE} no es una URL absoluta: «${crudo}». Tiene que llevar esquema y ` +
        "servidor, como `https://ejemplo.com` — sin ruta, sin barra final y sin comillas.",
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      `${VARIABLE} usa el esquema «${url.protocol}», que no sirve páginas. Solo ` +
        "`https:` —o `http:` en desarrollo local.",
    );
  }

  return crudo.replace(/\/$/, "");
}
