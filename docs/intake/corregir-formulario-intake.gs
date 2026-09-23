/**
 * corregir-formulario-intake.gs — Corrige el formulario de intake YA CREADO,
 * sin tocar sus respuestas ni su hoja.
 *
 * Se pega en el editor de Apps Script DEL PROPIO FORMULARIO (⋮ → «Editor de
 * secuencias de comandos»): así `getActiveForm()` lo encuentra y ningún
 * identificador del formulario tiene que estar en este repositorio público.
 *
 * Los títulos de las preguntas NO cambian: `commands/leer-intake.md` lee la
 * hoja por el título de cada columna. Solo se añade una pregunta y se ajustan
 * opciones y ayudas. Se puede ejecutar dos veces: lo que ya está, no se repite.
 *
 * Los huecos que corrige (agente del paso 10, 22-09):
 *   1. Faltaba el correo PÚBLICO de la web (`marca.correoPublico`).
 *   2. «Solo inglés» no lo soporta el motor: la opción se quita.
 *   3. La ayuda del CRM prometía un «panel» que solo existe con área privada.
 *   4. El formulario solo hablaba español: la descripción invita a responder en inglés.
 *   5. La tipografía no tiene sitio en la ficha: la ayuda lo dice.
 */
const CORREO_PUBLICO = 'Correo público que aparece en la web';
const BUZON = 'Correo que debe recibir los mensajes del formulario de contacto de la web';
const INGLES =
  'Prefer English? Answer in English — every question accepts it. / ¿Prefieres inglés? Responde en inglés sin problema.';

function corregirFormularioIntake() {
  const form = FormApp.getActiveForm();
  if (!form) throw new Error('Abre este editor desde el formulario: ⋮ → Editor de secuencias de comandos.');
  const hechos = [];

  const buscar = (titulo) => form.getItems().find((i) => i.getTitle() === titulo);
  const exigir = (titulo) => {
    const item = buscar(titulo);
    if (!item) throw new Error('No encuentro la pregunta «' + titulo + '». No se ha cambiado nada más.');
    return item;
  };

  // 0 · Restos de una ejecución con el texto mal pegado (tildes rotas): fuera.
  form.getItems().forEach((i) => {
    const t = i.getTitle();
    if (t.indexOf('Correo p') === 0 && t !== CORREO_PUBLICO) {
      form.deleteItem(i);
      hechos.push('Borrada una copia mal escrita de «' + CORREO_PUBLICO + '»');
    }
  });

  // 1 · Correo público, justo después del buzón de contactos.
  if (!buscar(CORREO_PUBLICO)) {
    const buzon = exigir(BUZON);
    const nuevo = form
      .addTextItem()
      .setTitle(CORREO_PUBLICO)
      .setHelpText('El que verán tus visitantes en la web (por ejemplo hola@tuempresa.com). Si es el mismo de arriba, repítelo.')
      .setRequired(true)
      .setValidation(FormApp.createTextValidation().setHelpText('Escribe un correo válido.').requireTextIsEmail().build());
    form.moveItem(nuevo.getIndex(), buzon.getIndex() + 1);
    hechos.push('Añadida: «' + CORREO_PUBLICO + '»');
  }

  // 2 · Idiomas: sin «Solo inglés».
  const idiomas = exigir('Idiomas de la web').asMultipleChoiceItem();
  if (idiomas.getChoices().some((c) => c.getValue() === 'Solo inglés')) {
    idiomas
      .setChoiceValues(['Solo español', 'Español e inglés'])
      .setHelpText('Si tu web debe ser solo en inglés, elige «Español e inglés» y cuéntanoslo al final: lo vemos contigo.');
    hechos.push('Idiomas: quitada «Solo inglés»');
  }

  // 3 · CRM: sin prometer un panel.
  exigir('¿Usas un CRM para tus clientes?').setHelpText(
    'Si no usas ninguno, cada contacto de la web te llega por correo al buzón que indicaste.'
  );
  hechos.push('CRM: ayuda corregida');

  // 4 · Inglés en la descripción.
  const descripcion = form.getDescription();
  if (descripcion.indexOf(INGLES) === -1) {
    form.setDescription(descripcion + '\n\n' + INGLES);
    hechos.push('Descripción: invitación a responder en inglés');
  }

  // 5 · Tipografía: que no parezca que se va a usar tal cual.
  exigir('Tipografías de tu marca').setHelpText(
    'La web usa una tipografía optimizada para cargar rápido. Si tu marca exige otra, escríbela y la valoramos contigo.'
  );
  hechos.push('Tipografías: ayuda corregida');

  Logger.log('LISTO.\n  · ' + hechos.join('\n  · '));
}
