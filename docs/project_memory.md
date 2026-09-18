---
type: docs
title: Project memory
project: slg_website
status: execution
timestamp: 2026-09-12
---

# Project memory — slg_website

> **Punto de retomada en una línea:** **la capa pública está construida.** Dieciséis unidades tocadas
> — **once `done`** y cinco `in_progress`. 58 rutas: portada, los cuatro overviews, las 22 páginas de
> servicio, el blog completo y los legales, en los dos idiomas y todas prerrenderizadas. Lighthouse
> móvil ya medido: **100 de accesibilidad en las tres páginas**. Lo siguiente es **DU-06** (Doctrina,
> Nosotros y legales con sus rutas del A.2) o **DU-07/DU-08** (biblioteca de descargas y la máquina
> del formulario). Lo que falta de Ricardo está en `docs/handoff.md`.

## Caducidades que hay que vigilar (R-03, R-14)

**Aquí no hay ni un valor, solo fechas.** Una credencial que caduca sin avisar deja el sitio a medias
de la peor forma: todo funciona menos una cosa, y nadie relaciona lo uno con lo otro.

| Qué | Caduca el | Dónde se rota | Quién avisa |
|---|---|---|---|
| Secreto de cliente de **Microsoft Entra** (`MICROSOFT_CLIENT_SECRET`) | `[PENDIENTE: fecha — se anota al crearlo]` | `README.md` → «Rotar el secreto de Microsoft» | Nadie automáticamente: **por eso está escrito aquí** |
| Credencial de **Google** (`GOOGLE_CLIENT_SECRET`) | No caduca por sí sola | Google Cloud → Credenciales | — |
| **Claves de API** del sitio | Cada una la suya, elegida al crearla | `/hq/claves` | La pantalla las muestra con su fecha |

**Cuando Ricardo cree o rote el secreto de Entra, la fecha se escribe en esta tabla en el mismo
cambio.** Es el requisito R-03, y la razón de que viva en la memoria del proyecto y no en un
calendario personal: quien abra una sesión dentro de un año tiene que poder verlo sin preguntar.

## Lo que espera a Ricardo, y solo a él
1. **Despliegue** — `docs/deployment.md` §3 a §5. Cierra FU-05 (criterios 1, 2, 3 y 8).
2. ~~**P-3 y P-4**~~ — **cerradas el 2026-09-12**: `no-reply@mailweb.softlandingglobal.com` sobre
   `mailweb.softlandingglobal.com`, `Reply-To` a `support@softlandingglobal.com`. EXT-6 cerrada.
3. ~~**Registros del subdominio**~~ — **hechos**: `mailweb.softlandingglobal.com` verificado el
   2026-09-11. Falta la credencial SMTP en Easypanel, **no crear el subdominio de tracking** y la
   prueba de bandeja en tres buzones (`docs/deployment.md` §4bis). Cierran FU-08.
4. **Los dos buckets `downloads` y `deliverables` en el servicio `minio`, los dos PRIVADOS**, y las
   seis variables `S3_*`. Es lo único que le falta a FU-09.
5. **F.2-2 y F.2-3** — consentimiento OAuth de Google y registro de aplicación en Entra ID. Son las
   dos últimas dependencias externas de M0 y bloquean **DU-01**.

## Current state
- **Fase**: **ejecución**. Compuerta de Planificación **abierta** (Ricardo, 2026-09-08).
- **active_profile**: `software-app` (`profiles/software-app/profile.md`) — D-14.
- **Contrato de entrada**: `START_PROJECT.md` v1.1, fase *Specify* de SDD.

## Última unidad completada
- **FU-01** — copy maestro (2026-09-12), `in_progress` con la **compuerta ABIERTA**: el esqueleto
  bilingüe está completo (71 registros) y los frenos construidos; **el copy es de `SLG_Overhauling`**.
- **DU-01** — acceso, sesión y recuperación (2026-09-12), `in_progress`: siete de los nueve criterios
  cerrados con **39 comprobaciones** contra el servidor real; los dos que faltan esperan los registros
  de OAuth. **Es la primera cosa que un consumidor puede hacer de punta a punta.**
- **FU-07** — servicio de invitaciones (2026-09-12). Los cinco criterios verificados con **34
  comprobaciones** contra PostgreSQL y SMTP reales.
- **FU-08** — adaptador de correo (2026-09-12), `in_progress`: el código está cerrado y verificado con
  **95 comprobaciones contra SMTP real**; falta dominio verificado y tres buzones.
- **FU-06** — módulo de identidad y autorización (2026-09-12). `lib/auth/` es el único sitio que sabe
  de sesión, rol, empresa y clave. Los siete criterios verificados; la frontera del módulo es un freno
  de CI, no una promesa de revisión. **53 comprobaciones** contra PostgreSQL real y **214** sobre la
  matriz B.3.
- Antes: **FU-04** — capa de datos (2026-09-08). 19 tablas, aislamiento verificado por comportamiento.

## Unidad en curso
- **FU-05** — despliegue, CI, DNS y documentación de entorno. **`in_progress` desde 2026-09-12.**
  - **Cerrado y verificado en el repositorio**: criterios **5, 6, 7 y 9**.
    - Pipeline `.github/workflows/ci.yml`: 4 jobs (gates, escáner de secretos dedicado, datos con
      PostgreSQL real, y la guarda que impide que `main` reciba nada que no haya pasado por `develop`).
    - Los frenos del criterio 4 con **prueba negativa ejecutada**: `npm run check:brakes`. **El
      número no se escribe aquí**: lo imprime el script, que es quien lo sabe. Esta línea decía
      «seis» cuando ya eran treinta y cinco, y lo encontró la revisión final.
    - Cabeceras de seguridad y compuerta de staging comprobadas **sobre el servidor real**, no sobre
      `next.config.ts`: `npm run check:runtime`, 19 comprobaciones.
    - `middleware.ts`: compuerta de staging con comparación en tiempo constante; `/api/health` fuera
      de ella a propósito (D-51).
    - `.env.example`: 42 variables, cero valores, y el gate falla también si el código lee una que no
      está declarada.
    - `scripts/ci/check-dns.sh`: modo línea base y modo verificación, nombre por nombre.
  - **Falta, y es de Ricardo, no de decisión**: criterios **1, 2, 3 y 8** — los cinco servicios de
    Easypanel, los dos webhooks de despliegue, los tres registros DNS nuevos y la prueba de aviso del
    monitor. **Paso a paso completo en `docs/deployment.md`.**

