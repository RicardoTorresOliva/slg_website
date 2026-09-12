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

---

## 2026-09-12 · FU-06 — Módulo de identidad y autorización · `done`

**Qué se produjo.** `lib/auth/`: el único sitio del proyecto que sabe de sesión, rol, empresa y clave
de API. Better Auth 1.7.4 fijado sin rango, con `organization` y `admin`; la matriz B.3 como tabla de
datos y su aplicación en servidor; la verificación de claves con su límite; el middleware con el orden
de `architecture` §2; y los dos layouts que repiten la comprobación contra la base de datos.

**Los siete criterios:**

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Cero lógica de identidad fuera del módulo | `npm run check:auth-boundary`: 28 archivos fuera de `lib/auth/`, cuatro reglas, **ninguno la cruza**. El criterio deja de ser una promesa de revisión |
| 2 | La matriz B.3 se comprueba en el servidor | `test:permisos` invoca las 15 acciones sin pasar por ninguna interfaz: **15 × 4 = 60 celdas** recorridas una a una |
| 3 | Un `client_*` en `/hq` no recibe datos ni pista | 404 en los cuatro caminos de `exigirSuperficie`; **nunca 403** (D-38) |
| 4 | Los alcances no se implican | Los **seis** alcances × las 15 acciones, más los tres casos que RF-147 nombra. Y la base rechaza guardar uno inventado |
| 5 | `/hq` y `/portal` cerrados mientras M3 y M4 sigan abiertos | `SUPERFICIES_ABIERTAS` en `false`; los layouts devuelven 404 **con sesión válida**. Se abren cambiando una constante, no borrando la comprobación |
| 6 | Versión fijada sin rango | `better-auth` **1.7.4** con `--save-exact`; `check:secrets` y el gate de FU-02 vigilan que no aparezca un rango |
| 7 | Los errores no revelan qué faltaba | El mensaje público no contiene ningún alcance, rol ni acción — comprobado contra las **25** palabras prohibidas |

**Cuatro defectos encontrados, tres de ellos anteriores a esta unidad.**

1. **`contextoDeSesion` y `contextoDeClaveApi` reventaban al llamarlas.** La marca de tipo era
   `declare const verificado: unique symbol`, y `declare` **solo existe en el espacio de tipos**: en
   ejecución la constante no existía y las dos constructoras lanzaban `ReferenceError` en su primera
   línea. No se notó en FU-04 porque **nadie las llamaba**: su prueba comprobaba que el caso hostil no
   **compila**, que es otra cosa. Con `const` + `Symbol()` TypeScript sigue infiriendo `unique symbol`
   —la garantía de tipos es idéntica— y además la función funciona.
2. **`api_key` no tenía ninguna restricción de alcances.** `data_model` §3.6 especifica dos
   —contención sobre los seis valores y «no vacío»— y **no existía ninguna**: la tabla solo tenía
   clave primaria y foránea. Se podía guardar `["superpoderes:todo"]` o `[]`. Añadidas en la
   migración `0007`, más una tercera que exige que sea un array.
3. **El motivo interno de un error de autorización se filtraba.** `JSON.stringify(error)` lo
   exponía entero —y serializar el error es la ruta normal para devolverlo—, así que el mensaje
   público cuidado no servía de nada. Ahora la propiedad es **no enumerable**. Lo encontró la prueba,
   no una revisión.
4. **`${JSON.stringify(lista)}::jsonb` no guarda un array, guarda una cadena JSON**: postgres.js ya
   serializa el parámetro y el cast lo envuelve otra vez. Hay que usar `sql.json()`. Lo destapó la
   restricción nueva del punto 2 en su primer uso, que es justo para lo que existe.

**Decisiones registradas.** **D-52** (no se usa el plugin `apiKey`; desviación declarada respecto al
texto de FU-06, con sus tres razones), **D-53** (dos funciones `SECURITY DEFINER` estrechas en vez de
relajar las políticas de fila) y **D-54** (`invitation.token_hash` opcional).

**Sobre «los cinco roles» de FU-06.** RF-67 y B.3 nombran cinco, pero `agent` **no es** un valor de
`user.role`: `data_model` §3.1 lo excluye por escrito. Un agente no inicia sesión, presenta una clave.
Los cinco existen como **actores**; cuatro son roles de persona y el quinto es el actor de clave, que
es exactamente lo que `AuthContext.actorRole` ya modelaba desde FU-04. No hay contradicción que
resolver: hay una palabra usada para dos cosas.

**Gates aplicados.** `QG` del perfil —autenticación, autorización, rutas privilegiadas, ningún dato
sensible en errores, consultas parametrizadas— y base de **D9**: el aislamiento entre empresas sigue
verificándose por comportamiento, ahora también desde el módulo de identidad.

**Verificación.** `npm run check:ci` en verde · `test:permisos` **214** comprobaciones ·
`test:db` **53** comprobaciones contra PostgreSQL 16 real (29 de FU-04 + 23 de FU-06) ·
`check:brakes` siete frenos.

**Residual.** El límite por clave vive en memoria del proceso, coherente con D-40 y con la réplica
única de `architecture` §6.7. Está aislado en una sola función para que moverlo a tabla, el día que
haya dos réplicas, sea un cambio local. Y `lib/auth/` levanta una **segunda conexión** a PostgreSQL,
porque `lib/db/scope.ts` no exporta su cliente crudo a propósito; son cinco conexiones más en el pool
y se acepta a cambio de no abrir esa puerta.

**Siguiente.** **FU-07** (servicio de invitaciones), que necesita FU-08 —adaptador de correo— para
entregar. En paralelo sigue pendiente de Ricardo el despliegue de FU-05: `docs/deployment.md` §3 a §5.

