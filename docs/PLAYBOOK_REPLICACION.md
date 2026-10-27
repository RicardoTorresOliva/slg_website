---
type: Plantilla
title: Playbook de replicación — webs de clientes desde slg_website
description: Qué de slg_website es núcleo reutilizable, qué se configura por cliente y qué es específico de SLG; stack mínimo recomendado; plan para convertir el repo en plantilla; intake, procedimiento de lanzamiento en ≤ 5 días hábiles y estimación para cinco encargos.
tags: [playbook, plantilla, clientes, replicacion, slg_website]
timestamp: 2026-09-22
lang: es
---

# Playbook de replicación — 5 webs de clientes

Base de trabajo: `docs/plantilla-de-sitios.md` (inventario línea a línea del 18-09) y `docs/MANUAL_DEL_SISTEMA.md` (estado real del 22-09).

## 1. Clasificación

| Clase | Qué es | Piezas concretas | Qué se hace con ello |
|---|---|---|---|
| **NÚCLEO** (motor, no se toca) | Todo lo que no lleva una sola línea de SLG | `AGENTS.md` + `profiles/software-app` · capa de contenido OKF bilingüe (`lib/content`) · identidad y roles (`lib/auth`) · aislamiento por empresa en la base (RLS, `lib/db`) · invitaciones · correo SMTP · adaptadores de archivos (S3/MinIO y Supabase) · anti-abuso propio · cola al CRM y webhooks (`lib/colas`, `lib/crm`, `lib/webhooks`) · blog y RSS · HQ y portal · API v1 y OpenAPI · visor aislado · copias cifradas · **los 65 frenos** · CI de tres trabajos · `docs/blog-editor.md` · el mapa «Empieza aquí» generado desde la tabla de rutas | Se clona tal cual |
| **CONFIGURABLE por cliente** | Lo que hoy está escrito a mano y debe salir de un `site.config` | **Identidad** (13 sitios con «SLG Agency»: nombre, wordmark, favicon, Open Graph, colores) · **Dominio** (`NEXT_PUBLIC_SITE_URL`, remitente de correo, visor) · **Idiomas** (hoy ES/EN fijos; un cliente puede querer uno) · **Estructura de la oferta** (`lib/content/rutas.ts`: ejes → líneas → servicios; `schema.ts` con los 11 literales de servicio; `nomenclature.ts` con 30 patrones; `POR_RUTA` de `Fotografia.tsx`) · **Módulos** (blog sí/no, descargas sí/no, portal sí/no, CRM sí/no, analítica sí/no) · **Textos** (`content/ui/*.json`, `content/pages`, `content/services`, `content/downloads`, legales) · **Cinco frenos que validan contra la oferta**: `check:nomenclature`, `check:armazon`, `check:paginas`, `check:seo`, `check:copy` | Se parametriza una vez; después cada cliente es un archivo de configuración + su contenido |
| **ESPECÍFICO de SLG** (se descarta) | Lo que solo tiene sentido para SLG Agency | La Doctrina Phoenix y sus documentos · los 11 servicios y las tres líneas de VoltAi · Holdings by SLG · los 11 PDF de descarga · el blog actual · la integración con **este** CRM (`crm.softlandingglobal.com`) · la Academy tal como está (noticias con importancia editorial, programas Phoenix) · el mapa de servicios · `content/conexiones.json` de HQ · `SLG_Overhauling` como fuente de copy | No se copia; el cliente trae lo suyo por el intake |

## 2. Stack recomendado para clientes

**Regla**: una web de cliente informativa se entrega con **tres herramientas** (Vercel, Supabase, Resend) y el registrador de dominio del cliente. Todo lo demás es opcional o sobra.

