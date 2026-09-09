---
type: planning
title: requirements
project: slg_website
description: Descomposición del brief START_PROJECT v1.1 en requisitos funcionales y no funcionales verificables, cada uno con origen, etiqueta (explícito/implícito/asumido) y superficie.
tags: [slg, slg_website, planning, requirements, sdd, okf, software-app]
status: planning
timestamp: 2026-09-08
sources:
  - START_PROJECT.md v1.1 (contrato)
  - AGENTS.md (gobernanza v4.1)
  - profiles/software-app/profile.md (perfil activo)
  - docs/decision_log.md (D-14 … D-45)
  - planning/questions.md (asunciones B1 … B10)
  - planning/scope.md (sección "Previsto (enchufable, no se construye)")
---

# Requisitos — slg_website

Paso 4 del playbook `init-project`. Este documento **no resume** el brief: lo descompone en unidades
que se pueden aceptar o rechazar sin discusión. Cada requisito es la entrada de una FU o DU del paso 7.

## Cómo leer las etiquetas

| Etiqueta | Significado |
|---|---|
| **explícito** | El brief, el `decision_log` o el perfil activo lo dicen. No se reinterpreta. |
| **implícito** | Se deduce necesariamente de algo que el brief dice (p. ej. una prueba del DoD que solo pasa si existe este requisito). No añade alcance. |
| **asumido** | Lo asume la planificación. **Debe confirmarse.** Cada uno remite a su asunción registrada en `planning/questions.md` §B. |

## Superficies

`pública` (capa comercial ES/EN) · `HQ` (intranet SLG, `/hq`) · `portal` (clientes, `/portal`) ·
`API` (`/api/v1`, agentes) · `transversal` (afecta a dos o más superficies o a la plataforma).

## Notación de la columna «Origen»

Tres numeraciones distintas compartían antes el token `D-NN` (decisiones HITL del §10, gates del
Anexo D y decisiones del `decision_log`). Aquí quedan **disjuntas**: ningún token significa dos cosas.

| Token | Qué es | Dónde vive |
|---|---|---|
| `§N` | Sección del brief (`§0`, `§1 Constraints`, `§4`, `§5.1`, `§5.3`, `§7`, `§8`, `§9`) | `START_PROJECT.md` |
| `§10-N` | **Decisión HITL de Ricardo**, fila N de la tabla §10 (`§10-1` … `§10-13`) | `START_PROJECT.md` §10 |
| `A.N` `B.N` `C.N` `F.N` | Sección de anexo, **siempre con punto** (`A.3-5` = sección 5 del contrato A.3; `B.6-2` = paso 2 del flujo B.6; `F.2-5` = fila 5 de F.2) | Anexos del brief |
| `Anexo C` `Anexo D` `Anexo E` | El anexo completo | Anexos del brief |
| `D1` … `D12`, `D2b` | **Quality gate del Anexo D**, sin guion, tal como el brief los escribe | `START_PROJECT.md` Anexo D |
| `DoD #N` | Prueba N de la Definition of Done | `START_PROJECT.md` §4 |
| `D-14` … `D-45` | **Decisión de planificación** registrada | `docs/decision_log.md` |
| `P-3` `P-4` | **Sub-decisión de configuración abierta**, se fija en M0 | `docs/decision_log.md` § «Pendientes de decisión» |
| `perfil …` | Bloque del Asset Profile activo (`quality_gate`, `deliverable_unit_completeness`) | `profiles/software-app/profile.md` |
| `AGENTS.md …` | Regla o sección de gobernanza | `AGENTS.md` |
| `questions.md BN` | Asunción `B1` … `B10` del §B (sin punto: **no** es el anexo `B.N` del brief) | `planning/questions.md` |
| `scope.md «Previsto»` | Fila de la tabla «Previsto (enchufable, no se construye)» | `planning/scope.md` |

**No confundir:** `D-01` … `D-11` son los once documentos de descarga del Anexo A.4 (D-17). Aparecen
en el **texto** de los requisitos, nunca en la columna «Origen».

## Convenciones que gobiernan todos los requisitos

- **Nada inventado**: donde el brief no da dato, el requisito lo marca `[PENDIENTE: …]` y ese pendiente
  es visible en staging y prohibido en producción (RNF-18).
- **Nomenclatura literal e intraducible** en los dos idiomas: `SLG_AI`, `SLG_Holdings`, `SLG_Academy`,
  `SLG_Enterprise`, `SLG_Factory`, `SLG_Readiness`, `SLG_Implement`, `APP_Building`, `AGE_Building`,
  `CoO as a Service`, `Phoenix PEEx` / `TEAx` / `RETx`. Marca pública: **SLG Agency**.
- **Productos, no categorías, donde Ricardo ya ha elegido** (AGENTS.md Regla 7: elige quien vive las
  consecuencias). Las dos categorías que quedaban abiertas están cerradas: correo transaccional →
  **Resend** (D-22, dentro de la categoría de D-15) y destino de backups → **Cloudflare R2** (D-21,
  dentro de la categoría de D-20). Ambos se nombran literalmente, como el resto del stack decidido en
  §7/§10. Lo que sigue abierto no es producto sino configuración: `P-3` (dirección remitente visible)
  y `P-4` (nombre del subdominio de envío), que se fijan en M0.
- **Excepción declarada, en sentido inverso: la monitorización externa** (RF-130). **D-43 cierra la
  categoría** —servicio de uptime dedicado con tramo gratuito, ejecutado fuera del VPS— pero **no**
  nombra producto: se elige con 2–3 candidatos antes de FU-05 y no bloquea el arranque. Hasta
  entonces, RF-130 describe la categoría y sus condiciones verificables, nunca un producto inventado.

---

## 1. Requisitos funcionales

### 1.1 Capa pública — arquitectura de información y páginas

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-01 | La navegación principal expone exactamente cinco destinos (`SLG_AI`, `SLG_Holdings`, Doctrina, Blog, Nosotros) más el botón "Acceder"; ninguna etiqueta genérica tipo "Inicio/Home" es destino de menú; el logo lleva a Home. | A.1 | explícito | pública |
| RF-02 | Existen las **27 rutas públicas** que enumera A.2 en español bajo la raíz, cada una con su par en inglés bajo `/en`. A.2 tiene **25 filas de tabla, no 25 rutas**: dos filas contienen dos rutas cada una — «Blog (índice, etiquetas)» aporta `/blog` y `/blog/etiqueta/[tag]`, y «Privacidad · Términos» aporta `/legal/privacidad` y `/legal/terminos`. El canal RSS **no** cuenta aquí: lo exige §5.1 vía RF-23, no A.2. | A.2, §5.1 | explícito | pública |
| RF-03 | El español se sirve en la raíz del dominio y el inglés bajo el prefijo `/en`; ninguna redirección automática por idioma del navegador sobrescribe la ruta pedida. | §0, §7 | explícito | pública |
| RF-04 | El conmutador de idioma lleva a la **misma** página en el otro idioma (no a la portada) y conserva la posición de navegación. | DoD #2 | explícito | pública |
| RF-05 | Cada página pública emite `hreflang` recíproco ES↔EN y un `canonical` propio por idioma. | DoD #2, D4 | explícito | pública |
| RF-06 | Toda página de servicio renderiza las seis secciones del contrato A.3 en orden fijo: para quién y qué problema · qué es · qué incluye · cómo trabajamos · descarga · siguiente paso. Falta o desorden de una sección = página rechazada. La estructura del **registro de contenido** que alimenta esas secciones se exige aparte, en RF-135. | A.3 | explícito | pública |
| RF-07 | La sección 5 (descarga) es el **único** llamado a la acción de la página de servicio: no hay segundo CTA, ni agenda embebida, ni formulario de contacto en la misma página. | A.3-5, §10-8 | explícito | pública |
| RF-08 | La sección 6 enlaza a `/contacto` con texto sin venta; no incrusta calendario ni widget de terceros. | A.3-6 | explícito | pública |
| RF-09 | Home renderiza en este orden: hero tipográfico de una idea → las dos ramas como dos puertas (`SLG_AI` · `SLG_Holdings`) → tres tarjetas de `SLG_AI` → franja Doctrina con pull-quote y enlace → últimos artículos → descarga destacada → pie. | A.3 | explícito | pública |
| RF-10 | La página Doctrina publica el resumen ejecutivo de The Phoenix Doctrine y los tres pilares de DAL OS, y ofrece "documento completo a solicitud" mediante un formulario que produce una captura de tipo `doctrine-request`. | A.3, §5.1 | explícito | pública |
| RF-11 | La página Nosotros presenta SLG Agency Inc. (Florida) y a Ricardo Torres Oliva; toda mención de mentorías, premios o cifras queda `[PENDIENTE]` hasta dato verificado y autorizado. | A.3, §1 Constraints | explícito | pública |
| RF-12 | Existen `/legal/privacidad` y `/legal/terminos` (y sus pares EN) con URL estables y públicas sin autenticación, porque las pantallas de consentimiento OAuth las exigen. | F.2-1 | explícito | pública |
| RF-13 | La página `SLG_Academy` enlaza a Phoenix Academy (`academy.softlandingglobal.com`) como enlace externo, sin integración, sin sesión compartida y sin contenido embebido. | §10-7, §1 Constraints | explícito | pública |
| RF-14 | La nomenclatura obligatoria aparece literal en ES y EN; un script de CI falla si detecta cualquier variante traducida o alterada de esas etiquetas. | §1 Constraints, B.4 | explícito | transversal |
| RF-15 | Toda aparición de DAL OS expande la "D" como **Destrucción Creativa**; un script de CI falla ante cualquier otra expansión. | §1 Constraints | explícito | transversal |
| RF-16 | Ninguna cadena de negocio está codificada en un componente: todo texto visible (público, HQ y portal) se lee de `content/`. Una revisión encuentra cero literales de negocio en `.tsx`. | §1 Constraints, B.4 | explícito | transversal |
| RF-17 | Existen páginas 404 y 500 propias, bilingües, con navegación de vuelta. | D6 | explícito | pública |