---

## 2026-09-12 · FU-08 — Adaptador de correo transaccional · `in_progress`

**Qué se produjo.** `lib/mail/`: el puerto de una sola operación, el adaptador SMTP, las cuatro
plantillas en dos idiomas y la cola con espera creciente. Igual que FU-05, la unidad queda
`in_progress` y no `done`: lo que falta no es código, es dominio verificado y tres buzones reales.

**Los siete criterios:**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Ningún caso de uso importa el cliente del proveedor | **cerrado** | `npm run check:fronteras` — el mismo freno que vigila `lib/auth/` ahora vigila `lib/mail/`: 31 archivos fuera, ninguno la cruza |
| 2 | Cambiar de proveedor, demostrado en la práctica | **cerrado** | La suite entera corre **dos veces contra dos servidores SMTP distintos**, con credenciales y remitentes distintos, cambiando solo variables de entorno. Si alguien metiera el nombre del proveedor en el código, la segunda vuelta se pondría roja |
| 3 | Remitente en el subdominio de envío, `Reply-To` a `support@`, y llegada a bandeja en tres buzones | **a medias** | Lo primero está verificado: el sobre lleva el remitente correcto, la cabecera `Reply-To` viaja y ambos se persisten. **La llegada a bandeja de entrada en tres proveedores distintos es de Ricardo** |
| 4 | Verificación sobre subdominio dedicado, sin tocar el SPF de la raíz ni los MX | **pendiente de Ricardo** | Los registros del subdominio, en el panel de Hostinger. `npm run check:dns` ya vigila que `crm`, `n8n`, `evolution`, `academy` y los MX no se muevan |
| 4b | P-3 y P-4 resueltas y registradas | **propuesta escrita** | `decision_log`: `mailweb.softlandingglobal.com` y `no-reply@mailweb.softlandingglobal.com`. Falta que Ricardo diga sí o diga otra cosa |
| 5 | Un fallo de envío no pierde el hecho de negocio | **cerrado** | `enviarCorreo()` **nunca lanza**. Probado con las tres formas de fallar: rechazo del destinatario, credencial equivocada y servidor caído. En las tres queda fila de evidencia |
| 6 | Seguimiento de aperturas y clics desactivado | **a medias** | Verificado en el correo que sale: cero imágenes remotas, cero parámetros de campaña, cero `List-Unsubscribe`. Y el esquema **no tiene dónde** guardar una apertura. **Falta el interruptor del panel del proveedor** |
| 7 | Cero valores de credencial en el repositorio | **cerrado** | `check:secrets` sobre 166 archivos; `check:env` sobre las 47 variables |

**Hallazgo: `.env.example` contradecía al diseño desde FU-02.** Traía `RESEND_API_KEY`, y
`api_contracts` §11.3 dice literalmente que **esa variable no existe y que su ausencia es la
decisión**: el adaptador habla SMTP estándar (D-22, D-36), así que el proveedor se configura poniendo
su servidor en `MAIL_SMTP_HOST` y su clave en `MAIL_SMTP_PASSWORD`. Sustituida por las ocho variables
de transporte (**D-55**). Con la variable de marca, el primer programador que la viera habría
importado el SDK, y el criterio 1 se habría perdido en la primera semana.

**Decisión difícil, registrada: los correos con enlace no se reintentan (D-56).** `invitation` y
`password_reset` llevan un token de un solo uso que **no se guarda** —`architecture` §8.2 lo prohíbe—,
así que el barrendero no puede recomponerlos y los marca `failed` con el motivo escrito. La
alternativa era guardar los datos de plantilla para poder reenviar el mismo correo, y eso convierte
`email_delivery` en un **almacén de enlaces de acceso vigentes**: cualquiera con lectura sobre esa
tabla entra. Reintentar una invitación significa **volver a emitirla**, con token y caducidad nuevos,
y eso es de FU-07 y DU-01. Los dos avisos internos sí se recomponen desde `lead_capture` y sí los
reintenta el barrendero.

**Sobre las pruebas.** Los dos servidores SMTP de la suite **son servidores SMTP de verdad**, que
negocian el protocolo, autentican y rechazan destinatarios. Un doble del adaptador solo habría
probado que el adaptador llama al doble; estos comprueban que el correo sale, que la cabecera
`Reply-To` viaja, que no hay ni un `<img>` y que un 550 se clasifica como rechazo y no como fallo de
red.

**Gates aplicados.** `QG`: cero secretos, el error del proveedor saneado antes de llegar a una
pantalla de HQ, ningún token ni cuerpo persistido · alimenta **D8** y **D7**.

**Verificación.** `test:correo` **95** comprobaciones contra SMTP real · `check:ci` en verde ·
`check:fronteras`, `check:brakes` y `test:db` sin fallos.

**Residual.** El barrendero existe pero **nadie lo arranca todavía**: `architecture` §6.2 pone el
ejecutor dentro de `slg-web` y **DU-09 fija el intervalo** (la restricción dura es < 60 s). Hasta
entonces la cola se barre a mano. Es correcto que sea así —el intervalo es una decisión de DU-09, no
de esta unidad— pero conviene no olvidarlo: hoy un correo que falle se queda esperando.

**Siguiente.** Con P-3 y P-4 respondidas y los registros del subdominio publicados, FU-08 cierra y
**FU-07** (invitaciones) queda desbloqueada.

---

## 2026-09-12 · FU-07 — Servicio de invitaciones · `done`

**Qué se produjo.** `lib/invitations/`: emisión, reenvío, revocación, canje y caducidad. El acceso de
clientes es **solo por invitación** (§10-10), así que esto es la puerta por la que entra todo el
mundo, y sus reglas están probadas una a una contra PostgreSQL y SMTP reales.

