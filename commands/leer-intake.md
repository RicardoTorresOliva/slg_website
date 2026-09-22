# Playbook: leer-intake — de la respuesta del cliente a su ficha

Se usa cuando un cliente ha respondido el formulario «Softlanding Global · Brief de tu nueva web»
(pasos 2–3 y 9 del §5 de `docs/PLAYBOOK_REPLICACION.md`). `AGENTS.md` governs; el perfil activo es
`profiles/marketing-website/profile.md`.

| | |
|---|---|
| **Entra** | Una fila de la hoja «Softlanding Global · Intake webs — respuestas» y la carpeta de Drive `Intake · <cliente>` |
| **Sale** | El `site.config.ts` del cliente, los borradores de `content/`, la marca en `public/`, la lista de variables no secretas y `docs/intake/pendientes.md` con lo que queda por confirmar |
| **Si falta un ★** | El borrador del correo de faltantes (correo 2 de `docs/intake/correos.md`) y nada más: sin ★ no arranca el reloj |

## 0. Lo que este playbook NO hace

- **No envía correos.** Deja el borrador; Ricardo pulsa **Enviar**.
- **No crea ni comparte la carpeta del cliente** sin el «sí» de Ricardo en el chat (paso 2 del §5).
- **No escribe en Drive.** Solo lee la hoja y la carpeta.
- **No descarga de enlaces externos** (Dropbox, WeTransfer, OneDrive). Si el cliente pegó uno, se le
  pide en el correo de faltantes que arrastre esos archivos a su carpeta.
- **No copia la fila al repositorio.** Teléfono, correos personales y nombres se quedan en la hoja;
  al repositorio solo va lo que la web publica.

## 1. Localizar la respuesta y la carpeta

Por el conector de Google Drive. **El conector no acepta `name`**: la consulta es por `title`.

1. `search_files` con `title contains 'Intake webs'`. Devuelve la carpeta «Softlanding Global ·
   Intake webs», el formulario y la hoja «Softlanding Global · Intake webs — respuestas».
2. `read_file_content` de la hoja. Cada fila es una respuesta; una respuesta editada por el cliente
   **reescribe su misma fila**, no añade otra. Se toma la fila cuyo `Nombre comercial` es el del
   cliente; si hay dos (el cliente respondió dos veces), la de `Timestamp` más reciente, y se anota.
3. `search_files` con `title contains 'Intake · <Nombre comercial>'` → la carpeta del cliente. Sus
   archivos: `search_files` con `'<id de la carpeta>' in parents`. Cada archivo se lee con
   `read_file_content` (documentos, PDF) o se baja con `download_file_content` (imágenes).
4. **Si la carpeta no existe**, es que falta el paso 2 del §5: se pide a Ricardo el «sí» para crearla
   y compartirla, y este playbook sigue solo con la hoja.

Las 32 columnas de la hoja, en orden (los encabezados son los títulos de las preguntas, literales):

`Timestamp` · `Nombre comercial` · `Razón social` · `País y ciudad` · `Nombre y apellido de la
persona responsable del proyecto` · `Correo corporativo de la persona responsable` · `Teléfono o
WhatsApp` · `¿Quién aprueba la web antes de publicarla?` · `Fecha en la que te gustaría lanzar la
web` · `¿Ya tienes dominio?` · `¿Cuál es tu dominio?` · `¿Dónde compraste el dominio?` · `¿Qué
correo usa tu empresa hoy?` · `¿Nos autorizas a gestionar el DNS del dominio?` · `Correo que debe
recibir los mensajes del formulario de contacto de la web` · `Colores de tu marca` · `Tipografías de
tu marca` · `¿Cómo quieres que suene tu web?` · `Webs que te gustan, y qué te gusta de cada una` ·
`Webs de tu competencia` · `Idiomas de la web` · `Tus servicios o productos` · `¿Se agrupan en áreas
o líneas?` · `Páginas que necesitas` · `¿Qué funciones necesitas?` · `¿Usas un CRM para tus
clientes?` · `¿Quieres medir las visitas a tu web?` · `Redes sociales y otros enlaces` · `¿Quién
escribe los textos de la web?` · `Política de privacidad y términos de uso` · `Si ya tienes tus
archivos en otra nube, pega aquí el enlace` · `¿Algo más que debamos saber?`

Las respuestas de casillas múltiples llegan en una sola celda, separadas por `, `.

## 2. Comprobar los ★

Los ítems ★ del §4 del playbook. Un ★ está **cumplido** cuando se da la condición de la tercera
columna; «No sé» nunca cumple un ★.

