---
type: planning
title: risks
project: slg_website
description: Registro de riesgos del proyecto slg_website — riesgo, probabilidad, impacto, mitigación accionable, señal temprana y dueño, agrupado por categoría.
status: completo
tags: [slg, slg_website, planning, riesgos, sdd, okf, software-app]
timestamp: 2026-09-08
source: START_PROJECT.md v1.1 §9 y anexos · docs/decision_log.md (D-14…D-20, S-01) · profiles/software-app/profile.md · AGENTS.md v4.1
---

# Registro de riesgos — slg_website

Generado por `init-project` (paso 4). Contiene **40 riesgos**: los 10 de `START_PROJECT.md` §9,
conservados y enriquecidos con señal temprana y dueño, más 28 derivados de lo que la planificación
sabe hoy (decisiones D-14…D-24, incidencia S-01, restricciones del brief y del perfil `software-app`).

## Cómo leer esta tabla

**Probabilidad**

| Nivel | Significado |
|---|---|
| Alta | Se espera que ocurra en el curso normal del proyecto si nadie hace nada. |
| Media | Plausible; depende de un tercero, de una configuración manual o de una omisión fácil. |
| Baja | Exige que concurran varios fallos, o está ya cubierto por diseño y el riesgo es que el diseño no se aplique. |

**Impacto**

| Nivel | Significado |
|---|---|
| Crítico | Compromete secretos o datos de clientes, o obliga a rehacer una superficie entera. |
| Alto | Bloquea un milestone o el go-live, o degrada la propuesta de valor (autoridad, conversión). |
| Medio | Retrasa o degrada una parte acotada; hay camino alternativo. |
| Bajo | Molestia acotada, absorbible sin cambiar el plan. |

**Dueño** — quien responde por ejecutar la mitigación: `Ricardo` (decisión, cuenta externa,
aprobación), `agente` (construcción y verificación), `externo` (el disparador está fuera de nuestro
control; siempre acompañado del dueño que escala).

**Orden.** Agrupado por categoría; dentro de cada categoría, por impacto y luego por probabilidad,
de mayor a menor.

**Nota sobre las señales tempranas.** No hay fecha de go-live (`START_PROJECT.md` Anexo I-1), así que
ninguna señal se expresa en fechas: todas son **estados observables** en el repo, en el panel, en los
registros o en el `task_tracker`.

---

## A. Dependencias externas

| ID | Riesgo | Prob. | Impacto | Mitigación (acción) | Señal temprana | Dueño |
|---|---|---|---|---|---|---|
| R-01 | La entregabilidad del correo transaccional falla por dos vías que D-24 deja en pie: **el subdominio de envío es nuevo y no tiene reputación**, y **sus registros se publican mal** (SPF, DKIM o el CNAME de verificación bajo el subdominio). Cualquiera de las dos deja invitaciones, recuperaciones de contraseña y avisos de captura sin llegar o en la carpeta de spam. Lo que ya **no** está en riesgo: el TXT de la raíz y los MX de Outlook no se tocan (D-23, D-24), así que el correo corporativo no puede caer por esta vía. | Alta | Alto | Verificar el subdominio de envío en Resend (D-22) con SPF, DKIM y DMARC publicados **solo bajo el subdominio**, y **antes** del primer envío real · DMARC en `p=none` al principio, para observar antes de endurecer · calentar la reputación del subdominio: primero buzones propios, después volumen real, subiendo de forma gradual · enviar correos de prueba a un buzón Google, uno Microsoft y uno corporativo antes de cerrar M0, y registrar el resultado en `work_log` · toda edición DNS se hace con la lista de "no tocar" (§7) delante. | Los correos de prueba caen en spam o rebotan · el panel de Resend mantiene el subdominio "no verificado" · suben los rebotes o las quejas en los primeros envíos reales. | Ricardo + externo |
| R-02 | Los 11 documentos de descarga (D-01…D-11, D-17) y el copy maestro se producen en **otro proyecto** (SLG_Overhauling): dependencia cruzada sobre la que este repo no tiene control de calendario. | Alta | Alto | Registrar los 11 documentos y el copy en `task_tracker` como dependencias externas con estado propio y revisión al cerrar cada milestone · construir el sistema de descargas contra el **registro de contenido**, nunca contra la existencia del archivo · página sin PDF publica "disponible próximamente" y captura el email igual (A.4) · el go-live no espera a los 11, solo a los de las páginas publicadas. | Se entra en M2 con menos de tres PDFs en el bucket `downloads` · FU-01 sin borrador · dos revisiones seguidas sin que cambie el estado de ningún documento. | Ricardo |
| R-03 | La pantalla de consentimiento de Google o el registro en Microsoft Entra ID no se completan a tiempo (§9); o el secreto de cliente de Entra caduca sin aviso y tumba el login en producción. | Media | Alto | Ejecutar F.2-2 y F.2-3 en paralelo a M0 con Claude in Chrome · cerrar M0 con **login por contraseña**, que no depende de terceros · al crear el secreto de Entra, anotar su fecha de caducidad en `docs/project_memory.md` y documentar la rotación en el README operativo · reutilizar el registro Entra del CRM si existe, añadiendo las redirecciones de la web. | F.2-2 / F.2-3 siguen en `[PENDIENTE]` cuando arranca M1 · el panel de Entra muestra el secreto a menos de 60 días de caducar · aparecen errores `invalid_client` en el registro de `/api/auth`. | Ricardo + externo |
| R-04 | La clave de API del CRM no puede crear empresas ni oportunidades: los alcances actuales solo permiten contactos, notas y actualizaciones (§9). | Alta | Medio | v1 entrega **contacto + nota** (modo `contact_note`, D-19) y la oportunidad se crea a mano en el CRM hasta que exista `POST /api/v1/leads` · nunca usar un login de persona como cuenta de servicio · documentar el paso manual en el README operativo para que no dependa de la memoria de nadie · HQ muestra qué capturas requieren ese paso. | Respuestas 403 del CRM registradas en `crm_delivery` sobre endpoints de empresa u oportunidad · en HQ, capturas en estado `delivered` sin oportunidad asociada en el CRM. | Ricardo |
| R-05 | El tramo gratuito del servicio transaccional (D-15) o del object storage externo de backups (D-20) cambia de condiciones, exige tarjeta o limita el volumen. | Media | Medio | Con P-1 (Resend, D-22) y P-2 (Cloudflare R2, D-21) ya elegidos, anotar en `decision_log` el límite del tramo y el coste del primer tramo de pago · integrar ambos **tras un adaptador** (envío de correo, destino S3) para que sustituirlos sea cambiar variables de entorno y no código · revisar consumo al cerrar cada milestone. | Aviso del proveedor · envíos o subidas de backup rechazados por cuota · el consumo mensual supera la mitad del tramo gratuito. | Ricardo + externo |
| R-06 | Se cancela Microsoft 365 antes de registrar la aplicación en Entra (§9). **Reevaluado por D-23: el correo se queda en Microsoft 365, no hay cancelación prevista.** | Baja (era Media) | Medio | Registrar la aplicación en Entra **antes** de cualquier cancelación o no renovación (F.2-3) · si ya se canceló, crear un tenant Entra gratuito solo para el registro · no anunciar el acceso con Microsoft en ninguna pantalla hasta que el registro exista. | Aparece en la agenda de Ricardo la renovación o cancelación de M365 con F.2-3 todavía en `[PENDIENTE]`. | Ricardo |
| R-07 | El CRM no responde en el momento de la captura (§9). | Baja | Medio | La entrega del PDF nunca espera al CRM · `lead_capture` nace en `crm_sync_status = pending` y la cola reintenta con backoff (1 min, 10 min, 1 h, 6 h, 24 h) · tras 5 fallos: `failed`, alerta en HQ y correo a `support@` · reintento manual en HQ · prueba E2E con el CRM apagado como criterio del gate D7. | `crm_delivery` acumula respuestas 5xx o timeouts · el contador de capturas `pending` crece en el tablero de HQ sin bajar. | agente |

