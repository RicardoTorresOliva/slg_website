---
type: docs
title: Work log
status: stub
---

# Work log

> Template stub. Chronological record per unit: what was produced, what was verified (quality gate applied), findings, and residual risks. Updated after each unit — not later, not in batches.

---

## 2026-09-08 · Compuerta de Planificación abierta

**Plan aprobado por Ricardo.** `init-project` cerrado en sus diez pasos; `preflight_check.sh` en verde
(user_units, task_tracker, knowledge/index, project_memory).

Estado con el que se entra en ejecución:

| | |
|---|---|
| Perfil activo | `software-app` (D-14) |
| Unidades | 39 — 14 FU + 25 DU, en 8 milestones, todas `pending` |
| Requisitos | 194 (148 RF + 46 RNF), cero huérfanos |
| Riesgos | 38, 7 críticos, todos con dueño y señal temprana |
| Decisiones | 33 registradas, D-14 a D-46 |
| Documentos de diseño | 6, ~6.500 líneas, más el bundle OKF de 7 conceptos |

**Revisión previa a la aprobación.** Tres revisores independientes con lentes distintas
(trazabilidad, coherencia, gobernanza) revisaron el plan dos veces. La primera pasada lo **reprobó**;
la segunda lo declaró apto con arreglos, y los arreglos se aplicaron antes de presentarlo. El hallazgo
más grave fue de seguridad: la documentación del propio plan permitía deducir, en un repositorio
público, la existencia de una credencial concreta sin rotar — no en un archivo, sino repartida entre
ocho. Corregido y verificado a cero antes de la aprobación.

**Abierto al arrancar, con su unidad bloqueada:**

- **H-04** — `organization.primary_contact`: ¿usuario con clave foránea o texto libre? Bloquea **FU-04**
  (primera migración). Decidirlo después es migración de datos.
- **S-01** — verificación de higiene de credenciales. Bloquea **FU-05**.
- **EXT-7** — producto de monitorización externa. Bloquea **FU-05**.

Ninguno bloquea FU-02 ni FU-03, que arrancan ya.

**Orden de ejecución:** FU-02 → FU-03 → FU-04 → FU-05 (M0-A), y de ahí M0-B. El orden comercial del
Anexo E se mantiene: M0 → M1 → M2 salen a producción antes de empezar M3.

---

## 2026-09-08 · FU-02 — Andamiaje, tokens de marca y skills · `done`

**Qué se produjo.** Next.js 16.3.4 (App Router, TypeScript) con React 19.2.8, Tailwind 4.3.3 y
Motion 13.2.0. Grupos de ruta `(public)`, `(auth)`, `(hq)`, `(portal)` y `api/v1` creados y vacíos
según B.1. Salida `standalone` para el despliegue en Easypanel.

**Los ocho criterios de aceptación, verificados sobre el paquete servido y no sobre el código fuente:**

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Compilación `standalone`, servidor arranca | HTTP 200 · `.next/standalone/server.js` |
| 2 | Todo color, radio, sombra y difuminado como variable CSS | 12 tokens presentes en el CSS servido; **cero hexadecimales fuera de `app/tokens.css`** |
| 3 | Montserrat autoalojada | Los tres pesos HTTP 200 desde `/fonts/`; **cero referencias a `fonts.googleapis`/`gstatic`** en HTML y CSS |
| 4 | Sin verde, amarillo ni naranja | Los 11 colores medidos por matiz: 197°–240° (azules) más 357° (rojo de detención) |
| 5 | Anillo de foco de dos capas (D-44) | Computado en navegador: `rgb(40,120,180) 0 0 0 2px, rgb(80,180,220) 0 0 0 4px` = `--slg-blue-primary` interior + `--slg-cyan` exterior |
| 6 | `.gitignore` cubre secretos | `git check-ignore` confirma `.env`, `.env.local`, `.mcp.json`, `*.key`, `*.pem` |
| 7 | Skills instaladas y auditadas | 3 skills, 5 archivos, todos texto, **cero ejecutables, cero patrones de secreto** |
| 8 | Sin rangos de versión | `grep '\^\|~'` en `package.json` → cero |