### 1.2 Contenido como datos (OKF)

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-18 | Existen seis colecciones de contenido en las rutas de B.4: `page`, `service`, `download`, `post`, `doctrine`, `ui`. | B.4 | explícito | transversal |
| RF-19 | Cada colección valida su frontmatter mínimo (B.4) en tiempo de build; un frontmatter inválido rompe el build, no se degrada en silencio. | B.4 | explícito | transversal |
| RF-20 | El campo `pair` enlaza cada `page` y cada `service` con su equivalente en el otro idioma; un script de CI falla si un `pair` apunta a un archivo inexistente o si falta el par. | B.4, D4 | explícito | transversal |
| RF-21 | Publicar un artículo consiste en añadir un `.md` con frontmatter OKF y hacer push: aparece en `/blog` sin tocar código, sin build manual y sin paso en HQ. | DoD #3, §10-11 | explícito | pública |
| RF-22 | Un `post` con `status: draft` no se sirve en ninguna ruta pública ni en RSS, y sí aparece en HQ marcado como borrador. | A.5, §5.1 HQ | explícito | transversal |
| RF-23 | El blog publica un canal RSS con los artículos publicados del idioma correspondiente. | §5.1 | explícito | pública |
| RF-24 | Existen índice de blog y página por etiqueta (`/blog/etiqueta/[tag]`, `/en/blog/tag/[tag]`). | A.2 | explícito | pública |
| RF-25 | Cada artículo lleva `social: { hook, linkedin, x }` en su frontmatter y HQ muestra esos extractos listos para copiar. | A.5, §5.1 HQ | explícito | HQ |
| RF-26 | Un artículo puede existir solo en español: el script de paridad ES/EN se aplica a `page` y `service`, **no** a `post`. | A.5 | explícito | transversal |
| RF-27 | Añadir un documento de descarga consiste en añadir su registro de contenido (ES y EN) y subir el archivo al bucket privado; no requiere cambio de código ni despliegue manual. | A.4, DoD #9 | explícito | transversal |

### 1.3 Sistema de descargas y captura de interés

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-28 | Existen **11** documentos de descarga (`D-01` … `D-11`), uno por página de servicio, cada uno con registro de contenido en ES y EN. | D-17, A.4 | explícito | pública |
| RF-29 | `/descargas` lista la biblioteca de documentos con estado (`published` / `coming-soon`); los `draft` no se listan. | A.2, B.2 | explícito | pública |
| RF-30 | Cada documento tiene su página propia con el formulario de captura (título, para quién, qué aprende). | A.2, B.4 | explícito | pública |
| RF-31 | El formulario **rechaza dominios de correo gratuito** contra una lista mantenida y devuelve un mensaje explícito en el idioma de la página ("usa tu correo corporativo"), no un error genérico. | DoD #1, §7 | explícito | pública |
| RF-32 | La lista de dominios de correo gratuito vive como dato editable (contenido o configuración), no incrustada en el código, para poder ampliarla sin desplegar. | D-16 | asumido | pública |
| RF-33 | Cada formulario público incluye un campo trampa (honeypot) invisible para personas; un envío con ese campo relleno se descarta silenciosamente y no crea `lead_capture`. | D-16 | explícito | pública |
| RF-34 | Cada formulario público aplica límite de peticiones (por IP y por dirección de correo) con umbral configurable; al excederlo responde 429 sin revelar el umbral. | D-16, §7 | explícito | pública |
| RF-35 | La capa pública **no carga ningún desafío anti-bot de terceros ni script de terceros**: la protección es propia (RF-32 a RF-34). | D-16 | explícito | pública |
| RF-36 | El envío registra consentimiento explícito con marca de tiempo (`consent_at`) y enlace a la política de privacidad vigente. | B.2 | explícito | pública |
| RF-37 | Cada envío persiste un registro `lead_capture` con email, dominio, nombre, empresa, cargo, `source`, `download_id`, página, `locale` y UTM **antes** de responder al visitante. | B.2, B.6-1 | explícito | pública |
| RF-38 | El archivo se entrega por URL firmada con caducidad; el archivo nunca se sirve desde una ruta pública ni desde el repositorio. | §5.1, B.8 | explícito | pública |
| RF-39 | El visitante recibe su documento sin esperar al CRM: la entrega es inmediata y la sincronización con el CRM ocurre en segundo plano. | B.6-1 | explícito | pública |
| RF-40 | Si el documento aún no tiene archivo, la página muestra "disponible próximamente", **captura el correo igual**, no emite URL firmada y no dispara `download.completed`. | A.4, §9 | explícito | pública |
| RF-41 | Cada entrega registra un `download_event` con el instante de emisión de la URL firmada y el de finalización de la descarga. | B.2 | explícito | transversal |
| RF-42 | Existe una página `/gracias` (y `/en/thank-you`) a la que llega el visitante tras el envío, con el enlace de descarga y el siguiente paso. | A.2 | explícito | pública |
| RF-43 | El formulario de `/contacto` produce un `lead_capture` con `source: contact` y sigue el mismo camino de validación, cola y aviso que una descarga. | §5.1, B.2 | explícito | pública |
| RF-44 | La solicitud del documento completo de Doctrina produce un `lead_capture` con `source: doctrine-request` y el mismo camino. | §5.1, B.2 | explícito | pública |
| RF-45 | Cada captura conserva la página de origen, el idioma y los parámetros UTM, y esos datos viajan al CRM en el texto de la nota. | B.2, B.6-2 | explícito | pública |