| Herramienta actual | ¿Sobra en una web de cliente? | Qué la reemplaza |
|---|---|---|
| VPS + Easypanel | **Sí**, para informativas y con intranet | Vercel (web) + Supabase (datos y archivos). El VPS solo si el cliente exige sus datos en su servidor o ya tiene CRM/n8n propios |
| MinIO | **Sí** | Supabase Storage (ya soportado por `FILES_DRIVER=supabase`) |
| Umami autoalojado | **Sí**, salvo que el cliente pida analítica sin terceros | Nada (informativa simple) o Umami Cloud / Vercel Web Analytics si el cliente acepta un script de terceros (decisión de intake) |
| n8n + webhooks | **Sí**, salvo que el cliente tenga automatizaciones | Nada; la cola del CRM basta |
| CRM propio + `lib/crm` | **Depende** | **Con `CRM_Template`**: conecta sin tocar código — expone las mismas rutas (`/api/v1/contacts`, `/api/v1/notes`) que el CRM de SLG, comprobado el 22-09. **Con HubSpot, Pipedrive u otro**: un adaptador nuevo en `lib/crm` (el puerto ya existe), ~1 día. **Sin CRM**: hoy **no** hay aviso por captura — la cola intenta entregar, falla cinco veces y a las ~31 h manda un aviso de *fallo*; lo arregla el paso 5b del §3 |
| Cloudflare R2 (copias) | **Sí** en tramo gratuito de Supabase | Copias automáticas de Supabase (7 días en Free, 30 en Pro). R2 solo si el contrato exige retención larga |
| UptimeRobot | No sobra: gratis y cinco minutos | Se mantiene, un monitor por cliente |
| Google / Microsoft login | **Sí** para informativas; **depende** para intranet | Invitación + contraseña ya funciona; social solo si el cliente lo pide y entrega las credenciales en el intake |
| Docker + `docker-compose.yml` | Solo para desarrollo local | Se mantiene para las pruebas de base de datos; el cliente nunca lo ve |

| Opción | Tiempo de entrega | Costo mensual | Complejidad de mantenimiento |
|---|---|---|---|
| **A · Informativa** — web pública ES(/EN), formulario de contacto, descargas, blog opcional. Vercel + Supabase Free + Resend Free | **2–3 días** (con contenido entregado) | 0 USD (Vercel Hobby no admite uso comercial → Vercel Pro compartido del equipo de SLG: ~20 USD/mes por asiento, prorrateable entre clientes) [POR CONFIRMAR precio vigente] | Baja: solo contenido y despliegues |
| **B · Informativa + intranet** — A + HQ/portal con invitaciones, entregables y avisos. Vercel + Supabase (Free o Pro ~25 USD) + Resend | **4–5 días** | 0–45 USD/mes | Media: usuarios, copias, migraciones |
| **C · Con CRM externo** — B + adaptador al CRM del cliente | **+2 días** por CRM nuevo | Igual que B + el CRM del cliente | Media-alta: dos sistemas de registro |
| **D · Réplica completa de SLG** (VPS, MinIO, n8n, Umami, R2) | 2–3 semanas (lo que costó esta) | 20–60 USD/mes + VPS | Alta: no recomendable para clientes |

> **E-commerce no está cubierto**: no hay carrito, pagos ni catálogo en el núcleo. Si un cliente lo pide, es un proyecto distinto (o una tienda externa enlazada).


## 3. Plan para convertir `slg_website` en plantilla de cliente

Orden estricto: cada paso depende del anterior. Total: **4 días de Claude + 45 min de Ricardo**, antes del primer cliente.

