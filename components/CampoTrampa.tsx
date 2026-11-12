import { NOMBRE_DEL_CAMPO_TRAMPA } from "@/lib/antiabuso/trampa";

/**
 * El campo trampa de todo formulario público (RF-33, D-180). Uno solo, para que
 * los tres formularios no vuelvan a divergir.
 *
 * **Ni el nombre ni la etiqueta pueden parecerse a un dato real.** Se llamaba
 * `empresa_web` y su etiqueta decía lo mismo: el autocompletar de Chrome (y
 * Safari, y los gestores de contraseñas) reconoce «empresa» como el campo de
 * organización, ignora `autocomplete="off"` en formularios de dirección y
 * rellena también los campos fuera de pantalla. Resultado: una persona real que
 * autocompletaba su nombre y su correo pisaba la trampa, el servidor la tomaba
 * por bot, NO guardaba el lead y le respondía «disponible próximamente» en vez
 * del documento. Es la queja «lleno el formulario y no se descarga».
 *
 * Los `data-*` apartan además a 1Password, LastPass, Bitwarden y Dashlane, que
 * no leen `autocomplete`.
 */
export function CampoTrampa({ id }: { id: string }) {
  return (
    <div aria-hidden="true" style={estilo}>
      <label htmlFor={id}>No rellenar</label>
      <input
        id={id}
        name={NOMBRE_DEL_CAMPO_TRAMPA}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
        defaultValue=""
      />
    </div>
  );
}

/**
 * Fuera de la vista sin salir del documento. `display:none` lo saltan algunos
 * bots; así el bot lo ve y la persona no.
 */
const estilo: React.CSSProperties = {
  position: "absolute",
  left: "-9999px",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};