| # | Ítem ★ | Cumplido cuando | Si no |
|---|---|---|---|
| 1 | Empresa | `Nombre comercial`, `Razón social` y `País y ciudad` con texto | Faltante |
| 2 | Dominio | `¿Ya tienes dominio?` = «Sí» **y** `¿Cuál es tu dominio?` con un dominio válido **y** `¿Dónde compraste el dominio?` ≠ «No sé»; **o** = «No, quiero que lo gestionen ustedes». Y `¿Nos autorizas a gestionar el DNS…?` ≠ «No sé, explíquenmelo» | Faltante. «No sé, explíquenmelo» → el correo 2 lleva la explicación del DNS |
| 3 | Correo actual | `¿Qué correo usa tu empresa hoy?` ≠ «No sé» | Faltante: sin saberlo no se toca el DNS |
| 4 | Idiomas | `Idiomas de la web` = «Solo español» o «Español e inglés» | «Solo inglés» → **parada** (§3) |
| 5 | Marca | Hay un logo en la carpeta (SVG, PNG o PDF vectorial) **y** hay colores: en `Colores de tu marca` o en un manual de marca de la carpeta | Faltante. Favicon, imagen para redes y tipografías **no** bloquean: tienen salida (§6) |
| 6 | Servicios | `Tus servicios o productos` con al menos una línea que se lee como «Nombre — para quién — frase» (§5.1) | Faltante si no hay ninguna; si algunas no se leen, se interpretan y van a pendientes |
| 7 | Páginas | `Páginas que necesitas` con al menos una | Faltante |
| 8 | Contenido | `¿Quién escribe…?` = «Que los redacte Softlanding Global…» y hay material en la carpeta (presentación, folleto, web anterior); **o** = «Los entregamos nosotros» / «Una parte cada uno» y los textos están en la carpeta | Faltante: el material o los textos |
| 9 | Buzón de contactos | `Correo que debe recibir los mensajes…` con un correo | Faltante (el formulario ya valida el formato) |
| 10 | Funciones | `¿Qué funciones necesitas?` con al menos una | Faltante |
| 13 | Legales | «Usen una plantilla y la revisa nuestro asesor»; **o** «Ya los tenemos redactados» y los documentos están en la carpeta | Faltante: los documentos, o la decisión («No sé» → el correo 2 explica las dos vías) |
| 14 | Responsable y aprobación | Nombre, correo corporativo y `¿Quién aprueba…?` con texto | Faltante |
| 15 | Fecha | `Fecha en la que te gustaría lanzar la web` con fecha | Faltante. Si cae a **menos de 5 días hábiles** del día en que se completan los ★, va a pendientes y al correo 2 como aviso |

**Si falta al menos un ★:**

1. Redactar el correo 2 de `docs/intake/correos.md` con **una línea por faltante**, en el orden de
   la tabla, cada una con lo que el cliente tiene que hacer (responder, subir a la carpeta, elegir).
2. Dejarlo como borrador en Gmail para el `Correo corporativo de la persona responsable`, o pegarlo
   en el chat si el conector de Gmail no responde.
3. Decir a Ricardo, en una línea, que el borrador está listo para **Enviar**.
4. Seguir con §4–§7 igualmente, con lo que haya: el borrador de la ficha adelanta trabajo, pero el
   reloj de los 5 días no arranca hasta que el último ★ esté cumplido.

## 3. Paradas: respuestas que la plantilla no cubre

Estas no son faltantes del cliente, son decisiones de Ricardo. Se le plantean en el chat con la
opción recomendada, y el trabajo sigue en lo demás.

| Respuesta | Por qué para | Opción recomendada |
|---|---|---|
| `Idiomas de la web` = «Solo inglés» | El motor sirve el español en la raíz; un sitio solo en inglés no está soportado (`lib/sitio/tipos.ts`) | Proponer al cliente «Español e inglés» con el español mínimo, o cotizar el cambio del motor |
| `¿Usas un CRM…?` = HubSpot, Pipedrive, Salesforce, Zoho u «Otro» | Hace falta un adaptador nuevo en `lib/crm` (opción C del §2: +2 días) | Arrancar con `crm: false` (aviso por correo) y cotizar el adaptador aparte |
| `Páginas que necesitas` incluye «Preguntas frecuentes», «Equipo» o «Trabaja con nosotros» | El motor no tiene esas páginas | «Equipo» como sección de Quiénes somos; las otras dos, cotizadas aparte o fuera |
| `¿Qué funciones necesitas?` incluye «Entrar con Google» o «Entrar con Microsoft» | Exige credenciales del proveedor de identidad del cliente | Arrancar con invitación + contraseña; activarlo cuando el cliente entregue las credenciales |
| `¿Algo más…?` o `Tus servicios…` hablan de vender en línea, carrito o pagos | E-commerce no está en la plantilla (§2) | Proyecto aparte |

## 4. Columna → ficha, variable o destino

La ficha es `site.config.ts` con la forma de `lib/sitio/tipos.ts`. «—» en la segunda columna: la
columna no va a la ficha; la tercera dice adónde va.

