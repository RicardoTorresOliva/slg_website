/**
 * crear-formulario-intake.gs — El brief de una web de cliente, en Google Forms.
 *
 * SE EJECUTA UNA SOLA VEZ, NO POR CLIENTE. Crea:
 *   · la carpeta de Drive «SLG · Intake webs»;
 *   · el formulario «SLG Agency · Brief de tu nueva web», con las 15 preguntas
 *     del checklist de intake (docs/PLAYBOOK_REPLICACION.md §4);
 *   · la hoja «SLG · Intake webs — respuestas», donde caen todas las respuestas
 *     de todos los clientes. Claude la lee por el conector de Google Drive.
 *
 * LOS ARCHIVOS NO VAN EN EL FORMULARIO, Y NO ES UN OLVIDO. Una pregunta de
 * «subir archivo» obliga al cliente a entrar con una cuenta de Google —medio
 * mundo corporativo usa Microsoft 365— y Apps Script ni siquiera puede crearla.
 * Por eso, al llegar cada respuesta, Claude crea en Drive la carpeta del
 * cliente y se la comparte: el cliente arrastra ahí logos, fotos y documentos
 * sin cuenta de nada, y Claude los lee por el mismo conector.
 *
 * EL CORREO SE PIDE COMO PREGUNTA Y NO CON «recopilar correos» por la misma
 * razón: la recopilación verificada exige iniciar sesión en Google.
 *
 * Cómo se ejecuta: docs/PLAYBOOK_REPLICACION.md §4.1.
 */