## Próxima unidad
- **DU-06** — Doctrina, Nosotros y `/legal/*`. Ojo: el Anexo A.2 los quiere en `/legal/privacidad` y
  `/legal/terminos`, y hoy están en `/legal-privacidad` y `/legal-terminos`. **Esa corrección es de
  DU-06**, igual que DU-04 corrigió las de la oferta.
- **DU-07 y DU-08** — biblioteca de descargas y **la máquina del formulario**: validación de correo
  corporativo, entrega por enlace firmado y captura al CRM. Hoy la sección 5 de cada servicio
  anuncia el documento y enlaza; su motor es DU-08.
- **DU-14 NO es analítica** —es empresas, proyectos y usuarios en HQ, y depende de DU-13 (M3)—. La
  analítica sin cookies está en **DU-12**, junto con los webhooks firmados, y depende de DU-09.

## Los materiales se piden POR GRUPOS, y eso **es** el criterio (DU-20)
`lib/portal/materiales.ts` tiene una sola función que consulta, `materialesPorProyecto()`, y devuelve
`{ proyecto, materiales }[]`. **No hay ningún tipo en el que quepa un material suelto**, y por eso
«no existe ruta ni entidad que liste materiales fuera del proyecto que los contiene» es cierto sin
vigilar ninguna pantalla. Si alguna vez hace falta «solo la lista», la respuesta no es añadir un
export: es preguntarse qué pantalla la quiere y por qué no puede enseñar el proyecto.
`separarMateriales()` es el reparto compartido por las dos pantallas — no se repite con `filter`.

## «Esto no es un LMS» es una frontera con freno, no una frase (DU-20)
`check:alcance` mira `lib/`, `app/` y `drizzle/` —nunca `content/`, donde «progreso» es el negocio de
SLG— y frena tres cosas: vocabulario de formación en el modelo, selección por el tipo `material`
fuera de su módulo, y `membership` con columnas de expediente. La razón de que exista: esa frontera
**se cruza con buena intención y de una línea en una** (un «visto», un porcentaje, una cohorte) y
ninguno de esos pasos parece el paso. La otra mitad la sostiene la base: el índice parcial
`uq_membership_una_empresa_cliente` (migración 0013) impide que una persona cuelgue de dos empresas
cliente, que es por donde `membership` se convierte en matrícula.

## La matriz tiene dos filas que B.3 no tiene, y están marcadas (DU-21)
`member.read` y `profile.self`. B.3 es una matriz de **privilegio sobre lo ajeno**; ver quién más está
en tu propia empresa y editar tu propio nombre no lo son, y aun así necesitan acción porque FU-12
exige que **toda sección declare la suya**. Las dos llevan `filaB3` empezando por «(derivada…)»: si
alguna vez hay que cotejar la tabla con el brief, se ve de un vistazo cuáles salen de él y cuáles no.
La consecuencia práctica: **la sección «Miembros» la ve `client_member`**, y lo que no ve es el
formulario de invitar. Ver y poder son dos cosas — y cambiar eso obligó a reescribir dos pruebas que
afirmaban lo contrario.

## Al invitar desde el portal, la empresa NO es un parámetro (DU-21)
`lib/portal/miembros.ts::invitarMiembro()` no acepta `organization_id`; `lib/hq/usuarios.ts::invitarACliente()`
sí, porque un operador de SLG invita a empresas que no son la suya. Son dos puertas a propósito. Si
algún día hace falta que el portal invite «a otra empresa», la respuesta no es añadir el parámetro.

## La Sesión Cero no se puede nombrar fuera del portal (DU-21)
`check:alcance` frena cualquier mención de la Sesión Cero fuera de `app/(portal)/` y `lib/portal/`, y
por eso su componente vive **colocado con la pantalla** en vez de en `components/` — un componente
compartido sería el primer sitio desde el que colarla a una página pública (RF-96). La URL es la clave
`portal.sesion0.url` de `content/ui`, **vacía a propósito**: la cadena vacía es el estado declarado de
«todavía no» y el paso degrada a «Próximamente». Solo se acepta `https:`.

## Quién cruza empresas está en la POLÍTICA, y ahora son tres (DU-22)
`slg_admin`, `slg_operator` y **`agent_slg`** — la marca que `withScope` pone cuando el contexto es de
una clave de API verificada **sin** `organization_id` (migración 0015, **D-137**). Ni `agent` (clave
acotada a una empresa) ni `system` (`withSystemScope`) cruzan, y `test:api` lo comprueba **contra la
política**, no a través de HTTP. Si algún día hace falta que algo más cruce, el sitio donde se decide
es esa lista, no un `if` en un caso de uso.

## El armazón de `/api/v1` está en `lib/api/`, y ninguna ruta repite su trabajo (DU-22)
`manejador.ts` hace lo que toda ruta hace igual: autenticar (401), cobrar el límite (429, **antes**
que el alcance por D-39), exigir el alcance (403 sin decir cuál faltaba), auditar **y** poner
`X-Request-Id`, `RateLimit-*` y `Cache-Control: no-store`. Una ruta nueva escribe su validación de
entrada y su consulta; lo demás no puede olvidarlo porque no lo escribe.
El `request_id` de toda respuesta **es** el `audit_log.id` de esa llamada: por eso la auditoría se
escribe antes de responder.