| # | Paso | Quién | Salida | Tiempo | Estado |
|---|---|---|---|---|---|
| 0 | Estructura de la oferta **declarada en un archivo** (`site.config.ts`), no un `rutas.ts` por cliente | Ricardo | **D-165** en `docs/decision_log.md` | — | ✅ 22-09 |
| 1 | Crear `site.config.ts`: nombre, dominio, idiomas, colores, logo, remitente, módulos activos y estructura de la oferta | Claude | Archivo + tipos | 3 h | ✅ 22-09 |
| 2 | Sustituir los 26 sitios de marca y dominio (§3.1, §3.2 de `plantilla-de-sitios.md`) por lecturas del config | Claude | 0 «SLG Agency» / `softlandingglobal.com` fuera de `content/` y del config | 3 h | ✅ 22-09 |
| 3 | Derivar `rutas.ts`, `PROJECT_SERVICES`, `nomenclature.ts` y `POR_RUTA` del config | Claude | Generador + freno `check:sitio` | 6 h | ✅ 22-09 · D-166, migración 0024 |
| 4 | Parametrizar los cinco frenos que validan contra la oferta de SLG | Claude | CI verde con un config «Cliente Demo» | 4 h | ✅ 22-09 |
| 5 | Módulos apagables: portal, blog, descargas, CRM, analítica | Claude | `portal: false` → sin `/portal` ni `/hq/*` | 4 h | ✅ 22-09 |
| 5b | **Modo sin CRM**: cada captura manda un aviso al correo del cliente con los datos del contacto, y la cola no intenta entregar a ningún CRM (sin avisos de fallo falsos) | Claude | Aviso por correo + prueba | 2 h | ✅ 22-09 · migración 0025, variable `MAIL_LEADS_TO` |
| 6 | Perfil `marketing-website` en `profiles/` | Claude | `profiles/marketing-website/profile.md` | 2 h | ✅ 22-09 |
| 7 | **Aprovisionamiento por MCP**: `commands/crear-sitio.md` — repo con `gh`, proyecto Supabase, migraciones y bucket por la API de Supabase (sin contraseña ni IPv6), proyecto Vercel conectado a GitHub, variables no secretas | Claude | Playbook ejecutable por Claude | 4 h | ✅ 22-09 |
| 8 | **Comando único de secretos** `npm run sitio:secretos`: genera los secretos, los carga en Vercel y Supabase, da de alta el dominio en Resend y el monitor en UptimeRobot, sin que ningún valor pase por la conversación. Las claves de Resend y UptimeRobot las pide la primera vez y las guarda en el Llavero de macOS | Claude (lo escribe) | `scripts/sitio/secretos.ts` | 4 h | ✅ 22-09 · `npm run sitio:secretos` |
| 9 | `auth:primer-admin` en modo invitación: manda el enlace al responsable en vez de imprimir una contraseña | Claude | Script cambiado + prueba | 1 h | ✅ 22-09 |
| 10 | Lector del intake: hoja de respuestas + carpeta de Drive → borrador de `site.config.ts` y del contenido | Claude | `commands/leer-intake.md` | 3 h | ✅ 22-09 · skill `leer-intake` |
| 11 | Plantillas de los cuatro correos al cliente (formulario, faltantes, revisión, entrega) | Claude | `docs/intake/correos.md` | 1 h | ✅ 22-09 · `docs/intake/correos.md` |
| 12 | Vaciar lo específico de SLG y dejar un «Cliente Demo» bilingüe con 3 servicios | Claude | La plantilla arranca con demo | 2 h | ✅ 22-09 · en `website_template`, rama `plantilla/p12-cliente-demo` · `docs/PLANTILLA.md` |
| 13 | Repositorio `website_template` privado y marcado como *template* | Ricardo | github.com/RicardoTorresOliva/website_template | — | ✅ 22-09 · rama por defecto cambiada a `develop` por Claude: «Use this template» solo copia la rama por defecto y `main` iba 102 commits atrás |
| 14 | Llevar los pasos 1–12 a `website_template` y limpiar sus ramas viejas | Claude | Plantilla al día | 30 min | ✅ 23-09 · plantilla con solo `develop` y `main`; la documentación heredada **no se vacía**: es la especificación del motor que cita el código y, con D-167, se comparte con los clientes (`docs/PLANTILLA.md` §4) |
| 15 | Configuración única de Ricardo (§7.3) | Ricardo | Permisos y cuentas listos | 45 min | |
| 16 | Prueba en frío con «Cliente Demo»: del formulario a `https://…vercel.app` en línea, midiendo el tiempo de Ricardo | Claude + Ricardo | Tiempo real al `work_log` | 2 h | ✅ 22-09 · `web_demo` en línea; 3 min de Ricardo; hallazgo abierto: el repo del cliente nace sin la historia de la plantilla |
| 17 | Actualizar clientes desde la plantilla (D-167): historial compartido y `npm run sitio:actualizar` | Claude | Un cambio de motor llega a cada cliente sin tocar su piel | 2 h | ✅ 23-09 · `web_demo` enganchado con `--primera-vez` y actualizado de verdad; `slg_website` trae la plantilla (89 páginas con el mismo HTML); `crear-sitio` paso 1 y 1b |

## 4. Checklist de intake por cliente

Se pide **todo antes de empezar**; sin los ítems ★ no arranca el reloj de los 5 días.