### 1.4 Integración con el CRM (sistema de registro de leads)

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-46 | La entrega al CRM se implementa como **adaptador de dos modos** seleccionable por variable de entorno: `contact_note` y `lead_admission`. Cambiar de modo no exige migrar datos ni tocar el DU de captura. | D-19 | explícito | transversal |
| RF-47 | Modo `contact_note`: busca el contacto por correo (`GET /contacts?q=`), lo crea si no existe (`POST /contacts` con nombre, email, cargo, empresa como texto y `source: web`) y añade `POST /notes` con el contexto de la captura (documento, ruta, idioma, UTM). | B.6-2, D-19 | explícito | transversal |
| RF-48 | Modo `lead_admission`: envía `POST /api/v1/leads` con alcance `leads:write`, idempotente por correo + documento. Si el CRM aún no expone el endpoint, el modo permanece inactivo y el sistema opera en `contact_note` sin degradación. | D-19, B.6 | explícito | transversal |
| RF-49 | Toda respuesta del CRM se persiste en la captura: `crm_contact_id`, `crm_company_id`, `crm_opportunity_id`, `crm_sync_status` (`pending`/`delivered`/`failed`), `crm_attempts`, `crm_last_error`. | B.2 | explícito | transversal |
| RF-50 | Si el CRM responde error o no responde, la captura se reintenta hasta un máximo de **cinco intentos**, y **cada intento va precedido de su propia espera**, en correspondencia uno a uno: 1 min → intento 1, 10 min → intento 2, 1 h → intento 3, 6 h → intento 4, 24 h → intento 5. **No hay intento inmediato previo**, de modo que los cinco escalones de espera se usan y ninguno se descarta (`api_contracts` §8.1 lo cierra así de forma expresa). Tras fallar el quinto intento la captura pasa a `failed`, genera alerta en HQ y correo a `support@softlandingglobal.com`. | B.6-3, `api_contracts` §8.1 | explícito | transversal |
| RF-51 | Cada intento de entrega deja una fila `crm_delivery` con petición, código de respuesta y número de intento, consultable desde HQ. | B.2 | explícito | HQ |
| RF-52 | Desde HQ se puede forzar el reintento manual de una captura no entregada, y el resultado del reintento queda auditado. | §5.1 HQ, B.3 | explícito | HQ |
| RF-53 | Cada captura entregada genera un correo a `support@softlandingglobal.com` con el resumen del lead y el enlace profundo a su ficha en el CRM. | B.6-4 | explícito | transversal |
| RF-54 | El enlace profundo a la ficha del CRM se construye desde una plantilla configurable por variable de entorno, nunca codificada, porque la ruta del frontend del CRM está sin confirmar. | B.6, questions.md B6 | asumido | HQ |
| RF-55 | El tablero de HQ lee del CRM `GET /dashboard/metrics`, `GET /reports/funnel` y `GET /reports/sources?currency=USD` con una clave de solo lectura y sirve el resultado desde una caché de 5 minutos. | B.6 | explícito | HQ |
| RF-56 | La web usa **dos claves distintas** del CRM ("Website — captura" con `contacts:write`, `activities:write`, `crm:read`; "Website — tablero" con `crm:read`), ambas solo en variables de entorno de la plataforma de despliegue. | B.6, F.2-5 | explícito | transversal |
| RF-57 | La web **no** gestiona pipeline: `lead_capture` no tiene campos de estado comercial, ni etapas, ni asignación, ni valor de oportunidad. Cualquier propuesta de añadirlos se rechaza. | §5.1, B.2, §10-13 | explícito | transversal |

### 1.5 Identidad, acceso y autorización

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-58 | `/acceder` ofrece tres métodos: correo + contraseña, Google y Microsoft Entra ID (`tenantId: common`). | F.1, §7 | explícito | transversal |
| RF-59 | No existe registro público: si el correo no corresponde a un usuario ni a una invitación vigente, la respuesta es un mensaje neutro ("solicita acceso a tu contacto en SLG") que no revela si la cuenta existe. | F.1 | explícito | transversal |
| RF-60 | Una invitación genera un enlace de un solo uso con caducidad de 72 horas; usado o caducado, deja de servir. | F.1 | explícito | transversal |
| RF-61 | Una invitación puede aceptarse con cualquiera de los tres métodos, y la cuenta resultante queda ligada a la empresa y al rol de la invitación. | F.1, DoD #5 | explícito | transversal |
| RF-62 | Si el correo verificado del proveedor coincide con un usuario existente, la cuenta se vincula en lugar de duplicarse; para Entra el ancla de identidad es `oid`, con `preferred_username`/`upn` como respaldo. | F.1 | explícito | transversal |
| RF-63 | Si el proveedor no entrega correo verificable, la aceptación de la invitación exige coincidencia explícita de correo. | F.1 | explícito | transversal |
| RF-64 | Las contraseñas exigen mínimo 12 caracteres, verificación de correo en el alta, recuperación por enlace de un solo uso y bloqueo progresivo por intentos fallidos. | F.1, B.8 | explícito | transversal |
| RF-65 | La sesión usa cookies seguras con expiración deslizante de 7 días. | F.1 | explícito | transversal |
| RF-66 | Existe "cerrar sesión en todos los dispositivos" y su efecto es inmediato en todas las sesiones del usuario. | F.1 | explícito | transversal |
| RF-67 | El sistema reconoce cinco roles: `slg_admin`, `slg_operator`, `client_admin`, `client_member` y `agent` (clave de API con alcances). | §5.1, B.3 | explícito | transversal |
| RF-68 | La matriz de permisos B.3 se aplica **en el servidor** para cada acción; ocultar un botón en la interfaz no cuenta como autorización. | B.3, perfil `quality_gate` | explícito | transversal |
| RF-69 | En v1 un usuario pertenece a una sola empresa cliente; el modelo lo permite pero la interfaz no ofrece pertenencia múltiple. | B.2 | explícito | transversal |
| RF-70 | El middleware resuelve idioma en `(public)`, exige sesión y rol en `(hq)` y `(portal)`, y exige clave válida con alcance en `api/v1`. | B.1 | explícito | transversal |
| RF-71 | Toda consulta a datos de cliente incorpora el `organization_id` del contexto autenticado y **nunca** el que venga en la petición; un parámetro de organización ajena devuelve 404/403, no datos. | B.1, §9 | explícito | transversal |
| RF-72 | En HQ y portal la interfaz se muestra en ES o EN según la preferencia del usuario; el contenido entregado (entregables, avisos) se muestra tal como se entregó, sin traducir. | §0 | explícito | transversal |

### 1.6 HQ — intranet SLG

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-73 | El tablero lista las capturas web filtrables por documento, página y fecha, cada una con su estado de entrega al CRM y enlace directo al contacto en el CRM. | §5.1 HQ, DoD #4 | explícito | HQ |
| RF-74 | El tablero muestra las métricas del pipeline **leídas del CRM** (embudo y fuentes), identificadas como dato del CRM y con marca de tiempo de la caché. | §5.1 HQ, B.6 | explícito | HQ |
| RF-75 | El tablero incluye un botón "Abrir CRM" que lleva a `crm.softlandingglobal.com`. | §5.1 HQ | explícito | HQ |
| RF-76 | El tablero muestra además: empresas activas, proyectos y entregables recientes, artículos publicados y borradores con sus extractos sociales, actividad reciente de agentes y últimos eventos de auditoría. | §5.1 HQ | explícito | HQ |
| RF-77 | HQ permite crear y editar empresas cliente (nombre, slug, tipo, estado, contacto principal). | §5.1 HQ, B.2 | explícito | HQ |
| RF-78 | HQ permite dar de alta usuarios SLG, emitir invitaciones a empresas cliente y revocar invitaciones no aceptadas. | §5.1 HQ, B.3 | explícito | HQ |
| RF-79 | HQ permite crear y editar proyectos ligados a una empresa, con servicio (nomenclatura literal), estado, responsable y fechas. | §5.1 HQ, B.2 | explícito | HQ |
| RF-80 | HQ permite publicar entregables por proyecto en los cuatro tipos (`pdf`, `html`, `md`, `link`) más `material`, por subida de archivo o por enlace, con visibilidad `client` o `internal` y control de versión. | §5.1 HQ, B.2 | explícito | HQ |
| RF-81 | HQ permite publicar un aviso dirigido a una empresa concreta, con cuerpo en Markdown. | §5.1 HQ, B.2 | explícito | HQ |
| RF-82 | HQ permite crear y revocar claves de API con nombre, propietario, alcances, límite de peticiones y caducidad; la clave en claro se muestra **una sola vez** al crearla. | §5.1 HQ, B.2, B.5 | explícito | HQ |
| RF-83 | HQ expone el registro de auditoría consultable y filtrable, accesible solo para `slg_admin`. | B.3 | explícito | HQ |
| RF-84 | HQ expone la lista de capturas web con su estado de sincronización, el detalle de intentos y la acción de reintento (RF-52). | §5.1 HQ | explícito | HQ |
| RF-85 | HQ **no** incluye gestión de leads, etapas, oportunidades ni pipeline: esa superficie vive en el CRM. Un requisito futuro que la pida se trata como cambio de alcance. | §5.1 HQ, §10-13 | explícito | HQ |
| RF-86 | `slg_operator` opera solo sobre los proyectos asignados y no puede crear claves de API, invitar usuarios SLG ni ver auditoría; los intentos se rechazan en el servidor y se auditan. | B.3 | explícito | HQ |
| RF-87 | `/hq` y `/portal` permanecen inaccesibles tras el login (no enlazados y bloqueados por rol) hasta que su milestone se dé por terminado, mientras la capa pública ya está en producción. | Anexo E | implícito | transversal |