**Los cinco criterios:**

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Un enlace usado deja de servir; uno de más de 72 h, tampoco; sin revelar si existió | El canje es una `UPDATE ... WHERE status = 'pending'`: dos canjes simultáneos del mismo enlace y **solo uno actualiza una fila**. Los cuatro motivos de rechazo —inexistente, caducado, usado, revocado— devuelven **exactamente el mismo mensaje**, comprobado comparando cadenas |
| 2 | Se acepta por los tres métodos y la cuenta queda ligada a empresa y rol | El canje es **una función de base de datos**: consume la invitación, crea la pertenencia y hereda el rol en **una transacción**. Los tres métodos entran por el mismo sitio con `userId` + correo verificado o no |
| 3 | Sin correo verificable, coincidencia explícita; nunca por correo no verificado | Cuatro casos probados: sin verificar y sin declarar → rechazo · declarado distinto → rechazo · **verificado pero ajeno → rechazo** · declarado coincidente → acepta |
| 4 | Si el correo falla, la invitación queda creada y reenviable | Probado apagando el servidor SMTP: la emisión **no lanza**, `sent_at` queda nulo, el error se registra y el reenvío sale |
| 5 | La revocación inutiliza de inmediato | Revocar borra el `token_hash` en la misma transacción: el enlace deja de servir en el acto |

**El hallazgo que cambió el diseño: las invitaciones no se escriben como sistema.** La primera versión
usaba `withSystemScope`, y PostgreSQL la rechazó — `invitation` está bajo row level security forzada y
`'system'` no pasa la política. **La base tenía razón y el código estaba mal.** Se reescribió para
escribir **con el contexto de quien invita**: así la política de fila hace cumplir la pertenencia ella
sola —un `client_admin` no puede tocar las invitaciones de otra empresa aunque el código lo
intentara— y la comprobación de B.3 pasa a ser la segunda capa en vez de la única. El barrido de
caducadas, que no tiene actor y recorre todas las empresas, va por una función estrecha
(migración `0009`).

**Segundo hallazgo: `membership.org_role` no era lo que el documento decía.** `data_model` §3.4
describe el vocabulario `admin`/`member` del plugin; la migración `0000` había fijado el `CHECK` sobre
los **cuatro roles de B.3** y el defecto en `client_member`. Escribir `'admin'` viola la restricción.
Lo descubrió esta prueba al canjear la primera invitación. Se conserva lo que la base impone (**D-59**),
que además evita traducir en cada lectura. Queda registrado que los endpoints de pertenencia **del
propio plugin** fallarían: no se usan, y el día que se usen necesitarán un mapeo explícito.

**Tercer hallazgo: `@/lib/auth` solo cargaba dentro de Next.** `session.ts` importaba `next/headers`
en la raíz del archivo, así que todo lo que tocara el módulo de identidad quedaba atado al runtime del
framework — incluido `lib/invitations/`, que tiene que poder correr desde un trabajo en segundo plano
y desde una prueba. El import pasa a ser dinámico, dentro de la función que lo usa. Una dependencia de
framework en la raíz de un módulo de dominio se propaga a todo lo que lo toca.

**Regla de B.3 que no cabe en un `CHECK`, y que ahora existe.** Un `client_admin` puede invitar a
miembros de **su** empresa (RF-92). De ahí se sigue, y hay que escribirlo: no a otra empresa, no
concediendo `slg_admin` ni `slg_operator`, y no a la organización de tipo `slg`. Sin esas tres
comprobaciones, «invitar a un miembro» es **escalada de privilegios con formulario**. Las tres están
probadas, y las tres responden **404, no 403**.

**Decisiones registradas.** **D-57** (reenviar emite testigo nuevo y renueva caducidad), **D-58**
(`NEXT_PUBLIC_SITE_URL` es la única URL base; el `APP_BASE_URL` del documento es esa misma) y **D-59**
(`membership.org_role` guarda el rol de B.3). Y **P-3 y P-4 quedan cerradas** por Ricardo:
`no-reply@mailweb.softlandingglobal.com` sobre `mailweb.softlandingglobal.com`, con
`support@softlandingglobal.com` como `Reply-To`. Con ellas se cierra **EXT-6**.

**El freno de fronteras se afinó, y se le puso prueba negativa.** No veía un import relativo sin
prefijo `lib/` —`../auth/db.ts` desde `lib/invitations/` entra igual de dentro—, y sus exenciones
valían también cuando se le apuntaba a los fixtures, así que la prueba negativa habría escaneado cero
archivos y anunciado verde: el mismo falso verde de R-26 que ya apareció con el escáner de secretos.
Corregido, y ahora el pipeline tiene **ocho frenos** con su caso en rojo.

**Gates aplicados.** `QG`: el testigo se guarda hasheado, el mensaje de rechazo no revela nada, la
autorización se comprueba en el servidor y la política de fila la respalda · alimenta **D8**.

**Verificación.** `test:invitaciones` **34** comprobaciones contra PostgreSQL y SMTP reales ·
`test:db` **184** en total · `check:ci` en verde · `check:brakes` ocho frenos.

**Residual.** La pantalla de `/invitacion/[token]` es de **DU-01** y la superficie de emisión de
**DU-14** (HQ) y **DU-21** (portal): por eso FU-07 es FU y no DU. El servicio está completo y probado;
lo que falta es dónde pulsarlo. Y el barrido de caducadas, como el de correo, **existe pero nadie lo
arranca todavía**: el ejecutor de colas se registra en DU-09.