**Decisión tomada dentro de la unidad.** Montserrat se sirve como **tres archivos estáticos**, no como
fuente variable. Google ofrece ambas formas; con la variable, los pesos 600 y 700 podían acabar
sintetizados por el navegador —falsa negrita— en lugar de ser los cortes reales de la fundición. Coste:
60 KB en tres peticiones en vez de 35 KB en una. Se acepta por fidelidad tipográfica (C.2); si el gate
D1 apretara en FU-10, es reversible.

**Desviación registrada — instalación de skills.** El instalador de `emilkowalski/skills` no permite
elegir: instaló **las 12 skills del paquete**, entre ellas `pick-ui-library` y `emil-design-eng`, que
`skills/inventory.md` había **rechazado con motivo escrito**. Se retiraron las nueve no aprobadas con
`skills remove`, dejando el `skills-lock.json` coherente con las tres del inventario. Quedan
`apple-design`, `prototype` y `review-animations`. Auditoría previa al commit, como exige el criterio 7
por ser repositorio público: 5 archivos, todos texto plano, ningún ejecutable, ningún patrón de secreto.

**Añadido no previsto en la unidad, con justificación.** Scripts `build:standalone` y `start:standalone`.
Next.js **no copia** `static/` ni `public/` dentro de `standalone/` por diseño, y hacerlo a mano produjo
durante esta unidad un fallo real: HTML de una compilación sirviendo chunks de otra, con el CSS
devolviendo HTTP 500 y la página cayendo a una serif de reserva sin tokens. Es exactamente el fallo que
romperá el Dockerfile de FU-05 si el empaquetado no está guionizado. Cuesta dos líneas.

**Gates aplicados.** `QG` del perfil: cero secretos en el árbol, dependencias fijadas sin rangos, cero
`node_modules`/`.next` en el control de versiones · **D2b** (marca): tokens sin verde/amarillo/naranja,
Montserrat autoalojada, wordmark provisional solo sobre claro con margen de respeto de 1 altura de «S» ·
**D1** (base del presupuesto de JS): ruta raíz estática, sin librerías más allá de React y Motion.

**Residual.** El wordmark tipográfico es provisional por diseño: aislado en `components/Wordmark.tsx` y
un token, para que el logo real de SLG Agency (Anexo I-5) sea un cambio de archivo. RNF-05 queda
**parcialmente** cubierto: el token existe y se aplica; su verificación de contraste cierra en FU-10.

**Siguiente.** FU-03 — capa de contenido OKF, i18n y scripts de verificación.

---

## 2026-09-08 · FU-03 — Capa de contenido OKF, i18n y scripts de verificación · `done`

**Qué se produjo.** El contenido como datos y su policía. Las seis colecciones de B.4 en
`content/`, validadas **en tiempo de build** por `lib/content/`, el enrutado bilingüe con español en
la raíz e inglés bajo `/en`, y los cuatro scripts de CI en `scripts/content/`.

**Los siete criterios, verificados provocando el fallo y no solo leyendo el código:**

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Frontmatter inválido rompe el build | Se quitó `description` de una página: el build cayó con `content/pages/es/nosotros.md · description: campo obligatorio ausente` |
| 2 | `service` sin uno de los seis bloques de A.3 es rechazado | Fixture sin el bloque «Descarga» → rechazado antes de renderizar |
| 3 | Paridad falla si `pair` no existe, y **no** aplica a `post` | Fixture con `pair` huérfano → rojo; el artículo con `pair: null` pasa |
| 4 | Nomenclatura y «D» de DAL OS | Fixture con «SLG AI» y «Disrupción Creativa» → rojo, señalando el término correcto |
| 5 | Clave de UI desparejada rompe el build | Se borró `download.cta` de `en.json`: el build cayó nombrando la clave |
| 6 | **Prueba negativa de cada gate** | `npm run check:gates`: 6 casos en rojo por el motivo esperado + 4 en verde contra el contenido real |
| 7 | `/en/…` no redirige a `/…` | 10 peticiones con `Accept-Language` es/en/fr/zh y sin cabecera: **200 en todas**, cero redirecciones |