| Columna | Campo de la ficha | Regla / otro destino |
|---|---|---|
| `Timestamp` | — | Fecha de la respuesta, al `work_log` del cliente |
| `Nombre comercial` | `marca.nombre`, `marca.remitente` | Literal. Su slug (§5.2) da el repositorio `web_<slug con guiones bajos>` y los archivos de marca |
| `Razón social` | `marca.razonSocial` | Literal; también en los legales |
| `País y ciudad` | — | Legales (jurisdicción) y página de contacto |
| `Nombre y apellido de la persona responsable…` | — | Primer administrador (paso 10 del §5) y saludo de los correos |
| `Correo corporativo de la persona responsable` | — | Destinatario de los correos 2–4 y de la invitación. No va al repositorio |
| `Teléfono o WhatsApp` | — | Página de contacto, solo si el cliente lo quiere público (pendiente) |
| `¿Quién aprueba la web…?` | — | Destinatario en copia del correo 3 |
| `Fecha en la que te gustaría lanzar la web` | — | Plan; aviso si cae a menos de 5 días hábiles |
| `¿Ya tienes dominio?` + `¿Cuál es tu dominio?` | `dominio.produccion` | `https://<dominio>` en minúsculas, sin `www` ni barra final. Sin dominio: `https://web-<slug>.vercel.app` provisional + pendiente de compra |
| `¿Dónde compraste el dominio?` | — | Paso 13 del §5 (DNS): a qué panel se refieren los pasos que se le manden |
| `¿Qué correo usa tu empresa hoy?` | — | Paso 13 del §5: registros MX y SPF que **no** se tocan |
| `¿Nos autorizas a gestionar el DNS…?` | — | Paso 13 del §5: *nameservers* a la plataforma, o los dos registros exactos al cliente |
| `Correo que debe recibir los mensajes…` | `marca.correoPublico` (provisional) | Buzón de contactos (§4.3). Como correo público de la web, **por confirmar**: el formulario no lo pregunta |
| `Colores de tu marca` | `marca.colores` | §4.1 |
| `Tipografías de tu marca` | — | La ficha no tiene tipografía: el motor usa Montserrat autoalojada. Otra tipografía → pendiente |
| `¿Cómo quieres que suene tu web?` | — | Tono de todos los borradores de `content/` |
| `Webs que te gustan…` · `Webs de tu competencia` | — | Referencia para los borradores; no se copia texto de ninguna |
| `Idiomas de la web` | `idiomas` | §4.2 |
| `Tus servicios o productos` | `oferta`, `nomenclatura.literales` | §5 |
| `¿Se agrupan en áreas o líneas?` | `oferta.ejes` | §5.3 |
| `Páginas que necesitas` | `menu`, `modulos`, `fotos` | §4.2 |
| `¿Qué funciones necesitas?` | `modulos` | §4.2 |
| `¿Usas un CRM…?` | `modulos.crm` | «No» o «No sé» → `false`. Cualquier CRM → parada (§3) |
| `¿Quieres medir las visitas…?` | `modulos.analitica` | «Sí» → `true`; «No» o «No sé» → `false` |
| `Redes sociales y otros enlaces` | `dominio.enlaces` | Una clave por enlace: `linkedin`, `instagram`, `whatsapp`, `agenda`… URL completa con `https://` |
| `¿Quién escribe los textos…?` | — | Todos los registros nacen `copy: temporal`; pasan a `aprobado` con el visto bueno del correo 3 |
| `Política de privacidad y términos de uso` | — | `content/pages/<idioma>/legal-*.md`: los del cliente, o la plantilla con `[PENDIENTE: revisión del asesor]` |
| `Si ya tienes tus archivos en otra nube…` | — | Un enlace de Drive se lee por el conector; cualquier otro, al correo 2 (§0) |
| `¿Algo más que debamos saber?` | — | Se lee entero: puede cambiar cualquier fila de esta tabla o disparar una parada |

**Campos de la ficha que ninguna columna da**, y de dónde salen:

| Campo | De dónde |
|---|---|
| `marca.lema` | Se redacta con el tono pedido a partir de los servicios; pendiente |
| `marca.logo`, `marca.isotipo` | La carpeta (§6) |
| `fotos` | La carpeta (§6) |
| `bloquesDeServicios` | `["puertas", "lineas", "articulos", "descarga"]`: los de SLG sin `holdings` ni `doctrina`. Los de un módulo apagado se omiten solos |
| `nomenclatura.variantesProhibidas`, `nomenclatura.reglasDeContenido` | Vacías al empezar; se llenan cuando el cliente corrige cómo se escribe algo |

### 4.1 Colores → los nueve tokens

`marca.colores` son las variables `--slg-*` de `app/tokens.css`. Cada token tiene un uso y un
contraste mínimo sobre `papel`; se mide con `npm run check:contraste`, no a ojo.