### 1.7 Portal de clientes

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-88 | El inicio del portal muestra los avisos de SLG dirigidos a la empresa del usuario, con estado vacío redactado cuando no hay ninguno. | §5.1 portal, perfil | explícito | portal |
| RF-89 | El portal lista los proyectos de la empresa y, dentro de cada uno, sus entregables con visibilidad `client`; los `internal` no aparecen ni por enlace directo. | §5.1 portal, B.2 | explícito | portal |
| RF-90 | El portal abre cada entregable según su tipo: PDF descargable por URL firmada, HTML autocontenido en visor aislado (`iframe` con sandbox y CSP estricta), Markdown OKF renderizado y enlace externo señalado como tal. | §5.1 portal, B.8 | explícito | portal |
| RF-91 | El portal separa "Materiales de programa" (entregables de tipo `material`) de los entregables de proyecto. | §5.1 portal | explícito | portal |
| RF-92 | `client_admin` puede invitar miembros de **su** empresa y ver la lista de miembros; `client_member` solo ve la lista. | §5.1 portal, B.3 | explícito | portal |
| RF-93 | Cada usuario puede ver y editar su perfil (nombre, idioma de interfaz) y cambiar su contraseña si usa el método de contraseña. | §5.1 portal | explícito | portal |
| RF-94 | El portal incluye el paso "Agenda tu Sesión Cero" con enlace a calendario tomado de `content/ui`; mientras la URL no exista, el paso se muestra en estado "próximamente" y no rompe la pantalla. | §5.1 portal, questions.md B4 | asumido | portal |
| RF-95 | Un usuario `client_*` no puede leer ningún recurso de otra empresa ni ninguna ruta de `/hq`, y esa imposibilidad está demostrada por prueba automatizada, no por inspección manual. | DoD #5, §9 | explícito | portal |
| RF-96 | La Sesión Cero **no** aparece como CTA en la capa pública: solo se ofrece dentro del portal, tras ingreso o enrolamiento. | §0, §10-8 | explícito | transversal |

### 1.8 API v1 para agentes

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-97 | La API autentica con `Authorization: Bearer <clave>`; una petición sin clave o con clave revocada/caducada devuelve 401. | B.5, DoD #6 | explícito | API |
| RF-98 | Cada endpoint exige un alcance concreto; una clave con alcance insuficiente devuelve 403 y no filtra qué alcance faltaba. | B.5, D9 | explícito | API |
| RF-99 | Cada clave tiene límite de peticiones propio; superarlo devuelve 429 con cabecera de reintento. | B.5, DoD #6 | explícito | API |
| RF-100 | `GET /api/v1/captures?since=&source=` devuelve, con alcance `captures:read`, la evidencia de capturas web y su estado en el CRM, en solo lectura. | B.5 | explícito | API |
| RF-101 | `GET /api/v1/organizations` y `GET /api/v1/organizations/{id}/projects` devuelven, con `orgs:read`, empresas y sus proyectos. | B.5 | explícito | API |
| RF-102 | `POST /api/v1/deliverables` crea, con `deliverables:write`, los metadatos del entregable y devuelve una URL firmada de subida; el archivo se sube por `PUT` y se publica con `POST /api/v1/deliverables/{id}/publish`. | B.5 | explícito | API |
| RF-103 | `GET /api/v1/projects/{id}/deliverables` devuelve, con `deliverables:read`, los entregables del proyecto. | B.5 | explícito | API |
| RF-104 | `POST /api/v1/announcements` crea, con `announcements:write`, un aviso dirigido a una empresa. | B.5 | explícito | API |
| RF-105 | `POST /api/v1/events` registra, con `events:write`, actividad del agente, y esa actividad aparece en el tablero de HQ. | B.5, DoD #4 | explícito | API |
| RF-106 | `GET /api/v1/openapi.json` publica la especificación completa y solo responde a peticiones autenticadas con cualquier clave válida. | B.5 | explícito | API |
| RF-107 | Toda llamada a la API deja una entrada en `audit_log` con actor (clave), acción, entidad, identificador e IP. | B.5, B.2 | explícito | API |
| RF-108 | Los errores de la API no revelan detalles internos (trazas, nombres de tabla, consultas ni versiones de dependencias). | B.5, perfil `quality_gate` | explícito | API |
| RF-109 | La versión va en la ruta (`/api/v1/...`); un cambio incompatible abre `/api/v2` en lugar de romper `/api/v1`. | B.5 | explícito | API |
| RF-110 | La API **no** expone leads ni pipeline: los agentes operan leads en el CRM por su propio MCP. `GET /captures` entrega evidencia, no gestión. | B.5, DoD #6 | explícito | API |
| RF-111 | Toda escritura por clave de API queda atribuida en el recurso creado (`published_by`, `author`) como clave, distinguible de un usuario. | B.2 | implícito | API |

### 1.9 Webhooks salientes

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-112 | El sistema emite los nueve eventos de B.7: `lead.captured`, `lead.delivered_to_crm`, `download.completed`, `contact.submitted`, `doctrine.requested`, `invitation.sent`, `deliverable.published`, `announcement.published`, `post.published`. | B.7 | explícito | transversal |
| RF-113 | Cada envío lleva firma HMAC-SHA256 en cabecera calculada sobre el cuerpo, con secreto por suscriptor. | B.7 | explícito | transversal |
| RF-114 | Los envíos fallidos se reintentan con espera creciente y cada intento queda en `webhook_delivery` con estado, intentos y último error. | B.7, B.2 | explícito | transversal |
| RF-115 | Ningún flujo externo es requisito de la v1: si no hay suscriptor configurado, los eventos se registran y el sistema funciona igual. | B.7, §7 | explícito | transversal |

### 1.10 Correo transaccional

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-116 | El envío de correo usa **Resend** como servicio transaccional dedicado, verificado sobre un **subdominio de envío propio** con SPF, DKIM y DMARC publicados **bajo ese subdominio**. El registro SPF de la raíz y los MX de Outlook no se tocan (el correo corporativo permanece en Microsoft 365). El seguimiento de aperturas y clics queda **desactivado** por dominio. `[PENDIENTE: P-4 — nombre exacto del subdominio de envío, se fija en M0]`. | D-22, D-23, D-24, F.2-4 | explícito | transversal |
| RF-117 | El sistema envía tres tipos de correo —invitación, recuperación de contraseña y aviso de captura a SLG— **desde un dominio verificado con SPF, DKIM y DMARC alineados** (el subdominio de envío de RF-116), y **toda respuesta del destinatario llega a `support@softlandingglobal.com`** por `Reply-To`. La dirección remitente visible **no** es necesariamente `support@softlandingglobal.com`: tras D-24 esa es la sub-decisión `[PENDIENTE: P-3 — dirección remitente visible; se fija en M0]`. `from_email` y `reply_to` son configuración por variable de entorno y se persisten en cada envío: nunca constantes en el código. | §5.1, D-24 | explícito | transversal |
| RF-118 | El envío está detrás de un **adaptador propio que habla SMTP estándar**, no el SDK propietario del proveedor, con servidor, credencial y remitente en variables de entorno: cambiar de proveedor cuesta tres variables de entorno y **ninguna línea de código**. Ningún caso de uso importa el cliente del proveedor. | D-22, AGENTS.md Regla 7 | explícito | transversal |
| RF-119 | Un fallo de envío de correo no pierde el hecho de negocio: la invitación queda creada y reenviable desde HQ, y la captura queda entregada aunque el aviso falle. | F.1, B.6 | implícito | transversal |