function crearFormularioIntake() {
  const carpeta = DriveApp.createFolder('SLG · Intake webs');

  const form = FormApp.create('SLG Agency · Brief de tu nueva web');
  form
    .setDescription(
      'Con esto construimos tu web. Son unos 15 minutos. Si no sabes una respuesta, ' +
        'elige «No sé»: te ayudamos después. Al terminar te llega un enlace para ' +
        'corregir lo que quieras, y una carpeta compartida para subir logos, fotos y documentos.'
    )
    .setProgressBar(true)
    .setAllowResponseEdits(true)
    .setConfirmationMessage(
      'Gracias. En menos de 24 horas te llega por correo una carpeta compartida de ' +
        'Google Drive para subir tu logo, fotos y documentos. No necesitas cuenta de Google.'
    );

  const correo = FormApp.createTextValidation()
    .setHelpText('Escribe un correo válido.')
    .requireTextIsEmail()
    .build();

  const texto = (titulo, ayuda, obligatorio) =>
    form.addTextItem().setTitle(titulo).setHelpText(ayuda || '').setRequired(!!obligatorio);
  const parrafo = (titulo, ayuda, obligatorio) =>
    form.addParagraphTextItem().setTitle(titulo).setHelpText(ayuda || '').setRequired(!!obligatorio);
  const unaOpcion = (titulo, opciones, obligatorio, ayuda) =>
    form
      .addMultipleChoiceItem()
      .setTitle(titulo)
      .setHelpText(ayuda || '')
      .setChoiceValues(opciones)
      .setRequired(!!obligatorio);
  const variasOpciones = (titulo, opciones, obligatorio, ayuda) =>
    form
      .addCheckboxItem()
      .setTitle(titulo)
      .setHelpText(ayuda || '')
      .setChoiceValues(opciones)
      .setRequired(!!obligatorio);
  const seccion = (titulo, ayuda) => form.addPageBreakItem().setTitle(titulo).setHelpText(ayuda || '');

  /* ── 1 · Empresa y contacto ─────────────────────────────────────────────── */
  form.addSectionHeaderItem().setTitle('1 · Tu empresa');
  texto('Nombre comercial', 'Como quieres que aparezca en la web.', true);
  texto('Razón social', 'El nombre legal que aparece en tus facturas.', true);
  texto('País y ciudad', '', true);
  texto('Nombre y apellido de la persona responsable del proyecto', '', true);
  texto('Correo corporativo de la persona responsable', 'Será la primera persona con acceso a la web.', true)
    .setValidation(correo);
  texto('Teléfono o WhatsApp', '', false);
  texto('¿Quién aprueba la web antes de publicarla?', 'Nombre y cargo.', true);
  form
    .addDateItem()
    .setTitle('Fecha en la que te gustaría lanzar la web')
    .setRequired(true);

  /* ── 2 · Dominio y correo ───────────────────────────────────────────────── */
  seccion('2 · Dominio y correo', 'El dominio es la dirección de tu web, por ejemplo tuempresa.com.');
  unaOpcion('¿Ya tienes dominio?', ['Sí', 'No, quiero que lo gestionen ustedes', 'No sé'], true);
  texto('¿Cuál es tu dominio?', 'Por ejemplo: tuempresa.com', false);
  unaOpcion(
    '¿Dónde compraste el dominio?',
    ['Hostinger', 'GoDaddy', 'Namecheap', 'Google / Squarespace', 'Cloudflare', 'Otro', 'No sé'],
    false
  );
  unaOpcion(
    '¿Qué correo usa tu empresa hoy?',
    ['Microsoft 365 / Outlook', 'Google Workspace / Gmail', 'El correo de mi hosting', 'No tenemos correo con el dominio', 'No sé'],
    true,
    'Lo preguntamos para no tocar nada que haga funcionar tu correo.'
  );
  unaOpcion(
    '¿Nos autorizas a gestionar el DNS del dominio?',
    [
      'Sí, gestiónenlo ustedes (recomendado: nosotros configuramos todo)',
      'No, prefiero añadir yo los registros que me indiquen',
      'No sé, explíquenmelo',
    ],
    true,
    'El DNS es la configuración que dice dónde vive tu web. Si lo gestionamos nosotros, te pediremos un solo cambio en tu proveedor y no tendrás que tocar nada más. Tu correo seguirá funcionando igual.'
  );
  texto('Correo que debe recibir los mensajes del formulario de contacto de la web', '', true).setValidation(correo);

  /* ── 3 · Marca ──────────────────────────────────────────────────────────── */
  seccion('3 · Tu marca', 'El logo, las fotos y el manual de marca los subirás a la carpeta compartida.');
  parrafo('Colores de tu marca', 'Si los tienes en código (por ejemplo #0A2540), mejor. Si no, descríbelos.', false);
  texto('Tipografías de tu marca', 'Si no lo sabes, déjalo en blanco.', false);
  variasOpciones(
    '¿Cómo quieres que suene tu web?',
    ['Sobria', 'Cercana', 'Técnica', 'Premium', 'Juvenil', 'Institucional'],
    true
  );
  parrafo('Webs que te gustan, y qué te gusta de cada una', 'Una por línea.', false);
  parrafo('Webs de tu competencia', 'Una por línea.', false);

  /* ── 4 · Idiomas y estructura ───────────────────────────────────────────── */
  seccion('4 · Idiomas y lo que ofreces');
  unaOpcion('Idiomas de la web', ['Solo español', 'Solo inglés', 'Español e inglés'], true);
  parrafo(
    'Tus servicios o productos',
    'Uno por línea, así: Nombre — para quién es — una frase que lo explique.',
    true
  );
  parrafo(
    '¿Se agrupan en áreas o líneas?',
    'Por ejemplo: «Consultoría: A, B · Formación: C, D». Si no, déjalo en blanco.',
    false
  );
  variasOpciones(
    'Páginas que necesitas',
    [
      'Inicio',
      'Quiénes somos',
      'Una página por servicio',
      'Blog',
      'Documentos descargables',
      'Contacto',
      'Preguntas frecuentes',
      'Equipo',
      'Trabaja con nosotros',
    ],
    true
  );

  /* ── 5 · Funciones ──────────────────────────────────────────────────────── */
  seccion('5 · Funciones');
  variasOpciones(
    '¿Qué funciones necesitas?',
    [
      'Formulario de contacto',
      'Documentos descargables a cambio del correo del visitante',
      'Blog',
      'Área privada para tus clientes (con usuario y contraseña)',
      'Entrar con Google',
      'Entrar con Microsoft',
    ],
    true
  );
  unaOpcion(
    '¿Usas un CRM para tus clientes?',
    ['No', 'HubSpot', 'Pipedrive', 'Salesforce', 'Zoho', 'Otro', 'No sé'],
    true,
    'Si no usas ninguno, los contactos de la web te llegan por correo y quedan guardados en tu panel.'
  );
  unaOpcion(
    '¿Quieres medir las visitas a tu web?',
    ['Sí', 'No', 'No sé'],
    true,
    'Medirlas implica cargar una herramienta de estadísticas en la web.'
  );
  parrafo('Redes sociales y otros enlaces', 'LinkedIn, Instagram, WhatsApp, enlace para agendar citas… uno por línea.', false);

  /* ── 6 · Contenido y legales ────────────────────────────────────────────── */
  seccion('6 · Textos y legales');
  unaOpcion(
    '¿Quién escribe los textos de la web?',
    [
      'Los entregamos nosotros',
      'Que los redacte SLG a partir de nuestro material',
      'Una parte cada uno',
    ],
    true
  );
  unaOpcion(
    'Política de privacidad y términos de uso',
    [
      'Ya los tenemos redactados',
      'Usen una plantilla y la revisa nuestro asesor',
      'No sé',
    ],
    true
  );
  texto(
    'Si ya tienes tus archivos en otra nube, pega aquí el enlace',
    'Drive, Dropbox, WeTransfer, OneDrive. Es opcional: igual te enviaremos una carpeta.',
    false
  );
  parrafo('¿Algo más que debamos saber?', '', false);

  /* ── Respuestas a una hoja, y todo dentro de la carpeta ─────────────────── */
  const hoja = SpreadsheetApp.create('SLG · Intake webs — respuestas');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, hoja.getId());
  DriveApp.getFileById(form.getId()).moveTo(carpeta);
  DriveApp.getFileById(hoja.getId()).moveTo(carpeta);

  Logger.log('LISTO.');
  Logger.log('Enlace para el cliente:   ' + form.getPublishedUrl());
  Logger.log('Editar el formulario:     ' + form.getEditUrl());
  Logger.log('Hoja de respuestas:       ' + hoja.getUrl());
  Logger.log('Carpeta en Drive:         ' + carpeta.getUrl());
}