## La API se declara una vez, en `lib/api/catalogo.ts` (DU-22 · DU-23)
Las nueve rutas, con sus parámetros, sus campos de cuerpo y sus códigos. **El validador lo aplica y
`GET /openapi.json` lo describe**: no hay dos textos que puedan discrepar, que es la razón por la que
el contrato pedía generarla y no escribirla. Añadir una ruta es añadir una entrada y su archivo en
`app/api/v1/`; `buscarRuta()` lanza si la ruta no está declarada, así que el fallo sale al arrancar.
El alcance de cada ruta **se lee de B.3** (`alcanceDe`), no de una lista aparte.

## Paginar por cursor con `timestamptz` exige truncar los dos lados (D-141)
PostgreSQL guarda microsegundos; JavaScript llega a milisegundos. Un cursor construido desde un `Date`
ya viene truncado, y comparado contra la columna sin truncar **se salta las filas creadas dentro del
mismo milisegundo**. El orden y la comparación usan `date_trunc('milliseconds', created_at)` los dos.
Si alguna colección nueva pagina por fecha, usa `ordenDeColeccion()` y `despuesDelCursor()` de
`lib/api/cursor.ts` en vez de escribir el `ORDER BY` a mano.

## Las copias se cifran con clave pública, y la privada NO está en el servidor (FU-14)
`lib/backup/cifrado.ts`: X25519 + AES-256-GCM. En el VPS vive `BACKUP_PUBLIC_KEY`, que **solo cifra**;
`BACKUP_PRIVATE_KEY` se define únicamente en la sesión donde se restaura. Si alguna vez alguien
propone «poner la privada en el servidor para automatizar la restauración», eso **anula la unidad
entera**: quien entre en el servidor podría leer todas las copias.
Las tres operaciones —copiar, restaurar, purgar— **no listan el bucket**: las claves se calculan de
generación y fecha (`lib/backup/generaciones.ts`). Y hay **dos credenciales**: la del servidor no
puede borrar, y esa es la mitigación de que R2 no ofrezca Object Lock (R-37).

## Los trece gates del Anexo D viven en `docs/gates.md`, no en la cabeza de nadie (DU-25)
Cada uno con qué exige, **cómo se comprueba** —un comando, o pasos numerados cuando depende de una
persona— y su prueba negativa. `check:anexo-d` vigila que estén los trece, que ninguno se quede en
prosa, que todos declaren su estado y que **cada `npm run …` que nombran exista**: un gate que apunta
a un script inexistente parece cubierto y no lo está.
Al cerrar M5: **seis en verde y siete esperando algo que no es código** — despliegue, los dos
registros de OAuth, el CRM real, o una persona haciendo algo y anotando el resultado.

## El DoD #10 se mide sobre lo que el sitio SIRVE, no sobre `content/` (D-148)
`check:produccion` recorre las 68 rutas públicas del servidor real y lee su texto visible. Existe
porque `content/` es de donde sale **casi** todo el texto: un marcador que entra por `content/ui`, por
una plantilla o por un valor por defecto de un componente no está ahí. Si algún día se comprueba algo
«en producción», compruébalo **contra la respuesta de esa ruta** y con `redirect: "manual"` — seguir
la redirección fue el primer fallo de este mismo gate, y le hizo decir que HQ era pública.

## El mapa de rutas vive en `lib/content/rutas.ts`, y es EXPLÍCITO
Cada página y cada servicio declara su ruta ES y su par EN (**D-79**). No se deriva del nombre del
archivo: el Anexo A.2 anida la oferta (`/ai/academy/phoenix-peex`) y `/holdings` lo sirve un registro
de **servicio**, no de página (**D-80**). Para añadir un servicio: su fila en `SERVICIOS`, su `.md` en
los dos idiomas, y ya está — la ruta, el overview y el par de idioma salen solos.

## El orden de los bloques está en el contenido, no en el componente
La portada pide sus siete bloques y cada servicio sus seis **por posición** al cuerpo del `.md`
(**D-81**). Si editas un `.md` y borras o mueves un `## `, la página cambia — y `check:paginas` te
lo dice en el mismo push.

## El copy: qué hay y qué falta
**74 registros con `copy: temporal`** (D-75). `check:copy` los lista en cada ejecución. Pasar uno a
`copy: aprobado` es lo que registra la firma de Ricardo.

**Las cuatro cosas que NO se inventaron** y siguen esperándole: las once dimensiones de
`SLG_Readiness`, las tres promesas de `CoO as a Service`, las tres líneas de `SLG_Holdings` y qué
distingue a `Phoenix PEEx`, `TEAx` y `RETx`. En los cuatro sitios el texto describe la forma del
servicio sin inventar su contenido. Detalle en `docs/work_log.md`.

## El mapa de rutas, que cambió en DU-02
`/ai` · `/holdings` · `/doctrina` · `/blog` · `/nosotros`, y sus pares bajo `/en` (D-71). Antes eran
`/slg-ai` y dos rutas que **no existían**. La portada es `/` y `/en`; `/home` y `/en/home-en` ya no
se sirven. El par de idioma de cada ruta sale del campo `pair` del frontmatter, vía
`lib/content/rutas.ts`.

## El esqueleto de contenido, de un vistazo
- **71 registros**: 22 `service` (las once páginas × 2 idiomas, con los seis bloques de A.3), 22
  `page`, 22 `download` en `coming-soon`, más blog y doctrina.
- **Cada hueco lleva su marcador con dueño**: `[PENDIENTE: copy maestro FU-01 — …]`. En staging son
  obligatorios; en `main` los rechaza `check:pending --strict`.
- **`check:copy` (D-65)** veta «Sesión Cero», agendas y cualquier cifra, premio o superlativo sin
  `[fuente: …]` en la misma línea.

## Lo que hay que saber del acceso antes de tocarlo
- **No existe registro público** (D-62). `POST /api/auth/sign-up/**` devuelve **404** desde el
  middleware. La única vía a una cuenta es `/api/acceso/invitacion`.
