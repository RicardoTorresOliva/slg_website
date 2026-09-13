/**
 * Los dos eventos de B.7 cuyas superficies **todavía no existen**.
 *
 * `deliverable.published` y `announcement.published` ocurren en el portal de
 * cliente (M4) y en HQ (M3). Sus unidades llegan después de esta, así que aquí
 * no hay ninguna llamada que interceptar: si esperáramos a que existieran, el
 * contrato del payload lo decidiría quien construya la pantalla, y lo decidiría
 * distinto en cada una.
 *
 * Lo que se cierra HOY es el contrato: la forma del payload —ya declarada en
 * `eventos.ts`— y **una sola función por evento**. Cuando DU-15 publique un
 * entregable, llamará a `anunciarEntregable(...)` y no podrá inventarse un
 * campo. Un `emitir("deliverable.published", { … })` escrito a mano en la
 * pantalla sería la puerta por donde entra el payload divergente.
 *
 * **Ninguna lleva datos del contenido**: ni el nombre del entregable, ni el
 * texto del aviso, ni el archivo. Un webhook que viaja fuera de nuestra
 * infraestructura no puede ser el sitio por donde sale material de un cliente
 * (§10-6). Quien lo recibe sabe QUÉ pasó y DÓNDE; para el contenido tiene el
 * portal, con su sesión y su política de fila.
 */
import { emitir } from "./cola.ts";

export async function anunciarEntregable(entrada: {
  deliverableId: string;
  projectId: string;
  organizationId: string;
}): Promise<void> {
  await emitir("deliverable.published", entrada);
}

export async function anunciarAviso(entrada: {
  announcementId: string;
  /** `null` en un aviso global de SLG, que no pertenece a ninguna empresa. */
  organizationId: string | null;
}): Promise<void> {
  await emitir("announcement.published", entrada);
}
