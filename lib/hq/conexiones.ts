/**
 * conexiones.ts — El lanzador de HQ: los productos externos de SLG, leídos de
 * un archivo (DU-29(a) · RF-154 · D-11).
 *
 * POR QUÉ UN ARCHIVO Y NO UNA TABLA. Ricardo es una Company of One: añadir un
 * producto nuevo al lanzador no es un cambio de producto, es escribir su
 * nombre, su descripción, su URL y a qué grupo pertenece. D-11 lo dice para
 * todo el proyecto — «si Ricardo quiere cambiar algo, edita un archivo» — y
 * una tabla con su propia pantalla de administración sería justo lo contrario
 * para siete filas que cambian dos veces al año.
 *
 * VALIDA AL CARGAR Y LANZA SI ALGO FALTA, con el mismo contrato que
 * `lib/content/loader.ts` (FU-03, criterio 1): un archivo mal formado no debe
 * convertirse en un lanzador a medias en producción. Mejor que el build caiga
 * con un mensaje que nombre el archivo, la clave y el motivo.
 *
 * `url` es `null` a propósito para los productos que todavía no tienen
 * dirección conocida (el asistente, el superchatbot, la fábrica de contenidos,
 * el estudio creativo): la lista es la del negocio, no la de lo que ya existe,
 * y la pantalla los enseña como «pendiente de conectar» en vez de esconderlos.
 */
import fs from "node:fs";
import path from "node:path";

import { LANGS, type Lang } from "../content/schema.ts";

/** Los tres grupos con los que la pantalla organiza el lanzador. */
export const GRUPOS = ["operacion", "agentes", "creacion"] as const;
export type Grupo = (typeof GRUPOS)[number];

export type Conexion = {
  readonly clave: string;
  readonly nombre: Readonly<Record<Lang, string>>;
  readonly descripcion: Readonly<Record<Lang, string>>;
  /** `null` = todavía no tiene URL conocida; la pantalla la marca «pendiente». */
  readonly url: string | null;
  readonly grupo: Grupo;
};

const RUTA_POR_DEFECTO = path.join(process.cwd(), "content", "conexiones.json");

function validarTextoBilingue(
  valor: unknown,
  campo: string,
  clave: string,
  archivo: string,
): Record<Lang, string> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new Error(`${archivo}: «${clave}».${campo} debe ser un objeto con ${LANGS.join(" y ")}`);
  }
  const objeto = valor as Record<string, unknown>;
  const out = {} as Record<Lang, string>;
  for (const lang of LANGS) {
    const texto = objeto[lang];
    if (typeof texto !== "string" || texto.trim() === "") {
      throw new Error(`${archivo}: «${clave}».${campo}.${lang} falta o está vacío`);
    }
    out[lang] = texto;
  }
  return out;
}

/**
 * Carga y valida el archivo de conexiones. Lanza con un mensaje que nombra el
 * archivo, la clave y el motivo — nunca se degrada a una lista a medias.
 *
 * `ruta` solo existe para la prueba del cargador (`test:conexiones`), que
 * necesita apuntar a un archivo temporal sin tocar el de verdad.
 */
export function conexiones(ruta: string = RUTA_POR_DEFECTO): readonly Conexion[] {
  const archivo = path.relative(process.cwd(), ruta) || ruta;

  if (!fs.existsSync(ruta)) {
    throw new Error(`Falta ${archivo}`);
  }

  let crudo: unknown;
  try {
    crudo = JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch (e) {
    throw new Error(`${archivo} no es JSON válido: ${(e as Error).message}`);
  }
  if (!Array.isArray(crudo)) {
    throw new Error(`${archivo} debe ser una lista de conexiones`);
  }

  const vistas = new Set<string>();
  const out: Conexion[] = [];
  for (const [i, item] of crudo.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`${archivo}[${i}] debe ser un objeto`);
    }
    const o = item as Record<string, unknown>;

    const clave = o.clave;
    if (typeof clave !== "string" || clave.trim() === "") {
      throw new Error(`${archivo}[${i}].clave falta o está vacía`);
    }
    if (vistas.has(clave)) {
      throw new Error(`${archivo}: la clave «${clave}» está repetida`);
    }
    vistas.add(clave);

    const nombre = validarTextoBilingue(o.nombre, "nombre", clave, archivo);
    const descripcion = validarTextoBilingue(o.descripcion, "descripcion", clave, archivo);

    const url = o.url;
    if (url !== null && (typeof url !== "string" || !url.startsWith("https://"))) {
      throw new Error(`${archivo}: «${clave}».url debe ser null o empezar por https://`);
    }

    const grupo = o.grupo;
    if (typeof grupo !== "string" || !(GRUPOS as readonly string[]).includes(grupo)) {
      throw new Error(`${archivo}: «${clave}».grupo debe ser uno de: ${GRUPOS.join(", ")}`);
    }

    out.push({ clave, nombre, descripcion, url: url as string | null, grupo: grupo as Grupo });
  }

  return out;
}

/** Las conexiones agrupadas, en el orden fijo de `GRUPOS` — así la pantalla pinta los subtítulos en un orden estable. */
export function conexionesPorGrupo(ruta?: string): ReadonlyMap<Grupo, readonly Conexion[]> {
  const todas = conexiones(ruta);
  const mapa = new Map<Grupo, Conexion[]>(GRUPOS.map((g) => [g, []]));
  for (const c of todas) mapa.get(c.grupo)!.push(c);
  return mapa;
}