| # | Ítem | ★ | Dónde lo da el cliente |
|---|---|---|---|
| 1 | Nombre comercial, razón social, país | ★ | Formulario §1 |
| 2 | Dominio: si lo tiene, dónde está registrado, y si autoriza que SLG gestione el DNS | ★ | Formulario §2 |
| 3 | Qué correo usa hoy (Microsoft 365, Google, hosting) — para no romperlo | ★ | Formulario §2 |
| 4 | Idiomas del sitio | ★ | Formulario §4 |
| 5 | Marca: logo SVG/PNG, favicon, colores, tipografías, fotos, imagen para redes 1200×630 | ★ | Carpeta de Drive (+ colores y tipografías en el formulario §3) |
| 6 | Servicios o productos: nombre, para quién, una frase; y cómo se agrupan | ★ | Formulario §4 |
| 7 | Páginas que necesita | ★ | Formulario §4 |
| 8 | Contenido de cada página, o material para que SLG lo redacte | ★ | Carpeta de Drive |
| 9 | Correo que recibe los contactos de la web | ★ | Formulario §2 |
| 10 | Funciones: contacto, descargas, blog, área privada, login Google/Microsoft | ★ | Formulario §5 |
| 11 | CRM que usa (si alguno) | | Formulario §5 |
| 12 | Si quiere medir visitas (implica un script de terceros) | | Formulario §5 |
| 13 | Legales: redactados, o plantilla revisada por su asesor | ★ | Formulario §6 + carpeta |
| 14 | Responsable (será el primer administrador) y quién aprueba | ★ | Formulario §1 |
| 15 | Fecha deseada de lanzamiento | ★ | Formulario §1 |

### 4.1 Cómo se recoge: Google Forms + carpeta de Drive

| Opción analizada | Subida de archivos | ¿El cliente necesita cuenta? | ¿Claude lo lee solo? | Veredicto |
|---|---|---|---|---|
| **Google Forms (preguntas) + carpeta de Drive compartida (archivos)** | Sí, sin límite práctico, cualquier formato | **No** | **Sí**: la hoja de respuestas y la carpeta, por el conector de Google Drive (comprobado el 22-09) | ✅ **Elegida** |
| Google Forms con pregunta «subir archivo» | Sí | **Sí, cuenta de Google** — un cliente con Microsoft 365 se atasca | Sí | ❌ |
| Tally / Jotform / Typeform | Sí | No | **No**: no hay conector; habría que copiar y pegar | ❌ |
| Formulario propio en el portal de SLG | Sí, con URL firmada | Sí, una invitación | Sí, por la base | ⏳ A medio plazo: cuando el portal abra en producción (M3/M4), el intake se muda ahí y se convierte en la sala del proyecto |

**Configuración única — Ricardo, una sola vez, 15 minutos:**
1. Abre `https://github.com/RicardoTorresOliva/slg_website/blob/develop/docs/intake/crear-formulario-intake.gs` en el navegador. Arriba a la derecha del código, clic en el icono **Copy raw file** (dos cuadraditos). Debe aparecer «Copied!».
2. Abre `https://script.google.com` con la cuenta `torresoliva.ricardo@gmail.com`. Clic en **Nuevo proyecto** (arriba a la izquierda).
3. En el editor, selecciona todo el texto que aparece (`Cmd + A`), bórralo y pega (`Cmd + V`). Clic en el icono de disquete **Guardar**.
4. En la barra de arriba, junto a **Depurar**, debe decir `crearFormularioIntake`. Clic en **Ejecutar**.
5. Aparece «Se necesita autorización» → **Revisar permisos** → elige tu cuenta → **Configuración avanzada** → **Ir a Proyecto sin título (no seguro)** → **Permitir**. Entre los permisos aparece «Conectarse a un servicio externo»: es para descargar el logo. Es tu propio script: es seguro.
6. Abajo se abre el **Registro de ejecución**. Debe terminar con `LISTO.` y cuatro enlaces: el del cliente, el de editar, la hoja y la carpeta.
7. **Colores y tipografía de la marca** (Google no deja ponerlos por script):
   1. Abre el enlace **Editar el formulario** del registro. Arriba debe verse el logo de Softlanding Global.
   2. Arriba a la derecha, clic en el icono de la **paleta** («Personalizar tema»).
   3. En **Color**, clic en **+** → pega `#2878B4` → **Aceptar**.
   4. En **Color de fondo**, elige el tono **más claro** de la fila (el casi blanco azulado).
   5. En **Estilo del texto**: Encabezado → **Montserrat**, 24 · Pregunta → **Montserrat**, 12 · Texto → **Montserrat**, 11. Si Montserrat no aparece en la lista, elige **Roboto**.
   6. Deja **Encabezado** (la imagen de la franja superior) **sin imagen**: el logo ya está dentro del formulario.
   7. Cierra el panel con la **X**. Se guarda solo. Debe verse el formulario con acentos azules y fondo casi blanco.