### 1.11 Operación, despliegue y literacy

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-120 | La aplicación se despliega como cinco servicios en Easypanel: web de producción, base de datos PostgreSQL, almacenamiento de archivos MinIO, analítica Umami y web de staging. | §5.1 Operación | explícito | transversal |
| RF-121 | El despliegue es automático: push a `main` publica producción, push a `develop` publica staging. | §5.1, §7 | explícito | transversal |
| RF-122 | `staging.softlandingglobal.com` está protegido con autenticación básica y excluido de indexación. | §5.1 | explícito | transversal |
| RF-123 | Los buckets `downloads` y `deliverables` son privados: no existe listado público ni acceso sin URL firmada. | §5.1, D10 | explícito | transversal |
| RF-124 | Existe copia de seguridad diaria de la base de datos y de los volúmenes de archivos hacia **Cloudflare R2**, object storage S3-compatible externo y en proveedor distinto del que aloja el VPS; el script habla **API S3 genérica**, de modo que cambiar de destino sea endpoint y credenciales en variables de entorno. La copia **no se declara inmutable** —R2 no ofrece Object Lock por API estándar (R-37)—; en su lugar se exigen tres cosas verificables: (a) la credencial del proceso de copia es de **solo escritura, sin permiso de borrado**; (b) la purga de copias antiguas la ejecuta un proceso distinto con **credenciales distintas**; (c) existe **retención por generaciones** (diaria, semanal, mensual), nunca un único destino sobrescrito. Una copia escrita con credencial que puede borrar, o una sola generación, es un defecto. | D-21, D-20, R-37, §5.1 | explícito | transversal |
| RF-125 | La restauración de una copia se ejecuta y se verifica en staging: datos y archivos vuelven íntegros. La prueba se hace **también desde una copia antigua**, no solo desde la última, porque es lo que R-37 obliga a demostrar cuando la inmutabilidad no está garantizada. Un backup no restaurado no cuenta como backup. | DoD #8, D11, R-37 | explícito | transversal |
| RF-126 | Existe un README operativo que permite a una persona no programadora hacer siete tareas: cambiar un texto, publicar un artículo, añadir una descarga, crear un cliente e invitar, crear una clave de API, desplegar y restaurar un backup. | §5.1, DoD #9 | explícito | transversal |
| RF-127 | La analítica es autoalojada y privacy-first (Umami en Easypanel), sin scripts de terceros ni cookies de seguimiento en la capa pública. | §5.1, §7 | explícito | pública |
| RF-128 | Un script de CI verifica antes de cada publicación a `main`: frontmatter válido, `pair` existente, nomenclatura literal y cero `[PENDIENTE]`. Falla el pipeline, no solo avisa. | B.4, DoD #10 | explícito | transversal |
| RF-129 | Todas las variables de entorno están documentadas en el repositorio **sin valores**, con su propósito y su servicio consumidor. | D11 | explícito | transversal |
| RF-130 | Existe un monitor de caída del sitio que avisa cuando producción deja de responder. El monitor es un **servicio de uptime dedicado con tramo gratuito que se ejecuta FUERA del VPS** (D-43): vigila al menos `softlandingglobal.com` y `staging.softlandingglobal.com`, y **avisa por un canal que no dependa del VPS**. n8n **no** cumple este requisito por sí solo —corre en el mismo VPS que debería vigilar— y queda como monitor **secundario** para incidencias parciales. El producto concreto es `[PENDIENTE: se elige con 2–3 candidatos antes de FU-05; no bloquea el arranque]`; un monitor que viva dentro del VPS, o que avise por un canal alojado en él, es un defecto. | §9, D11, D-43, R-29 | explícito | transversal |
| RF-131 | El registro DNS del dominio raíz, `www` y `staging` se crea sin tocar los registros de `crm`, `n8n`, `evolution`, `academy`, **los MX de Outlook ni el TXT (SPF) de la raíz** — el correo corporativo permanece en Microsoft 365 (D-23). Los registros del correo transaccional (SPF, DKIM y CNAME de verificación) se publican **solo bajo el subdominio de envío** de RF-116, como entradas DNS distintas (D-24). | §7, §1 Constraints, D-23, D-24 | explícito | transversal |

### 1.12 Compuertas de secuencia (copy y prototipo)

Dos compuertas que el brief impone y que ninguna DU de página puede saltarse. No son buenas prácticas
de trabajo: son **condiciones de entrada**. Una DU de página construida antes de su compuerta se
rechaza aunque funcione. Los IDs de esta sección y de las dos siguientes continúan la numeración
global; su posición al final de §1 no significa que se construyan al final (ver el mapa a milestones).

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-132 | El **copy maestro bilingüe se produce como una sola Foundation Unit** (FU-01 del Anexo E) y se aprueba en **una única compuerta** antes de construir cualquier DU de página. Hasta esa aprobación las páginas se construyen contra el **esquema de contenido** (B.4, RF-135 a RF-140) con el texto marcado `[PENDIENTE: …]`: visible en staging y prohibido en producción (RNF-18). Una segunda ronda de aprobación de copy es un cambio de alcance, no un paso del plan. | §1 Constraints, Anexo E, §9 | explícito | pública |
| RF-133 | Los **nueve componentes de C.5 se diseñan primero y en este orden**: 1) barra de navegación translúcida + sheet móvil · 2) hero tipográfico · 3) tarjeta de rama/servicio · 4) bloque "Qué incluye" · 5) formulario de descarga · 6) tarjeta de artículo · 7) pie · 8) shell de app (barra lateral, tabla, ficha, estado vacío, estado de error) · 9) visor de entregables. Cada uno pasa por **prototipo interactivo aprobado antes de construir ninguna DU de página**. Prototipo = componente real, navegable con teclado y con gesto; una imagen no cierra esta compuerta. | C.5 | explícito | transversal |
| RF-134 | Dentro de esa secuencia, el **formulario de descarga se prototipa y se valida antes que cualquier otro componente** — es "el componente que paga el proyecto" (C.5) y el CTA único de toda página de servicio (RF-07). Su prototipo demuestra el camino completo del visitante: validación de correo corporativo con mensaje en el idioma de la página, error en línea, estado de envío, estado "disponible próximamente" y estado de error del servidor. | C.5, A.3-5 | explícito | pública |

### 1.13 Estructura de los registros de contenido

RF-19 exige que el frontmatter se valide en tiempo de build; esta sección dice **qué** se valida,
colección por colección. Todas las filas las verifica el mismo script de CI de B.4 (RF-128) y un
registro que no cumpla rompe el build. Estructura del **registro** ≠ orden de **renderizado**: la
página de servicio se rige además por RF-06.

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-135 | Cada registro `service` lleva `type: service`, `name` (nomenclatura literal), `branch` (`SLG_Academy`, `SLG_Enterprise`, `SLG_Factory`, `SLG_Holdings`), `parent`, `download` (slug del documento), `lang`, `pair` **y las secciones 1–6 del contrato A.3 como bloques con encabezado fijo**. Falta un bloque, sobra uno o se altera un encabezado = registro inválido, y el script de CI lo rechaza antes de que la página llegue a renderizarse. | B.4, A.3 | explícito | transversal |
| RF-136 | Cada registro `page` lleva `type: page`, `title`, `description`, `lang`, `pair`, `nav_order` y `updated`. | B.4 | explícito | transversal |
| RF-137 | Cada registro `download` lleva `type: download`, `service`, `title`, `audience`, `learns[]`, `file_key`, `status` (`draft` / `coming-soon` / `published`), `lang` y `pair`. | B.4, A.4 | explícito | transversal |
| RF-138 | Cada registro `post` lleva `type: post`, `title`, `description`, `lang`, `pair` (slug del par o `null`), `date`, `tags`, `status` (`draft` / `published`), `cover`, `social: { hook, linkedin, x }` y `author`. | A.5, B.4 | explícito | transversal |
| RF-139 | Cada registro `doctrine` lleva `type: doctrine_section` y `order`. | B.4 | explícito | transversal |
| RF-140 | La colección `ui` es un archivo por idioma (`content/ui/<lang>.json`) con las cadenas de interfaz de las tres superficies (pública, HQ, portal). Una clave presente en un idioma y ausente en el otro rompe el build; nunca se degrada a cadena vacía en pantalla. | B.4, §0 | implícito | transversal |

### 1.14 Requisitos de extensibilidad

`planning/scope.md` § «Previsto (enchufable, no se construye)» no añade alcance: **impone forma** al
alcance de v1. Su columna «Qué exige decidir HOY» son restricciones vinculantes — si la v1 no las
cumple, lo previsto costará una migración de datos o la reescritura de un DU. Cada fila de aquella
tabla tiene aquí un requisito verificable. Ninguno de estos requisitos construye lo previsto.