---
| R-38 | ~~Un solo registro SPF para dos remitentes.~~ **Neutralizado por D-24**: con subdominio de envío dedicado, el SPF de la raíz no se toca y sigue autorizando solo a Outlook. Riesgo residual: publicar los registros del subdominio **mal** (SPF, DKIM o el CNAME de verificación), lo que rompería el correo transaccional — pero ya no puede arrastrar al corporativo. | Baja (era Media) | Medio (era Alto) | Los registros del subdominio (SPF, DKIM, CNAME de verificación) se publican **solo bajo el subdominio**; el TXT de la raíz y los MX de Outlook quedan formalmente en la lista de "no tocar" del §7 · verificar el dominio en el proveedor **antes** del primer envío real · DMARC en `p=none` al principio para observar antes de endurecer · calentar la reputación del subdominio enviando primero a buzones propios · comprobar que las invitaciones llegan a bandeja de entrada en Outlook, Gmail y Microsoft 365 corporativo antes de invitar a un cliente real. | Las invitaciones no llegan o caen en spam · el proveedor marca el subdominio como no verificado · alguien propone "simplificar" añadiendo el `include` del proveedor al SPF de la raíz, que es justo lo que D-24 descartó. | Ricardo |

## B. Seguridad y datos

| ID | Riesgo | Prob. | Impacto | Mitigación (acción) | Señal temprana | Dueño |
|---|---|---|---|---|---|---|
| R-08 | **Higiene de credenciales de integración (S-01).** Las credenciales que la aplicación usará en producción deben ser de creación reciente, una por integración y con el alcance mínimo que necesita cada una. | Media | Alto | Verificación previa a la ejecución, registrada **fuera de este repositorio**: cada integración estrena credencial propia con alcance mínimo (Anexo G) antes de cargarse en producción · rotación anual programada · revocación inmediata ante sospecha. **Regla permanente:** ninguna incidencia de credenciales se documenta con detalle operativo dentro de este repositorio, que es público (§10-6). | Una integración comparte credencial con otra · una credencial supera su ventana de rotación · el registro de auditoría muestra llamadas desde una IP o un horario no reconocidos. | Ricardo |
| R-09 | **El repo es público** (§10-6): un secreto entra al historial de git por descuido (`.env`, `.mcp.json`, una captura de pantalla, un valor pegado en un documento). El historial no se borra: una vez publicado, el secreto está quemado. | Media | Crítico | D-18 ya deja el MCP del CRM en `--scope local` · añadir `.env*`, `.mcp.json`, `*.key` y `*.pem` a `.gitignore` en la primera FU · script de CI que **rechaza el push** ante patrones de secreto (`crm_live_`, `sk-`, `-----BEGIN`) · en la documentación solo se escriben **nombres** de variables, nunca valores · `.env.example` con nombres y sin valores. | El script de CI marca una coincidencia · `git status` muestra un archivo inesperado antes de un commit · un valor con pinta de credencial aparece en un `work_log` o en un doc de diseño. | agente |
| R-10 | Fuga de datos entre empresas en el portal: un `client_*` lee recursos de otra empresa (§9). | Baja | Crítico | `organization_id` se toma **siempre** del contexto autenticado en el servidor, nunca del parámetro de la petición · una única capa de acceso a datos lo aplica, sin excepciones por endpoint · las pruebas automatizadas de aislamiento son criterio de cierre del DU, no un extra (DoD #5, gate D9) · `/review` independiente al cerrar M4. | En una revisión aparece una consulta que recibe `organization_id` por parámetro · una prueba de aislamiento se marca "pendiente" o se salta para cerrar un DU. | agente |
| R-11 | El visor de entregables HTML autocontenidos ejecuta HTML de origen no verificado dentro del dominio de la aplicación (robo de sesión, exfiltración de datos del portal). | Baja | Crítico | **D-45 fija el origen separado como norma**, no como opción: servir el HTML desde un origen separado (subdominio propio) con CSP propia, en `iframe sandbox` **sin** `allow-same-origin` · CSP que prohíba scripts y recursos externos, con `frame-ancestors` propio · validar tipo y tamaño en la subida · el visor no recibe cookies de sesión · probar con un HTML malicioso de laboratorio antes de cerrar el DU (gate D10). | Alguien necesita activar `allow-same-origin` "para que funcione" · un entregable HTML pide recursos externos y la consola lo registra. | agente |
| R-12 | Los backups salen a un proveedor externo (D-20) llevando datos personales de leads y entregables de clientes. | Media | Alto | **Cifrar el backup en el VPS antes de subirlo** y custodiar la clave de cifrado fuera del VPS y fuera del repo · credencial S3 limitada a escritura sobre un bucket dedicado, sin permiso de borrado ni de lectura global · retención definida y purga automática · la restauración probada (DoD #8) se ejecuta desde el archivo cifrado, no desde una copia en claro. | El primer backup sube sin paso de cifrado · la credencial creada tiene permisos amplios sobre el proveedor · nadie sabe dónde está la clave de cifrado. | Ricardo + agente |
| R-13 | Se capturan datos personales en producción antes de publicar privacidad y términos (F.2-1 en `[PENDIENTE]`). | Media | Alto | El texto legal es requisito de **producción**, no de staging: ningún formulario público se activa en producción sin `/legal/privacidad` y `/legal/terminos` publicados y enlazados desde el propio formulario · `lead_capture` guarda `consent_at` junto con la versión del texto aceptada · el go-live lo verifica como ítem explícito. | Se acerca el go-live con Anexo I-6 en `[PENDIENTE]` · las pantallas de consentimiento OAuth se rechazan por falta de URL de política. | Ricardo |
| R-14 | Una clave de API de agente se filtra, nace sin caducidad o con más alcance del necesario, y escribe entregables o avisos en portales de clientes. | Baja | Alto | Una clave por agente y por uso, con alcances mínimos, caducidad y límite de peticiones **obligatorios en el momento de crearla** · la clave se muestra una sola vez · revocación inmediata desde HQ · toda llamada en `audit_log` con clave e IP · pruebas de que un alcance insuficiente devuelve 403, la ausencia de clave 401 y el exceso 429 (gate D9). | `agent_event` o `audit_log` con actividad fuera del patrón habitual · aparece en HQ una clave sin caducidad o con alcances de escritura que nadie recuerda haber pedido. | Ricardo |

---
| R-37 | **Cloudflare R2 no ofrece Object Lock por API estándar (D-21).** Un atacante con las credenciales del VPS (o un fallo de script) puede borrar o sobrescribir los backups además de los datos originales: el backup deja de ser una red de seguridad frente a un compromiso, y solo protege frente a la muerte del hardware. | Baja | Crítico | Credenciales de R2 **de solo escritura y sin permiso de borrado** para el proceso de backup; el borrado de copias antiguas lo hace un proceso distinto con otras credenciales · activar versionado de bucket donde R2 lo permita y verificar qué garantiza · retención por generaciones (diaria/semanal/mensual), no un único destino sobrescrito · **verificar la restauración desde una copia antigua, no solo desde la última** (el DoD #8 exige restauración probada) · reevaluar un segundo destino con inmutabilidad estándar si el volumen de datos de cliente crece. | El proceso de backup usa una credencial con permiso de borrado · solo existe una generación de copia · nadie ha restaurado nunca desde una copia de más de un día. | agente |
| R-39 | **La caducidad del certificado no está vigilada.** El plan gratuito de UptimeRobot **no incluye** el aviso de caducidad de SSL ni de dominio (verificado por Ricardo el 2026-09-08, en contra de lo que anuncia su página). Un certificado Let's Encrypt caducado tumba el sitio entero, y es un fallo silencioso: todo va bien hasta el minuto en que deja de ir. | Media | Alto | Easypanel renueva Let's Encrypt automáticamente: la primera línea de defensa es que esa renovación funcione, y hay que **verificarla al menos una vez** viendo la fecha del certificado cambiar · añadir un monitor de tipo palabra clave sobre una página que solo responda con HTTPS válido, que sí entra en el plan gratuito · alternativa de coste cero: un flujo en n8n que compruebe la fecha del certificado una vez al día — sirve aquí porque un certificado caduca de forma predecible, no de golpe, así que un monitor dentro del VPS basta para ESTE riesgo concreto · si más adelante duele, el plan de pago de UptimeRobot son 9 USD/mes. | El certificado entra en su último mes sin que nadie lo haya mirado · el panel no muestra la fecha de renovación · nadie sabe decir cuándo caduca. | Ricardo |

## C. Entrega y calendario

| ID | Riesgo | Prob. | Impacto | Mitigación (acción) | Señal temprana | Dueño |
|---|---|---|---|---|---|---|
| R-15 | El copy nuevo retrasa las páginas (§9): sin texto aprobado no hay página publicable. | Alta | Alto | El copy es **FU-01 de M1**, con una sola compuerta de aprobación · las páginas se construyen antes contra el esquema de contenido (B.4) con texto de staging marcado `[PENDIENTE]` · el orden de redacción sigue el orden comercial: Home, `SLG_AI`, las tres ramas, después el resto · cada sección se redacta contra el contrato A.3, no en blanco. | FU-01 acumula más de una ronda de revisión sin cerrar · hay DU de página en `task_tracker` bloqueadas esperando texto. | Ricardo (aprobación) + agente (producción) |
| R-16 | Todas las compuertas tienen **un solo aprobador**: Planning Gate, FU-01, prerequisitos F.2 y `/review` por milestone dependen de Ricardo. El proyecto se detiene a la espera de decisiones. | Media (era Alta) | Medio (era Alto) | **D-46: Hermes Agent asume por cron las compuertas delegables** — ejecuta `/review` por milestone con contexto limpio, corre las pruebas E2E del DoD en contenedor y devuelve veredicto estructurado, y recuerda las compuertas pendientes con su paquete de decisión listo. Queda con Ricardo lo que la gobernanza le reserva: Planning Gate (Regla 1), copy FU-01 y elecciones de producto (Regla 7) · cada compuerta se presenta con **recomendación por defecto** y alternativas ya evaluadas, para que sea sí/no y no una investigación · las compuertas se agrupan por milestone en vez de llegar sueltas · mientras una espera, el trabajo continúa por unidades que no dependen de ella y el bloqueo se registra. | Una compuerta lleva más de una semana esperando · el cron de Hermes no ha emitido veredicto en el último milestone · las decisiones llegan a Ricardo como preguntas abiertas en vez de como sí/no. | Ricardo (compuertas propias) · Hermes (delegadas) |
| R-17 | Presión comercial y ampliación de alcance: se publica saltando gates para que la web venda antes, o HQ y el portal crecen más allá de §5.1. | Media | Alto | El DoD por milestone y los gates del Anexo D son **condición de publicación**, no recomendación · toda función no listada en §5.1 se registra en `planning/scope.md` como spec-delta y se decide fuera del milestone en curso (AGENTS.md Regla 4) · `/review` independiente al cerrar cada milestone · un gate en rojo se documenta en `work_log` con la decisión de quien lo asume. | Aparece en `task_tracker` una unidad que no mapea a ningún requisito · se propone "publicar ahora y arreglar el gate después". | Ricardo + agente |
| R-18 | Los documentos de descarga no están listos al lanzar (§9). D-17 elevó el número de 9 a **11**: dos páginas más que dependen de contenido externo. | Alta | Medio | El sistema admite alta de documentos **sin desplegar código** · cada página sin PDF muestra "disponible próximamente" y captura el email igual · `download.completed` solo se dispara cuando el archivo existe · se lanza con los que haya; los demás entran subiéndolos al bucket. | Se avanza en M2 con el bucket `downloads` vacío · hay páginas de servicio publicadas sin registro `download` asociado. | Ricardo |

---

## D. Técnicos

| ID | Riesgo | Prob. | Impacto | Mitigación (acción) | Señal temprana | Dueño |
|---|---|---|---|---|---|---|
| R-19 | **Better Auth es punto único de fallo de identidad para las tres superficies**: capa pública, HQ y portal comparten sesión, y además emite las claves de API de los agentes (plugins `organization`, `admin`, `apiKey`). Un fallo, un cambio incompatible o una vulnerabilidad afecta a todo a la vez. | Baja | Crítico | Fijar versión exacta (sin rangos) y no actualizar dentro de un milestone · encapsular todo acceso a identidad en un **módulo propio** (sesión, rol, `organization_id`, verificación de clave) para que la alternativa declarada en §7 sea sustituible sin tocar páginas ni endpoints · los datos de identidad viven en nuestro Postgres, con backup probado · pruebas E2E de los tres métodos y de las claves como criterio de cierre (gates D8 y D9). | Un cambio menor de versión rompe una prueba de login · aparece lógica de sesión escrita directamente dentro de una página o de un endpoint. | agente |
| R-20 | Una migración de esquema o un despliegue automático desde `main` rompe producción sin puerta intermedia (Easypanel despliega al hacer push). | Media | Alto | `develop` → staging **siempre** antes que `main` → producción · backup de base de datos ejecutado automáticamente antes de aplicar migraciones · ninguna migración destructiva (borrado de columna o tabla) sin spec-delta aprobado y respaldo previo · comprobación de salud posterior al despliegue y procedimiento de vuelta a la imagen anterior, documentado en el README operativo y probado una vez. | Un despliegue llega a `main` sin haber pasado por staging · una migración generada contiene `DROP` y nadie la ha leído. | agente |
| R-21 | El gate D1 (Lighthouse móvil ≥ 90 en las **cuatro** categorías) falla tarde: Montserrat autoalojada, `backdrop-filter` en la navegación y Motion son exigentes juntos, y el fallo aparece cuando ya está todo construido. | Alta | Alto | Medir Lighthouse móvil **desde la primera página de M1**, no al final: barra translúcida, hero y una página de servicio se miden en cuanto existen · subconjunto latino de Montserrat en `woff2` con `font-display: swap` y precarga solo del peso del hero · `backdrop-filter` únicamente en la barra de navegación · Motion cargado solo donde hay interacción · el propio gate D1 se verifica en CI en cada push desde FU-05 (`check-lighthouse.ts`, D-50), no solo en la revisión final. | La primera medición baja de 90 en cualquier categoría. | agente |
| R-22 | Microsoft Entra ID no emite `email` para usuarios gestionados (F.1): la vinculación de cuentas falla, crea duplicados o —en el peor caso— vincula la cuenta a la persona equivocada. | Media | Alto | Anclar la cuenta al `oid` de Entra, **nunca al email** · `mapProfileToUser` con `preferred_username`/`upn` como respaldo · no vincular jamás por un email no verificado (ese es el camino al acceso cruzado, que convertiría este riesgo en crítico) · si no hay email verificable, la invitación exige coincidencia explícita al aceptarla · probar la aceptación de invitación por los tres métodos (gate D8). | En pruebas, un usuario de Microsoft crea una cuenta duplicada en vez de vincularse · el perfil devuelto por Entra llega sin `email` y el código lo trata como caso excepcional. | agente |
| R-23 | La cola de entrega al CRM depende de un proceso en memoria del contenedor y se pierde en cada despliegue o reinicio: leads capturados que nunca llegan al CRM. | Media | Alto | La cola es una **tabla en Postgres** (`lead_capture` + `crm_delivery`), no una estructura en memoria · el disparador de reintentos es idempotente y puede ejecutarse desde fuera del proceso web · al arrancar, el servicio retoma los `pending` vencidos · prueba explícita: reiniciar el contenedor con capturas pendientes y comprobar que se entregan. | Capturas `pending` que no cambian de estado después de un despliegue · el contador de reintentos no avanza aunque el CRM esté vivo. | agente |
| R-24 | **Deuda silenciosa del adaptador de dos modos (D-19):** producción se queda para siempre en modo `contact_note` porque el `/iterate` del CRM nunca se ejecuta, y nadie lo nota porque las capturas "funcionan". | Alta | Medio | El **modo activo se muestra en el tablero de HQ** y en el README operativo, no solo en una variable de entorno · `api_contracts` especifica los dos modos y el DU de captura prueba ambos contra un doble del endpoint `POST /api/v1/leads` · la dependencia queda como entrada explícita en `decision_log` con revisión obligatoria al cerrar M5 · mientras siga en `contact_note`, HQ muestra cuántas capturas exigen crear la oportunidad a mano. | Pasa un milestone completo sin revisar el estado del spec-delta del CRM · nadie sabe decir en qué modo está producción sin abrir Easypanel. | Ricardo |

---
| ~~R-40~~ | ~~El presupuesto de JS del gate D1 y el stack elegido son incompatibles.~~ Medido el 2026-09-08: el suelo de React 19 + Next 16 App Router es de **172 KB comprimidos** en una página vacía, con **cero** librerías de la aplicación, contra un presupuesto de 150 KB. **Resuelto por D-50 (2026-09-09)**: Ricardo elige la salida (a) — el gate D1 pasa a medirse por Lighthouse en CI (≥ 90 en las cuatro categorías, LCP < 2,5 s — RNF-01, RNF-02), y RNF-03 (el presupuesto de KB) queda retirada. Implementado en `scripts/ci/check-lighthouse.ts`, con prueba negativa en `scripts/ci/test-lighthouse-gate.ts` (R-26); verificado en verde contra el build real (Performance 98 · Accesibilidad 100 · Best Practices 92 · SEO 100 · LCP 2,2 s). | Alta (ya ocurrida) | Medio | *(cerrada)* | *(cerrada)* | Ricardo |

## E. Operación

| ID | Riesgo | Prob. | Impacto | Mitigación (acción) | Señal temprana | Dueño |
|---|---|---|---|---|---|---|
| R-25 | Un cambio DNS en Hostinger toca por error `crm`, `n8n`, `evolution`, `academy` o los MX y tumba sistemas en producción ajenos a este proyecto. | Baja | Crítico | Antes de cualquier edición, copiar la zona DNS completa a `docs/` como estado previo (sin secretos) · **solo se añaden registros nuevos** (`@`, `www`, `staging` y el subdominio de envío de correo); ningún registro existente se edita ni se borra · el cambio se hace con Ricardo delante (Claude in Chrome) · tras el cambio, verificar que cada nombre no tocado sigue resolviendo. | Al abrir el editor DNS aparece un registro existente en modo edición · tras un cambio, `crm` o `n8n` dejan de resolver, o llega un rebote de correo. | Ricardo |
| R-26 | Los scripts de verificación de APP_Builder dan **falsos verdes** (§9). Reevaluado en esta planificación: no afecta solo a la completitud, afecta a **todos** los gates que se apoyan en un script — contenido, i18n, presupuesto de JS, aislamiento, secretos. | Alta | Alto (elevado desde "Medio" en §9) | Antes de confiar en un script, ejecutarlo contra un caso que **debe fallar** (prueba negativa) y registrar el resultado en `work_log` · mientras no exista esa prueba negativa, el gate se verifica a mano en `/review` y se marca como "verificado a mano" · ningún gate se declara verde solo por la salida de un script sin prueba negativa · el estado de cada script se registra en `decision_log`. | Un script pasa en verde sobre un repo con un fallo introducido a propósito · un gate pasa a la primera y nunca se le ha visto en rojo. | agente |
| R-27 | **Un solo VPS** (§9): la web comparte máquina con el CRM, n8n, Hermes y Umami. Una caída se lo lleva todo; y aunque no caiga, un servicio puede agotar los recursos de los demás. | Media | Alto | Backups diarios de base de datos y volúmenes a destino externo, con **restauración probada** en staging (DoD #8) · límites de CPU y memoria por servicio en Easypanel, para que la web no ahogue al CRM ni al revés · procedimiento de reconstrucción completa documentado en el README operativo y ejecutado una vez antes del go-live. | Uso sostenido de memoria o CPU por encima del 80 % en el panel · un servicio se reinicia solo · un backup falla y nadie se entera. | Ricardo |
| R-28 | Las variables de entorno viven **solo** en Easypanel: si se pierde el acceso al panel o la máquina, el entorno no es reproducible aunque el código y los backups estén intactos. | Media | Alto | Mantener `.env.example` en el repo con todos los nombres y ningún valor · guardar los valores reales en el gestor de contraseñas de Ricardo, actualizándolos cada vez que se añade una variable · el README operativo indica de dónde sale cada valor y quién puede regenerarlo (Google Cloud, Entra, CRM, correo, S3). | Aparece una variable nueva en Easypanel que no está en `.env.example` · nadie sabe explicar de dónde salió un valor. | Ricardo |
| R-29 | El monitor de caída propuesto en §9 (vía n8n) **vive en la misma máquina que vigila**: si el VPS cae, el monitor cae con él y la caída la descubre un visitante. **Resuelto en categoría por D-43**: la monitorización se ejecuta fuera del VPS. Riesgo residual: que el servicio externo no llegue a configurarse, o que se siga confiando en n8n como monitor principal. | Alta | Medio | **D-43 cierra la categoría**: servicio de uptime dedicado con tramo gratuito, ejecutado **fuera del VPS**, que avisa por un canal que **no dependa del VPS** · vigila al menos `softlandingglobal.com` y `staging.softlandingglobal.com` · **n8n queda como monitor SECUNDARIO únicamente** —para incidencias parciales, un servicio caído con el VPS vivo—, porque corre en el mismo VPS (`167.88.42.76`) que debería vigilar · único pendiente: `[PENDIENTE: producto concreto de la categoría; se elige con 2–3 candidatos antes de FU-05 y no bloquea el arranque]`. | Una caída la detecta Ricardo o un visitante antes que el monitor · el monitor lleva semanas sin emitir ninguna señal de vida · alguien propone dejar n8n como monitor principal, que es justo lo que D-43 descartó. | Ricardo |
| R-30 | Ricardo no puede operar el sitio sin ayuda técnica (DoD #9 no se cumple) y la operación queda dependiendo del agente de forma permanente. | Media | Medio | El README operativo se escribe como secuencia de pasos literales y **se prueba con Ricardo ejecutándolos él solo** antes del go-live: cambiar un texto, publicar un artículo, añadir una descarga, crear un cliente e invitar, crear una clave de API, desplegar, restaurar un backup · cada paso que no logre completar sin ayuda es un defecto del README y se corrige, no se explica por chat. | La prueba del README se pospone "para el final" · Ricardo pregunta por chat algo que el README debería responder. | agente |

---

## F. Contenido y marca

| ID | Riesgo | Prob. | Impacto | Mitigación (acción) | Señal temprana | Dueño |
|---|---|---|---|---|---|---|
| R-31 | Contenido no verificado llega a producción: `[PENDIENTE]`, lorem ipsum, cifras sin fuente, casos o testimonios sin autorización, o nomenclatura obligatoria traducida o alterada. | Media | Alto | Script de CI **bloqueante** sobre `content/` y las páginas construidas que rechaza en `main` cualquier `[PENDIENTE]`, "lorem" y toda variante no literal de la nomenclatura obligatoria (`SLG_AI`, `SLG_Holdings`, `SLG_Academy`, `SLG_Enterprise`, `SLG_Factory`, `SLG_Readiness`, `SLG_Implement`, `APP_Building`, `AGE_Building`, `CoO as a Service`, `Phoenix PEEx`, `Phoenix TEAx`, `Phoenix RETx`) · toda cifra del copy lleva fuente en el frontmatter o no se publica · ningún nombre de cliente sin autorización escrita · ese script pasa antes la prueba negativa de R-26. | El script se degrada a "aviso, para no frenar el deploy" · aparece una cifra redonda sin fuente en un borrador de copy · el EN escribe "SLG Academy" o "AI Academy" en lugar de `SLG_Academy`. | agente + Ricardo |
| R-32 | El copy suena a hype de IA o a landing de agencia: se pierde la autoridad, que es exactamente la propuesta de valor ("no vendemos, ayudamos a comprar"). | Media | Alto | Revisar FU-01 frase a frase contra la restricción de tono del brief (ejecutivo, sobrio, cero hype) y contra las fuentes (`SLG Overhauling.md`, Docs_MD) · la "D" de DAL OS se expande **siempre** como Destrucción Creativa · cada afirmación de una página de servicio nace de una sección del contrato A.3, no de una idea nueva · Ricardo aprueba el copy leyéndolo como lo leería un comprador, no como autor. | Aparecen superlativos, "revoluciona", "el futuro es ahora" o promesas sin objeto · dos servicios distintos se describen con las mismas frases. | Ricardo |
| R-33 | La versión EN queda por debajo de la ES pese a la paridad obligatoria de secciones: el comprador internacional recibe una traducción, no una propuesta. | Media | Alto | El EN se redacta como **original ejecutivo**, no como traducción literal, dentro de la misma FU-01 y bajo la misma compuerta · el script de paridad verifica que existan las secciones; la revisión humana verifica que digan lo mismo con la misma autoridad · la nomenclatura obligatoria no se traduce nunca. | El EN se produce después de aprobar el ES, en una tanda aparte y sin revisión propia · frases EN calcadas de la sintaxis española. | Ricardo |
| R-34 | **El repo es público desde el primer commit** (§10-6): el posicionamiento, el copy sin terminar y los huecos de la oferta son visibles para competencia y clientes antes del lanzamiento. | Alta | Medio | Es consecuencia aceptada de la decisión, no un descuido, y se gestiona escribiendo **cada borrador como si fuera público**: ninguna nota interna, precio, margen, nombre de cliente ni estrategia comercial entra en este repo (eso vive en SLG_Overhauling) · los `[PENDIENTE]` se redactan como huecos neutros, nunca como dudas sobre la oferta · el `README.md` del repo dice en una línea qué es y en qué estado está, para que quien llegue no lo confunda con el sitio publicado. | Aparece en un archivo una nota interna, un precio o un nombre de cliente · alguien menciona haber leído en el repo algo que aún no se ha lanzado. | Ricardo |
| R-35 | Faltan los activos de marca de SLG Agency (logo SVG/PNG, favicon, imagen Open Graph, Montserrat en `woff2`) y el respaldo provisional acaba en producción. | Alta | Medio | Implementar el respaldo que el propio brief define (wordmark tipográfico "SLG Agency" en Montserrat 700 `--blue-deep`) como **un componente y un token**, de modo que sustituirlo sea cambiar un archivo · los activos entran en la lista de requisitos de go-live, no de M1 · el gate D2b verifica las reglas del kit: logo solo sobre claro, margen de respeto de 1 altura de la "S", sin deformar. | Se acerca el go-live con Anexo I-5 en `[PENDIENTE]` · alguien propone usar el logo `SLGA-Horizontal-A.png` (Softlanding Global Academy) como sustituto: es otra marca. | Ricardo |
| R-36 | El dominio raíz es nuevo y no tiene historial SEO (§9). | Alta | Bajo | Sitemap, `robots.txt`, canonical y `hreflang` desde el primer despliegue público · schema `Organization` + `Service` · blog con publicación constante y extractos que alimentan las redes · enlazado desde los activos digitales que SLG ya tiene · medir en Umami desde el día uno para tener línea base. | Semanas después del go-live el sitio no aparece al buscar "SLG Agency" ni "Softlanding Global" · el sitemap no consta indexado. | agente |

---

## Resumen

| Impacto \ Probabilidad | Alta | Media | Baja | Total |
|---|---|---|---|---|
| Crítico | 1 | 1 | 5 | **7** |
| Alto | 5 | 12 | 1 | **18** |
| Medio | 6 | 3 | 3 | **12** |
| Bajo | 1 | — | — | **1** |
| **Total** | **13** | **16** | **9** | **38** |

Los siete críticos: R-08 (higiene de credenciales), R-09 (secretos en repo público), R-10 (aislamiento entre
empresas), R-11 (visor HTML), R-19 (Better Auth como punto único), R-25 (DNS de sistemas ajenos) y
R-37 (los backups de R2 son borrables con las credenciales del VPS).
Cinco de los siete son de probabilidad baja **porque la mitigación está en el diseño**: el riesgo real
es que el diseño no se aplique, y por eso cada uno tiene su señal temprana en la revisión, no en
producción.

Por categoría: dependencias externas 8 · seguridad y datos 8 · entrega y calendario 4 · técnicos 6 ·
operación 6 · contenido y marca 6.

### Acción antes de cerrar el plan

| Riesgo | Acción | Dueño |
|---|---|---|
| R-08 | Ejecutar y verificar S-01 (higiene de credenciales, detalle fuera del repo). | Ricardo |
| R-06 | Confirmar que la aplicación está registrada en Entra **antes** de cualquier movimiento sobre M365. | Ricardo |
| ~~R-29~~ | **Ya no bloquea la aprobación del plan.** D-43 cierra la categoría (servicio de uptime dedicado con tramo gratuito, fuera del VPS) y con ella P-5, RF-130 y el gate D11. Lo único que queda es **elegir el producto concreto con 2–3 candidatos antes de FU-05**, y eso no bloquea el arranque. Las tres categorías de producto quedan así cerradas: Resend (D-22), Cloudflare R2 (D-21) y monitorización externa (D-43). | Ricardo |

### Trazabilidad con `START_PROJECT.md` §9

| §9 | Riesgo original | ID aquí | Cambio respecto al brief |
|---|---|---|---|
| 1 | Consentimiento Google / registro Entra a tiempo | R-03 | Absorbe también la caducidad del secreto de cliente de Entra. |
| 2 | Cancelar M365 antes de registrar en Entra | R-06 | **Rebajado a probabilidad Baja por D-23**: el correo se queda en Microsoft 365 y el tenant existente puede reutilizarse para el registro. |
| 3 | Copy nuevo retrasa las páginas | R-15 | Sin cambio; añadidos señal temprana y dueño. |
| 4 | "9 PDFs de descarga" no listos | R-18 | Ahora son **11** (D-17). |
| 5 | Un solo VPS | R-27 | Absorbe el agotamiento de recursos en la máquina compartida. |
| 6 | Fuga entre empresas en el portal | R-10 | Sin cambio; añadidos señal temprana y dueño. |
| 7 | La clave del CRM no crea empresas ni oportunidades | R-04 | Se resuelve por D-19 (adaptador de dos modos); la deuda que genera es R-24. |
| 8 | CRM caído en el momento de la captura | R-07 | Sin cambio; añadidos señal temprana y dueño. |
| 9 | Falsos verdes de los scripts de verificación | R-26 | **Impacto elevado de Medio a Alto**: afecta a todos los gates que se apoyan en un script, no solo a la completitud. |
| 10 | Dominio raíz sin historial SEO | R-36 | Sin cambio; añadidos señal temprana y dueño. |

### Huecos declarados

- **R-29**: la categoría que abría (monitorización externa al VPS) está **cerrada por D-43** —servicio
  de uptime dedicado con tramo gratuito, ejecutado fuera del VPS— y con ella P-5, RF-130 y el gate D11.
  Sigue abierto **solo el producto**: `[PENDIENTE: producto concreto, se elige con 2–3 candidatos antes
  de FU-05; no bloquea el arranque]`. La mitigación de §9 ("monitor de caída vía n8n") queda
  formalmente como monitor **secundario**, nunca como principal, porque n8n vive en la máquina vigilada.
- **R-01, R-05, R-12** dependían de P-1 y P-2 (`docs/decision_log.md`): **ambos cerrados** —Resend
  (D-22) sobre la categoría D-15 y Cloudflare R2 (D-21) sobre la categoría D-20—. Lo que sigue
  abierto de R-01 no es producto sino configuración: `P-3` (dirección remitente visible) y `P-4`
  (nombre exacto del subdominio de envío), que se fijan en M0.
- **R-12** propone cifrar los backups y custodiar la clave fuera del VPS: es una mitigación nueva de
  esta planificación, no una decisión ya tomada; con P-2 cerrado, se confirma al implementar el
  backup sobre Cloudflare R2, junto con las mitigaciones de R-37.
- Sin fecha de go-live (Anexo I-1), este registro no puede fijar plazos: las revisiones se anclan al
  cierre de cada milestone.

---

## Registro

- `2026-09-08` — Generado por `init-project` (paso 4) sobre `START_PROJECT.md` v1.1 §9 y anexos,
  `docs/decision_log.md` (D-14…D-20 y la incidencia S-01) y `profiles/software-app/profile.md`.
  36 riesgos en la generación inicial: los 10 del brief, conservados y enriquecidos, más 26
  derivados. R-37 y R-38 se añaden en las dos entradas siguientes, hasta los **38 actuales**.
  Próxima revisión: al cerrar cada milestone, dentro de `/review`.
- `2026-09-08` — R-37 añadido tras la elección de Cloudflare R2 (D-21): brecha de inmutabilidad del backup.
- `2026-09-08` — D-22 (Resend) y D-23 (el correo se queda en Microsoft 365): R-01 reformulado, R-06 rebajado a probabilidad Baja, R-38 añadido (SPF compartido entre Outlook y el proveedor transaccional).
- `2026-09-08` — D-24 (subdominio de envío dedicado): R-38 neutralizado, de Media/Alto a Baja/Medio; el SPF de la raíz sale del alcance del proyecto.
- `2026-09-08` — Sincronización del cierre con el estado real del registro. **R-01 reformulado**: elimina el escenario del `include` SPF conviviendo en el TXT de la raíz —imposible tras D-24— y se queda con lo que sí sigue siendo riesgo, el subdominio de envío nuevo sin reputación y sus registros mal publicados. **Resumen recontado sobre las 38 filas reales**: 7 críticos (faltaba R-37 en la lista), matriz impacto × probabilidad 14 Alta / 15 Media / 9 Baja, reparto por categoría 8 · 8 · 4 · 6 · 6 · 6, y la primera línea del Registro corregida (la generación inicial produjo 36; R-37 y R-38 llegan después). **Bloques de cierre actualizados** con D-21 (Cloudflare R2) y D-22 (Resend) ya decididos; **R-29 sigue abierto**: la monitorización externa es la única categoría sin producto elegido.
- `2026-09-08` — **D-43 (monitorización externa)**: **R-29 cierra su categoría** —servicio de uptime
  dedicado con tramo gratuito, ejecutado fuera del VPS, que avisa por un canal independiente del VPS y
  vigila al menos `softlandingglobal.com` y `staging.softlandingglobal.com`—, con **n8n degradado
  formalmente a monitor secundario** por correr en el mismo VPS que debería vigilar. Queda pendiente
  **solo el producto concreto**, que se elige con 2–3 candidatos antes de FU-05. En consecuencia,
  **R-29 sale de «Acción antes de cerrar el plan» como bloqueante**: ya no bloquea la aprobación, y las
  tres categorías de producto (D-21, D-22, D-43) quedan cerradas. Actualizado también el hueco
  declarado de R-29. **D-45 (visor desde origen separado)**: R-11 pasa de proponer el origen separado a
  citarlo como **norma decidida**, manteniendo `iframe sandbox` sin `allow-same-origin` y CSP estricta
  como defensa en profundidad. Ni el número de riesgos (38) ni ninguna probabilidad, impacto o conteo
  del Resumen cambian.
- `2026-09-08` — D-46 (cron de Hermes como validador de las compuertas delegables): R-16 baja de Alta/Alto a Media/Medio. Sin cambio de alcance en este repositorio: el cron vive en Hermes Agent.
- `2026-09-08` — R-39 añadido: la caducidad de SSL no entra en el plan gratuito de UptimeRobot (comprobación empírica de Ricardo, contraria a lo que anuncia su web).
- `2026-09-08` — R-40 añadido: el gate D1 (150 KB) y el stack decidido son incompatibles; el objetivo del gate sí se cumple (Lighthouse 98/100/92/100). Decisión pendiente.
- `2026-09-09` — **R-40 resuelto por D-50**: Ricardo elige sustituir el presupuesto de KB por Lighthouse en CI (≥ 90 en las cuatro categorías, LCP < 2,5 s). RNF-03 retirada. Implementado y verificado en verde (`scripts/ci/check-lighthouse.ts`, prueba negativa en `test-lighthouse-gate.ts`). R-21 actualizado para no citar el presupuesto de KB como mitigación.