**Siguiente.** M0-B queda con **FU-09** (almacenamiento de archivos y URLs firmadas) y **DU-01**
(acceso, sesión y recuperación). DU-01 necesita además F.2-2 y F.2-3 —los registros de OAuth de Google
y Microsoft—, así que **FU-09 es la que puede construirse entera ahora mismo**.

---

## 2026-09-12 · FU-09 — Almacenamiento de archivos y URLs firmadas · `in_progress`

**Qué se produjo.** `lib/files/`: el puerto de almacenamiento, el adaptador contra API S3 genérica, la
validación de tipo y tamaño **antes de emitir la firma**, y las tres caducidades leídas de
configuración. Queda `in_progress` por una sola razón, escrita abajo.

**Los cinco criterios:**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Sin firma y con firma caducada, denegado | **cerrado** | Un servidor HTTP real que **recalcula la firma SigV4** paso a paso: con firma válida 200; sin firma, con el objeto cambiado, con la caducidad alargada a mano y con la ventana vencida, **403 las cuatro** |
| 2 | **No existe** endpoint de listado | **cerrado** | El puerto expone **tres** operaciones y ninguna lista. Y `npm run check:archivos` falla si alguien nombra `ListObjects*` en cualquier archivo del repositorio, el propio adaptador incluido |
| 3 | La caducidad es la de `api_contracts` y se lee de configuración | **cerrado** | `X-Amz-Expires` comprobado en la URL emitida: 900, 600 y 1800 segundos. Una variable de entorno lo cambia sin tocar código; un valor desmesurado se rechaza al arrancar |
| 4 | MIME o tamaño no permitidos se rechazan en el servidor, antes de escribir un byte | **cerrado** | Ocho casos rechazados —ejecutable, SVG, HTML de 6 MB, markdown de 2 MB, PDF de 30 MB, cualquier cosa sobre el tope duro, travesía de directorios y destino inventado— y **ninguno llegó a tocar el almacenamiento** |
| 5 | Cero PDF de descarga y cero entregables en control de versiones | **cerrado** | `npm run check:archivos`, que es el `grep` que el criterio pide, corriendo en cada push |

**El defecto que encontré al empezar: las caducidades estaban intercambiadas.** `lib/db/limits.ts`
daba **30 minutos al entregable del portal y 10 a la subida**; `api_contracts` §11.9 fija lo contrario.
No es cosmético: el entregable habría vivido el triple de lo especificado —debilitando el gate D10, que
existe justo para que un enlace copiado del historial no valga mañana— y una subida de 50 MB habría
tenido 10 minutos, que por una conexión mala no bastan. Corregido, y con el número ahora en
configuración (**D-60**) más un tope duro de 60 minutos: una variable mal puesta no debe poder
convertir una firma en un enlace público con fecha.

**Dos ausencias que son la unidad.** El puerto **no tiene** `listar` y **no tiene** `firmarPermanente`.
No es que nadie las llame: es que no existen, y un puerto sin la operación no se puede usar mal. Es la
diferencia entre una convención y una garantía.

**La lista de MIME de `material`, cerrada (D-61).** `data_model` §2.6 la delegaba en esta unidad. Se
cierra en vez de abrirse: un **ejecutable** en un portal de clientes distribuye malware con nuestra
marca encima; un **comprimido** es contenido que nadie ha validado; y un **SVG es HTML con otro
nombre** —lleva `<script>`— que se abriría en el origen del portal y no en el visor aislado que D-45
exige. Ampliarla es una decisión escrita, no un parche.

**Sobre la prueba, y lo que NO prueba.** El servidor de la suite verifica SigV4 **reescribiendo el
estándar a mano** sobre `node:crypto`, no reutilizando el firmador del SDK: comprobar una firma con el
mismo objeto que la creó prueba poco, porque un defecto estaría a los dos lados. Lo que este montaje
**no** demuestra es que MinIO se comporte igual; eso se comprueba al desplegar.

**Gates aplicados.** `QG` (subidas validadas, mensajes que no describen el sistema) · **D10**
(archivos): sin listado, sin URL permanente, caducidad corta y verificada.

**Verificación.** `test:archivos` **39** comprobaciones contra un servidor real · `test:db` **224** en
total · `check:ci` en verde · `check:brakes` **diez** frenos.

**Por qué `in_progress` y no `done`.** Falta **una** cosa, y es de Ricardo: crear los dos buckets
`downloads` y `deliverables` en el servicio `minio` de Easypanel, **los dos privados**, y poner las
seis variables `S3_*`. Todo lo demás está construido y probado. Hasta que existan los buckets, el
criterio 1 está demostrado contra un verificador propio y no contra el almacenamiento real.

**Siguiente.** M0-B queda solo con **DU-01** (acceso, sesión y recuperación), que necesita **F.2-2 y
F.2-3**: el consentimiento OAuth de Google y el registro de aplicación en Microsoft Entra ID. Son las
dos últimas dependencias externas de M0.

---

## 2026-09-12 · DU-01 — Acceso, sesión y recuperación por los tres métodos · `in_progress`

**Qué se produjo.** `/acceder` y `/en/sign-in`, `/recuperar` y `/en/recover`, `/restablecer`, y la
pantalla de `/invitacion/[token]` que crea la cuenta. Más el bloqueo progresivo, el cierre de sesión
en todos los dispositivos y los manejadores de formulario. **Es la primera cosa que un consumidor
puede hacer de punta a punta.**