| ID | Requisito | Origen | Etiqueta | Superficie |
|---|---|---|---|---|
| RF-141 | El frontmatter A.5 de `post` se implementa **completo desde el primer artículo**, aunque en v1 se escriba a mano, y la publicación se dispara del campo `status`, **nunca** de la existencia del archivo: un editor posterior escribe los mismos campos sin migrar contenido. | §5.3, scope.md «Previsto» (módulo «Contenido» en HQ), A.5 | explícito | transversal |
| RF-142 | El tipo del entregable (`pdf`, `html`, `md`, `link`, `material`) es un **valor de datos, no una rama de código** en el visor del portal: añadir un tipo nuevo es añadir un registro y su renderizador declarado, no reescribir el visor. Una decisión sobre el tipo repartida por la interfaz se rechaza en revisión. | §5.3, scope.md «Previsto» (alojamiento nativo de `SLG_Readiness`), B.2 | implícito | portal |
| RF-143 | `deliverable.version` existe y se usa desde v1: reemitir un entregable crea una versión nueva y no destruye la anterior. | B.2, §5.3, scope.md «Previsto» | explícito | transversal |
| RF-144 | Los entregables de tipo `material` **cuelgan siempre de un proyecto**, nunca de una biblioteca global: no existe ruta ni entidad que liste materiales fuera del proyecto que los contiene. `membership` no se usa como matrícula — en v1 un usuario pertenece a una sola empresa cliente (RF-69) y esa restricción queda explícita en el modelo. | §5.3, scope.md «Previsto» (programas Phoenix), B.2 | explícito | portal |
| RF-145 | El payload del evento `post.published` transporta los extractos `social.hook`, `social.linkedin` y `social.x` **y el enlace canónico del artículo en su idioma**, no solo un identificador: un suscriptor debe poder publicar sin leer de vuelta el repositorio. | §5.3, scope.md «Previsto» (flujo n8n), B.7, A.5 | implícito | transversal |
| RF-146 | `agent_event.kind` y `agent_event.payload_json` admiten un **veredicto estructurado** de un agente validador **sin cambiar el esquema**: `kind` es un valor abierto y `payload_json` un objeto validado contra esquema en la escritura, no un conjunto de columnas fijas. | §5.3, scope.md «Previsto» (Hermes validador), B.2 | implícito | API |
| RF-147 | Los alcances de las claves de API son **granulares desde v1** y ninguno implica a otro: una clave de validación puede tener `events:write` sin `deliverables:write`. Que una clave con `events:write` consiga crear un entregable es un defecto de seguridad, no una comodidad. | §5.3, scope.md «Previsto» (Hermes validador), B.5, D9 | explícito | API |
| RF-148 | Cada gate del Anexo D (`D1` … `D12`, más `D2b`) queda escrito como **checklist verificable o script**, no como prosa, de modo que extraerlos a un perfil `marketing-website` sea mover texto y no reinventar criterios. | §5.3, scope.md «Previsto» (perfil `marketing-website`), Anexo D, D-14 | implícito | transversal |

---

## 2. Requisitos no funcionales