| Token | Uso en el motor | Contraste sobre `papel` | Del cliente |
|---|---|---|---|
| `primario` | Enlaces, botones, anillo de foco interior | ≥ 4,5:1 | Su color principal |
| `profundo` | Logotipo en texto, H1, titulares | ≥ 7:1 | Su color más oscuro, o el principal oscurecido |
| `acento` | Realce, iconos, subrayado. **Nunca texto** | — | Su color de detalle |
| `tinte` | Solo fondos, al 20–40 % | — | Su color claro |
| `secundario` | H3, datos destacados | ≥ 4,5:1 | Su segundo color oscuro, o una variante del principal |
| `alerta` | El botón del único CTA; máx. 1–2 por pantalla | Blanco encima ≥ 4,5:1 | Su color cálido, oscurecido hasta cumplir |
| `tinta` | Texto de cuerpo | ≥ 15:1 | `#0a0a14` salvo que el manual diga otro |
| `linea` | Divisores y bordes | — | `#c8ccd3` salvo manual |
| `papel` | Fondo | — | `#ffffff` salvo manual |

Colores descritos con palabras («azul marino y dorado») → se proponen los hexadecimales y van a
pendientes. Un color del cliente que no cumple su contraste **se oscurece** y va a pendientes con el
valor original al lado.

### 4.2 Idiomas, módulos y menú

| Respuesta | Ficha |
|---|---|
| `Idiomas` = «Solo español» | `idiomas: { principal: "es", adicionales: [] }` |
| `Idiomas` = «Español e inglés» | `idiomas: { principal: "es", adicionales: ["en"] }` |
| Función «Formulario de contacto» o página «Contacto» | `modulos.contacto: true` |
| Función «Documentos descargables…» o página «Documentos descargables» | `modulos.descargas: true` |
| Función o página «Blog» | `modulos.blog: true` · menú `nav.blog` · `fotos.blog` |
| Función «Área privada para tus clientes…» | `modulos.intranet: true` (variante B del perfil) |
| Siempre en un cliente | `modulos.doctrina: false` · `modulos.api: false` |
| Página «Inicio» | menú `nav.start` (siempre, aunque no la marque) |
| Página «Una página por servicio» | menú `nav.services` y un registro por servicio (§5.4). Sin marcar: pendiente, porque el motor da página a cada servicio de la oferta |
| Página «Quiénes somos» | menú `nav.about` · `content/pages/{es,en}/nosotros.md` / `about.md` · `fotos.nosotros` |

`fotos` lleva una clave por página fija activa: `servicios`, `nosotros`, `contacto`, y `descargas`
y `blog` si sus módulos están encendidos.

### 4.3 Variables de entorno no secretas

Salen del intake y se cargan en el proyecto de la plataforma de despliegue (paso 7 del §5). **Los
secretos no salen de aquí**: los genera y los carga `npm run sitio:secretos` (paso 8 del §5).

| Variable | Valor | De qué columna |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `dominio.produccion` en producción; la URL de la vista previa en *Preview* | `¿Cuál es tu dominio?` |
| `BETTER_AUTH_URL` | Igual que `NEXT_PUBLIC_SITE_URL` (solo con `intranet: true`) | `¿Cuál es tu dominio?` |
| `MAIL_FROM_NAME` | `marca.remitente` | `Nombre comercial` |
| `MAIL_FROM_ADDRESS` | `noreply@mailweb.<dominio>` — el subdominio de envío (D-24) | `¿Cuál es tu dominio?` |
| `MAIL_REPLY_TO` | `marca.correoPublico` | `Correo que debe recibir los mensajes…` (provisional) |
| **Buzón de contactos**: `MAIL_ALERTS_TO` hoy; `MAIL_LEADS_TO` si el paso 5b del §3 la crea | El correo, literal | `Correo que debe recibir los mensajes…` |
| `PRIVACY_POLICY_VERSION` | Fecha de la versión de la política, `AAAA-MM-DD` | `Política de privacidad…` |
| `FILES_DRIVER` | `supabase` | — (la plataforma elegida, §2) |
| `CRM_MODE`, `CRM_BASE_URL` | Solo con `crm: true`, tras la parada del §3 | `¿Usas un CRM…?` |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Solo con `analitica: true`; salen de la herramienta de analítica, no del intake | `¿Quieres medir las visitas…?` |

## 5. Servicios: del texto libre a la oferta y a los registros

### 5.1 Leer cada línea

La pregunta pide «Nombre — para quién es — una frase que lo explique», uno por línea.

1. Separar la celda por saltos de línea; descartar las líneas vacías.
2. Partir cada línea por ` — `, ` – ` o ` - ` (en ese orden de preferencia). Tres partes → nombre,
   para quién, frase. Dos partes → nombre y frase; «para quién» sale del material y va a pendientes.
   Una parte → solo nombre; el resto, del material, y a pendientes.
