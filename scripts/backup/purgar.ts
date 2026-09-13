/**
 * purgar.ts — **El borrado lo hace OTRO proceso, con OTRAS credenciales**
 * (FU-14, criterio 4 · R-12 · R-37).
 *
 *   npm run backup:purge
 *
 * POR QUÉ SEPARADO. R2 no ofrece Object Lock por API estándar, así que la
 * inmutabilidad se sustituye por reparto de poder: la credencial que **copia**
 * no puede borrar, y la que **borra** vive en otro sitio y corre en otro momento.
 * Quien se haga con la del servidor —la de copia— puede escribir basura nueva,
 * pero **no puede destruir el histórico**, que es lo que un atacante necesita
 * para que el rescate funcione.
 *
 * **NO LISTA NADA.** Calcula qué fechas quedaron fuera de retención y borra esas
 * claves. Borrar una que no existe es un no-op. Además de mantener la credencial
 * ciega, ahorra operaciones de clase A, que es la partida que R2 factura (D-21).
 */
import { borrar } from "../../lib/backup/destino.ts";
import { clavesCaducadas, RETENCION, type Generacion } from "../../lib/backup/generaciones.ts";

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

async function main() {
  const hoy = new Date();
  const retencion = retencionDelEntorno();
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
