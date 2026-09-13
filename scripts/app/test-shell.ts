/**
 * test-shell.ts — El armazón de aplicación, contra los CUATRO roles (FU-12).
 *
 * Lo que este archivo existe para demostrar es el criterio 5, que dice **dos**
 * cosas y no una: «el shell no expone acciones que el rol no puede ejecutar,
 * **y la comprobación real está en el servidor**».
 *
 * Las dos se prueban por SEPARADO y a propósito. Que un enlace no se pinte es
 * interfaz; que la URL escrita a mano no funcione es seguridad. Probar solo lo
 * primero es probar la parte que no protege: un enlace escondido sigue siendo
 * una dirección que cualquiera puede teclear.
 *
 * Y el criterio 3: la interfaz sale en el idioma de la **preferencia de la
 * cuenta**, sin conmutador y sin mirar la URL.
 *
 * No necesita servidor ni navegador: lo que se comprueba son funciones puras
 * sobre la matriz B.3, que es exactamente el nivel al que viven las dos mitades.
 */
import { contextoDeSesion } from "../../lib/db/context.ts";
import { idiomaDeInterfaz } from "../../lib/app/idioma.ts";
import { ESTADOS_CANONICOS } from "../../lib/app/estados.ts";
import {
  exigirSeccion,
  SECCIONES,
  seccionDeLaRuta,
  seccionesVisibles,
} from "../../lib/app/navegacion.ts";
import { ErrorDeAutorizacion, ROLES_DE_PERSONA } from "../../lib/auth/matriz.ts";
import type { UserRole } from "../../lib/db/schema.ts";

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

const ctxDe = (rol: UserRole) =>
  contextoDeSesion({
    userId: `u-${rol}`,
    userName: `Persona ${rol}`,
    role: rol,
    organizationId: rol.startsWith("client") ? "org-cliente" : null,
  });

const clavesVisibles = (rol: UserRole, superficie: "hq" | "portal") =>
  seccionesVisibles(ctxDe(rol), superficie).map((s) => s.clave);

/** ¿La comprobación del servidor deja pasar a este rol en esta sección? */
function servidorDejaPasar(rol: UserRole, clave: string): boolean {
  try {
    exigirSeccion(ctxDe(rol), clave);
    return true;
  } catch (e) {
    if (e instanceof ErrorDeAutorizacion) return false;
    throw e;
  }
}

console.log("\nCriterio 5, mitad de interfaz — el shell no enseña lo que el rol no puede:\n");

check(
  "`slg_operator` NO ve «Claves de API» ni «Auditoría», que son de admin (RF-86)",
  !clavesVisibles("slg_operator", "hq").includes("apikeys") &&
    !clavesVisibles("slg_operator", "hq").includes("audit"),
  clavesVisibles("slg_operator", "hq").join(" · "),
);
check(
  "`slg_admin` SÍ las ve: esconderlas a todo el mundo sería otro fallo",
  clavesVisibles("slg_admin", "hq").includes("apikeys") &&
    clavesVisibles("slg_admin", "hq").includes("audit"),
  clavesVisibles("slg_admin", "hq").join(" · "),
);
check(
  "`client_member` NO ve «Miembros»: invitar es de `client_admin`",
  !clavesVisibles("client_member", "portal").includes("members"),
  clavesVisibles("client_member", "portal").join(" · "),
);
check(
  "`client_admin` SÍ ve «Miembros»",
  clavesVisibles("client_admin", "portal").includes("members"),
  clavesVisibles("client_admin", "portal").join(" · "),
);
check(
  "ningún rol de cliente ve UNA SOLA sección de HQ",
  clavesVisibles("client_admin", "hq").length === 0 && clavesVisibles("client_member", "hq").length === 0,
  `${clavesVisibles("client_admin", "hq").join(" · ")} / ${clavesVisibles("client_member", "hq").join(" · ")}`,
);
check(
  "ningún rol de SLG ve el portal de cliente en su barra",
  clavesVisibles("slg_admin", "portal").length === 0 && clavesVisibles("slg_operator", "portal").length === 0,
  `${clavesVisibles("slg_admin", "portal").join(" · ")} / ${clavesVisibles("slg_operator", "portal").join(" · ")}`,
);

