/**
 * secretos.ts — **El comando único de secretos de un sitio de cliente**
 * (`docs/PLAYBOOK_REPLICACION.md` §3 paso 8, §7.2 y §7.3 punto 4).
 *
 * EL PROBLEMA QUE RESUELVE. Montar un sitio de cliente exige una docena de
 * valores secretos: contraseñas de la base, firmas de sesión, la clave de
 * servicio de Supabase, la de envío de correo. Claude monta todo lo demás por
 * sus conectores, pero **Claude no maneja contraseñas, claves de API ni
 * testigos**: lo que pasa por la conversación queda en ella. Así que estos
 * valores se generan **aquí, en el Mac de Ricardo**, y viajan directamente a su
 * plataforma. Ricardo pega una línea; ningún valor pasa por la pantalla ni por
 * el chat.
 *
 * QUÉ HACE, EN ORDEN (el detalle y sus porqués están en `nucleo.ts`):
 *   1. Comprueba la sesión de la CLI de Vercel.
 *   2. Lee del Llavero las claves de cuenta de Resend y UptimeRobot; la primera
 *      vez las pide con entrada oculta, las prueba y las guarda.
 *   3. Mira qué variables tiene ya el proyecto de Vercel (solo añade las que faltan).
 *   4. Pone contraseñas nuevas a `slg_app` y a `postgres` (como verificadores
 *      SCRAM, por la CLI de Supabase), prueba que la base las acepta y carga
 *      `DATABASE_URL`, `DATABASE_URL_MIGRATIONS` y `APP_DB_PASSWORD`.
 *   5. Genera y carga los secretos propios del sitio.
 *   6. Carga `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
 *   7. Da de alta `mailweb.<dominio>` en Resend, crea una clave de solo envío
 *      para el sitio y la carga como contraseña SMTP; imprime los registros DNS.
 *   8. Crea el monitor de UptimeRobot (en pausa hasta que el dominio responda).
 *
 *   npm run sitio:secretos -- --cliente acme-legal --supabase <ref> \
 *        --vercel web-acme-legal --dominio acmelegal.com
 *
 * Los cuatro datos se pueden omitir: si faltan, **los pide**. Claude entrega la
 * línea con los cuatro ya puestos (paso 6 de `commands/crear-sitio.md`).
 *
 *   --simular         recorre todo y dice qué haría; no llama a nada.
 *   --cambiar-claves  vuelve a pedir las claves de Resend y UptimeRobot.
 *   --sin-correo      salta Resend (paso 7); --sin-monitor salta UptimeRobot
 *                     (paso 8). Ninguno de los dos pide su clave.
 */
import readline from "node:readline/promises";
import { parseArgs } from "node:util";

import { ejecutar, type Opciones } from "./nucleo.ts";
import { plataformasReales, plataformasSimuladas } from "./plataformas.ts";

const AYUDA = `
Uso:  npm run sitio:secretos -- --cliente <nombre> --supabase <ref> --vercel <proyecto> --dominio <dominio>
      (los que falten, los pregunta)

  --simular          dice qué haría con cada plataforma y no llama a ninguna
  --cambiar-claves   vuelve a pedir las claves de Resend y UptimeRobot
  --sin-correo       no da de alta el correo en Resend (sitio sin dominio real todavía)
  --sin-monitor      no crea el monitor en UptimeRobot (mismo caso)
  --ayuda            esto
`;

/**
 * Se quitan los `--` sueltos antes de leer las opciones. La línea que da Claude
 * ya lleva uno (`npm run sitio:secretos -- --cliente …`) y la instrucción para
 * cambiar las claves dice «añade `-- --cambiar-claves` al final»: con dos `--`,
 * todo lo que va tras el segundo llegaría como texto suelto y el comando se
 * negaría a arrancar. Que la misma instrucción sirva para las dos líneas es lo
 * que evita tener que explicar la diferencia.
 */
const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== "--"),
  options: {
    cliente: { type: "string" },
    supabase: { type: "string" },
    vercel: { type: "string" },
    dominio: { type: "string" },
    simular: { type: "boolean", default: false },
    "cambiar-claves": { type: "boolean", default: false },
    "sin-correo": { type: "boolean", default: false },
    "sin-monitor": { type: "boolean", default: false },
    ayuda: { type: "boolean", default: false },
  },
  strict: true,
});

if (values.ayuda) {
  console.log(AYUDA);
  process.exit(0);
}

/**
 * Los datos que no vinieron en la línea se preguntan, uno a uno, con un ejemplo
 * de cómo es cada uno. Un comando que falla porque falta un argumento obliga a
 * quien no programa a editar una línea; uno que pregunta, no.
 */
const PREGUNTAS: { clave: "cliente" | "supabase" | "vercel" | "dominio"; texto: string }[] = [
  { clave: "cliente", texto: "Nombre corto del cliente (minúsculas y guiones, ej.: acme-legal): " },
  { clave: "supabase", texto: "Referencia del proyecto de Supabase (20 letras, te la da Claude): " },
  { clave: "vercel", texto: "Nombre del proyecto de Vercel (ej.: web-acme-legal): " },
  { clave: "dominio", texto: "Dominio del cliente, sin https:// (ej.: acmelegal.com): " },
];

const datos: Record<string, string> = {};
const faltan = PREGUNTAS.filter((p) => !values[p.clave]?.trim());
if (faltan.length > 0) {
  if (!process.stdin.isTTY) {
    console.error(`✗ Faltan datos: ${faltan.map((p) => `--${p.clave}`).join(", ")}.${AYUDA}`);
    process.exit(1);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  for (const p of faltan) datos[p.clave] = (await rl.question(p.texto)).trim();
  rl.close();
}
const dato = (k: "cliente" | "supabase" | "vercel" | "dominio"): string => values[k]?.trim() || datos[k] || "";

/**
 * Se perdona lo que una persona escribe de más al copiar un dominio del
 * navegador (`https://`, la barra final, mayúsculas). El id de un proyecto de
 * Vercel (`prj_…`) sí distingue mayúsculas, así que ese no se toca.
 */
const opciones: Opciones = {
  cliente: dato("cliente").toLowerCase(),
  supabase: dato("supabase").toLowerCase(),
  vercel: dato("vercel"),
  dominio: dato("dominio").toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, ""),
  simular: values.simular ?? false,
  cambiarClaves: values["cambiar-claves"] ?? false,
  sinCorreo: values["sin-correo"] ?? false,
  sinMonitor: values["sin-monitor"] ?? false,
};

const salida = (linea: string): void => console.log(linea);
const dependencias = opciones.simular ? plataformasSimuladas(salida) : plataformasReales(salida);
process.exitCode = await ejecutar(opciones, dependencias);