| ID | Requisito | Umbral medible | Origen | Etiqueta |
|---|---|---|---|---|
| RNF-01 | Rendimiento de la capa pública | Lighthouse móvil ≥ 90 en Performance, Accessibility, Best Practices y SEO, medido en Home, una página de servicio y un artículo | DoD #7, D1 | explícito |
| RNF-02 | Velocidad de carga percibida | LCP < 2,5 s en 4G simulado en las tres páginas de RNF-01 | D1 | explícito |
| ~~RNF-03~~ | ~~Peso del JavaScript inicial~~ | ~~< 150 KB comprimido (gzip) en la capa pública~~ — **retirada por D-50**: proxy mal calibrado, incompatible con el suelo de React 19 + Next 16 (172 KB sin librerías propias) pese a cumplir el objetivo del gate. El gate D1 queda definido solo por RNF-01 + RNF-02. | D1 | ~~explícito~~ |
| RNF-04 | Contraste de color | AA en todas las combinaciones. `#50B4DC` y `#78B4DC` nunca como color de texto sobre fondo claro; `#2878B4` sobre blanco roto (`#F4F6F9`) solo a ≥ 24 px | D2, C.1 | explícito |
| RNF-05 | Accesibilidad operativa | Navegación completa por teclado con foco visible en todo elemento interactivo; `alt` en toda imagen informativa; formularios con etiqueta asociada y error en línea | D2, DoD #7 | explícito |
| RNF-06 | Movimiento reducido | Con `prefers-reduced-motion: reduce`, toda transición se degrada a cross-fade de 200 ms, sin desplazamientos ni rebotes | C.4, D3 | explícito |
| RNF-07 | Transparencia reducida | Con `prefers-reduced-transparency`, toda superficie translúcida se vuelve sólida | C.3 | explícito |
| RNF-08 | Contraste aumentado | Con `prefers-contrast: more`, bordes definidos y fondos casi sólidos | C.4 | explícito |
| RNF-09 | Física del movimiento | Springs con `damping` 1.0 y `response` 0.3–0.4 s por defecto; rebote (`~0.8`) solo tras un gesto con momentum | C.4 | explícito |
| RNF-10 | Respuesta a la entrada | Feedback visual en `pointerdown` (`scale(0.97)`, 100 ms); cero retardos artificiales en la ruta de entrada | C.4 | explícito |
| RNF-11 | Propiedades animadas | Solo `transform` y `opacity`; nada que provoque reflow durante la animación; `will-change` únicamente donde el movimiento es inminente | C.4 | explícito |
| RNF-12 | Interrumpibilidad | Toda animación gestual se reanuda desde el valor presentado, nunca desde el objetivo; sin `@keyframes` en interacciones agarrables | C.4 | explícito |
| RNF-13 | Cumplimiento del Kit de Marca | Cero verde, amarillo o naranja; rojo `#DC141E` en ≤ 2 instancias por viewport y nunca como fondo o decoración; ≤ 3 colores de marca por elemento gráfico; logo solo sobre `--paper`/`--paper-2`, con margen de 1 altura de la "S", sin deformar | D2b, Anexo C, Kit de Marca SLG Rojo v1 | explícito |
| RNF-14 | Tipografía | Montserrat autoalojada en `woff2` (400, 600, 700), `font-display: swap`, subconjunto latino; cero peticiones a servicios de fuentes de terceros | C.2, D1 | explícito |
| RNF-15 | Tokens de diseño | Todos los colores, radios, sombras y difuminados se expresan como variables CSS, de modo que el modo oscuro de v1.1 no exija rehacer componentes | C.1 | explícito |
| RNF-16 | Paridad bilingüe | 100 % de las colecciones `page` y `service` tienen par ES/EN, verificado por script en CI (0 huérfanos) | D4, DoD #2 | explícito |
| RNF-17 | SEO técnico | Metadatos únicos por página e idioma, Open Graph con imagen de marca, `sitemap.xml`, `robots.txt`, `schema.org` `Organization` + `Service`, `canonical` y `hreflang` — verificados por script | D6, §5.1 | explícito |
| RNF-18 | Fidelidad de contenido en producción | Cero `[PENDIENTE]`, cero lorem ipsum, cero cifra sin fuente y cero nombre de cliente sin autorización en `main`; verificado por script de CI que bloquea el despliegue | DoD #10, D5 | explícito |
| RNF-19 | Aislamiento entre empresas | Prueba automatizada que demuestra que un `client_*` no lee recursos de otra empresa ni rutas de HQ; se ejecuta en cada pipeline | DoD #5, D9, §9 | explícito |
| RNF-20 | Archivos privados | Toda URL de archivo caduca; el sistema no expone ninguna ruta que liste el contenido de un bucket. Duración de la firma, **cerrada en `api_contracts` §11.9**: **15 min** para la descarga de documento desde `/gracias`, **10 min** para un entregable abierto desde el portal, **30 min** para la URL de subida por API. Los tres valores se leen de configuración (`SIGNED_URL_TTL_DOWNLOAD_MINUTES`, `SIGNED_URL_TTL_DELIVERABLE_MINUTES`, `SIGNED_URL_TTL_UPLOAD_MINUTES`), nunca como constante en el código | D10, B.8, `api_contracts` §11.9 | explícito |
| RNF-21 | Aislamiento del visor HTML | Los entregables HTML se sirven en `iframe` con `sandbox` y CSP estricta, sin acceso a la sesión de la aplicación anfitriona | B.8, D10 | explícito |
| RNF-22 | Cabeceras de seguridad | CSP, HSTS y `frame-ancestors` activas en producción y verificadas por prueba | B.8 | explícito |
| RNF-23 | Cookies | Todas las cookies de sesión con `Secure`, `HttpOnly` y `SameSite` | B.8 | explícito |
| RNF-24 | Resistencia a fuerza bruta | Límite de intentos de login con bloqueo progresivo; el mismo mecanismo protege la recuperación de contraseña | B.8, F.1 | explícito |
| RNF-25 | Subidas | Tipo MIME y tamaño validados en el servidor antes de aceptar el archivo. Límite de tamaño, **cerrado en `data_model` §2.6**: **25 MB** en el bucket `downloads` (`application/pdf`), **50 MB** para entregables `pdf` y `material`, **5 MB** para entregable `html`, **1 MB** para entregable `md`, y **tope duro de 50 MB** en servidor y proxy, que rechaza antes de leer el cuerpo. Constante única referenciada desde el código, no repetida a mano | B.8, perfil, `data_model` §2.6 | explícito |
| RNF-26 | Secretos | Cero secretos en el repositorio (que es **público**): claves, tokens y contraseñas solo en variables de entorno de la plataforma. Verificado por análisis de secretos en CI | §1 Constraints, perfil, D-18 | explícito |
| RNF-27 | Datos fuera del repositorio | Ningún PDF de descarga, entregable de cliente ni dato de cliente entra en el control de versiones | §1 Constraints | explícito |
| RNF-28 | Dependencias | Versiones fijadas y procedentes de fuentes confiables; el pipeline falla ante una vulnerabilidad crítica conocida | perfil `quality_gate` | explícito |
| RNF-29 | Auditoría | `audit_log` es inmutable: sin actualización ni borrado desde la aplicación, ni siquiera para `slg_admin` | B.2, B.8 | explícito |
| RNF-30 | Acceso a datos | Toda consulta usa sentencias parametrizadas; cero concatenación de entrada de usuario en SQL | perfil `quality_gate` | explícito |
| RNF-31 | Escapado de salida | Todo contenido renderizado se escapa; el Markdown de avisos y entregables se sanea antes de renderizarse | perfil `quality_gate` | explícito |
| RNF-32 | No filtración | Ni logs, ni mensajes de error, ni interfaz muestran datos sensibles ni detalles internos del sistema | perfil `quality_gate`, B.5 | explícito |
| RNF-33 | Validación de entrada | Toda entrada externa (formularios, API, webhooks entrantes, parámetros de ruta) se valida contra un esquema antes de usarse | perfil `quality_gate` | explícito |
| RNF-34 | Completitud de cada DU | Ninguna DU se da por hecha sin: backend que la soporta, frontend que la expone, recorrido completo del consumidor, gate de calidad en verde, estados vacíos y de error resueltos y pruebas de las rutas críticas | perfil `deliverable_unit_completeness` | explícito |
| RNF-35 | Cobertura de pruebas críticas | Existen pruebas automatizadas de: autenticación por los tres métodos, aislamiento por empresa, alcances y límites de la API, y el camino captura → CRM (incluido el caso de CRM caído) | perfil, D7/D8/D9 | explícito |
| RNF-36 | Conversión E2E verificada | Prueba real end-to-end: descarga → `lead_capture` → contacto + nota en el CRM → correo a `support@`; y caso de error: CRM apagado → captura en cola → PDF entregado → reintento exitoso al volver | D7, DoD #1 | explícito |
| RNF-37 | Identidad E2E verificada | Login por los tres métodos, invitación aceptada por cada método, vinculación por correo verificado, recuperación de contraseña y cierre de sesión global — todos probados | D8 | explícito |
| RNF-38 | Comprensión del visitante | Un ejecutivo que llega desde LinkedIn en móvil entiende qué es `SLG_AI` y qué es `SLG_Holdings` en **menos de 3 minutos**, medido con al menos una prueba con persona real registrada en `work_log` | DoD #1 | explícito |
| RNF-39 | Literacy operativa | Ricardo ejecuta sin ayuda técnica tres tareas siguiendo el README (cambiar un texto, añadir una descarga, crear un cliente); cada fallo del README es un defecto | DoD #9, D12 | explícito |
| RNF-40 | Higiene de claves del CRM | Una clave por integración, alcances mínimos, rotación anual y revocación inmediata ante sospecha de filtración; nunca un login de persona como cuenta de servicio | B.6 | explícito |
| RNF-41 | Trazabilidad del conocimiento | Cada documento de diseño está enlazado desde `knowledge/index.md`; cada montaje queda en `knowledge/log.md` | D12, §8 | explícito |
| RNF-42 | Disciplina de contexto y coste | El consumo de tokens por milestone queda registrado en `docs/run_metadata.md`; un cambio que suba el coste sin beneficio claro se rechaza | AGENTS.md (Context & Token Management) | explícito |
| RNF-43 | Lente de revisión de interfaz | Cada DU con interfaz se revisa contra los ocho principios de C.6 y responde en cada pantalla: dónde estoy, a dónde puedo ir, cómo salgo | C.6, D3 | explícito |
| RNF-44 | Densidad de la capa pública | Una idea por viewport, blanco generoso, cero fotografía de stock y cero clichés visuales de IA; verificado en la revisión de marca | Anexo C, §1 Constraints | explícito |
| RNF-45 | Contrato del gesto del sheet móvil | El menú móvil es un *sheet* arrastrable con: **seguimiento 1:1 con `setPointerCapture`**; **proyección de momentum (`d ≈ 0.998`)** para decidir cerrar o abrir; **rubber-band en el límite**; **velocidad transferida al spring de cierre**. Los cuatro se verifican cuadro a cuadro en la revisión de motion (gate D3), no por inspección del código. Se combina con RNF-12: el gesto es interrumpible y sin `@keyframes` | C.4, C.5, D3 | explícito |
| RNF-46 | Reveals al scroll | Opacidad + **8 px** de desplazamiento, **una sola vez** por elemento, `damping 1.0`; sin parallax, sin fondos en movimiento y sin bucles lentos | C.4 | explícito |

---

## 3. Trazabilidad

**Regla de cierre del paso 7:** cada requisito de este documento debe mapear a **al menos una** Foundation
Unit o Deliverable Unit en `implementation/user_units.md`. Un requisito sin unidad es alcance perdido;
una unidad sin requisito es alcance inventado (Regla 4 de `AGENTS.md`).

La verificación se hace en la "Quality check before presenting" del playbook `init-project`, con estas
condiciones:

1. **Cobertura**: la tabla de FU/DU incluye una columna `requisitos` que cita IDs `RF-NN` / `RNF-NN`.
   La unión de todas esas citas cubre RF-01 … RF-148 y RNF-01 … RNF-46 sin huecos.
2. **Sin invención**: ninguna FU/DU cita un requisito que no exista aquí, y ninguna introduce
   funcionalidad sin requisito que la respalde.
3. **Criterios de aceptación**: el criterio de aceptación de cada DU se redacta citando los requisitos
   que cierra y la definición de completitud del perfil (`deliverable_unit_completeness`, ver RNF-34).
4. **Requisitos no funcionales**: los RNF no se reparten por unidad, se aplican como **gate**. Cada uno
   se ancla al gate del Anexo D o al `quality_gate` del perfil que lo verifica, y se comprueba en cada
   FU/DU y de nuevo en la auditoría final.
5. **Requisitos `asumido`**: RF-32, RF-54 y RF-94 se marcan en `user_units.md` como **dependientes de
   confirmación**. Si Ricardo los corrige, se resuelven por spec-delta sin rehacer la unidad que los
   contiene. **RF-118 dejó de ser `asumido`**: D-22 fija expresamente el adaptador SMTP tras variable
   de entorno, así que ya no es una asunción de la planificación sino una condición de diseño decidida.
6. **Requisitos con umbral — ya cerrados**: RNF-20 (caducidad de URL firmada) y RNF-25 (tamaño máximo
   de subida) dejaban su número a los `design_docs` del paso 6. El paso 6 está ejecutado y los dos
   números están fijados: `api_contracts` §11.9 (15 / 10 / 30 minutos) y `data_model` §2.6 (25 MB
   `downloads`, 50 MB entregables `pdf` y `material`, 5 MB `html`, 1 MB `md`, tope duro 50 MB).
   **Ningún requisito de este documento conserva ya un umbral `[PENDIENTE]`**; lo único abierto es
   configuración, no umbral: `P-3` y `P-4` en RF-116 y RF-117, que se fijan en M0, y la **elección de
   producto** de RF-130 dentro de la categoría ya cerrada por D-43, que se hace antes de FU-05.