- **Los manejadores de formulario son nuestros, no de la librería**: el mensaje neutro, el bloqueo
  progresivo y el funcionar sin JavaScript no se delegan.
- **Cero JavaScript de cliente** en las pantallas de acceso. El presupuesto del gate D1 va al 89 %.
- **Aceptar una invitación verifica el correo** (D-63) y **restablecer cierra todas las sesiones**
  (D-64).

## Lo que hay que saber de `lib/files/` antes de tocarlo
- **El puerto no tiene `listar` ni `firmarPermanente`.** No es que nadie las llame: no existen. Esa
  ausencia ES el gate D10.
- **La validación ocurre antes de emitir la firma**: sin firma no hay escritura, así que rechazar ahí
  es rechazar antes de que se escriba un byte.
- **Las tres caducidades salen de variables de entorno** (D-60), con defectos en `lib/db/limits.ts` y
  tope de 60 minutos. Estuvieron intercambiadas hasta FU-09.
- **La lista de MIME de `material` es cerrada** (D-61): sin ejecutables, sin comprimidos y sin SVG.

## Lo que hay que saber de `lib/invitations/` antes de tocarlo
- **Se escribe con el contexto de quien invita**, nunca como sistema: la política de fila de
  `invitation` hace cumplir la pertenencia ella sola. El código que lo intentó como sistema fue
  rechazado por PostgreSQL, y la base tenía razón.
- **El testigo solo existe en el correo.** En la base está su hash. Revocar o caducar lo borra.
- **Reenviar emite un testigo nuevo** (D-57): el viejo deja de servir.
- **Tres reglas de B.3 que no caben en un `CHECK`**: un `client_admin` no invita a otra empresa, no
  concede roles de SLG y no invita a la organización `slg`. Las tres responden **404**.

## Lo que hay que saber de `lib/mail/` antes de tocarlo
- **Una puerta pública**: `@/lib/mail`. `nodemailer` vive solo en `smtp.ts`; importarlo fuera pone el
  CI en rojo (`check:fronteras`).
- **Las variables son de transporte, no de marca** (D-55). No hay `<PRODUCTO>_API_KEY` y esa ausencia
  es la decisión: el proveedor se configura con su servidor y su clave en `MAIL_SMTP_*`.
- **Los correos con enlace no se reintentan** (D-56): su token no se guarda, así que reintentar es
  **reemitir**, y eso es de FU-07 y DU-01.
- **El barrendero existe pero nadie lo arranca**: el intervalo lo fija DU-09 (< 60 s). Hoy la cola se
  barre a mano.

## Lo que hay que saber de `lib/auth/` antes de tocarlo
- **Dos puertas públicas, no una**: `@/lib/auth` (servidor) y `@/lib/auth/edge` (middleware, donde no
  existen ni la instancia ni PostgreSQL). Entrar por un archivo interno rompe el build de CI.
- **La matriz B.3 vive una sola vez**, como datos, en `lib/auth/roles.ts`. Añadir una acción es añadir
  una fila; la prueba la recorre entera y falla si queda una celda sin decidir.
- **Dos funciones `SECURITY DEFINER`** (D-53) son la única vía a `membership` y `api_key` sin contexto
  de empresa. No se amplían: cada una contesta una pregunta.
- **`SUPERFICIES_ABIERTAS`** en `roles.ts` mantiene `/hq` y `/portal` en 404 mientras M3 y M4 sigan
  abiertos (RF-87). Se abren cambiando la constante, no borrando la comprobación.

## Cómo se verifica todo, de un vistazo
| Necesidad | Comando |
|---|---|
| Pipeline entero en local | `npm run check:ci` |
| Que los frenos sigan frenando | `npm run check:brakes` |
| DNS tras cualquier cambio de zona | `npm run check:dns` (antes: `npm run check:dns:baseline`) |
| Aislamiento entre empresas | `npm run test:db` (necesita PostgreSQL) |
| Que el portal no se esté volviendo un LMS | `npm run check:alcance` |
| La API de agentes: 401, 403, 429, alcances y auditoría | `npm run test:api` (necesita el build) |
| Que las copias se puedan **restaurar** | `npm run test:respaldos` (necesita PostgreSQL) |
| Que el manual y el índice sigan completos | `npm run check:literacy` |
| Que el sitio no SIRVA un marcador ni una cifra sin fuente | `npm run check:produccion` (necesita el build) |
| Que los trece gates del Anexo D sigan siendo verificables | `npm run check:anexo-d` |
| Las cuatro cláusulas del sheet, cuadro a cuadro | `npm run test:gesto` (necesita el build y Chromium) |
| El armazón público sobre el servidor real | `npm run check:armazon` (necesita el build) |
| Que la zona DNS no se ha movido | `npm run check:dns` (ya no necesita `dig`) |
| El blog: borradores, etiquetas y RSS | `npm run check:blog` (necesita el build) |
| Portada, overviews y páginas de servicio | `npm run check:paginas` (necesita el build) |
| Rendimiento y accesibilidad, en móvil | `npm run check:lighthouse` (necesita el build y Chromium) |

## Entorno local
- `docker-compose.yml` levanta `slg-db` (PostgreSQL 16) en el **puerto 5434**. El 5432 lo ocupa la
  base de datos del CRM y el 5433 otro proyecto: no se tocan.
- **Dos roles, dos cadenas de conexión** (D-47): `slg` migra, `slg_app` sirve. Apuntar `DATABASE_URL`
  al dueño **desactiva todo el aislamiento**, y `test:isolation` falla si alguien lo hace.
- Credenciales en `.env`, ignorado por git. `.env.example` documenta solo los nombres.
- Migraciones en `drizzle/`: `0000` generada; `0001`, `0002` y `0003` escritas a mano (drizzle-kit no
  genera políticas de fila ni disparadores).

## Stack: cerrado. Todas las elecciones de producto, hechas
Detalle y justificación en `docs/decision_log.md`. **No se re-exploran.**