8. Pega los cuatro enlaces del paso 6 en la sesión de Claude. Claude los guarda y a partir de ahí los usa solo.
9. Si sale un error en rojo: cópialo entero y pégalo en la sesión de Claude. No ejecutes el script dos veces: crearía un segundo formulario. Si ya lo ejecutaste con la versión anterior, borra antes en Google Drive la carpeta «SLG · Intake webs».

**Corrección del 23-09 (formulario ya creado):** `docs/intake/corregir-formulario-intake.gs` añade
`Correo público que aparece en la web`, quita «Solo inglés», corrige las ayudas del CRM y de la
tipografía e invita a responder en inglés. Se pega en el editor de Apps Script **del propio
formulario** (⋮ → Editor de secuencias de comandos) y se ejecuta `corregirFormularioIntake`. No toca
respuestas ni la hoja; ejecutarlo dos veces no duplica nada. `crear-formulario-intake.gs` ya incluye
estos cambios.

**Por cliente, Claude:** redacta el correo con el enlace del formulario (borrador en Gmail), lee la respuesta en la hoja, crea la carpeta `Intake · <cliente>` dentro de «Softlanding Global · Intake webs», la comparte con el correo del responsable (con tu «sí» en el chat) y comprueba los ★ antes de arrancar.

## 5. Procedimiento de lanzamiento de una web nueva (≤ 5 días hábiles)

C = Claude · R = Ricardo · Cl = cliente. Presupone la plantilla del §3 terminada.

| Día | # | Paso | Hace | Tiempo de Ricardo | Resultado visible |
|---|---|---|---|---|---|
| 0 | 1 | Correo al cliente con el enlace del formulario | C redacta el borrador en Gmail · R pulsa **Enviar** | 1 min | Cliente recibe el formulario |
| 0 | 2 | Cliente responde; C crea la carpeta `Intake · <cliente>` y la comparte con el responsable | C, con «sí» de R en el chat | 10 s | Cliente recibe la carpeta |
| 0 | 3 | C revisa los ★ y redacta el correo de faltantes, si los hay | C · R pulsa **Enviar** | 1 min | Intake completo |
| 1 | 4 | Repositorio `web_<cliente>` con el historial de `website_template` (D-167; `commands/crear-sitio.md` paso 1) | C | 0 | Repositorio privado |
| 1 | 5 | Proyecto Supabase por MCP: consulta el coste; si es 0 lo crea, si no pide «sí» | C (+ «sí» de R si cuesta) | 0–10 s | Proyecto activo |
| 1 | 6 | 24 migraciones y bucket privado por la API de Supabase (sin contraseña, sin el problema de IPv6) | C | 0 | Base lista |
| 1 | 7 | Proyecto Vercel conectado al repositorio + variables no secretas | C | 0 | Una vista previa por cada cambio |
| 1 | 8 | **Comando único de secretos** (§7.3, paso 4 explica cómo) | R | 5 min | `…/api/health` responde `ok` |
| 1–2 | 9 | `site.config.ts`, contenido y marca a partir de la hoja y la carpeta | C | 0 | Vista previa completa |
| 2 | 10 | Invitación al responsable como primer administrador | C, con «sí» de R | 10 s | El responsable recibe el enlace |
| 3 | 11 | Correo de revisión con el enlace a la vista previa | C redacta · R pulsa **Enviar** | 1 min | Lista de cambios del cliente |
| 4 | 12 | Cambios, `check:ci` completo, Lighthouse ≥ 90 | C | 0 | CI verde |
| 5 | 13 | DNS. Si el cliente autorizó: C copia a Vercel DNS los registros actuales (correo incluido) y el cliente cambia los *nameservers* en su registrador. Si no: C le manda los dos registros exactos | C + Cl | 0 | Vercel: *Valid Configuration* |
| 5 | 14 | Lanzamiento: `develop` → `main` despliega producción por la integración con GitHub; monitor activo | C, con «sí» de R | 10 s | Dominio del cliente en línea |
| 5 | 15 | Correo de entrega con accesos y el `README` del cliente | C redacta · R pulsa **Enviar** | 1 min | Cliente autónomo |
| 5 | 16 | Factura | R | 10 min | — |

