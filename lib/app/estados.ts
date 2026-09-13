/**
 * estados.ts — Los **seis estados canónicos** de FU-12, como vocabulario cerrado.
 *
 * El criterio 1 no pide «que haya estados»: pide que **ninguna pantalla de M3 o
 * M4 invente el suyo**. Un vocabulario abierto no puede garantizar eso, así que
 * la lista está cerrada aquí y `check:shell` comprueba que ninguna pantalla
 * escriba su propio «No hay nada todavía» a mano.
 *
 * POR QUÉ SEIS Y NO TRES. Las tres parejas parecen redundantes y no lo son:
 *
 *   · **vacío inicial** vs **vacío por filtro** — «todavía no hay capturas» y
 *     «tu filtro no encuentra ninguna» son problemas distintos con salidas
 *     distintas: una se arregla esperando o creando algo, la otra **quitando el
 *     filtro**. Enseñar el mismo cartel para las dos deja a la persona buscando
 *     un dato que sí está.
 *   · **error de carga** vs **error de acción** — en el primero **no se ve nada**
 *     y hay que reintentar; en el segundo **los datos siguen ahí** y lo que
 *     falló fue lo que se acababa de intentar. Confundirlos hace pensar que se
 *     perdió algo que no se perdió.
 *   · **cargando** vs cualquier vacío — un vacío mostrado mientras todavía se
 *     está cargando es una mentira que dura un segundo y se recuerda.
 *
 * **`sin_permiso` es uno solo, y dice «no encontrado»**: separar «no existe» de
 * «no puedes» confirmaría la existencia del recurso a quien no debe verlo
 * (RF-95, D-38). La indistinguibilidad es el requisito, no una simplificación.
 */
export const ESTADOS_CANONICOS = [
  "cargando",
  "vacio_inicial",
  "vacio_por_filtro",
  "error_de_carga",
  "error_de_accion",
  "sin_permiso",
] as const;

export type EstadoCanonico = (typeof ESTADOS_CANONICOS)[number];

/**
 * La clave de interfaz de cada estado. El texto vive en `content/ui/*.json`
 * —RF-16 rige también dentro de la aplicación— y se compone con este prefijo.
 */
export const claveDeEstado = (estado: EstadoCanonico, parte: "titulo" | "texto" | "accion") =>
  `app.state.${estado}.${parte}`;
