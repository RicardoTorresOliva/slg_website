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
 * DE DÓNDE SALE LA LISTA. La primera versión la derivaba de los términos
 * literales, y dejaba fuera dos servicios que no son marca registrada —un
 * proyecto de esos dos no se habría podido dar de alta—. La segunda la derivaba
 * de la colección de contenido. Desde D-166 sale de la **ficha del sitio**
 * (`nombresDeServicio()`), que es la que declara la oferta: es la misma lista
 * que el catálogo de la API anuncia (`PROJECT_SERVICES`), así que HQ y la API
 * no pueden discrepar. Que cada servicio de la ficha tenga su registro de
 * contenido con ese mismo `name` lo exige `check:sitio`, y que ese `name` se
 * escriba bien, `check:nomenclature`.
 *
 * Y es LA validación: desde la migración 0024 la base ya no lleva la lista en
 * un `CHECK`. Lo que esta función rechaza no llega a PostgreSQL.
 */
import { nombresDeServicio } from "../sitio/index.ts";

/** Los servicios de la oferta, con su nombre literal, en orden alfabético. */
export function serviciosLiterales(): string[] {
  return [...new Set(nombresDeServicio())].sort((a, b) => a.localeCompare(b, "es"));
}

/** `true` solo si el valor es **exactamente** uno de los nombres de la oferta. */
export function esServicioLiteral(valor: string): boolean {
  // Comparación exacta y sin normalizar: «phoenix peex» NO es «Phoenix PEEx».
  // Aceptar variantes aquí sería reintroducir por la puerta de atrás justo lo
  // que RF-14 prohíbe, y encima en la base de datos, donde ya no se corrige.
  return serviciosLiterales().includes(valor);
}