3. El nombre se copia **literal**, con sus mayúsculas: es nomenclatura del cliente.

### 5.2 Slugs y rutas

- **Slug**: el nombre en minúsculas, sin tildes ni eñes (`ñ` → `n`), sin signos, sin las palabras
  `de`, `del`, `la`, `el`, `los`, `las`, `y`, `en`, `para`, `a`; palabras unidas por guiones; como
  mucho 40 caracteres. Único en toda la oferta: si choca, se añade la palabra siguiente del nombre.
- **Slug en inglés**: `<slug>-en`. Los slugs no se traducen: son identificadores, no texto.
- **Rutas**: toda la oferta cuelga de la página Servicios. Español `/servicios/…`, inglés
  `/en/services/…`, con los mismos slugs de segmento en los dos idiomas.

### 5.3 Agrupación → ejes, líneas y sueltos

| `¿Se agrupan en áreas o líneas?` | Oferta |
|---|---|
| En blanco | `ejes: []` y cada servicio en `sueltos`, ruta `/servicios/<slug>` |
| «Área: A, B · Área: C» | **Un** eje, `clave: "servicios"`, que es la página Servicios (`pagina: { es: "servicios", en: "services" }`, `ruta: { es: "/servicios", en: "/en/services" }`); cada área es una línea en `/servicios/<clave>`, con su página `content/pages/{es,en}/<clave>.md` / `<clave>-en.md`; cada servicio en `/servicios/<clave de la línea>/<slug>` |
| Servicios que no aparecen en ninguna área | En `sueltos`, ruta `/servicios/<slug>` |
| Un nombre en las áreas que no está en la lista de servicios | Pendiente: no se inventa el servicio |

La clave de una línea es el slug de su nombre (§5.2). **Esta convención de rutas la confirma el paso
3 del §3** (el generador de rutas desde la ficha): si el generador fija otra, se cambia aquí.

### 5.4 El registro de cada servicio

Uno por servicio y por idioma: `content/services/es/<slug>.md` y, con inglés,
`content/services/en/<slug>-en.md`. Frontmatter (`lib/content/schema.ts`, colección `service`):

| Campo | Valor |
|---|---|
| `type` | `service` |
| `name` | El nombre literal, igual en los dos idiomas (la ficha tiene un solo `nombre`) |
| `branch` | El nombre de su línea; si es suelto, su propio nombre (`nombresDeRama()` en `lib/sitio`) |
| `parent` | La página de su línea (`<clave>` / `<clave>-en`); si es suelto, `home` / `home-en` |
| `download` | `d-NN` de su documento de descarga (§6) |
| `lang` · `pair` | `es` · `<slug>-en`, y a la inversa en el inglés |
| `tagline` | «para» + el «para quién», abreviado a cinco palabras como mucho |
| `copy` | `temporal` |

El cuerpo lleva **los seis encabezados de `SERVICE_SECTIONS`, literales y en este orden**; uno que
falte o cambie rompe el build:

| Español | Inglés | Se redacta con |
|---|---|---|
| `## Para quién y qué problema` | `## Who it is for and what problem` | El «para quién» y el problema que resuelve, del material |
| `## Qué es` | `## What it is` | La frase del cliente, desarrollada |
| `## Qué incluye` | `## What it includes` | Lo que diga el material; si no dice nada, `[PENDIENTE: qué incluye]` |
| `## Cómo trabajamos` | `## How we work` | El material y el tono pedido |
| `## Descarga` | `## Download` | Una frase que presenta el documento: es el único CTA de la página |
| `## Siguiente paso` | `## Next step` | Invitación a escribir |

Con `descargas: false` el contrato **sigue exigiendo** `download` y `## Descarga`: hasta que el paso
5 del §3 lo resuelva, el campo apunta a un `d-NN` con `status: coming-soon` y va a pendientes.

### 5.5 Nomenclatura

`nomenclatura.literales` = el nombre de cada servicio, de cada línea y, si el cliente la tiene, su
marca de producto. `check:nomenclature` exige desde entonces que se escriban siempre igual.

## 6. Los archivos de la carpeta

