/**
 * servicios.ts — El campo `service` de un proyecto **solo admite nomenclatura
 * literal** (DU-14 criterio 2 · RF-79 · RF-14 · RF-27).
 *
 * POR QUÉ UNA LISTA CERRADA Y NO UN TEXTO LIBRE. `project.service` es lo que
 * después aparece en el portal del cliente, en sus entregables y en los
 * informes. Un texto libre produce «Phoenix Peex», «phoenix peex» y «Phoenix
 * PEEX» en tres proyectos distintos, y a partir de ahí **no hay forma de
 * agrupar por servicio** sin normalizar a mano cada vez. Y RF-14 dice que la
 * nomenclatura es **literal e intraducible**: media docena de proyectos con el
 * nombre mal escrito son media docena de sitios donde la marca aparece rota.
 *
 * DE DÓNDE SALE LA LISTA, Y POR QUÉ NO DE `LITERAL_TERMS`. La primera versión
 * la derivaba de los términos literales, y dejaba fuera **dos de los once
 * servicios de A.2**: «AI Coaching for Directors» y «Customize Programs» no son
 * marcas registradas, así que no están en esa lista — y un proyecto de esos dos
 * servicios no se habría podido dar de alta. Se derivan de la **colección de
 * contenido**, que es la fuente de la oferta: añadir un servicio es añadir un
 * `.md` (RF-27) y el desplegable de HQ lo recoge solo, sin tocar este archivo.
 *
 * El nombre que se guarda es el del frontmatter `name`, y ese ya está vigilado:
 * `check:nomenclature` recorre todo el contenido y falla si alguno se escribe
 * mal. O sea que la lista es literal **porque el freno de contenido la mantiene
 * literal**, no porque aquí se repita a mano.
 */
import { loadCollection } from "../content/loader.ts";

type FrontmatterDeServicio = { name: string };

/**
 * Los servicios de A.2, con su nombre literal, en español.
 *
 * **Solo el español**: el nombre es intraducible (RF-14), así que las dos
 * versiones traen el mismo `name` y listar los dos idiomas daría la lista
 * duplicada. Si alguna vez difirieran, el freno de nomenclatura lo diría antes
 * de que llegara aquí.
 */
export function serviciosLiterales(): string[] {
  const nombres = loadCollection<FrontmatterDeServicio>("service", "es")
    .map((s) => s.data.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  return [...new Set(nombres)].sort((a, b) => a.localeCompare(b, "es"));
}

/** `true` solo si el valor es **exactamente** uno de los nombres de la oferta. */
export function esServicioLiteral(valor: string): boolean {
  // Comparación exacta y sin normalizar: «phoenix peex» NO es «Phoenix PEEx».
  // Aceptar variantes aquí sería reintroducir por la puerta de atrás justo lo
  // que RF-14 prohíbe, y encima en la base de datos, donde ya no se corrige.
  return serviciosLiterales().includes(valor);
}