**Los nueve criterios:**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Entrar por los tres métodos y llegar a la superficie del rol | **a medias** | Contraseña: **cerrado y probado**. Google y Microsoft: el código está desde FU-06 y la pantalla los ofrece; faltan **F.2-2 y F.2-3** |
| 2 | La respuesta no revela si la cuenta existe | **cerrado** | Tres casos —correo inexistente, contraseña equivocada, y **correo con invitación vigente pero sin cuenta**, que RF-59 nombra aparte— con **el mismo destino y el mismo texto**, comparados como cadenas |
| 3 | Vinculación solo por correo verificado; ancla `oid` en Entra | **a medias** | `accountLinking` con `trustedProviders` y `allowDifferentEmails: false`; la comprobación viva necesita los proveedores |
| 4 | Contraseña de 12, alta verificada, recuperación de un solo uso | **cerrado** | Menos de 12 → rechazada. El enlace de recuperación **sirve una vez**: al segundo intento falla y la contraseña anterior deja de valer |
| 5 | Bloqueo progresivo, y el mismo mecanismo en la recuperación | **cerrado** | La escalera se activa tras varios intentos seguidos, y la recuperación comparte cerradura (RNF-24) |
| 6 | Cookies `Secure`/`HttpOnly`/`SameSite` y 7 días deslizantes | **cerrado** | Leídas del `Set-Cookie` real y la duración consultada en la base: **7 días** |
| 7 | Cerrar sesión en todos los dispositivos | **cerrado** | Con **dos navegadores simulados**: dos sesiones vivas → cero, y el segundo queda fuera en su siguiente petición |
| 8 | Estados resueltos | **cerrado** | Los cinco, incluido «proveedor no disponible», que se pinta **deshabilitado y explicado**, no escondido |
| 9 | Pruebas automatizadas | **cerrado** | `test:acceso`, **39 comprobaciones** contra el servidor real con cookies |

**EL HALLAZGO GRAVE: el registro público estaba abierto.** Better Auth publica
`POST /api/auth/sign-up/email` por defecto, y con él **cualquiera se daba de alta** en un sitio cuyo
acceso es **solo por invitación** (§10-10, RF-59). No es teórico: la primera versión de la prueba creó
una cuenta con un `POST` y sin invitación de ningún tipo. Cerrado en el middleware con **404** —no 403,
que confirmaría que la ruta existe— y sustituido por `/api/acceso/invitacion`, que exige testigo válido
y llama a la librería por dentro (**D-62**). La prueba ahora comprueba las dos caras: que el alta
pública devuelve 404 y que **no se creó ninguna cuenta**.

**Tres decisiones que salieron de construirlo.**

1. **El correo queda verificado al aceptar la invitación** (D-63). La invitación se envió a esa
   dirección: llegar con su testigo ya lo prueba. Un segundo correo de verificación pide dos veces la
   misma prueba, y es el que la gente no encuentra.
2. **El enlace de recuperación apunta a una pantalla nuestra** (D-64). El de la librería va a
   `/reset-password`, que aquí no existe: el destinatario aterrizaría en un 404 **con el testigo en la
   barra de direcciones**.
3. **Cero JavaScript en el acceso.** Formularios nativos contra manejadores de ruta. Un formulario de
   acceso que depende de JS falla justo cuando peor viene, y además el presupuesto del gate D1 ya va
   al 89 %. El presupuesto no se movió: **133,9 KB**, igual que antes de esta unidad.

**Por qué un manejador propio y no el endpoint de la librería.** Tres cosas son nuestras y no suyas:
el **mensaje neutro** —la librería distingue «usuario no encontrado» de «contraseña incorrecta», y esa
distinción es justo la que no puede salir—, el **bloqueo progresivo**, y **funcionar sin JavaScript**.

**Dos cosas que la prueba encontró y que no eran del código.** El servidor SMTP de la suite rechazaba
la autenticación —y el adaptador lo clasificó correctamente como `autenticacion`, que es la prueba de
que esa clasificación sirve—; y el enlace llegaba con un `3D` pegado delante del testigo, porque el
correo va en *quoted-printable* y la prueba solo deshacía los saltos blandos. Las dos son de la prueba,
no del producto, y quedan escritas porque la siguiente persona que lea un correo en una prueba se va a
tropezar con lo mismo.

**Gates aplicados.** `QG`: autenticación, autorización, sin filtración en errores, sin secretos ·
alimenta **D8**, que cierra en M3 cuando exista la emisión de invitaciones desde HQ.

**Verificación.** `test:acceso` **39** comprobaciones contra el servidor real · `test:db` **264** en
total · `check:ci` en verde · `check:brakes` diez frenos · presupuesto de JS sin mover.

**Por qué `in_progress`.** Los criterios 1 y 3 solo cierran con **F.2-2 y F.2-3**: el consentimiento
OAuth de Google y el registro de aplicación en Entra ID. El paso a paso de los dos está en
`docs/deployment.md` §4quater, con las URL de retorno exactas. Con las cuatro variables puestas, no
cambia una línea de código.

**Residual.** La pantalla es deliberadamente austera: el sistema de componentes es **FU-10** y esta
unidad llega antes. Lo que hay son los tokens de FU-02 y HTML nativo, y se rehace con el sistema
cuando exista.

**Siguiente.** **M0 está construido salvo lo que depende de Ricardo.** Lo siguiente por dependencia es
**FU-01** (copy maestro bilingüe), que es una **compuerta de aprobación** y no código: hasta que el
copy pase, M1-A no empieza.

---

## 2026-09-12 · FU-01 — Copy maestro bilingüe · `in_progress` · **COMPUERTA ABIERTA**

**Qué se produjo, y qué NO.** Se produjo **el esqueleto completo y bilingüe de la capa pública** —los
64 registros de contenido que faltaban— y **la maquinaria que hace cumplir sus reglas**. **No se
produjo el copy**, y esa ausencia es deliberada: ver abajo.

**El esqueleto, en números.** De 7 registros de contenido a **71**:

| Colección | Antes | Ahora | Qué es |
|---|---:|---:|---|
| `service` | 2 | **22** | Las **once** páginas de servicio de A.2, en los dos idiomas, cada una con los **seis bloques del contrato A.3** en su orden fijo |
| `page` | 2 | **22** | Home, `/ai`, los tres overviews de rama, Doctrina, Nosotros, Descargas, Gracias, Contacto y los dos legales, en los dos idiomas |
| `download` | 2 | **22** | Los **once** documentos D-01…D-11 en los dos idiomas, todos en `coming-soon` |
| `post`, `doctrine` | 3 | 5 | Sin cambios de alcance |

Las 33 páginas se generan y las **26 rutas entran bajo el presupuesto de JS**; la más pesada sigue
siendo la portada con 133,9 KB, exactamente igual que antes. El esqueleto no costó un byte.

**Por qué NO escribí el copy, y por qué eso es lo correcto.** El criterio 3 dice que toda mención de
mentorías, premios, cifras, casos o nombres de cliente tiene que estar **respaldada por dato
verificado y autorización explícita**. El copy de una firma que asesora directorios son afirmaciones
sobre una empresa real: inventarlas sería producir exactamente lo que ese criterio prohíbe, y hacerlo
con la voz de SLG. La fuente es `SLG_Overhauling` y `Docs_MD`, que viven fuera de este repositorio.
Lo que sí se puede construir sin la fuente —y es lo que hay— es **la estructura contra la que se
redacta** y **los frenos que impiden publicar sin respaldo**.

Cada hueco lleva su marcador con dueño escrito:
`[PENDIENTE: copy maestro FU-01 — se redacta en SLG_Overhauling contra el contrato A.3 y pasa por la
compuerta de aprobación de Ricardo]`. Y lo que el contrato A.3 fija por escrito **sí está redactado**,
porque es estructura y no copy: «sin lock-in, el stack lo elige el cliente, compuertas de aprobación,
capacidad transferible», «único llamado a la acción de esta página» y «si después de leerlo quieres
conversar, escríbenos».

**Los seis criterios:**

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Par ES/EN completo, cero huérfanos | **cerrado** | `check:pairs`: **46** comprobaciones, cero huérfanos sobre los 71 registros |
| 2 | Nomenclatura literal en los dos idiomas | **cerrado** | `check:nomenclature`: **73** comprobaciones |
| 3 | Cero cifras, premios o casos sin respaldo | **freno construido** | `check:copy` (**D-65**): exige `[fuente: …]` en la misma línea o `[PENDIENTE: …]`. La veracidad la firma Ricardo |
| 4 | Ningún texto público ofrece «Sesión Cero» ni agenda | **cerrado** | `check:copy`, con su prueba negativa: «Sesión Cero», «agenda tu», Calendly y equivalentes en inglés |
| 5 | Una idea por viewport, cero lorem, cero stock | **parcial** | El lorem lo veta `check:pending`. «Una idea por viewport» es juicio de diseño y se resuelve en **FU-10** y **DU-03** |
| 6 | **Aprobación explícita de Ricardo en `work_log`, con fecha** | **ABIERTA** | Es la compuerta. Ver abajo |

**LA COMPUERTA SIGUE ABIERTA, Y ESO BLOQUEA M1-A.** Mientras no haya una aprobación con fecha en este
archivo, **ninguna DU de página se declara construible** (criterio 6). El mecanismo ya está montado y
funciona solo: las páginas existen en staging **con los `[PENDIENTE]` visibles**, y `main` las rechaza
porque `check:pending --strict` corre en el pipeline solo en esa rama. Comprobado: el gate pasa sin
`--strict` y falla con él.

**Lo que Ricardo tiene que hacer para cerrarla**, en orden de prioridad comercial, que es el que el
contrato fija: Home → `SLG_AI` → las tres ramas → el resto. Por cada registro, sustituir el marcador
por el copy definitivo en los dos idiomas. Y **una sola ronda**: el contrato dice que una segunda es
cambio de alcance, no un paso del plan.

**El freno nuevo, y lo que no puede hacer (D-65).** `check:copy` comprueba que nadie publique una
cifra **sin declarar de dónde sale**. No puede comprobar si el dato es cierto, y eso queda escrito en
la decisión: la veracidad es de la compuerta, la disciplina es del freno. Las dos reglas que vigila
son justo las que se cuelan cuando hay prisa por publicar, y la compuerta se pasa **una sola vez**:
después, cualquier edición de un `.md` entraría sin volver a verla.

**Gates aplicados.** **D4** (paridad, por script) · **D5** (fidelidad de contenido: nomenclatura
literal y marcadores bloqueados en `main`) · alimenta **D2b** y **D6**.

**Verificación.** `check:gates`: **ocho** casos de contenido en rojo por su motivo y **cinco** scripts
en verde contra el contenido real · `check:ci` en verde · el presupuesto de JS sin mover con 26 rutas.

**Siguiente.** Con la compuerta abierta, M1-A no empieza. Lo que **sí** puede construirse en paralelo
es **FU-10** (sistema de componentes C.5), que depende de FU-02 y no del copy: su prototipo se valida
con el contenido marcador que ahora existe.

---

## 2026-09-12 · FU-10 — Sistema de componentes C.5 con prototipo interactivo · `in_progress` · **COMPUERTA ABIERTA**

**Qué se construyó.** Los **nueve componentes de C.5**, en el orden que impone RF-134 —el formulario
de descarga primero, los otros ocho en el orden literal del anexo (**D-67**)—, más el contrato de
movimiento de C.4 partido en dos: lo que se puede expresar en CSS vive en `app/motion.css`, y lo que
no —proyección de momentum, rubber-band, transferencia de velocidad— en `lib/design/motion.ts`,
porque es cálculo y no curva.