| Archivo | Va a | Cómo |
|---|---|---|
| Logo (SVG preferido; PNG o PDF vectorial) | `public/marca/logo-<slug>.svg` (o `.webp`) → `marca.logo` | SVG tal cual; PNG → WebP sin perder transparencia |
| Isotipo o versión sin texto | `public/marca/isotipo-<slug>.svg` → `marca.isotipo` | Si no hay, se recorta del logo y va a pendientes |
| Favicon | `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` | Del isotipo, si el cliente no da uno |
| Imagen para redes 1200×630 | `public/og.png` | Si no hay, logo sobre `papel`, centrado |
| Fotos | `public/fotos/<nombre>.webp` → `foto` de ejes, líneas, servicios y `fotos` | WebP, 1600 px de ancho, menos de 200 KB (`sharp` o `cwebp`). El nombre dice lo que se ve (`planta`, `equipo`), no el orden |
| Manual de marca | — | Colores (§4.1), tipografía (§4) y usos del logo |
| Presentación, folleto, web anterior | Borradores de `content/pages` y `content/services` | Fuente de los textos; nada se copia de una web de terceros |
| Textos entregados por el cliente | Los registros de `content/` que correspondan | Literal, con `copy: temporal` hasta el correo 3 |
| PDF pensados para descargar | `content/downloads/{es,en}/d-NN.md` + el archivo al almacenamiento | Uno por servicio; sin PDF, `status: coming-soon` |
| Legales redactados | `content/pages/{es,en}/legal-*.md` | Literal |

Una foto sin permiso de uso claro (bajada de internet, con marca de agua) no se usa: va a pendientes.

## 7. El resultado

Se escribe en el repositorio `web_<cliente>` si ya existe (paso 4 del §5), en una rama `intake`; si
no, en el directorio de trabajo de la sesión, y se mueve al crearlo.

1. `site.config.ts` — la ficha, con un comentario de cabecera que dice de qué respuesta sale
   (fecha del `Timestamp`), nunca con datos personales.
2. `content/services/{es,en}/*.md`, `content/pages/{es,en}/*.md` de las líneas, `nosotros`,
   contacto y legales, `content/downloads/{es,en}/d-NN.md`. Todo `copy: temporal`.
3. `public/marca/`, `public/fotos/`, `public/og.png`, los iconos de `app/`.
4. La tabla de variables no secretas (§4.3), con sus valores, para el paso 7 del §5.
5. `docs/intake/pendientes.md` — lo que queda por confirmar, con este formato:

   | # | Qué | Por qué está pendiente | Quién lo resuelve | Cómo |
   |---|---|---|---|---|
   | 1 | Correo público de la web | El formulario no lo pregunta; se puso el de contactos | Cliente | Correo 3 |

6. `npm run check:types` y `npm run check:content` en verde sobre el borrador.
7. Una entrada en el `work_log` del cliente: fecha de la respuesta, ★ cumplidos, paradas planteadas y
   número de pendientes.

Los pendientes que son del cliente van en el correo 3 (revisión de la vista previa); los que son de
Ricardo, al chat.

## 8. Ejemplo resuelto: «Cliente Demo»

Una respuesta inventada, de principio a fin.

### 8.1 La fila

| Columna | Respuesta |
|---|---|
| `Timestamp` | 23/09/2026 10:14:52 |
| `Nombre comercial` | Cliente Demo |
| `Razón social` | Cliente Demo S.A.C. |
| `País y ciudad` | Perú, Lima |
| `Nombre y apellido de la persona responsable…` | Ana Pérez |
| `Correo corporativo de la persona responsable` | ana.perez@clientedemo.example |
| `Teléfono o WhatsApp` | +51 900 000 000 |
| `¿Quién aprueba la web…?` | Luis Gómez, gerente general |
| `Fecha en la que te gustaría lanzar la web` | 15/10/2026 |
| `¿Ya tienes dominio?` | Sí |
| `¿Cuál es tu dominio?` | clientedemo.example |
| `¿Dónde compraste el dominio?` | Namecheap |
| `¿Qué correo usa tu empresa hoy?` | Google Workspace / Gmail |
| `¿Nos autorizas a gestionar el DNS…?` | Sí, gestiónenlo ustedes (recomendado: nosotros configuramos todo) |
| `Correo que debe recibir los mensajes…` | contacto@clientedemo.example |
| `Colores de tu marca` | Azul petróleo #0E4D64, arena #E8DCC4 y un naranja #F2994A para detalles |
| `Tipografías de tu marca` | Inter |
| `¿Cómo quieres que suene tu web?` | Cercana, Técnica |
| `Webs que te gustan…` | (una web de ingeniería: «se entiende qué hacen en diez segundos») |
| `Webs de tu competencia` | (dos webs) |
| `Idiomas de la web` | Español e inglés |
| `Tus servicios o productos` | Auditoría energética — plantas industriales medianas — medimos dónde se pierde la energía y cuánto cuesta<br>Paneles solares para empresas — naves y oficinas con techo propio — diseñamos, instalamos y mantenemos<br>Formación en eficiencia — equipos de mantenimiento — un curso práctico de tres días en tu planta |
| `¿Se agrupan en áreas o líneas?` | Ingeniería: Auditoría energética, Paneles solares para empresas · Formación: Formación en eficiencia |
| `Páginas que necesitas` | Inicio, Quiénes somos, Una página por servicio, Contacto, Preguntas frecuentes |
| `¿Qué funciones necesitas?` | Formulario de contacto, Documentos descargables a cambio del correo del visitante |
| `¿Usas un CRM…?` | No |
| `¿Quieres medir las visitas…?` | Sí |
| `Redes sociales y otros enlaces` | https://www.linkedin.com/company/cliente-demo<br>https://wa.me/51900000000 |
| `¿Quién escribe los textos…?` | Que los redacte Softlanding Global a partir de nuestro material |
| `Política de privacidad y términos de uso` | Usen una plantilla y la revisa nuestro asesor |
| `Si ya tienes tus archivos en otra nube…` | (en blanco) |
| `¿Algo más que debamos saber?` | El logo tiene una versión en blanco para fondos oscuros. |