- Correo transaccional: **Resend** (D-22), tras adaptador SMTP por variable de entorno (D-36).
- Backups: **Cloudflare R2** (D-21), contra API S3 genérica.
- Correo corporativo: **se queda en Microsoft 365** (D-23). Los MX de Outlook no se tocan.
- **Subdominio de envío dedicado** (D-24): el SPF de la raíz no se toca.
- Monitorización externa: **UptimeRobot** (D-49), fuera del VPS. n8n queda como señal **secundaria**.
- Anillo de foco de dos capas (D-44) · visor de entregables desde **origen separado** (D-45).

## Decisiones fijadas (no re-explorar)
- 13 HITL de Ricardo en `START_PROJECT.md` §7 y §10 · **D-14…D-24** · **D-25…D-42** (las que tomaron
  los `design_docs`; D-26 y D-27 marcadas **[IRREVERSIBLE-TRAS-FU-04]**, y FU-04 ya corrió) ·
  **D-43…D-46** · **D-47…D-51** (ejecución) · **D-52…D-54** (FU-06: sin plugin `apiKey`, funciones
  `SECURITY DEFINER` estrechas, `invitation.token_hash` opcional) · **D-55…D-56** (FU-08: variables de
  transporte y no de marca; los correos con enlace no se reintentan).

## Blockers
- **Ninguno de decisión.** Lo que falta de FU-05 es acceso a paneles, y tiene runbook.
- **De Ricardo, para cerrar FU-05**: ejecutar `docs/deployment.md` §2 a §5.
- **Abiertas sin bloquear**: **P-3 y P-4** (dirección remitente y nombre del subdominio de envío), se
  fijan en M0 antes de FU-08 · **EXT-8** (nombre del subdominio del visor), antes de DU-19 ·
  **F.2-1…F.2-6**, dependencias externas listadas en el tracker.
- **S-01**: **diferida a go-live** (D-49). La credencial afectada es de construcción, no de
  producción, y **no se reutiliza en ningún entorno desplegado**. La rotación sigue siendo requisito
  de go-live.
- **Cerradas, no reabrir**: ~~P-5~~ (D-43) · ~~CF-3~~ (D-44) · ~~CF-4~~ (D-45) · ~~EXT-7~~ (D-49) ·
  ~~H-04~~ (D-48) · ~~CF-1~~ (D-50, y con ella **DU-16 deja de esperar un spec-delta**).

## El presupuesto de JS, y por qué ya no asusta
Iba al **89 %** (133,9 KB de 150 KB) con la portada vacía, y la duda era qué pasaría al entrar FU-10.
Respuesta medida: **no se movió ni un byte**. Siete de los nueve componentes son de **servidor**, y
los dos que no —formulario y sheet— viven en rutas que ya cargaban React. La regla que lo mantiene
así: **`"use client"` solo donde hay gesto o estado**, y el resto en `components/piezas.tsx`.

## Lo que hay que saber de la CSP antes de tocarla
**Hay dos políticas, y no es un descuido (D-68).** Las páginas prerrenderizadas llevan
`script-src 'self' 'unsafe-inline'`; las dinámicas —`(auth)`, `(hq)`, `(portal)`, `/api`— llevan
**nonce nuevo por petición + `'strict-dynamic'` y sin `'unsafe-inline'`**. Las dos se emiten desde
**`middleware.ts`**, nunca desde `next.config.ts`: una cabecera declarada allí es la misma para todas
las peticiones y no puede llevar un nonce. **Si alguien vuelve a declarar la CSP en `next.config.ts`,
las dos políticas se intersecan y el sitio deja de hidratar**: se ve y no funciona. `check:runtime` lo
comprueba sobre el servidor real.

## Por qué hay un borrador permanente en el blog
`content/blog/es/market-fracking.md` está en `status: draft` **a propósito** (D-78). El criterio 2 de
DU-11 —«un borrador no se sirve en ninguna parte»— solo se comprueba si existe un borrador; al
publicar el único que había, el freno pasó en verde sin ejecutar ninguna de sus tres comprobaciones.
**No lo publiques por limpieza.**

## Por qué los frenos barren también lo NO versionado
`git ls-files` **no ve un archivo sin `git add`**. FU-10 pasó `check:ci` en verde contra sus propios
archivos nuevos sin versionar, y al hacer commit dos frenos se pusieron rojos: el CI habría fallado en
el primer push de una unidad dada por terminada. Los cinco frenos que barren el repositorio usan ahora
`--cached --others --exclude-standard` (**D-74**). **Si añades un freno nuevo, cópialo de ahí.**

## Lo que se puede hacer con código no se le pide a una persona
`docs/deployment.md` mandaba a la consola de PostgreSQL y a la de MinIO a hacer tres cosas que la API
hace sola. Ahora las hace `/api/ops` con dos botones (**D-123**), y el documento solo pide **pegar
valores en Easypanel**. **Antes de escribir un paso a paso, pregúntate si el paso puede darlo el
código.** Y si el paso a paso menciona una herramienta, di **dónde está**: «en la consola de X» no es
una instrucción para quien no sabe que X tiene consola.

## Una página de diagnóstico NO puede devolver 500
`/api/ops` existe para arreglar una infraestructura a medias: es normal que falten variables, y ahí
es cuando más falta hace saber **cuál**. Cualquier cosa que se escape se pinta como fila roja con el
motivo (**D-125**). Lo mismo vale para `asegurarBuckets()`: `clienteS3()` lanza si faltan variables,
y esa función existe justo para cuando faltan.

## `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` YA son credenciales S3 válidas
No hace falta entrar a la consola de MinIO a crear una clave de acceso para arrancar: esos dos
valores, copiados del servicio `minio` a `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY` de `slg-web`,
funcionan. Crear una clave aparte es más limpio y se puede hacer después.