**Tiempo de Ricardo por cliente: ~25 minutos** (antes ~5 h). Camino crítico: lo que tarda el cliente en responder el formulario, subir archivos y revisar.

## 6. Estimación para los 5 encargos

| Concepto | Estimación |
|---|---|
| Preparar la plantilla (§3) | 4 días de Claude + 45 min de Ricardo. **Una vez, antes del cliente 1** |
| Un sitio, opción A (informativa) | 5 días hábiles de calendario; ~12 h de Claude; **~25 min de Ricardo** |
| Un sitio, opción B (con área privada) | 5–7 días hábiles; ~18 h de Claude; ~40 min de Ricardo |
| Paralelismo | Ricardo deja de ser el cuello de botella. El límite pasa a ser **el cliente** (respuestas y revisión) y el número de sesiones de Claude: 2–3 sitios a la vez, una sesión y un repositorio por sitio |
| **Cinco sitios** | Plantilla (semana 1) → clientes 1–3 en paralelo (semana 2) → clientes 4–5 (semana 3) = **~3 semanas**, cada cliente dentro de sus 5 días |
| Condición | Los cinco formularios enviados **el día 1**; la plantilla se construye mientras los clientes responden |
| Coste recurrente para SLG | Vercel Pro (1 asiento) + Supabase + Resend + UptimeRobot. El siguiente proyecto de Supabase **cuesta 0** (comprobado el 22-09 con la API); a partir del tercero, Claude consulta el coste antes de crear y pide tu «sí» [POR CONFIRMAR precios vigentes] |

**Pregunta abierta que cambia el plan**: si alguno de los cinco es **e-commerce**, no cabe en esta plantilla y se cotiza aparte.

## 7. Automatización máxima: qué hace Claude y qué queda para Ricardo

### 7.1 Herramientas que Claude ya puede usar (comprobado el 22-09-2026)

| Herramienta | Estado | Para qué en el procedimiento |
|---|---|---|
| GitHub por `gh` (terminal) | ✅ sesión activa, permisos `repo` y `workflow` | Crear `web_<cliente>` desde la plantilla, empujar, fusionar |
| Conector MCP de GitHub | ❌ falla al conectar (error 400 de autorización) | No hace falta: `gh` hace lo mismo |
| Conector MCP de Supabase | ✅ ve la organización «Softlanding Global»; `get_cost` = 0 para el próximo proyecto | Crear proyecto, migraciones, bucket, consultas |
| Conector MCP de Vercel | ✅ ve el equipo `ricardotorresolivas-projects` | Crear proyecto conectado a GitHub, variables no secretas, dominios, registros DNS |
| Conector de Google Drive | ✅ lista los formularios de la cuenta | Leer respuestas y archivos del intake; crear y compartir carpetas |
| Conector de Gmail | [POR CONFIRMAR en el primer cliente] | Dejar borradores de correo listos para enviar |

### 7.2 Lo que queda para Ricardo, y por qué no lo hace Claude

| Acción | Cuándo | Por qué es suya |
|---|---|---|
| Pulsar **Enviar** en cada correo al cliente | 4 veces por cliente | Un mensaje en su nombre necesita su confirmación, mensaje a mensaje |
| Escribir «sí» en el chat | Al compartir la carpeta, invitar al responsable, lanzar, y si algo cuesta dinero | Compartir y publicar son acciones hacia fuera; una compra usa su medio de pago |
| Ejecutar el comando de secretos | 1 vez por cliente | Claude no maneja contraseñas, claves de API ni tokens: el comando los genera en el Mac de Ricardo y los manda directo a cada plataforma, sin pasar por la conversación |
| Facturar | 1 vez por cliente | Dinero |
| Cambiar los *nameservers* | Solo si el cliente no puede | Credenciales del registrador del cliente |

