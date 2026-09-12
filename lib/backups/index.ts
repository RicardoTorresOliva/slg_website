/**
 * index.ts — Fachada del módulo de copias de seguridad (FU-14).
 *
 * Todo lo que necesita un proceso de copia entra por aquí. La restauración y
 * la purga NO están en esta fachada porque no son parte del puerto: viven en
 * `scripts/backups/`, con credenciales distintas (§8.3, mitigación 2 de R-37).
 */
export {
  leerConfigDeCopia,
  leerConfigDePurga,
  leerConfigDeRestauracion,
  type CopiaConfig,
  type PurgaConfig,
  type RestauracionConfig,
  type DestinoConfig,
  type VolumenesConfig,
  type RetencionConfig,
  PAPELES_DE_VOLUMEN,
  type PapelDeVolumen,
} from "./config.ts";

export {
  crearClienteDeDestino,
  depositar,
  type ContenidoADepositar,
  type Confirmacion,
} from "./destination.ts";

export {
  cifrarFlujo,
  descifrarArchivo,
  BackupCifradoInvalidoError,
  MAGIC,
  CABECERA_BYTES,
} from "./encryption.ts";

export {
  GENERACIONES,
  TIPOS,
  claveDeCopia,
  analizarClave,
  nuevaEjecucion,
  generacionesDeFecha,
  selloDeTiempo,
  seleccionarParaPurga,
  type Generacion,
  type TipoDeCopia,
  type ClaveDeCopia,
  type RetencionPorGeneracion,
} from "./generations.ts";