## `withSystemScope` NO abre las tablas con `organization_id`
Fija `app.actor_role = 'system'`, y la política de fila solo deja pasar a `slg_admin` y
`slg_operator`. Así que una consulta de sistema sobre `announcement`, `deliverable`, `project` y
compañía **devuelve cero**, no todo. Lo descubrió el primer fixture negativo de FU-13, que no
filtraba nada (**D-122**). Úsalo para tablas sin empresa —colas, capturas anónimas, auditoría—; para
leer datos de una empresa hace falta el contexto de alguien de SLG.

## La fuga que la política NO para: el contexto construido desde la petición
Si alguien fabrica el `AuthContext` con un `organization_id` que llega en la URL, la política de fila
hace su trabajo **para la empresa equivocada** y no hay nada raro que ver desde dentro de la base. Es
lo que RF-71 prohíbe y lo que `test:aislamiento` atrapa **arriba**. **El `organization_id` sale
siempre de la sesión.**

## `error.tsx` importa JSON, y todo lo que importe pesa en CADA página pública
Un límite de error **tiene que ser** componente de cliente (D-85), así que importa las cadenas del
JSON directamente. Con un solo `content/ui/<lang>.json`, **cada cadena nueva de HQ o del portal
viaja al navegador de alguien que solo entra a leer el blog**: `check:js-budget` se puso rojo al
pasar de 150 KB después de que M3 añadiera 150 cadenas. Las siete de la 404 y la 500 viven ahora en
`content/ui/error.<lang>.json` (**D-120**). **No vuelvas a importar el archivo grande desde un
componente de cliente.**

## El Markdown acota el esquema de los enlaces, y la regla vive fuera del JSX
`lib/content/markdown-seguro.ts` decide qué `href` se pinta: `http`, `https`, `mailto` y relativos, y
nada más (**D-119**). Está fuera del componente porque **un script de Node no puede cargar un
`.tsx`**, y una regla de seguridad que solo se prueba abriendo un navegador se prueba poco. Se
comprueba con `new URL()` y no con `startsWith`: sin normalizar, `JavaScript:` y ` javascript:`
pasan.

## El registro de auditoría apunta también los INTENTOS
`conAuditoria()` envuelve toda escritura de HQ y, cuando la autorización la para, apunta la acción
con el sufijo `.denied` (**D-106**). Un registro de solo éxitos no contesta «¿alguien ha estado
probando puertas?». **Si añades una escritura, envuélvela**; y no apuntes como rechazo un error que
no sea `ErrorDeAutorizacion`, o la consulta por `.denied` se llena de ruido.

## `audit_log` rechaza el DELETE incluso al usuario dueño
Un disparador de la migración 0003 lo hace inmutable (RNF-29). Una prueba **no puede limpiar sus
propios apuntes**: cuenta desde un instante inicial (`created_at >= DESDE`) en vez de en absoluto.
Lo aprendió `test:gestion` chocando contra él.

## Una prueba nunca borra datos que no ha creado
`test:gestion` usaba «Cliente Demo» —el nombre del criterio 1 de DU-14— y su slug **choca con el de
`db:seed`**: la limpieza se llevaba por delante los datos de desarrollo y murió contra la clave ajena
de un entregable sembrado. Los datos de prueba llevan sufijo de unidad (`…-du14`) y la limpieza
borra solo por esos identificadores.

## Vacío y error NO se pintan igual, y por eso un bloque no devuelve un array vacío
En el tablero de HQ cada bloque devuelve **o datos o motivo** (`Bloque<T>`, **D-101**). Si devolviera
un array vacío en los dos casos, el día que el CRM falle la pantalla diría «todavía no hay nada»: una
mentira tranquilizadora, y además el estado canónico equivocado de los seis de FU-12. **Si escribes
un bloque nuevo, distingue las dos cosas en el tipo**, no en el componente.

## Dos claves del CRM, y la de lectura no es opcional
`CRM_API_KEY_CAPTURE` escribe y `CRM_API_KEY_READ` solo lee (RF-56, **D-102**). Leer con la de
captura **funciona igual de bien** — ese es el problema: el fallo aparece el día que hay que revocar
la de lectura y se descubre que apaga también la captura de leads. `check:hq` lo comprueba, y
`sanear()` borra las dos de cualquier texto que salga.

## Un servidor viejo escuchando en el puerto hace parecer que el build no cambia
Pasó en FU-12 y costó una hora: una ejecución anterior del navegador dejó vivo el
`.next/standalone/server.js` en su puerto; el arranque nuevo falló en silencio por EADDRINUSE y
cada medida siguió leyendo la versión vieja. Se reconstruyó tres veces, se borró `.next` entero, y
la página seguía «sin cambiar». **Antes de medir con el navegador: `pkill -f standalone/server.js`.**
Si algo no cambia por más que reconstruyas, sospecha del proceso, no del build.

## Una compuerta de revisión puede estar enseñando otra cosa
`/prototipo` —la compuerta de los nueve componentes de C.5, aprobada en FU-10— vivía dentro del
grupo `(auth)`, que centra a sus hijos en una tarjeta de **26 rem**. Todo se revisó a **416 px de
ancho**. Los componentes de una columna aguantaban; el armazón de aplicación y el visor de
entregables **nunca se habían visto a su tamaño** (**D-100**). **Si una pantalla existe para un
ancho, revísala a ese ancho** — y comprueba en qué layout cae antes de fiarte de lo que ves.

## Permiso sobre un dato ≠ superficie donde vivir
`slg_admin` puede leer avisos y entregables, así que filtrar la navegación solo con `puede()` le
pintaba el **portal de cliente entero** en la barra lateral — enlaces a pantallas que el layout
después rechaza. La navegación filtra **primero por superficie** (`superficieDelRol`) y luego por
permiso (**D-98**). Lo cazó `test:shell` en su primera ejecución.

## Un fixture negativo servido como `file://` puede mentir
Chromium **no guarda cookies de un origen `file://`**. La prueba negativa de `check:terceros` —una
página que carga un script de terceros y escribe `_ga`— salía roja por las peticiones y **verde por
las cookies**: la mitad del medidor no se había ejecutado nunca y la prueba negativa la daba por
buena (**D-95**). El fixture se sirve ahora por HTTP desde el propio freno. **Si escribes un fixture
negativo que dependa de tener origen —cookies, `localStorage`, CSP, CORS—, sírvelo por HTTP.**