### 7.3 Configuración única (Ricardo, ~45 min en total, una sola vez)

1. **Formulario de intake** — pasos del §4.1 (10 min).
2. **Vercel conectado a todos tus repositorios** (5 min):
   1. Abre `https://github.com/settings/installations`. Debe aparecer **Vercel** en la lista.
   2. Clic en **Configure** junto a Vercel. En **Repository access** marca **All repositories**. Clic en **Save**.
   3. Si Vercel no aparece en la lista: abre `https://vercel.com/new`, clic en **Continue with GitHub** / **Install**, elige **All repositories** y **Install**.
3. **Claves de Resend y UptimeRobot** (10 min) — se crean ahora, se pegan cuando el comando de secretos las pida la primera vez:
   1. Resend: abre `https://resend.com/api-keys` → **Create API Key** → nombre `slg-sitios`, permiso **Full access** → **Add**. Copia la clave (empieza por `re_`) a tu gestor de contraseñas. Solo se muestra una vez.
   2. UptimeRobot: abre `https://dashboard.uptimerobot.com/integrations` → **API** → **Main API key** → **Create**. Cópiala a tu gestor de contraseñas.
4. **El comando de secretos, la primera vez** (5 min) — `scripts/sitio/secretos.ts` (§3 paso 8). Genera las contraseñas y claves del sitio en tu Mac y las carga directamente en Vercel, Supabase, Resend y UptimeRobot; ningún valor sale por la pantalla ni pasa por el chat. En cada cliente, Claude te da esta misma línea **con los cuatro datos ya puestos** (paso 6 de `commands/crear-sitio.md`); si la pegas tal cual, sin datos, te los pregunta uno a uno.
   1. Abre **Terminal** (Aplicaciones → Utilidades → Terminal).
   2. Pega exactamente esto y pulsa Enter:
      `cd ~/Dev/slg_website && npm run sitio:secretos`
   3. Contesta las cuatro preguntas con los datos que Claude te dio en el chat: nombre corto del cliente, referencia de Supabase, proyecto de Vercel y dominio.
   4. Te pide la clave de **Resend** y luego la de **UptimeRobot** (las del punto 3). Pégala (`Cmd + V`) y pulsa Enter: **no se ve nada al pegar**, es a propósito. Las comprueba y las guarda en el **Llavero** (servicio `slg-sitios`); en los clientes siguientes ya no las pide.
   5. Tiene que ver ocho bloques `── 1/8` … `── 8/8` con ✓, un **Resumen** y, al final, `✓ Listo. Ningún secreto ha pasado por la pantalla.` Selecciona desde `── Resumen` hasta el final, cópialo y pégalo en la sesión de Claude: son nombres de variables y registros DNS, nada secreto.
   6. Si macOS pregunta si `security` puede usar el Llavero: **Permitir siempre**.
   7. Si sale una línea con **✗**: haz lo que dice la línea **Qué hacer** que va debajo (por ejemplo, `vercel login` o `npx --yes supabase login` si una sesión caducó) y vuelve a pegar la misma línea: lo ya hecho no se repite. Si la clave de Resend o UptimeRobot dejó de valer, pega la línea añadiendo al final un espacio y `-- --cambiar-claves`.
5. **Permisos de Claude Code para no preguntarte en cada paso** (5 min) — Claude prepara la lista de permisos del proyecto (crear repositorios `web_*`, empujar a ellos, usar los conectores de Supabase, Vercel y Drive) y te la muestra para que la apruebes una vez. Lo que nunca queda permitido de antemano: enviar correos, gastar dinero y manejar secretos.

### 7.4 Lo que ya se hizo el 22-09

| Qué | Resultado |
|---|---|
| D-165 registrada | Estructura de la oferta en `site.config.ts` |
| `website_template` comprobada | Privada, marcada como *template*; **rama por defecto cambiada de `main` a `develop`** |
| Formulario de intake | **Creado y con la marca**: enlace para el cliente `https://forms.gle/PdrXV9Jay9Re79wQ8`. Hoja de respuestas y carpeta «Softlanding Global · Intake webs» en el Drive de Ricardo; Claude las localiza por el conector (sus enlaces no van a este repositorio, que es público) |
| Conectores probados | Supabase, Vercel y Google Drive responden; GitHub MCP no, cubierto por `gh` |