| # | Componente | Archivo | Cliente |
|---|---|---|---|
| 1 | Formulario de descarga | `components/FormularioDeDescarga.tsx` | sí (5 estados) |
| 2 | Barra de navegación + sheet móvil | `components/BarraDeNavegacion.tsx` · `components/SheetMovil.tsx` | sí |
| 3 | Hero tipográfico | `components/piezas.tsx` | no (servidor) |
| 4 | Tarjeta de rama/servicio | `components/piezas.tsx` | no |
| 5 | Bloque «Qué incluye» | `components/piezas.tsx` | no |
| 6 | Tarjeta de artículo | `components/piezas.tsx` | no |
| 7 | Pie | `components/piezas.tsx` | no |
| 8 | Shell de app | `components/ShellDeApp.tsx` | no |
| 9 | Visor de entregables | `components/VisorDeEntregables.tsx` | no |

Siete de los nueve son componentes de **servidor**: el presupuesto de JS no se movió un byte —26
rutas, la más pesada sigue siendo la portada con **133,9 KB**—.

**Los nueve, navegables, en `/prototipo`.** El criterio 1 dice que una imagen no cierra esta
compuerta, así que el prototipo es la página real, con los nueve componentes y sus estados. Es lo que
Ricardo abre para aprobar, y es lo que mide `test:gesto`.

### Tres defectos que ningún `grep` podía ver

El criterio 10 exige verificar el sheet **cuadro a cuadro, no por inspección del código**. Convertir
esa frase en un freno ejecutable (**D-70**) —un Chromium real, viewport de móvil, la traslación
presentada muestreada en cada `requestAnimationFrame`— encontró tres cosas en su primera ejecución:

1. **La hidratación no ocurría. En todo el sitio.** `script-src 'self'` a secas hacía que el navegador
   rechazara los scripts en línea de Next y React moría con el error 412. El servidor devolvía 200,
   las cabeceras parecían impecables y **nada funcionaba**: ni el formulario, ni el sheet, ni el
   conmutador de idioma. Corregido con **dos políticas según la superficie** (**D-68**), y ahora
   `check:runtime` lo vigila: nonce en las superficies dinámicas, distinto en cada petición y el mismo
   que Next puso en el HTML; `'unsafe-inline'` **solo** en las prerrenderizadas, que no reflejan ni un
   dato externo.
2. **El sheet cerraba siempre en 350 ms**, viniera el dedo como viniera. El `setState` del gesto
   provoca un render justo después de soltar y React reescribía la duración recién calculada: la
   cláusula 4 de RNF-45 estaba incumplida y el código parecía correcto. El cierre pasa a ser **estado
   de render** (**D-69**).
3. **La velocidad no caducaba**: arrastrar rápido, pararse un segundo y soltar cerraba el sheet contra
   un dedo que se había detenido a propósito. Ventana de 100 ms (**D-69**).

Como efecto del mismo cambio, agarrar a mitad del cierre continúa ahora **desde el valor presentado**
—lo que RNF-12 exige y el comentario del componente ya prometía sin que el código lo hiciera—.

### Los trece criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Nueve prototipos reales, navegables con teclado y con gesto | **cerrado** | `/prototipo` sirve los nueve; `test:gesto` los conduce con puntero real |
| 2 | El formulario demuestra el camino completo del visitante | **cerrado** | Cinco estados en `FormularioDeDescarga.tsx`: validación de correo corporativo con mensaje en el idioma de la página, error en línea, envío, «disponible próximamente» y error de servidor |
| 3 | Contraste AA en todas las combinaciones; cyan nunca como texto sobre claro | **cerrado** | `check:contraste`: **21** mediciones sobre los tokens reales, más **4 pares prohibidos** que se comprueba que NO llegan a AA. Corrige de paso las cifras obsoletas del `style_guide` (**D-66**) |
| 4 | Teclado completo con foco visible; anillo de dos capas de D-44 **medido** | **cerrado** | Medido, no afirmado: **capa interior sobre `--paper` 4,7:1** y **sobre `--paper-2` 4,4:1**, ambos sobre el mínimo de 3:1 que exige RNF-05. Y el par que **rechaza la unidad** también se mide: un anillo de **una sola capa** en `--cyan` da **2,4:1** sobre `--paper` y el gate lo tiene declarado como prohibido |
| 5 | Las tres preferencias del sistema | **cerrado** | Los tres bloques en `app/motion.css`: `prefers-reduced-motion` degrada a cross-fade de 200 ms sin desplazamientos, `prefers-reduced-transparency` vuelve sólida toda superficie translúcida, `prefers-contrast: more` define bordes y casi elimina la transparencia |
| 6 | Springs `damping` 1.0, `response` 0.3–0.4 s; rebote solo tras momentum | **cerrado** | `SPRING` en `lib/design/motion.ts` (1.0 / 0.35); `SPRING_CON_REBOTE` existe y **no se usa en ninguna transición provocada por un clic** |
| 7 | Feedback en `pointerdown` y cero retardos artificiales | **cerrado** | `.slg-pressable` → `scale(0.97)` en 100 ms; `check:motion` no encuentra ningún retardo en la ruta de entrada |
| 8 | Solo `transform` y `opacity`; `will-change` acotado | **cerrado** | `check:motion`: **87** archivos. Y medido: el panel **no cambia de tamaño en ningún fotograma** durante el gesto |
| 9 | Se reanuda desde el valor presentado; cero `@keyframes` agarrables | **cerrado** | `check:motion` prohíbe `@keyframes` en los componentes agarrables; `test:gesto` mide que el primer fotograma tras soltar sigue donde lo dejó el dedo |
| 10 | Las cuatro cláusulas de RNF-45, **cuadro a cuadro** | **cerrado** | `test:gesto`: **10** comprobaciones sobre un Chromium real. 1:1 con ≤ 1 px de desviación · rubber-band sobre la curva de iOS con ≤ 1 px · un lanzamiento rápido y **corto** cierra mientras un arrastre lento que llega **más lejos** no · el cierre hereda la velocidad |
| 11 | Reveals: opacidad + 8 px, una sola vez, sin parallax | **cerrado** | `REVEAL` y `components/Reveal.tsx`: `IntersectionObserver` que se desconecta al disparar |
| 12 | La lente de los ocho principios de C.6, respondida por escrito | **cerrado** | Abajo |
| 13 | **Aprobación explícita registrada aquí, con fecha** | **ABIERTA** | Es la compuerta. Ver abajo |