**Decisiones tomadas dentro de la unidad.**

1. **Los scripts comparten el esquema del build, no una copia.** Se ejecutan con el soporte nativo de
   TypeScript de Node 22, así que `check-frontmatter` usa exactamente el mismo validador que rompe el
   build. Dos fuentes de verdad acaban divergiendo, y el día que lo hagan el gate se vuelve decorativo.
   Coste: `scripts/` necesita su propio `tsconfig.json` con `allowImportingTsExtensions`, porque `tsc`
   rechaza las extensiones `.ts` en los imports que Node sí exige.

2. **Corrección a mi propia primera versión del gate de `[PENDIENTE]`.** Lo escribí prohibiéndolos
   siempre, y eso contradice el brief: los `[PENDIENTE]` son **obligatorios en staging** donde falte un
   dato y prohibidos en producción. Ahora el script los lista como aviso y pasa, salvo con `--strict`,
   que es como lo ejecutará el gate de `main`.

3. **`isIsoDate` acepta objetos `Date`.** YAML convierte `2026-09-08` sin comillas en un `Date`, no en
   una cadena. Obligar a comillas sería una trampa para quien edita el `.md` a mano, que es justamente
   para quien está pensado el sistema (DoD #9). Lo encontró el propio script en su primera ejecución.

4. **Hueco propio detectado y cerrado.** `loadUiStrings()` existía pero **nada lo llamaba**, así que el
   criterio 5 no se estaba aplicando. Se cablea en `app/(public)/layout.tsx`, con un comentario que
   advierte de que borrar esa llamada borra el gate.

**Gates aplicados.** `QG` · **D4** (paridad ES/EN por script, con su prueba negativa) ·
**D5** (fidelidad de contenido: nomenclatura literal y cero marcadores en `main`) · alimenta **D12**.

**Residual.** Las 27 rutas públicas de A.2 existen como **mecanismo**, no como contenido: hay una
página y un servicio de muestra por idioma. El resto entra con el copy maestro (FU-01), que tiene su
propia compuerta. El contenido de muestra es marcador estructural declarado, no copy provisional que
alguien pueda confundir con definitivo.

**Siguiente.** FU-04 — capa de datos. Bloqueada por H-04, que sigue abierta.

---

## 2026-09-08 · FU-04 — Capa de datos: PostgreSQL, Drizzle, migraciones y modelo B.2 · `done`

**Qué se produjo.** 19 tablas migradas, cuatro migraciones versionadas, la capa de acceso que hace
imposible olvidar el filtro de empresa, y 24 comprobaciones automatizadas contra PostgreSQL real.

**Los ocho criterios:**

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Las entidades de B.2 migran | 19 tablas · `0000` generada + `0001`, `0002`, `0003` escritas a mano |
| 2 | `lead_capture` sin estado comercial | Consulta al catálogo: **cero** columnas de etapa, propietario, importe, probabilidad o próximo paso |
| 3 | `audit_log` inmutable, ni para `slg_admin` | `UPDATE` y `DELETE` rechazados con mensaje explicativo — probado, no afirmado |
| 4 | Consultas parametrizadas | Cero concatenación de SQL, cero `sql.unsafe` |
| 5 | La capa de acceso no admite `organization_id` por parámetro | **Una prueba compila el caso hostil y exige que `tsc` FALLE**, por el motivo correcto |
| 6 | `deliverable.type` por mapa de renderizadores | `Record<DeliverableType, …>`: añadir un tipo al esquema sin declararlo **no compila** |
| 7 | `agent_event` abierto pero validado en la escritura | `kind` nuevo aceptado sin migración; forma incorrecta, payload desmesurado y anidamiento excesivo rechazados |
| 8 | Tamaño de subida como número único | `lib/db/limits.ts`; el mapa lo lee, nadie lo repite |

**Hallazgo grave, encontrado y corregido dentro de la unidad.** El usuario que crea la imagen de
PostgreSQL es **superusuario y lleva `rolbypassrls`**. Con él, las políticas de fila **no se aplican**:
una consulta sin contexto devolvía las dos empresas en vez de ninguna. Todo el aislamiento de la
migración `0001` habría sido decorativo. Se corrige en `0002` separando el rol de aplicación
(`slg_app`, sin BYPASSRLS y sin ser dueño) del rol de migraciones, con dos cadenas de conexión
distintas. **La primera comprobación de la prueba de aislamiento vigila exactamente esto**: si alguien
vuelve a apuntar `DATABASE_URL` al dueño, el CI se pone rojo.

**Segundo hallazgo, encontrado por la prueba de catálogo.** `audit_log` tiene `organization_id` y no
tenía política de fila: un cliente podría haber leído las entradas de auditoría de otra empresa. La
comprobación recorre `pg_class` en vez de una lista escrita a mano, por eso lo vio. Corregido en
`0003`, restringiendo la lectura a `slg_admin` según B.3 y dejando la inserción abierta, porque una
auditoría que no puede escribirse no sirve de nada.

**El aislamiento, verificado en comportamiento:** sin contexto → **cero filas, no todas** · con
contexto ajeno → cero · escritura ajena → rechazada por la política · operador de SLG → ve las dos.
El principio de diseño es que **olvidar el filtro devuelva cero**, y eso es lo que se demostró.

**Decisiones tomadas dentro de la unidad.** `crm_delivery` gana una columna `cycle`: el reintento
manual de RF-52 sobre una captura `failed` abre un ciclo nuevo en vez de superar el tope de cinco
intentos. Resuelve el conflicto **CF-1** que `api_contracts` §13.2 declaró bloqueante de DU-16, sin
contradecir el backoff de B.6.

**Datos de ejemplo.** Tres organizaciones, cuatro roles, dos contactos —uno con cuenta y otro sin
ella, que es el caso que D-48 existe para cubrir—, entregables de los cinco tipos con dos versiones de
una familia, y capturas en los **tres** estados de sincronización. La captura `failed` no es adorno:
sin ella la pantalla de reintento de HQ nunca se ve, y esa pantalla es la mitigación visible de R-24.

**Deuda aceptada y registrada.** `npm audit` reporta una vulnerabilidad moderada de `esbuild` vía
`drizzle-kit`, dependencia **de desarrollo** que solo genera migraciones y nunca se despliega. El
aviso afecta al servidor de desarrollo de `esbuild`, que no corre en producción. El «arreglo»
degradaría `drizzle-kit` de 0.31 a 0.18. Se acepta; revísese si `drizzle-kit` publica corrección.

**Gates.** `QG` (consultas parametrizadas, validación en escritura, sin secretos) · base de **D9**
(aislamiento, con 10 comprobaciones automatizadas).

**Siguiente.** FU-05 — despliegue, CI, DNS y documentación de entorno. **Bloqueada por S-01 y por la
elección del producto de monitorización (EXT-7)**, ambas de Ricardo.

---

## 2026-09-12 · FU-05 — Despliegue, CI, DNS y documentación de entorno · `in_progress`

**Qué se produjo.** La mitad de esta unidad que vive en el repositorio, completa y verificada; y
`docs/deployment.md`, el runbook paso a paso de la mitad que vive en la infraestructura y que solo
Ricardo puede ejecutar. La unidad **no se marca `done`**: cuatro criterios necesitan los cinco
servicios arriba y la zona DNS en la mano.

**Los nueve criterios, uno por uno:**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Staging por HTTPS, auth básica y `noindex` | **construido y probado** · falta desplegar | `middleware.ts` + 10 comprobaciones de `check:runtime` contra el servidor real |
| 2 | `develop`→staging, `main`→producción, y nada llega a `main` sin pasar por staging | **construido** · faltan los webhooks | job `guarda-staging`: falla si el commit de `main` no está contenido en `develop` |
| 3 | `crm`, `n8n`, `evolution`, `academy` y los MX siguen resolviendo igual | **construido** · falta ejecutarlo contra la zona real | `scripts/ci/check-dns.sh`, en modo línea base y en modo verificación |
| 4 | El pipeline **falla** ante los seis casos | **cerrado** | `.github/workflows/ci.yml`, 4 jobs |
| 5 | Cada freno con su prueba negativa ejecutada | **cerrado** | `npm run check:brakes`: 6 frenos en rojo por el motivo esperado + 3 contrapruebas en verde |
| 6 | `.env.example` con todos los nombres y cero valores | **cerrado** | `npm run check:env`: 42 variables, todas documentadas; y falla si el código lee una que no está |
| 7 | CSP, HSTS y `frame-ancestors` verificadas por prueba automatizada | **cerrado** | `npm run check:runtime`: 19 comprobaciones sobre el servidor real, no sobre `next.config.ts` |
| 8 | El monitor avisa, provocando la caída una vez | **pendiente de Ricardo** | procedimiento exacto en `docs/deployment.md` §5.2 |
| 9 | Producto de monitorización elegido y registrado | **cerrado** | **UptimeRobot**, ahora sí escrito como **D-49** |

**Por qué la unidad queda `in_progress` y no `blocked`.** Nada de lo que falta depende de una
decisión: depende de tener el panel de Easypanel y el de DNS delante. El runbook dice qué se pulsa
y en qué orden.

**Tres hallazgos dentro de la unidad.**

1. **El presupuesto de JS estaba rojo y nadie lo sabía.** La primera ejecución del gate D1 dio
   **172,5 KB** comprimidos en la portada — un 115 % del presupuesto— con una página que solo tiene
   un wordmark y dos párrafos. De ellos, **39,4 KB eran el paquete de polyfills `noModule`**, que un
   navegador moderno **ignora por completo**: no lo pide ni lo ejecuta. Excluirlo (D-51) deja la
   portada en **133,9 KB, el 89 %**. Sigue siendo estrecho: ver *Residual*.
2. **El escáner de secretos encontró dos cadenas de conexión en mi propio runbook**, en dos rondas
   seguidas: primero el ejemplo de `DATABASE_URL`, después la nota que explicaba el formato. Las dos
   eran ejemplos, y el gate tenía razón las dos veces — una cadena con contraseña dentro de un
   repositorio público no se distingue de una real hasta que alguien la prueba. El documento las
   describe ahora sin escribirlas.
3. **La prueba negativa del escáner escaneaba cero archivos y anunciaba verde.** El barrido saltaba
   todo directorio llamado `negative/`, incluidos los fixtures a los que la prueba le apuntaba a
   propósito. Es exactamente el falso verde que R-26 describe: un gate que pasa porque no mira nada.
   Corregido — `negative/` solo se salta en el barrido del repositorio, nunca cuando
   `SECRETS_SCAN_ROOT` apunta ahí.

**Decisiones registradas.** **D-51** (las tres precisiones de la compuerta de staging y del
presupuesto de JS). Y se cierra el hueco documental que arrastraban las unidades anteriores:
**D-47** (separación del rol dueño y el rol de aplicación), **D-48** (`contact` como entidad propia,
cierra H-04) y **D-49** (UptimeRobot y S-01 diferida) estaban **citadas en el tracker, en este
`work_log` y en el propio esquema sin tener entrada en `decision_log`**; **D-50** (`crm_delivery.cycle`,
que resuelve CF-1) no tenía ni número. Las cinco están escritas.

**Añadido no previsto, con justificación.** `scripts/ci/check-env-example.ts` comprueba también la
dirección contraria: que toda variable que el código lee esté declarada en la plantilla. El criterio 6
solo pedía lo primero. Cuesta 40 líneas y convierte en rojo de CI lo que si no es un `undefined`
silencioso en producción.

**Gates aplicados.** `QG` del perfil: cero secretos (144 archivos barridos), ninguna cadena de
conexión con contraseña, la compuerta de staging comparando en tiempo constante, `/api/health` sin
dato de negocio · **D11** (operación): monitor externo elegido, registrado y con procedimiento de
prueba escrito · **D1** (presupuesto de JS): medido, no estimado · alimenta **D5**.

**Residual y riesgo abierto.** La portada ocupa **el 89 % del presupuesto de JS estando vacía**.
Los 133,9 KB son el runtime de React 19 más Next 16: no hay nada nuestro que recortar. Cuando entren
la Home real (DU-03) y el sistema de componentes (FU-10), el margen es de **16 KB**. Dos salidas, y
conviene decidir cuál antes de FU-10: reducir el JavaScript de cliente llevando componentes a
Server Components, o subir el presupuesto con una decisión escrita. **Lo que no vale es desactivar
el gate.**

**Siguiente.** Ricardo ejecuta `docs/deployment.md` §2 a §5 para cerrar los criterios 1, 2, 3 y 8.
En paralelo, la unidad siguiente por dependencia es **FU-06** (identidad y autorización), que solo
espera a que FU-05 esté desplegada.

---

## 2026-09-12 · Defecto corregido — las migraciones `0001`, `0002` y `0003` nunca se aplicaban

Encontrado al levantar PostgreSQL para empezar **FU-06**. No es una unidad: es una reparación.

**Qué pasaba.** `drizzle-kit migrate` solo aplica lo que `drizzle/meta/_journal.json` declara, y el
journal listaba **una sola entrada**: `0000_inicial`. Las tres migraciones escritas a mano en FU-04
—restricciones y aislamiento, rol de aplicación, política de auditoría— estaban en el repositorio,
revisadas y en el diff, pero **ningún despliegue las habría ejecutado**. drizzle-kit no avisa: desde
su punto de vista un `.sql` que nadie declaró no es una migración, es un archivo.

**Qué habría pasado en producción.** Las 19 tablas creadas **sin row level security, sin el rol
`slg_app` y sin la política de `audit_log`**. El aislamiento entre empresas no habría estado roto:
habría estado **ausente**, con DoD #5 y el gate D9 sin cumplir y sin una sola señal en el despliegue.
Verificado: contra una base recién migrada solo con `0000`, `test:isolation` cae con
`role "slg_app" does not exist`.

**Por qué FU-04 no lo vio.** Aplicó las tres a mano durante la unidad y verificó el resultado —por eso
sus 24 comprobaciones eran ciertas—, pero verificó **el estado de la base**, no **el camino que lleva
a ese estado**. Es la diferencia entre probar el resultado y probar el procedimiento.

**Corregido y verificado.** Las tres entradas añadidas al journal. Contra una base creada desde cero:
19 tablas, 10 políticas, `slg` (dueño, con BYPASSRLS) y `slg_app` (aplicación, sin BYPASSRLS), y las
**29 comprobaciones** de `npm run test:db` en verde.

**Freno nuevo, para que no vuelva.** `scripts/ci/check-migrations.ts`: falla si un `.sql` de
`drizzle/` no está declarado, si el journal declara algo que no existe, o si la secuencia se rompe.
Con su prueba negativa (`npm run check:brakes`, ahora **siete** frenos) y su paso en el pipeline.

---

## 2026-09-12 · FU-05 — corrección del runbook tras ver la infraestructura real

Ricardo mandó captura del proyecto `slg_website` en Easypanel: **los cinco servicios ya existen**.
`docs/deployment.md` §2 les decía que los crearan. Reescrito con los nombres reales —`slgwebpostgres`,
`minio`, `slg-web`, `slgweb-staging`, `umami` + `umami-db`— y reducido a lo que de verdad queda:
contraseña del rol `slg_app`, variables de entorno y el `deploy command`. El nombre importa más allá
de la etiqueta: en las cadenas internas el host es `slgwebpostgres`, no `slg-db`.

**Lección, escrita para no repetirla:** el runbook se redactó desde `architecture` §7 sin comprobar el
estado real del panel. Un procedimiento que supone un punto de partida equivocado hace perder más
tiempo que no tenerlo.