## Los webhooks no pueden tumbar nada
`emitir()` **nunca lanza** y se llama **después** de la escritura que anuncia (**D-94**). Un webhook
es un flujo opcional (RF-115): si propagara su error, un suscriptor mal configurado le costaría el
documento a un visitante. En `lib/crm/cola.ts` el evento sale además **fuera** de la transacción que
marca `delivered`, porque dentro un fallo del webhook revertiría una entrega al CRM que sí ocurrió y
el reintento crearía un contacto duplicado. **Si añades un emisor nuevo, respeta las dos cosas.**

## Lo que hay que saber del sheet antes de tocarlo
El cierre es **estado de render**, no `style` escrito sobre el nodo (**D-69**). Escribirlo a mano
parecía funcionar y no funcionaba: el render que dispara el propio gesto reescribía la duración recién
calculada y el sheet cerraba **siempre** en 350 ms. Si vuelves a necesitar animar algo desde un
manejador, pásalo por estado. Lo vigila `npm run test:gesto`, que lo mide cuadro a cuadro con un
Chromium real.

## Migraciones: diez, y todas declaradas
`0000`…`0009`. **Ojo con el journal**: una migración escrita a mano no se registra sola, y hasta el
2026-09-12 tres de ellas no se aplicaban. Lo vigila `npm run check:migrations`.

## Base de datos para verificar sin Docker
`bash scripts/db/local-pg.sh up` levanta PostgreSQL 16, migra y siembra; `down` lo borra. Existe
porque lo que se prueba son **políticas de fila reales**, y contra un doble siempre saldría verde.

## Archivos clave de FU-10
- `components/`: `FormularioDeDescarga.tsx`, `BarraDeNavegacion.tsx`, `SheetMovil.tsx`, `piezas.tsx`,
  `Reveal.tsx`, `ShellDeApp.tsx`, `VisorDeEntregables.tsx`
- `app/motion.css` (las tres preferencias del sistema) · `lib/design/motion.ts` (la física del gesto) ·
  `app/(auth)/prototipo/page.tsx` (los nueve, navegables)
- `middleware.ts` (las dos CSP) · `next.config.ts` (ya no lleva CSP) ·
  `scripts/ci/check-contraste.ts`, `check-motion.ts`, `test-gesto.ts`, `negative/gesto/roto.html`

## Archivos clave tocados en sesiones anteriores (FU-05 y FU-06)
- `middleware.ts` · `.github/workflows/ci.yml` · `.gitleaks.toml`
- `scripts/ci/`: `check-js-budget.ts`, `check-secrets.ts`, `check-env-example.ts`, `check-runtime.ts`,
  `verify-brakes.ts`, `check-dns.sh`, `negative/`
- `docs/`: `deployment.md` (nuevo), `decision_log.md` (D-47…D-51), `work_log.md`, `project_memory.md`,
  `run_metadata.md`
- `lib/auth/`: `index.ts`, `edge.ts`, `roles.ts`, `permissions.ts`, `session.ts`, `membership.ts`,
  `api-key.ts`, `better-auth.ts`, `db.ts`
- `middleware.ts` (compuerta de staging + orden de §2) · `app/(hq)/layout.tsx` ·
  `app/(portal)/layout.tsx` · `app/api/auth/[...all]/route.ts`
- `drizzle/`: `0004`…`0007` y el journal · `lib/db/schema.ts` · `lib/db/context.ts` (marca de tipo)
- `scripts/auth/`: `test-permisos.ts`, `test-autorizacion.ts` · `scripts/ci/check-auth-boundary.ts`,
  `check-migrations.ts` · `scripts/db/local-pg.sh`
- `implementation/task_tracker.md` · `package.json` · `scripts/tsconfig.json`

---

## Sesión 2026-09-17 — el sitio está publicado

**`https://softlandingglobal.com` sirve en producción, desde Vercel.** No desde el
VPS: Easypanel sigue sin arrancar contenedores nuevos (ver `handoff-despliegue.md`
§9) y se rodeó, no se arregló.

- Proyecto `slg-website` en la cuenta de Vercel de Ricardo. Protección SSO
  **desactivada** a propósito — con ella puesta el sitio pedía login.
- Las variables NO están en el almacén del proyecto: viajan en cada despliegue
  con `--build-env`/`--env`. `DATABASE_URL` apunta adrede a una dirección que no
  conecta; el sitio público no la necesita y una cadena que no conecta es más
  segura que una que sí. **Los formularios no guardan nada todavía.**
- **`output: "standalone"` es condicional** (`next.config.ts`): Vercel escribe
  los `.nft.json` que su ejecutor lee, y con la salida autocontenida Next no los
  emite. Así falló el primer despliegue. Fuera de Vercel no cambia nada.
- DNS en Hostinger: raíz y `www` → `76.76.21.21`. Ricardo lo cambió el 17.

**Contenido.** Los seis servicios de `SLG_Academy`/`SLG_Factory` y las páginas
Doctrina y Nosotros reescritos contra las fuentes reales
(`The_Phoenix_Doctrine_v1.1.md`, `SLG Overhauling.md`). Phoenix RETx describía
otro servicio: es para investigadores y estudiantes, no para revisar
implementaciones fallidas. Los 76 registros siguen en `copy: temporal`.

**Marca.** `public/marca/isotipo-slg.svg` se había perdido al reemplazar la línea
de código; recuperado de `origin/develop-linea-2026-09-11-local`. Once
fotografías propias en `public/fotos/` (WebP, 352 KB en total).

**`app/apple.css`** aporta la capa de acabado que faltaba. Lleva `!important`
porque las páginas escriben estilo en línea; quitarlos es trabajo aparte.