console.log("\nCriterio 5, mitad de servidor — ESCONDER NO ES PROTEGER:\n");

/**
 * La comprobación que de verdad importa: para **cada rol y cada sección**, lo
 * que el servidor decide tiene que coincidir con lo que la barra lateral pinta.
 * Si alguna vez divergen, hay una URL que no se ve y sí funciona — o al revés,
 * un enlace que lleva a un 404, que es un callejón.
 */
const divergencias: string[] = [];
for (const rol of ROLES_DE_PERSONA) {
  for (const s of SECCIONES) {
    const seVe = clavesVisibles(rol, s.superficie).includes(s.clave);
    const pasa = servidorDejaPasar(rol, s.clave);
    if (seVe !== pasa) divergencias.push(`${rol} · ${s.clave}: se ve ${seVe}, el servidor deja pasar ${pasa}`);
  }
}
check(
  `las ${ROLES_DE_PERSONA.length * SECCIONES.length} combinaciones de rol × sección coinciden`,
  divergencias.length === 0,
  divergencias.join("\n      "),
);
check(
  "escribir a mano la URL de «Claves» siendo `slg_operator` NO pasa",
  !servidorDejaPasar("slg_operator", "apikeys"),
);
check(
  "escribir a mano la URL de «Miembros» siendo `client_member` NO pasa",
  !servidorDejaPasar("client_member", "members"),
);
check(
  "una sección inexistente es 404, no un error distinto que confirme el mapa",
  (() => {
    try {
      exigirSeccion(ctxDe("slg_admin"), "seccion-que-no-existe");
      return false;
    } catch (e) {
      return e instanceof ErrorDeAutorizacion && e.status === 404;
    }
  })(),
);

console.log("\n«Dónde estoy» — la ruta más larga gana:\n");

check(
  "/hq/capturas es «Capturas»",
  seccionDeLaRuta("/hq/capturas")?.clave === "captures",
  String(seccionDeLaRuta("/hq/capturas")?.clave),
);
check("/hq/tablero es «Tablero»", seccionDeLaRuta("/hq/tablero")?.clave === "dashboard");
check(
  "/hq NO es una sección: es una puerta que redirige, no una pantalla",
  seccionDeLaRuta("/hq") === null,
  String(seccionDeLaRuta("/hq")?.clave),
);
check(
  "una ruta hija hereda su sección: /hq/capturas/abc sigue siendo «Capturas»",
  seccionDeLaRuta("/hq/capturas/abc")?.clave === "captures",
);
check("una ruta de fuera no es de ninguna sección", seccionDeLaRuta("/doctrina") === null);

console.log("\nCriterio 3 — el idioma sale de la preferencia de la cuenta (RF-72):\n");

check("«en» da inglés", idiomaDeInterfaz("en") === "en");
check("«es» da español", idiomaDeInterfaz("es") === "es");
check(
  "un valor desconocido cae a español y NO lanza: nadie se queda sin interfaz",
  idiomaDeInterfaz("pt-BR") === "es" && idiomaDeInterfaz(null) === "es" && idiomaDeInterfaz(undefined) === "es",
);

console.log("\nCriterio 1 — los seis estados, cerrados:\n");
check(
  "son exactamente los seis de la unidad",
  ESTADOS_CANONICOS.join(",") ===
    "cargando,vacio_inicial,vacio_por_filtro,error_de_carga,error_de_accion,sin_permiso",
  ESTADOS_CANONICOS.join(","),
);

if (fallos > 0) {
  console.error(`\n✗ shell: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
  process.exit(1);
}
console.log(`\n✓ shell: ${comprobaciones} comprobaciones sobre los cuatro roles, sin fallos.`);