### La lente de C.6, respondida

| # | Principio | Respuesta |
|---|---|---|
| 1 | **Propósito** | Se decidió **no** construir un carrusel, un buscador, un selector de vista ni un menú de segundo nivel. Nadie los echa de menos porque el sitio tiene 26 rutas y cinco destinos: buscar es más trabajo que leer el menú |
| 2 | **Agencia** | El sheet se cierra de cuatro formas —gesto, telón, Escape y el propio destino—, y ninguna pide confirmación porque ninguna destruye nada. La única confirmación del sistema vive donde sí es irreversible: cerrar todas las sesiones (DU-01) |
| 3 | **Responsabilidad** | El formulario de descarga pide **un** campo: el correo. Ni cargo, ni empresa, ni teléfono. El documento se entrega por un enlace firmado, así que no hay ningún dato más que sirva para entregarlo |
| 4 | **Familiaridad** | Un solo anillo de foco, un solo token de radio por familia, un solo patrón de error en línea, y el wordmark siempre arriba a la izquierda llevando a la portada. El shell de app repite la misma jerarquía tipográfica que el sitio público |
| 5 | **Flexibilidad** | Móvil = rápido: un botón y un sheet arrastrable. Escritorio = profundo: los cinco destinos a la vista, sin esconderlos tras un icono. La tabla del shell **se apila como ficha por fila** en móvil en vez de pedir zoom |
| 6 | **Simplicidad** | Hay jerarquía, no minimalismo: el hero usa `clamp()` hasta 3,25 rem contra un cuerpo de 1 rem, y el rojo aparece **una vez por viewport** —en el CTA—, que es lo que lo hace funcionar como CTA |
| 7 | **Craft** | Cada espaciado, radio, sombra y `timing` sale de un token de `app/tokens.css` o de una cifra de C.4. `check:contraste` mide los colores y `check:motion` vigila las animaciones: no hay ningún valor «a ojo» |
| 8 | **Deleite** | El único movimiento que no es respuesta directa a una acción es el reveal al scroll, y son 8 px de desplazamiento **una sola vez**. Lo demás —press, sheet, cierre— es consecuencia del dedo |

**Wayfinding.** **Dónde estoy**: el enlace activo lleva `aria-current="page"` y el título de sección
encabeza cada pantalla del shell. **A dónde puedo ir**: los cinco destinos están a la vista en
escritorio y a un toque en móvil. **Cómo salgo**: el wordmark siempre vuelve a la portada, y el sheet
tiene tirador, telón y Escape.

**Gates aplicados.** **D2** (accesibilidad, 21 mediciones + 4 pares prohibidos) · **D2b** (marca) ·
**D3** (motion, con la revisión cuadro a cuadro convertida en freno) · alimenta **D1** (el
presupuesto no se movió).

**Verificación.** `check:ci` en verde, ahora con `test:gesto` dentro · `check:brakes`: **trece**
frenos, cada uno visto en rojo por su motivo · `test:db`: **264** comprobaciones contra PostgreSQL,
SMTP y servidores HTTP reales · `npx tsc --noEmit` y `eslint` limpios.

### LA COMPUERTA SIGUE ABIERTA (criterio 13)

**Ninguna DU de página empieza hasta que Ricardo apruebe los nueve prototipos**, y la aprobación se
registra aquí con fecha. Paso a paso, sin dar por supuesto dónde va cada cosa:

1. Abre el navegador y entra en **`https://staging.softlandingglobal.com/prototipo`**. Si el navegador
   pide usuario y contraseña, son las de la compuerta de staging, las mismas que configuraste en
   Easypanel en el servicio `slgweb-staging` (variables `STAGING_BASIC_AUTH_USER` y
   `STAGING_BASIC_AUTH_PASSWORD`).
2. Míralo **primero en el móvil**, no en el ordenador: el sheet arrastrable solo existe ahí. Toca
   «Menú», arrastra el panel hacia abajo con el dedo y suéltalo; prueba también a lanzarlo rápido y
   corto, y a arrastrarlo hacia arriba para notar la resistencia.
3. En el ordenador, recorre la página **solo con el teclado**, con la tecla Tab. Lo que tienes que ver
   es un anillo de foco visible en **todos** los elementos por los que pases, sin excepción.
4. Escríbeme **una sola respuesta** con una de estas dos cosas: «apruebo FU-10» —y lo registro aquí
   con la fecha—, o la lista de lo que quieres cambiar. Como en FU-01, **una sola ronda**: una segunda
   es cambio de alcance, no un paso del plan.

**Mientras esto no se cierre, DU-02, DU-03 y las demás DU de página no arrancan.** No es una
formalidad: son el marco por el que se navega todo lo demás, y rehacerlas después de construir diez
páginas encima cuesta diez veces más.