**Los 11 documentos de descarga EXISTEN**, en `~/Dev/SLG_Overhauling/docs/`
(markdown) y `docs/pdf/` (PDF con la marca, vía pandoc + typst). 29.671 palabras,
222 citas de fuente, 69 `[PENDIENTE]` declarados. **Todavía no están conectados
al sitio**: las fichas siguen diciendo «disponible próximamente».

**Dos frenos corregidos, ninguno cosmético:**
- `check-copy` marcaba «liderazgo» como superlativo: la expresión sin `\b` final
  cazaba toda la familia de «liderar».
- `eslint` analizaba `.claude/worktrees/`, copias completas del repo de otra
  línea — 583 errores en archivos que no son fuente.

**Pendiente de Ricardo, y solo de él:** aprobar el título nuevo de D-03;
verificar el «12× de capacidad» de D-10 (medición interna con supuestos sin
confirmar); los 69 pendientes de los documentos, casi todos precios, duraciones
y casos reales; y qué son ACP y SelectUSA/SGWIT para poder escribirlos en
Nosotros.

---

## Sesión 2026-09-17 (noche) — la captura de correo funciona en producción

**Base de datos y archivos en Supabase, tramo gratuito.** Proyecto `slg-website`
(ref `jadrwpbgtshwqanrhjxp`, `us-east-1`, Postgres 17). Las 17 migraciones
aplicadas con el rol dueño; `slg_app` con contraseña y LOGIN; 21 tablas, 11 con
RLS forzada. Bucket privado `downloads` con los 11 PDF (uno por ficha, clave =
`file_key` del frontmatter).

- **Vercel conecta por el pooler** `aws-0-us-east-1.pooler.supabase.com:5432`
  (sesión, porque el código usa `prepare: true`), usuario `slg_app.<ref>`.
  Las migraciones van por el host directo, que es IPv6.
- **Archivos por `FILES_DRIVER=supabase`**: la API de gestión no crea claves S3,
  así que existe `lib/files/supabase.ts` (REST de Storage, clave de servicio) y
  `adaptadorDeArchivos()` elige proveedor en un solo sitio. El adaptador S3 y el
  diseño del VPS no cambian.
- **Secretos** en `~/Dev/SLG_Overhauling/ops/supabase-slg-website.env` (fuera del
  repo) y cargados en el despliegue de Vercel con `--env`.
- **Verificado de punta a punta contra producción**: POST al formulario → 303 a
  `/gracias?url=…` → GET de la URL firmada devuelve el PDF (142 KB) →
  `lead_capture` con `crm_sync_status: pending` y `download_event` con su firma.

**Bug corregido por el camino**: cinco componentes comparaban el estado de la
descarga con `"available"`, valor que el esquema no admite; unificado en
`published`. Las 11 fichas ES están `published`; las EN siguen `coming-soon`
porque los documentos existen solo en español.

**Lo que sigue faltando y por qué**: `MAIL_SMTP_HOST`/`OPS_MAIL_TO` (correo:
las credenciales de Resend viven en Easypanel, no aquí) — no bloquean la
descarga; `CRM_*` (la cola queda en `pending` hasta que existan); los documentos
en inglés (traducción, otro encargo). El CLI de Supabase bajo Claude Code fuerza
modo JSON: invocarlo con `env -u CLAUDECODE` (ver memoria del agente).

---

## PRÓXIMA SESIÓN — la nueva arquitectura está en producción

Estado al 2026-09-18, 02:15 (Lima). Producción = `slg-website-56kh73gri` (02:10, completa, Nosotros corregido y About reflejado): menú de cuatro destinos
con el mapa de portada, Servicios en `/servicios` con Holdings desarrollado y descargas destacadas,
renombre VoltAi by SLG / Holdings by SLG / VoltAi Academy·Enterprise·Factory, regreso al nivel
anterior, quince fotos nuevas, fechas del blog repartidas, formularios con apellido, CRM, correo.
Verificado tras el despliegue: sonda (18 migraciones), portada, Readiness con foto y regreso,
`/empieza-aqui` → `/`.

**Desplegado** (`2d8edd6`): dos erratas de la edición manual
de Ricardo en Nosotros («con ella tecnología… implementados», «y no está preparado») corregidas y
About reflejado en inglés. La edición manual entró en el commit `0354c08` sin revisar: lección,
mirar `git status` de `content/` antes de un `git add -A`.

### Pregunta abierta para Ricardo
Los servicios `SLG_Readiness` y `SLG_Implement` conservan el prefijo `SLG_` (el renombre del 18
fue de ejes y líneas; «los servicios no cambian»). Dentro de «VoltAi Enterprise» desentonan. Si
decide renombrarlos (¿`VoltAi Readiness` / `VoltAi Implement`? ¿`Readiness` / `Implement` a secas?),
son `name` en `content/services/{es,en}/readiness*.md` e `implement*.md`, la tabla de
`nomenclature.ts` y `naming-rules.md`; las URL no cambian.

### Decisiones pendientes de Ricardo
- Easypanel: parar el proyecto `slg_website`; pegar el «Show Error» de los compose de `clientes`.
- Blog → redes: flujo n8n y `WEBHOOK_*` (§4 de `docs/blog-editor.md`).
- Fotos: en `phoenix-peex` salen dos sillas azules; `readiness` es una regla lisa. Regenerar si quiere.
- Copys en `temporal`: 84 registros. `test:descargas`/`test:webhooks`: premisa S3 por rehacer sobre Supabase.
- Vercel CLI 54 → 59 (`npm i -g vercel@latest`), sin urgencia.

### Los previews de `git push` ya compilan
Con las variables en Preview, cada push a `develop` produce un preview funcional
(`vercel ls` los enseña como «Preview · Ready»). Sirve como staging: comprobar ahí antes de
`vercel deploy --prod --yes`. Regla operativa: **el despliegue de producción va después del
último commit**, no antes; un `vercel ls --prod` con hora dice qué árbol subió.