7. **Requisitos de secuencia**: RF-132 (compuerta de copy), RF-133 (orden de C.5 y prototipo
   interactivo) y RF-134 (formulario de descarga primero) no se cierran con una unidad: **ordenan**
   las unidades. `user_units.md` los cita en la FU correspondiente y ninguna DU de página se declara
   construible mientras una de esas compuertas siga abierta.
8. **Requisitos de extensibilidad**: RF-141 a RF-148 no construyen nada de `scope.md` § «Previsto»;
   restringen **cómo** se construye la v1. Se verifican en la revisión de la unidad que toca la
   entidad o el evento afectado, y de nuevo en la auditoría final.

### Mapa orientativo requisito → milestone (Anexo E)

| Milestone | Requisitos que cierra (principales) |
|---|---|
| **M0 Fundaciones** | RF-16, RF-18 a RF-20, RF-58 a RF-72, RF-116 a RF-118, RF-120 a RF-123, RF-128 a RF-131, RF-135 a RF-140, RF-143, RF-146 a RF-148 |
| **M1 Capa pública núcleo** | RF-01 a RF-17, RF-26, RF-132 a RF-134; gates RNF-01 a RNF-17, RNF-44 a RNF-46 |
| **M2 Conversión y contenido** | RF-21 a RF-25, RF-27 a RF-57, RF-112 a RF-115, RF-127, RF-141, RF-145; gate RNF-36 |
| **M3 HQ** | RF-51, RF-52, RF-73 a RF-87; gates RNF-19, RNF-29 |
| **M4 Portal** | RF-88 a RF-96, RF-142, RF-144; gate RNF-19, RNF-21 |
| **M5 API + go-live** | RF-97 a RF-111, RF-124 a RF-126; gates RNF-18, RNF-20, RNF-22 a RNF-28, RNF-35, RNF-37 a RNF-43 |

Este mapa es orientativo: el reparto definitivo lo fija `implementation/user_units.md` en el paso 7.

---

## Registro

- `2026-09-08` — Creado en el paso 4 de `init-project` a partir de `START_PROJECT.md` v1.1 (§4, §5.1,
  Anexos A, B, C, D, F), `AGENTS.md` v4.1, `profiles/software-app/profile.md` y las decisiones D-14 a
  D-20 de `docs/decision_log.md`. 131 requisitos funcionales, 44 no funcionales; 4 etiquetados
  `asumido` y 2 con umbral `[PENDIENTE]`.
- `2026-09-08` — Reparación tras revisión adversarial (seis defectos de gravedad alta). Añadidos:
  compuerta de copy (RF-132), secuencia de C.5 con prototipo interactivo y formulario de descarga
  primero (RF-133, RF-134), estructura de los registros de contenido por colección (RF-135 a RF-140,
  desdoblada de RF-06 y RF-19), requisitos de extensibilidad derivados de `planning/scope.md`
  § «Previsto» (RF-141 a RF-148), contrato del gesto del sheet móvil y reveals al scroll (RNF-45,
  RNF-46), y `will-change` añadido a RNF-11. Reescrita **toda** la columna «Origen» con notación
  disjunta (`§10-N` decisiones HITL · `D1`…`D12`/`D2b` gates del Anexo D · `D-14`…`D-20`
  `decision_log` · `DoD #N` · `§N` / `A.N` / `B.N` / `C.N` / `F.N`), declarada en la leyenda
  «Notación de la columna «Origen»»; se elimina así la colisión en la que `D-8` significaba a la vez
  la decisión §10-8 (RF-07) y el gate 8 (RNF-37). Totales: **148 requisitos funcionales, 46 no
  funcionales**; 4 etiquetados `asumido` y 2 con umbral `[PENDIENTE]`.
- `2026-09-08` — Sincronización con **D-21 a D-24**, posteriores a la redacción de este documento. Sin
  requisitos nuevos ni retirados: **siguen siendo 148 RF y 46 RNF**, numeración continua RF-01…RF-148
  y RNF-01…RNF-46. Cambios: **RF-02** corrige la cifra de rutas de A.2 (25 **filas** de tabla, **27
  rutas** en ES: la fila del blog aporta dos y la fila legal, dos); **RF-116** nombra Resend y el
  subdominio de envío verificado; **RF-117** deja de afirmar que el remitente es
  `support@softlandingglobal.com` y exige lo que sí es requisito —dominio verificado con SPF/DKIM/DMARC
  alineados y respuestas a `support@`— dejando la dirección remitente visible como `P-3`
  `[PENDIENTE]`; **RF-118** pasa de `asumido` a `explícito` y exige adaptador SMTP estándar (D-22);
  **RF-124** nombra Cloudflare R2 y sustituye cualquier supuesto de inmutabilidad por las mitigaciones
  de R-37 (credencial de solo escritura, purga con credenciales distintas, retención por generaciones);
  **RF-125** exige restauración verificada **desde una copia antigua**; **RF-131** añade la restricción
  DNS de D-23/D-24 (MX de Outlook y TXT de la raíz intocables; registros de envío solo bajo el
  subdominio). Actualizados también la leyenda de «Origen» (`D-14`…`D-24`, más `P-3`/`P-4`), la
  convención de productos —las dos categorías abiertas están cerradas— y el punto 5 de Trazabilidad
  (los `asumido` quedan en RF-32, RF-54 y RF-94). Revisado D-16: RF-32 a RF-35 ya lo reflejan y no
  requieren cambio.
- `2026-09-08` — Sincronización con los `design_docs` del paso 6, ya escritos. Sin requisitos nuevos
  ni retirados: **siguen siendo 148 RF y 46 RNF**. **RNF-20** cierra su umbral con los valores de
  `api_contracts` §11.9 (15 / 10 / 30 minutos, leídos de configuración); **RNF-25** cierra el suyo con
  los de `data_model` §2.6 (25 MB `downloads`, 50 MB entregables `pdf` y `material`, 5 MB `html`,
  1 MB `md`, tope duro 50 MB): **ya no queda ningún RNF con umbral `[PENDIENTE]`**. **RF-50** deja de
  ser ambiguo sobre la relación entre las cinco esperas y los cinco intentos —cada espera precede a su
  intento, no hay intento inmediato previo y los cinco escalones se usan— citando `api_contracts` §8.1,
  que resolvió la contradicción declarada en `architecture` §15.2. Actualizado el punto 6 de
  Trazabilidad. Revisado el remitente: fuera de RF-117, ningún requisito exige
  `support@softlandingglobal.com` como dirección **remitente**; RF-50, RF-53 y RNF-36 lo citan como
  **destinatario** del aviso, que es lo que `api_contracts` §8.1 confirma, y no requieren cambio.
- `2026-09-08` — Sincronización con **D-43, D-44 y D-45**. Sin requisitos nuevos ni retirados: **siguen
  siendo 148 RF y 46 RNF**. **RF-130** deja de ser una frase genérica y precisa lo que D-43 decide: el
  monitor es un servicio de uptime dedicado con tramo gratuito que se ejecuta **fuera del VPS**, vigila
  al menos `softlandingglobal.com` y `staging.softlandingglobal.com` y **avisa por un canal que no
  dependa del VPS**; n8n queda como monitor **secundario**, y el producto concreto es el único
  `[PENDIENTE]`, elegido con 2–3 candidatos antes de FU-05. Actualizados la leyenda de «Origen»
  (`D-14`…`D-45`), la fuente del frontmatter, la convención de productos —con la excepción declarada de
  la monitorización externa: categoría cerrada, producto abierto— y el punto 6 de Trazabilidad. **D-44**
  (anillo de foco de dos capas) y **D-45** (visor desde origen separado) **no añaden ni retiran
  requisitos**, y se propagan a `implementation/user_units.md`: D-44 es la forma concreta de cumplir
  RNF-05 y el gate D2, que ya exigían foco visible con contraste, y se fija en FU-02 y se verifica en
  FU-10; D-45 eleva a **norma** el origen separado del visor, que RF-90 y RNF-21 describen hoy solo como
  `iframe` con `sandbox` y CSP estricta «sin acceso a la sesión de la aplicación anfitriona» — el
  sandbox y la CSP **se mantienen** como defensa en profundidad y la norma se construye en DU-19.
  Se declara la desviación: si se quiere que RNF-21 nombre literalmente el origen separado, es un
  spec-delta de una línea, no una reescritura.