### 8.2 La carpeta `Intake · Cliente Demo`

`logo-cliente-demo.svg` · `isotipo.svg` · `planta.jpg` · `techo-solar.jpg` · `equipo.jpg` ·
`curso.jpg` · `Presentación corporativa 2026.pdf` · `Manual de marca.pdf`

### 8.3 Comprobación

- **★ cumplidos: todos.** El reloj arranca el 23-09. La fecha pedida (15-10) cae a 16 días hábiles:
  sin aviso.
- **Una parada** para Ricardo: «Preguntas frecuentes» no existe en el motor. Recomendación: fuera
  del alcance de esta web, o cotizada aparte.
- **Sin faltantes**: no hay correo 2.

### 8.4 La ficha resultante

```ts
/**
 * site.config.ts — La ficha de Cliente Demo (D-165).
 * Sale de su respuesta al intake del 2026-09-23 (commands/leer-intake.md).
 */
import type { FichaDelSitio } from "./lib/sitio/tipos.ts";

export const sitio: FichaDelSitio = {
  marca: {
    nombre: "Cliente Demo",
    razonSocial: "Cliente Demo S.A.C.",
    lema: "Energía medida, instalada y enseñada.", // pendiente 1
    correoPublico: "contacto@clientedemo.example", // pendiente 2
    logo: "/marca/logo-cliente-demo.svg",
    isotipo: "/marca/isotipo-cliente-demo.svg",
    remitente: "Cliente Demo",
    colores: {
      primario: "#0e4d64", //   9,3:1 — azul petróleo del cliente
      profundo: "#0a3647", //  12,9:1 — el mismo, oscurecido
      acento: "#f2994a", //     2,2:1 — naranja del cliente: solo realce, nunca texto
      tinte: "#e8dcc4", //      arena del cliente: solo fondos
      secundario: "#1f6f8b", // 5,7:1 — variante del principal
      alerta: "#b4530f", //     5,0:1 con blanco — naranja oscurecido (pendiente 3)
      tinta: "#0a0a14",
      linea: "#c8ccd3",
      papel: "#ffffff",
    },
  },

  dominio: {
    produccion: "https://clientedemo.example",
    enlaces: {
      linkedin: "https://www.linkedin.com/company/cliente-demo",
      whatsapp: "https://wa.me/51900000000",
    },
  },

  idiomas: { principal: "es", adicionales: ["en"] },

  modulos: {
    blog: false,
    descargas: true,
    doctrina: false,
    contacto: true,
    intranet: false,
    api: false,
    crm: false,
    analitica: true,
  },

  menu: [
    { clave: "nav.start", ruta: { es: "/", en: "/en" } },
    { clave: "nav.services", ruta: { es: "/servicios", en: "/en/services" } },
    { clave: "nav.about", ruta: { es: "/nosotros", en: "/en/about" } },
  ],

  oferta: {
    ejes: [
      {
        clave: "servicios",
        nombre: "Servicios",
        pagina: { es: "servicios", en: "services" },
        ruta: { es: "/servicios", en: "/en/services" },
        foto: "techo-solar",
        lineas: [
          {
            clave: "ingenieria",
            nombre: "Ingeniería",
            pagina: { es: "ingenieria", en: "ingenieria-en" },
            ruta: { es: "/servicios/ingenieria", en: "/en/services/ingenieria" },
            foto: "planta",
            servicios: [
              {
                slug: "auditoria-energetica",
                nombre: "Auditoría energética",
                pagina: { es: "auditoria-energetica", en: "auditoria-energetica-en" },
                ruta: {
                  es: "/servicios/ingenieria/auditoria-energetica",
                  en: "/en/services/ingenieria/auditoria-energetica",
                },
                foto: "planta",
              },
              {
                slug: "paneles-solares-empresas",
                nombre: "Paneles solares para empresas",
                pagina: { es: "paneles-solares-empresas", en: "paneles-solares-empresas-en" },
                ruta: {
                  es: "/servicios/ingenieria/paneles-solares-empresas",
                  en: "/en/services/ingenieria/paneles-solares-empresas",
                },
                foto: "techo-solar",
              },
            ],
          },
          {
            clave: "formacion",
            nombre: "Formación",
            pagina: { es: "formacion", en: "formacion-en" },
            ruta: { es: "/servicios/formacion", en: "/en/services/formacion" },
            foto: "curso",
            servicios: [
              {
                slug: "formacion-eficiencia",
                nombre: "Formación en eficiencia",
                pagina: { es: "formacion-eficiencia", en: "formacion-eficiencia-en" },
                ruta: {
                  es: "/servicios/formacion/formacion-eficiencia",
                  en: "/en/services/formacion/formacion-eficiencia",
                },
                foto: "curso",
              },
            ],
          },
        ],
      },
    ],
    sueltos: [],
  },

  fotos: {
    servicios: "techo-solar",
    nosotros: "equipo",
    descargas: "curso",
    contacto: "planta",
  },

  bloquesDeServicios: ["puertas", "lineas", "articulos", "descarga"],

  nomenclatura: {
    literales: [
      "Cliente Demo",
      "Ingeniería",
      "Formación",
      "Auditoría energética",
      "Paneles solares para empresas",
      "Formación en eficiencia",
    ],
    variantesProhibidas: [],
    reglasDeContenido: [],
  },
};
```

