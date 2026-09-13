/**
 * purgar.ts — **El borrado lo hace OTRO proceso, con OTRAS credenciales**
 * (FU-14, criterio 4 · R-12 · R-37).
 *
 *   npm run backup:purge
 *
 * POR QUÉ SEPARADO, Y HASTA DÓNDE LLEGA. Aquí ponía que «la credencial que
 * copia no puede borrar», y **no era verdad**: el permiso más acotado que
 * Cloudflare R2 ofrece para un token de objeto es *Object Read & Write*, y ese
 * permiso **incluye `DeleteObject`**. No existe en R2 un token que escriba y no
 * borre, así que la mitigación de R-37 estaba escrita como si existiera —aquí,
 * en `destino.ts` y en la guía de despliegue— y quien la leyera daría por
 * protegido el histórico. Lo encontró la revisión final.
 *
 * Lo que la separación **sí** consigue: la purga corre en otro proceso, en otro
 * momento y con otro token, y sus variables no están en `slg-web`. Eso acota
 * quién borra **a propósito** y evita el borrado accidental desde la web. Lo que
 * **no** consigue es impedir que quien se haga con la credencial del servidor
 * destruya el histórico.
 *
 * **SI LA PREVENCIÓN NO EXISTE, LA DETECCIÓN TIENE QUE EXISTIR.** De ahí el
 * centinela: antes de borrar nada, comprueba que las copias que deberían seguir
 * ahí siguen ahí, y avisa por correo si falta alguna. No impide el borrado —nada
 * lo impide— pero convierte «el histórico se vació en marzo y nos enteramos en
 * septiembre» en «nos enteramos el domingo siguiente».
 *
 * **NO LISTA NADA.** Calcula qué fechas quedaron fuera de retención y borra esas
 * claves. Borrar una que no existe es un no-op. Además de mantener la credencial
 * ciega, ahorra operaciones de clase A, que es la partida que R2 factura (D-21).
 */
import { borrar, existeCopia, hayDestinoConfigurado } from "../../lib/backup/destino.ts";
import {
  clavesCaducadas,
  clavesVigentes,
  RETENCION,
  type Generacion,
} from "../../lib/backup/generaciones.ts";

const GENERACIONES: Generacion[] = ["diaria", "semanal", "mensual"];

function retencionDelEntorno(): Record<Generacion, number> {
  const leer = (nombre: string, porDefecto: number) => {
    const crudo = process.env[nombre];
    const n = crudo ? Number(crudo) : NaN;
    // **Nunca por debajo del defecto.** Una variable mal escrita no puede
    // acortar la retención en silencio: eso borraría copias buenas.
    return Number.isInteger(n) && n >= porDefecto ? n : porDefecto;
  };
  return {
    diaria: leer("BACKUP_RETENTION_DAILY", RETENCION.diaria),
    semanal: leer("BACKUP_RETENTION_WEEKLY", RETENCION.semanal),
    mensual: leer("BACKUP_RETENTION_MONTHLY", RETENCION.mensual),
  };
}

/**
 * El centinela. Devuelve las claves que **deberían estar y no están**.
 *
 * `BACKUP_FIRST_DATE` es la fecha de la primera copia, en `YYYY-MM-DD`. Sin ella
 * el centinela **no corre**, y eso es deliberado: sin saber desde cuándo hay
 * copias, todo hueco anterior al despliegue sería una alarma falsa, y una alarma
 * falsa semanal enseña a ignorar las verdaderas.
 */
async function copiasQueFaltan(hoy: Date, retencion: Record<Generacion, number>): Promise<string[] | null> {
  const desde = process.env.BACKUP_FIRST_DATE?.trim();
  if (!desde) return null;
  const primera = new Date(`${desde}T00:00:00Z`);
  if (Number.isNaN(primera.getTime())) {
    console.error(`[centinela] BACKUP_FIRST_DATE ilegible: ${desde}. Debe ser YYYY-MM-DD.`);
    return null;
  }
  const faltan: string[] = [];
  for (const clave of clavesVigentes(hoy, primera, retencion)) {
    if (!(await existeCopia(clave))) faltan.push(clave);
  }
  return faltan;
}

/** El mismo aviso que usa la copia diaria: un fallo de copias tiene que salir de la máquina. */
async function avisar(motivo: string): Promise<void> {
  console.error(`[centinela] ✗ ${motivo}`);
  const destinatario = process.env.BACKUP_ALERT_EMAIL;
  if (!destinatario) {
    console.error("[centinela] sin BACKUP_ALERT_EMAIL no hay a quién avisar; el código de salida es 1.");
    return;
  }
  try {
    const { enviarCorreo } = await import("../../lib/mail/index.ts");
    await enviarCorreo({
      tipo: "backup_failed_alert",
      para: destinatario,
      idioma: "es",
      datos: { fecha: new Date().toISOString().slice(0, 10), motivo: motivo.slice(0, 300) },
    });
    console.error(`[centinela] aviso enviado a ${destinatario}`);
  } catch (e) {
    console.error(`[centinela] y el aviso tampoco salió: ${(e as Error).message}`);
  }
}

async function main() {
  const hoy = new Date();
  const retencion = retencionDelEntorno();

  /**
   * **EL CENTINELA VA ANTES DE BORRAR**, y no es un detalle de orden: si el
   * histórico ya está vacío, lo último que debe hacer este proceso es seguir
   * borrando. Un fallo aquí corta la purga.
   */
  if (hayDestinoConfigurado()) {
    let faltan: string[] | null;
    try {
      faltan = await copiasQueFaltan(hoy, retencion);
    } catch (e) {
      await avisar(`el centinela no pudo comprobar el histórico: ${(e as Error).message}`);
      process.exit(1);
    }
    if (faltan === null) {
      console.log(
        "[centinela] sin BACKUP_FIRST_DATE: no se comprueba el histórico. " +
          "Decláralo en la tarea de purga para que el borrado del histórico se detecte.",
      );
    } else if (faltan.length > 0) {
      await avisar(
        `faltan ${faltan.length} copias que deberían existir: ${faltan.slice(0, 5).join(", ")}` +
          `${faltan.length > 5 ? " …" : ""}. NO se ha purgado nada.`,
      );
      process.exit(1);
    } else {
      console.log("[centinela] el histórico diario está completo.");
    }
  }

  let borradas = 0;
  let fallos = 0;

  for (const generacion of GENERACIONES) {
    for (const clave of clavesCaducadas(generacion, hoy, retencion)) {
      try {
        await borrar(clave);
        borradas++;
      } catch (e) {
        fallos++;
        console.error(`[purga] no se pudo borrar ${clave}: ${(e as Error).message}`);
      }
    }
  }

  console.log(
    `[purga] ${borradas} claves retiradas (${fallos} fallos). ` +
      `Retención: ${retencion.diaria} diarias, ${retencion.semanal} semanales, ${retencion.mensual} mensuales.`,
  );
  if (fallos > 0) process.exit(1);
}

if (process.argv[1]?.endsWith("purgar.ts")) await main();