### 8.5 Un registro de servicio

`content/services/es/auditoria-energetica.md`:

```markdown
---
type: service
name: "Auditoría energética"
branch: Ingeniería
parent: "ingenieria"
download: "d-01"
lang: es
pair: "auditoria-energetica-en"
tagline: "para plantas industriales medianas"
copy: temporal
---

## Para quién y qué problema

Para la planta industrial mediana que paga cada mes una factura de energía que nadie sabe desglosar.

## Qué es

Medimos dónde se pierde la energía y cuánto cuesta cada pérdida, máquina por máquina.

## Qué incluye

[PENDIENTE: qué incluye — la presentación corporativa no lo detalla]

## Cómo trabajamos

(de la presentación corporativa, con tono cercano y técnico)

## Descarga

Un resumen de cómo es una auditoría y qué se entrega al final.

## Siguiente paso

Si quieres saber cuánto pierde tu planta, escríbenos.
```

Su par `content/services/en/auditoria-energetica-en.md` lleva `name: "Auditoría energética"`,
`parent: "ingenieria-en"`, `download: "d-01-en"`, `lang: en`, `pair: "auditoria-energetica"` y los
seis encabezados en inglés. `d-01`, `d-02` y `d-03` nacen con `status: coming-soon`: el cliente no ha
dado todavía los PDF.

### 8.6 Variables no secretas

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://clientedemo.example` (producción) |
| `MAIL_FROM_NAME` | `Cliente Demo` |
| `MAIL_FROM_ADDRESS` | `noreply@mailweb.clientedemo.example` |
| `MAIL_REPLY_TO` | `contacto@clientedemo.example` |
| `MAIL_ALERTS_TO` (buzón de contactos) | `contacto@clientedemo.example` |
| `PRIVACY_POLICY_VERSION` | La fecha en que el asesor apruebe la política |
| `FILES_DRIVER` | `supabase` |
| `NEXT_PUBLIC_UMAMI_*` | De la herramienta de analítica, cuando se cree el sitio en ella |

Sin `BETTER_AUTH_URL` ni `CRM_*`: sin área privada y sin CRM.

### 8.7 `docs/intake/pendientes.md`

| # | Qué | Por qué está pendiente | Quién lo resuelve | Cómo |
|---|---|---|---|---|
| 1 | El lema | Redactado por Claude a partir de los servicios | Cliente | Correo 3 |
| 2 | Correo público de la web | El formulario no lo pregunta; se puso el de contactos | Cliente | Correo 3 |
| 3 | Naranja del botón | `#f2994a` no se lee con texto blanco; se oscureció a `#b4530f` | Cliente | Correo 3 |
| 4 | Tipografía Inter | La ficha no tiene tipografía; el motor usa Montserrat | Ricardo | Chat: aceptar Montserrat o cotizar |
| 5 | «Preguntas frecuentes» | El motor no tiene esa página (parada del §3) | Ricardo | Chat |
| 6 | Nombres de servicio en inglés | La ficha tiene un solo nombre por servicio: en `/en` se lee «Auditoría energética» | Cliente | Correo 3: ¿se quedan en español? |
| 7 | Qué incluye cada servicio | La presentación no lo detalla | Cliente | Correo 3 |
| 8 | Los tres PDF de descarga | No están en la carpeta | Cliente | Correo 3 |
| 9 | Versión en blanco del logo | Anunciada en «¿Algo más?», no está en la carpeta | Cliente | Correo 3 |
| 10 | Teléfono público | ¿Va en la página de contacto? | Cliente | Correo 3 |
| 11 | Revisión de los legales | Plantilla elegida; la revisa su asesor | Cliente | Correo 3 |
