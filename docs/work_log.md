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

### COMPUERTA CERRADA — aprobada por Ricardo el **2026-09-12**

> **«apruebo FU-10»** — Ricardo Torres Oliva, 2026-09-12.

Con esto el **criterio 13 queda cerrado**, FU-10 pasa a `done` y **DU-02 arranca**. El texto de abajo
es el procedimiento con el que se pasó la compuerta; se conserva porque es el que se repetirá en las
compuertas siguientes.

### El procedimiento de la compuerta (criterio 13)

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

---

## 2026-09-12 · DU-02 — Armazón público: navegación, sheet, pie y conmutador · `done`

**El marco por el que se navega todo lo demás.** Navegación con los cinco destinos de RF-01, sheet
móvil arrastrable en producción, pie, conmutador de idioma y salto al contenido, aplicados a las
**29 rutas públicas** en los dos idiomas.

### Tres rutas del menú no existían

RF-01 pide cinco destinos. Al construir la barra, tres no resolvían: `/ai` estaba como `/slg-ai`, y
**`/holdings` y `/blog` no existían en absoluto**. El mapa de rutas canónico vive en
`ui_wireframes` §1.1 y es la referencia de todo lo demás —las tres salidas del 404, los enlaces del
hero, el mapa del sitio—, así que mandan sus rutas y se movió el contenido, que son marcadores sin
copy (**D-71**). De paso se retiró la portada duplicada: era `/` **y** `/home`, y la misma página en
dos URL divide los enlaces y duplica contenido para los buscadores.

| Destino | Antes | Ahora |
|---|---|---|
| `SLG_AI` | `/slg-ai` | **`/ai`** · `/en/ai` |
| `SLG_Holdings` | *no existía* | **`/holdings`** · `/en/holdings` |
| Doctrina | `/doctrina` | sin cambios |
| Blog | *no existía* | **`/blog`** · `/en/blog` (solo el índice; el resto es DU-11) |
| Nosotros | `/nosotros` | sin cambios |
| Portada | `/` y `/home` | **`/`** y **`/en`** |

### El falso verde de FU-10, y por qué importa más que el resto

**FU-10 se declaró verificada con `check:ci` en verde, y ese verde era falso.** Cinco frenos barrían
con `git ls-files`, que **no ve los archivos todavía sin `git add`**: los archivos nuevos de FU-10 no
entraron en el barrido. Al hacer commit entraron, y dos frenos se pusieron en rojo — el CI de GitHub
habría fallado en el primer push de una unidad dada por terminada.

Es la misma familia que R-26 —un barrido que no mira nada siempre pasa— y se cierra en los cinco a la
vez con `--cached --others --exclude-standard` (**D-74**). De rebote destapó dos defectos más en
`check:motion`: se ponía rojo por **los comentarios que documentan la regla que vigila**, y no
reconocía `animationName`, que es la forma que toma un keyframe en un `.tsx` — es decir, **un
componente de React con un keyframe pasaba entero**. Su fixture negativo tampoco lo probaba: disparaba
desde un comentario. Los tres, corregidos.

### Los siete criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Cinco destinos más «Acceder»; ninguna etiqueta genérica; el logo lleva a Home | **cerrado** | `check:armazon`: los cinco `href` en las dos barras, el botón de acceso, el logo a `/` y `/en`, y **cero etiquetas «Inicio/Home»** como destino de menú |
| 2 | Desde cualquier ruta, el conmutador lleva a **esa misma página** en el otro idioma | **cerrado** | `check:armazon` recorre las **29 rutas**: sigue el conmutador, comprueba que el destino responde 200, y que **el viaje de vuelta devuelve a la ruta de partida**. Un conmutador que apunte a la portada desde una página interior es rojo |
| 3 | Español en la raíz, inglés bajo `/en`; ninguna redirección por idioma | **cerrado** | `/doctrina` con `Accept-Language: en-US` sigue sirviendo español y **no redirige**; y al revés |
| 4 | El sheet cumple **en producción** las cuatro cláusulas, cuadro a cuadro | **cerrado** | `test:gesto` mide ahora **dos** páginas: `/prototipo` y `/doctrina`, que es una página pública prerrenderizada de verdad. **20 comprobaciones** sobre Chromium real |
| 5 | Ni la navegación ni el pie enlazan `/hq` ni `/portal` | **cerrado** | `check:armazon`, sobre el HTML servido, en los dos idiomas |
| 6 | Estados resueltos: navegación en carga, sheet sin conexión, ruta sin par de idioma | **cerrado** | La ruta sin pareja dibuja el conmutador **desactivado y con motivo** (**D-73**), no lo esconde ni manda a la portada. El sheet no necesita red: es estado local. El salto al contenido es la **primera** parada del tabulador, comprobado |
| 7 | Todo el texto de navegación y pie sale de `content/ui`: cero literales | **cerrado** | Freno nuevo `check:cadenas`, con prueba negativa: caza el texto visible de JSX y los atributos que un lector de pantalla lee en voz alta |

### La lente de C.6, respondida

| # | Principio | Respuesta |
|---|---|---|
| 1 | **Propósito** | No hay menú desplegable, ni buscador, ni mapa del sitio en el pie. Un desplegable convertiría cinco destinos en dieciséis y rompería RF-01; y un pie que repite la navegación con otro formato es ruido |
| 2 | **Agencia** | El sheet se cierra de cuatro formas —gesto, telón, Escape, o el propio destino— y ninguna pide confirmación, porque ninguna destruye nada |
| 3 | **Responsabilidad** | El armazón no pide ni un dato. No hay banner de cookies porque no hay cookies que consentir en la capa pública: la analítica es sin cookies |
| 4 | **Familiaridad** | Mismo sitio en las 29 rutas: logo arriba a la izquierda, destinos a la derecha, conmutador junto al botón de acceso, pie idéntico. El sheet repite el orden exacto de la barra de escritorio |
| 5 | **Flexibilidad** | Móvil = rápido: un botón, un sheet que se cierra con el dedo. Escritorio = profundo: los cinco a la vista, sin esconderlos tras un icono |
| 6 | **Simplicidad** | Hay jerarquía: el botón «Acceder» es **secundario a propósito** y nunca rojo, porque el CTA de la capa pública es la descarga (§10-8) |
| 7 | **Craft** | Cada medida sale de un token. El salto al contenido se mueve con `transform`, no con `display:none`, que lo sacaría del orden del tabulador y lo dejaría inútil |
| 8 | **Deleite** | El único movimiento del armazón es el del dedo sobre el sheet y el anillo de foco. Ninguna animación de entrada de la barra: aparecer no es una acción |

**Wayfinding.** **Dónde estoy**: `aria-current="page"` en el destino activo. **A dónde puedo ir**: los
cinco, a la vista. **Cómo salgo**: el logo, siempre, a la portada del idioma en que estás.

**Gates aplicados.** **D2** (accesibilidad: foco, salto al contenido, `aria-current`) · **D3**
(el sheet, cuadro a cuadro, en una página pública) · **D4** (paridad) · alimenta **D1**: las rutas
públicas subieron de 26 a **29** y la más pesada es `/ai` con **136,1 KB** de 150 KB.

**Verificación.** `check:ci` en verde con dos frenos nuevos dentro · `check:brakes`: **quince**
frenos, cada uno visto en rojo por su motivo · `check:armazon`: 50 comprobaciones · `test:gesto`: 20 ·
`test:db`: 264.

**Lo que este armazón NO es.** Las páginas siguen siendo provisionales: muestran su título, su bajada
y su `[PENDIENTE]`, porque el copy es de FU-01 y su compuerta sigue abierta. Cuando se cierre,
aparecerá el copy definitivo **sin tocar una línea de código**: para eso el contenido vive en
`content/`. Las páginas de verdad, con los seis bloques del contrato A.3, son DU-04 y DU-05.

---

## 2026-09-12 · FU-05 — DNS: línea base y verificación (criterio 3)

**La comprobación ya no exige `dig` ni una terminal.** El script pasó de bash a Node (`node:dns`
contra el resolutor público 8.8.8.8), así que lo ejecuta quien construye o el CI. Ricardo solo toca
el panel de Hostinger, y solo si algo se movió.

**Línea base**, tomada el 2026-09-12 y versionada en `docs/dns_baseline.txt`. Y dice algo que no
estaba escrito en ningún sitio: **los tres registros que §4.3 pedía crear ya estaban puestos**.

**Verificación (criterio 3), salida literal:**

```
Resolutor: 8.8.8.8 · línea base: docs/dns_baseline.txt

Nombres protegidos (deben seguir IGUAL):
  · crm.softlandingglobal.com          A      sin cambios
  · crm.softlandingglobal.com          CNAME  sin cambios
  · n8n.softlandingglobal.com          A      sin cambios
  · n8n.softlandingglobal.com          CNAME  sin cambios
  · evolution.softlandingglobal.com    A      sin cambios
  · evolution.softlandingglobal.com    CNAME  sin cambios
  · academy.softlandingglobal.com      A      es un CNAME: se compara el CNAME, no sus IP
  · academy.softlandingglobal.com      CNAME  sin cambios
  · softlandingglobal.com              MX     sin cambios
  · softlandingglobal.com              TXT    sin cambios

Nombres nuevos (deben resolver a la IP del VPS):
  · softlandingglobal.com              A      167.88.42.76
  · www.softlandingglobal.com          CNAME  softlandingglobal.com
  · staging.softlandingglobal.com      A      167.88.42.76

✓ DNS: 12 comprobaciones. Los nombres protegidos no se movieron.
```

**Dos rojos falsos, encontrados y cerrados al primer uso:**

1. **Un timeout del resolutor se leía como «el registro cambió».** Habría mandado a alguien a
   revertir a mano una entrada que nadie tocó. Ahora se distingue «no hay registro» (`ENOTFOUND`,
   `ENODATA`) de «no contestó», que reintenta y, si insiste, dice explícitamente que **no significa
   que haya cambiado nada**.
2. **`academy` es un CNAME a Vercel, y Vercel rota las IP de detrás.** Sus `A` cambiaron entre la
   línea base y la verificación sin que nadie tocara la zona. Lo que tiene que seguir igual es
   **nuestra entrada** —el CNAME—, no la infraestructura de un tercero, así que el `A` de un nombre
   que es CNAME ya no se compara.

**Hallazgo de correo, del mismo barrido de DNS.** El remitente configurado en Easypanel es
`noreply@mail.softlandingglobal.com` y **`mail.` no existe**: no tiene DKIM ni SPF. El dominio
verificado en Resend es **`mailweb.`**. Enviar desde `mail.` es enviar **sin firmar**: no rebota, se
entrega a spam, y desde fuera parece que funciona. La corrección, con los clics exactos, en
`docs/deployment.md` §4bis.0.

---

## 2026-09-13 · FU-01 — Copy maestro temporal · `in_progress` · **compuerta abierta, avance desbloqueado**

**Decisión de Ricardo el 2026-09-13**: redactar el copy contra el material que ya está en el
repositorio y marcarlo temporal, en vez de seguir esperando a `SLG_Overhauling`. Tiene razón: el
material existe —`START_PROJECT.md` §0, §1 y Anexo A, más los nueve archivos de `knowledge/`— y la
espera bloqueaba **cinco unidades** por un texto sustituible.

**Lo que hay ahora.** **74 registros públicos con copy redactado y cero `[PENDIENTE]`** en todo el
contenido: 22 servicios con los seis bloques del contrato A.3, 26 páginas, 22 documentos con título,
audiencia y qué se aprende, y 4 secciones de doctrina. Todo en los dos idiomas.

Cada registro lleva **`copy: temporal`** en su frontmatter (**D-75**), y `check:copy` lo lista en cada
ejecución:

```
Copy TEMPORAL — 74 registros redactados contra el brief y pendientes de
la firma de Ricardo. Publicables, y ninguno es definitivo.
```

**Lo que NO inventé, y sigue siendo tuyo.** Cuatro sitios donde el contrato A.3 pide la lista «tal
cual la fuente» y la fuente no está en este repositorio. En los cuatro, el texto describe la **forma**
del servicio sin inventar su contenido:

| Dónde | Qué falta | Qué dice hoy |
|---|---|---|
| `SLG_Readiness` | Los nombres de las **once dimensiones** | Que son once, que se entregan las once y con qué evidencia |
| `CoO as a Service` | Las **tres promesas** | Que son tres y que se escriben en el acuerdo antes de empezar |
| `SLG_Holdings` | Las **tres líneas** | Que son tres, cada una con su alcance |
| `Phoenix PEEx`, `TEAx`, `RETx` | Qué distingue a cada uno; el brief los nombra sin definirlos | Los diferencia por **audiencia y momento** —individual, equipo, y revisión de lo ya implementado—, que es defendible desde la estructura de la línea pero **no está confirmado** |

Pásame esas cuatro cosas y las cambio en un commit. Todo lo demás ya es sustituible frase a frase.

**La regla dura sigue intacta.** Cero cifras, premios, casos y nombres de cliente: `check:copy` los
veta sin fuente declarada, y en 1.266 comprobaciones no hay ninguno. La página de Nosotros lo dice
por escrito: «no publicamos una cifra, un caso ni un nombre de cliente sin autorización escrita, que
es la razón por la que en estas páginas no vas a encontrar ninguno».

**Dos textos legales marcados como provisionales en su propia primera línea** (privacidad y términos):
son los que exige F.2-1 para las pantallas de consentimiento OAuth, y necesitan revisión profesional
antes del lanzamiento. Decirlo dentro del texto es más honesto que dejarlo en una nota interna.

---

## 2026-09-13 · DU-11 — Blog: índice, artículo, etiquetas, RSS y borradores · `done`

**Publicar es añadir un `.md` y hacer push.** Nada más: sin tocar código, sin build manual y sin
ningún paso en HQ. Lo decide el campo `status`, **nunca la existencia del archivo**.

| Ruta | ES | EN |
|---|---|---|
| Índice | `/blog` | `/en/blog` |
| Artículo | `/blog/[slug]` | `/en/blog/[slug]` |
| Etiqueta | `/blog/etiqueta/[tag]` | `/en/blog/tag/[tag]` |
| Canal | `/blog/rss.xml` | `/en/blog/rss.xml` |

Las ocho rutas se **prerrenderizan**: un artículo nuevo entra en la compilación, no en una petición.

### El criterio que pasó en verde sin ejecutarse

Al publicar el único artículo que había en borrador, el freno se puso verde **sin haber ejecutado ni
una** de las tres comprobaciones del criterio 2 — no había borrador que comprobar. Es la misma
familia que D-74: un barrido sin casos siempre pasa.

Ahora el repositorio **conserva un borrador permanente** (**D-78**), y su propio texto explica por
qué está ahí, para que nadie lo publique por limpieza.

### Los ocho criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Añadir un `.md` y hacer push publica, sin ningún otro paso | **cerrado** en repositorio | `check:blog` comprueba que cada publicado aparece en índice, URL propia, etiqueta y RSS. La mitad del «en minutos» la cierra el despliegue real |
| 2 | Un `draft` **no se sirve** en ninguna ruta pública ni en RSS | **cerrado** | Tres comprobaciones contra un borrador **real**: sin URL (404), fuera del índice, fuera del canal |
| 3 | El RSS publica solo los publicados **del idioma correspondiente** | **cerrado** | Y además: el canal español no lleva artículos ingleses, y al revés — el fallo silencioso de un blog bilingüe |
| 4 | Índice y página por etiqueta en los dos idiomas | **cerrado** | Cuatro etiquetas en español, dos en inglés, todas navegables; el segmento se traduce (`etiqueta`/`tag`) porque es una palabra, no nomenclatura |
| 5 | Un artículo **solo en español** no rompe la paridad | **cerrado** | «El mes cuatro» existe solo en español con `pair: null`. El freno comprueba que ese caso **existe**: sin él, el criterio estaría verde sin haberse probado |
| 6 | Frontmatter A.5 completo desde el primer artículo | **cerrado** | Los cuatro artículos llevan `type`, `title`, `description`, `lang`, `pair`, `date`, `tags`, `status`, `cover`, `social{hook,linkedin,x}` y `author` |
| 7 | Estados: blog sin artículos · etiqueta sin artículos · artículo inexistente | **cerrado** | Etiqueta y artículo inexistentes devuelven **404**, no una página vacía; el índice y la etiqueta vacía tienen su texto |
| 8 | Lighthouse sobre un artículo (tercera página del gate D1) | **parcial** | El presupuesto de JS ya mide las **38 rutas**, artículos incluidos, y todas entran. Lighthouse completo se pasa sobre el despliegue |

**Un conversor de Markdown propio, y por qué (D-77).** No se añadió librería. El presupuesto de JS
está al 91 % del gate D1 y no cabe, pero la razón de fondo es otra: **una librería de Markdown acepta
HTML embebido**, y el contenido del blog acabará pasando por manos que no son las nuestras. Este
conversor construye elementos de React y no puede producir HTML arbitrario: un `<script>` escrito
dentro de un `.md` sale como texto.

**Verificación.** `check:blog`: **33** comprobaciones sobre el servidor real, con su prueba negativa
—un blog que publica sus borradores— en `check:brakes`. Van **dieciséis** frenos. `check:ci` en verde
con 38 rutas bajo presupuesto; `test:db`: 264.

---

## 2026-09-13 · DU-03, DU-04 y DU-05 — La capa pública completa · `done`

**58 rutas públicas**, las 67 páginas de la compilación, todas prerrenderizadas. La portada con sus
siete bloques, los cuatro overviews de rama y las once páginas de servicio con el contrato A.3, en los
dos idiomas.

### Las rutas, ahora las del Anexo A.2

DU-02 derivaba la ruta del nombre del archivo. No sirve para la oferta, que el Anexo A.2 **anida**:

| Antes | Ahora |
|---|---|
| `/slg-academy` | `/ai/academy` |
| *(no existía)* | `/ai/academy/phoenix-peex` … y los otros nueve servicios |
| `/holdings` *(registro de página)* | `/holdings` *(el registro de **servicio**, con su contrato A.3 y su D-11)* |

La tabla pasa a ser **explícita** (**D-79**): se lee de una vez y se compara con el Anexo A.2 línea a
línea. Y el registro de página `holdings` que DU-02 había creado **se retira** (**D-80**): dos
registros para una URL son dos fuentes para un solo texto, y la que se edita nunca es la que se sirve.

### El orden de los bloques vive en el contenido

La portada pide sus siete bloques y cada servicio sus seis **por posición** al cuerpo del `.md`
(**D-81**). Es lo que hace cierto que **añadir un servicio sea añadir un archivo** (RF-27). El riesgo
que abre —que alguien reordene o borre un bloque editando contenido— es justo lo que `check:paginas`
comprueba en las 22 páginas de servicio y las dos portadas, en cada push.

### Los criterios

**DU-03 — portada.** Los siete bloques en el orden de RF-09, comprobado por posición en el HTML
servido · los dos bloques vacíos —últimos artículos y descarga destacada— **redactados**, no huecos ·
`pair` recíproco y paridad en verde · cero cadena de negocio en componentes (`check:cadenas`) · una
idea por viewport y **cero fotografía**: el freno comprueba que no hay ni una `<img>` servida desde
fuera del dominio.

**DU-04 — los cuatro overviews.** Cada uno enlaza a **todos** sus servicios y a **ninguno ajeno**,
comprobado contra la tabla de rutas y no contra una lista escrita a mano · `Phoenix Academy` se enlaza
como **externo**, con `target="_blank"` y `rel="noopener"`, y el freno comprueba que **no hay ningún
`iframe`**: la frontera (e) dice sin integración, sin sesión compartida y sin contenido embebido · un
servicio sin registro de contenido **no rompe el índice**: se salta.

**DU-05 — las once páginas de servicio.** Las seis secciones del contrato A.3 en orden fijo, en las 22
páginas · **un solo llamado a la acción**: el freno cuenta los enlaces al documento y falla con dos,
y falla también si aparece un `<form>` en la página · cero `iframe` y cero scripts de terceros ·
la sección 6 enlaza a `/contacto` · ninguna ofrece «Sesión Cero» (`check:copy`) · estados resueltos:
servicio sin documento asociado y bloque «Qué incluye» vacío.

### Lighthouse, medido AHORA (criterio 6 de DU-03)

El criterio pide medir «aquí, ya, no al final», como mitigación de **R-21**. Medido en **móvil**, con
la simulación de red y CPU que Lighthouse aplica por defecto:

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| `/` | **96** | **100** | **100** | **100** |
| `/ai/enterprise/readiness` | **98** | **100** | **100** | **100** |
| `/blog/mes-cuatro` | **93** | **100** | **100** | **100** |

**Accesibilidad 100 en las tres**, que es lo que de verdad cuesta recuperar tarde. Queda como freno
(`npm run check:lighthouse`) con los umbrales en variables de entorno, así que endurecerlos no toca
código.

**Verificación.** `check:paginas`: **142** comprobaciones sobre el HTML servido, con su prueba
negativa —bloques desordenados, dos CTA, un formulario y un servicio de otra línea—. Van
**diecisiete** frenos. `check:ci` en verde con **58 rutas** bajo presupuesto; `test:db`: 264.

**Lo que falta para que estas páginas estén terminadas.** La **máquina** de la sección 5 —formulario
de descarga, entrega por enlace firmado y captura al CRM— es **DU-08**: hoy la sección anuncia el
documento y enlaza a su página. Y el copy sigue siendo temporal en los 74 registros.

---

## 2026-09-13 · DU-06, DU-07, FU-11 y DU-08 — Autoridad, SEO, anti-abuso y la máquina de descargas

**78 rutas públicas.** Con esto la capa pública queda completa de punta a punta: desde que alguien
llega por un buscador hasta que recibe su documento.

### DU-06 — Doctrina, Nosotros y legales

`/doctrina` publica las secciones de la colección `doctrine` **ordenadas por su campo `order`**:
añadir una sección es añadir un `.md`. El bloque «documento completo a solicitud» está, **sin
formulario y diciéndolo** — su máquina es DU-10, y un botón que no hace nada es peor que una frase
que explica por qué todavía no está.

Los legales pasan a **`/legal/privacidad` y `/legal/terminos`**, con sus pares ingleses, que son las
rutas del Anexo A.2. Responden **200 sin sesión**, y eso no es una preferencia: las pantallas de
consentimiento de Google y de Entra ID exigen una URL de privacidad que responda sin sesión (F.2-1,
R-13). Si dejan de hacerlo, el inicio de sesión social deja de poder configurarse. Los dos textos
**dicen en su primera línea que son provisionales**: necesitan revisión profesional antes del
lanzamiento, y decirlo dentro del texto es más honesto que dejarlo en una nota interna.

`/nosotros` no lleva ni una cifra, ni un premio, ni un caso: `check:copy` lo veta sin fuente, y la
propia página lo dice por escrito.

### DU-07 — SEO técnico, 404 y 500

| Qué | Dónde |
|---|---|
| Metadatos únicos por página e idioma | `lib/content/seo.ts`, una función, no repartido por 78 rutas |
| `canonical` propio + `hreflang` **recíproco** | ídem, con `x-default` al español |
| Open Graph con imagen de marca | ídem |
| `sitemap.xml` con los dos idiomas | `app/sitemap.ts` — sin borradores, que no tienen ruta |
| `robots.txt` | `app/robots.ts` — `/hq`, `/portal`, `/api` y `/prototipo` fuera del índice |
| `schema.org` `Organization` y `Service` | `components/DatosEstructurados.tsx` |
| 404 y 500 propias y bilingües | con **tres salidas de vuelta**: Home, `/ai` y `/blog` |

El freno `check:seo` hace **220 comprobaciones** sobre el HTML servido. La que más vale es el
**`hreflang` recíproco**: si una mitad del par no declara la vuelta, los buscadores **ignoran las
dos** — y la página se ve perfecta. Encontró dos cosas: `/holdings` sin metadatos, y **las once
páginas de documento sin par de idioma**, que dejaban el conmutador desactivado.

**Lighthouse móvil** (gate D6, criterio 4): `/` **98**, `/ai/enterprise/readiness` **97**,
`/blog/mes-cuatro` **92** de rendimiento, y **100 de accesibilidad, buenas prácticas y SEO en las
tres**. Umbral: 90.

### FU-11 — anti-abuso propio, sin un solo script de terceros

Tres capas, en el orden en que salen más baratas: **trampa → límite → dominio**.

1. **Campo trampa** — relleno ⇒ se descarta **en silencio** y **no crea captura**. Responde como un
   éxito: decirle a un bot que ha fallado es entrenarlo.
2. **Límite** por IP **y** por correo, con el contador **en la base de datos** y la clave **hasheada**
   (**D-83**). En memoria del proceso, dos instancias permiten el doble de peticiones.
3. **Dominios de correo gratuito** en una **tabla** (**D-82**), no en un archivo: RF-32 dice
   «editable **sin desplegar**», y un archivo obliga a recompilar. Se comprueba insertando un dominio
   y verificando el rechazo **sin reconstruir nada**.

### DU-08 — la máquina que paga el proyecto

**El orden de las operaciones ES el requisito**: verificar → **persistir el lead** → emitir la firma.
Si se emitiera la URL primero y la escritura fallara después, se habría entregado el documento sin
registrar el lead, que es exactamente lo contrario de por qué existe esto. La prueba lo comprueba
mirando la base después de cada envío.

El formulario es **HTML nativo con POST**: funciona sin JavaScript, funciona mientras la página
hidrata, y no cuesta un byte del presupuesto.

**12 comprobaciones contra PostgreSQL y el servidor reales**, entre ellas las que más se rompen:
documento **sin archivo** ⇒ captura igual, no emite firma y no crea `download_event` (RF-40); la
trampa ⇒ cero filas; el límite ⇒ corta y **no revela el umbral**.

### Lo que encontró el navegador, y ningún test

Se sacaron capturas de las páginas reales, y la portada salía **en blanco por debajo del hero**. El
reveal al scroll estaba escrito como se escribe siempre —`opacity: 0` por defecto— y eso **apuesta la
página entera** a que el observador dispare: sin JavaScript, con el script bloqueado, si la
hidratación falla o al imprimir, el contenido no aparece **nunca**. Corregido (**D-84**): nace
visible, se esconde solo lo que está fuera de pantalla, y hay un rescate a los 3 s.

De la misma tanda: los acentos graves del Markdown salían a la vista en las bajadas de una línea, y
el hero de cada servicio repetía entera la primera frase de su sección 1.

**Verificación.** `check:ci` en verde con **78 rutas** bajo presupuesto · `check:seo` 220 ·
`check:paginas` 142 · `check:armazon` 56 · `check:blog` 33 · `test:gesto` 20 · Lighthouse sobre el
umbral en las tres páginas · `test:db` **276** comprobaciones · **dieciocho frenos**, cada uno visto
en rojo por su motivo.

**Lo que falta de estas unidades.** El criterio 7 de DU-07 —declarar D1…D6 en verde **en staging**—
necesita el despliegue. Y DU-08 entrega «disponible próximamente» en los once documentos porque
**no hay PDFs**: el camino con archivo está construido y se probará en cuanto exista el primero.

---

## 2026-09-13 · DU-09 y DU-10 — La entrega al CRM y las otras dos puertas

### DU-09 — el CRM, con los dos modos y la cola que sobrevive

**El visitante nunca espera al CRM** (criterio 1). Su documento se entrega cuando la captura está
guardada; la sincronización ocurre después, en un barrido que corre **dentro del propio servicio**
(A-01): sin orquestador externo, sin servicio aparte y sin una URL disparable desde fuera.

**Los dos modos, los dos probados** (criterio 2). `contact_note` recorre buscar → crear → nota, y la
nota transporta documento, ruta, idioma, UTM y el mensaje **en su texto**. `lead_admission` hace un
`POST` idempotente por correo + documento contra un **doble** del endpoint, que es lo que el criterio
pide mientras el CRM no lo publique. Cambiar de modo es cambiar `CRM_MODE`: comprobado en la misma
prueba, sin migrar datos y sin tocar la unidad.

**La cola es la tabla** (criterio 5, R-23). La prueba lo demuestra como hay que demostrarlo: crea la
captura en un proceso, lo deja, y **lanza un proceso Node distinto** que la entrega. Si la cola
viviera en memoria del contenedor, ahí se perdería.

| Criterio | Cómo se comprueba |
|---|---|
| 6 · CRM apagado | El doble se «tira»: la captura queda `pending` con su error saneado y su próximo intento. Al volver, el reintento entrega. Es el gate **D7** |
| 7 · cinco fallos | Tras el quinto, `failed` + aviso por correo. Y el fallo del aviso **no revierte nada** (RF-119) |
| 8 · traza | Una fila de `crm_delivery` por intento, con endpoint y código |
| 9 · credenciales | La clave viaja **solo** en la cabecera; la prueba comprueba que no aparece en ningún cuerpo ni en `crm_last_error` |

**El barrido corre cada 20 s** (**D-87**), que cierra el `[PENDIENTE]` de `architecture` §6.2: tiene
que ser **menor que el escalón más corto** (1 min) o la espera real no sería la de RF-50.

### DU-10 — contacto y solicitud de Doctrina: la MISMA máquina

Las tres puertas —descarga, contacto, doctrina— llaman a `registrarCaptura` (**D-89**). Tres
manejadores paralelos habrían sido **tres sitios donde olvidarse del campo trampa**, y el que se
olvida no da ningún error: deja pasar. La prueba comprueba que las tres rechazan dominios gratuitos y
descartan la trampa en silencio.

`/gracias` distingue las tres variantes (criterio 7): un «gracias» genérico después de escribir un
mensaje deja al visitante sin saber si lo que mandó llegó.

`lead_capture` gana una columna `message` (**D-88**): la «ausencia deliberada» de `data_model` prohíbe
el **pipeline**, no el texto que la persona escribió.

### Dos rojos falsos, cazados antes de que enseñaran a ignorar los frenos

1. **Lighthouse dio 0 de rendimiento** en una ejecución, con 96 antes y 97 después. Un 0 no es una
   página lenta: es un audit que no llegó a correr. Ahora se repite **una** vez y se distingue «no se
   pudo medir» de «suspende» (**D-90**).
2. **`spawnSync` en la prueba del CRM** bloqueaba el proceso que aloja el doble, así que el hijo
   reclamaba la fila y el doble no podía contestarle. La entrega fallaba por timeout y **parecía un
   fallo de la cola** cuando era un fallo de la prueba.

**Verificación.** `test:crm`: **19** comprobaciones contra un doble del CRM y PostgreSQL real ·
`test:descargas`: **18**, con las tres puertas · `check:ci` en verde con **78 rutas** ·
`test:db`: **295** comprobaciones · **dieciocho frenos**.

**Lo que sigue esperando.** DU-09 necesita **F.2-5** —las dos claves del CRM real— para el criterio 2
en su mitad `contact_note` contra el CRM de verdad, y **S-01 cerrada**. Todo lo demás está construido
y probado contra dobles.

---

## 2026-09-13 · DU-12 — Webhooks salientes firmados y analítica sin terceros

**Qué se construyó.** `lib/webhooks/`: los **nueve** eventos de B.7 con su payload cerrado
(`eventos.ts`), la firma **HMAC-SHA256 sobre el cuerpo exacto que se envía** con la marca de tiempo
**dentro** de lo firmado (`firma.ts`), la lista de suscriptores con **secreto por suscriptor** y que
puede estar legítimamente vacía (`suscriptores.ts`), y la cola con la misma forma que la del CRM
—`FOR UPDATE SKIP LOCKED`, reserva de 5 min, escalera 1/10/60/360/1440, cinco intentos—
(`cola.ts`). Más `components/Analitica.tsx`: la analítica **autoalojada**, que sin variable no emite
absolutamente nada.

**Dónde salen los eventos.** Siete están cableados a código que ya existía: `lead.captured`,
`contact.submitted`, `doctrine.requested` y `download.completed` en `lib/descargas/service.ts`;
`lead.delivered_to_crm` en `lib/crm/cola.ts`; `invitation.sent` en `lib/invitations/service.ts`,
**también en el reenvío** —un reenvío es un envío, y callarlo haría que el flujo externo viera una
invitación donde hubo dos correos—. `post.published` no tiene momento que interceptar porque un
artículo se publica cambiando un archivo: se dispara al arrancar, comparando el repositorio con lo ya
registrado, y **apagado por defecto** (**D-93**). Los dos de M3/M4 tienen ya su función —
`anunciarEntregable`, `anunciarAviso`— para que la pantalla que los llame no pueda inventarse el
payload.

**El orden que no es negociable.** El evento **se registra antes de intentar enviarlo**, y **se
registra aunque no haya nadie escuchando** (**D-91**): es lo que hace cierta la promesa de RF-115.
`emitir()` **nunca lanza** (**D-94**): un suscriptor mal configurado no puede costarle el documento
a un visitante. En la cola del CRM el evento sale **fuera** de la transacción que marca `delivered`,
porque dentro un fallo del webhook revertiría una entrega al CRM que de verdad ocurrió.

**Ningún payload lleva contenido.** Ni el mensaje de contacto, ni el correo del invitado, ni el
cuerpo del artículo, ni el nombre del entregable. La excepción está razonada en RF-145 y es
`post.published`, que lleva los tres extractos de redes **y el enlace canónico en su idioma** para
que el suscriptor publique sin leer de vuelta el repositorio.

**Verificación — `test:webhooks`, 32 comprobaciones contra receptores HTTP reales y PostgreSQL real:**

| Criterio | Cómo se comprueba |
|---|---|
| 1 · nueve eventos | Se emiten **los nueve** y los nueve aparecen en `webhook_delivery`. No una muestra: el que falta siempre es el que nadie probó |
| 2 · firma | El receptor **recalcula la firma sobre el texto crudo** y verifica. **Un cuerpo alterado la invalida**; una marca alterada también; y la firma de A **no vale** con el secreto de B |
| 3 · reintentos | Primer fallo → `pending`, 1 intento, error guardado y cita **en el futuro**. Al quinto → `failed`, sin próxima cita. El receptor contó los cinco |
| 4 · sin suscriptor | El evento queda registrado con destino `(sin suscriptor)` y el barrendero no tiene nada que reclamar |
| 5 · `post.published` | Enlace canónico correcto en cada idioma (`/blog/…` y `/en/blog/…`), los tres extractos rellenos y las etiquetas |
| 7 · secretos | Ni en el payload, ni en la URL de destino, ni en `last_error` |
| cableado | `registrarCaptura` real: las tres capturas disparan `lead.captured`, el contacto añade `contact.submitted`, y el documento **«próximamente» NO dispara `download.completed`** (RF-40) |

**Prueba negativa del cableado (R-26).** Se desactivó la llamada a `download.completed` y las dos
comprobaciones que la vigilan se pusieron en rojo. Un `emitir` que funciona y que **nadie llama** es
el fallo más fácil de esconder detrás de una prueba verde.

### El freno nuevo: `check:terceros` — cero terceros, medido en un navegador

El criterio 6 y el gate **D1** no se pueden comprobar leyendo el repositorio (**D-95**). El freno
abre un Chromium sobre seis páginas públicas y afirma dos cosas: **toda petición sale de nuestro
origen** —o del de la analítica autoalojada, si está configurada— y **no queda ni una cookie**. Doce
comprobaciones en verde sobre el sitio real.

**Un hallazgo de la propia prueba negativa.** El fixture roto —un script de Google Tag Manager, una
fuente de un CDN y una cookie `_ga`— se abría al principio como `file://`, y **la mitad del medidor
que busca cookies salía verde**: Chromium no guarda cookies de un origen `file://`. La prueba
negativa estaba certificando un freno medio roto. Ahora el fixture **se sirve por HTTP** y las dos
mitades se ponen rojas.

### La analítica, mirada con el navegador antes de darla por hecha

Se levantó un Umami de mentira, se reconstruyó con la variable puesta y se abrió el sitio:

- en la capa pública el script **carga y se ejecuta**, sin ninguna violación de CSP, y **no escribe
  ninguna cookie**;
- en `/acceder` **no se carga** —`<Analitica />` solo cuelga del armazón público—, lo que dejó ver
  que el origen de la analítica sobraba en la política **estricta**: se movió a la pública, donde es
  lo único que lo necesita. Sin abrir el navegador, la CSP se habría quedado más ancha de lo
  necesario en justo las superficies que muestran datos de personas.

**Verificación global.** `lint` · `check:content` (1338) · `check:secrets` (391 archivos) ·
`check:env` · `check:migrations` · `check:fronteras` · `check:archivos` · `check:contraste` (21) ·
`check:motion` (201) · `check:cadenas` · `build:standalone` · `check:js-budget` (78 rutas) ·
`check:runtime` (30) · `check:armazon` (60) · `check:blog` (33) · `check:paginas` (142) ·
`check:seo` (220) · `test:gesto` (20) · **`check:terceros` (12)** · `check:lighthouse` (96/97/90) ·
`check:brakes`: **diecinueve frenos** · `test:db`: **320** comprobaciones.

**Lo que sigue esperando.** El criterio 6 queda cerrado en su forma más exigente —cero terceros— y
la analítica **no está desplegada todavía**: es un servicio `slg-analytics` en Easypanel y dos
variables. Mientras no exista, el sitio no mide nada, que es el estado por defecto correcto.

---

## 2026-09-13 · FU-12 — Shell de aplicación para HQ y portal

**Qué se construyó.** La implementación del **octavo componente de C.5**, ya con sesión detrás:
`components/app/ArmazonDeApp.tsx` (barra lateral, cabecera de ubicación y salida),
`components/app/EstadosCanonicos.tsx` (**un** componente para los seis estados),
`components/app/ContenidoEntregado.tsx`, `components/app/PantallaDeApp.tsx` (el puente con la
sesión), y `lib/app/` con la tabla de secciones, el vocabulario de estados y la resolución de
idioma. Los layouts de `(hq)` y `(portal)` ya lo montan: la compuerta sigue siendo lo primero y el
armazón se pinta **después** de verificar.

**Las tres preguntas de wayfinding (RNF-43), respondidas sin abrir nada.** *Dónde estoy*: el nombre
de la superficie y el de la sección, en la cabecera y en el enlace con `aria-current`, los dos
sacados de la **misma tabla** para que no puedan discrepar. *A dónde puedo ir*: las secciones,
permanentes. *Cómo salgo*: «cerrar sesión», visible y siempre en el mismo sitio — y es un
**formulario POST**, no un enlace: un cierre de sesión por GET lo dispara cualquier `<img src>` de
cualquier página y echa a la persona de su sesión desde fuera.

**Los seis estados son un componente, no seis** (**D-96**). Y son seis porque las tres parejas no
son redundantes: «todavía no hay nada» y «tu filtro no encuentra nada» se arreglan de formas
distintas; «no se pudo cargar» y «la acción falló» dicen cosas opuestas sobre si se perdió algo.
`sin_permiso` es uno solo y dice **«no encontrado»**: separar «no existe» de «no puedes» confirmaría
la existencia del recurso a quien no debe verlo.

**Esconder no es proteger** (**D-97**). Cada sección declara su acción de B.3 en la misma fila que
pinta el enlace: la barra lateral filtra con `puede()` y la página aplica `exigirSeccion()`.
`test:shell` recorre **las 32 combinaciones de rol × sección** y exige que lo que se ve y lo que el
servidor permite coincidan.

**Sin conmutador de idioma** (RF-72). La interfaz sale de `user.locale` y de nada más; cambiar de
idioma es cambiar la preferencia de la cuenta, no la vista. El contenido entregado va aparte, con
`lang` propio y `translate="no"`: traducirlo sería cambiar lo que se entregó, y sin `lang` un lector
de pantalla lee un entregable inglés con fonética española.

### Dos defectos que encontró la propia verificación

1. **`slg_admin` veía el portal de cliente entero en su barra lateral.** B.3 le concede la lectura
   de avisos y entregables —la tiene, y debe—, así que filtrar solo con `puede()` le ofrecía una
   navegación que el layout rechaza después. Tener permiso sobre un dato y tener **superficie** son
   cosas distintas (**D-98**). Lo cazó `test:shell` en su primera ejecución.
2. **El freno de fronteras cazó el módulo nuevo**: `lib/app/navegacion.ts` entraba por archivos
   internos de `lib/auth/`. La salida no fue relajar el freno sino abrir una **segunda puerta
   pública con la mitad pura** del módulo, `lib/auth/matriz.ts` (**D-99**) — el mismo caso que
   `@/lib/auth/edge`, al revés.

### Y uno que solo se vio abriendo el navegador

**La compuerta de revisión de C.5 se estaba mirando a 416 px de ancho.** `/prototipo` vivía en el
grupo `(auth)`, que centra a sus hijos en una tarjeta de 26 rem — la anchura de un formulario de
acceso. Los componentes de una columna aguantaban; el **armazón de aplicación** y el **visor de
entregables**, que existen para una pantalla ancha, **nunca se habían visto a su tamaño**, ni
siquiera cuando FU-10 se aprobó. Ahora `/prototipo` tiene su propio grupo y ocupa el ancho completo
(**D-100**); el `noindex` se conserva por las dos vías que de verdad lo ponen.

Medido después en un Chromium real, a 1280 y a 390: el armazón pasa de 406 px a **1110 px**, los
seis estados se pintan, la lista de secciones se **tumba en una tira horizontal** en móvil sin
plegarse, el botón de salida se ve en las dos anchuras, el contenido entregado sale con
`lang="en" translate="no"`, la página **no desborda horizontalmente** y no hay ni un error de
consola.

*(Una hora perdida y vale la pena anotarla: durante varias medidas el navegador siguió viendo la
versión vieja porque **un servidor de una ejecución anterior seguía escuchando en el puerto** y el
arranque nuevo fallaba en silencio. La página parecía no cambiar por más que se reconstruyera. Si
vuelve a pasar: `pkill -f standalone/server.js` antes de medir.)*

### El freno nuevo: `check:shell`

Comprueba lo mecanizable de los tres criterios: que los seis estados existan y tengan texto **en los
dos idiomas**; que **ninguna pantalla** de `(hq)` o `(portal)` escriba su propio estado —se busca la
**forma**: `role="alert"`, `aria-busy`, `data-slg-estado` fuera del componente canónico—; que no
aparezca un conmutador de idioma; y que toda sección declare una acción que **existe** en B.3.
Prueba negativa: una pantalla que rompe las dos cosas a la vez, y el freno se pone rojo por las dos.
`components/app/*` entra además en `check:cadenas`.

**Verificación global.** `lint` · `check:content` (1338) · `check:secrets` (402 archivos) ·
`check:env` · `check:migrations` · `check:fronteras` (161) · `check:archivos` · `check:contraste` ·
`check:motion` (212) · `check:cadenas` (13) · **`check:shell` (33)** · `build:standalone` ·
`check:js-budget` (78 rutas) · `check:runtime` (30) · `check:armazon` (60) · `check:blog` (33) ·
`check:paginas` (142) · `check:seo` (220) · `test:gesto` (20) · `check:terceros` (12) ·
`check:lighthouse` (96/96/91) · `check:brakes`: **veinte frenos** · `test:db`: **338**
comprobaciones.

**Lo que NO cambia todavía.** `SUPERFICIES_ABIERTAS` sigue en `false` para las dos: HQ y el portal
**siguen devolviendo 404 a todo el mundo** (RF-87). Lo que hay construido es el marco; las pantallas
son DU-13 en adelante, y la superficie se abre al cerrar su milestone, no antes.

---

## 2026-09-13 · DU-13 — Tablero de HQ

**Qué se construyó.** `/hq/tablero` con los nueve bloques de RF-73…RF-76: las **capturas del día**
filtrables por documento, página y fecha, con estado de entrega, intentos y **enlace directo al
contacto en el CRM**; las **métricas del pipeline leídas del CRM** con caché de cinco minutos;
empresas activas; proyectos y entregables recientes; **artículos publicados y borradores con sus
tres extractos sociales listos para copiar**; actividad de agentes; auditoría reciente; el **modo del
adaptador de captura**; y el botón «Abrir CRM». Detrás, `lib/hq/` —`tablero.ts`, `capturas.ts`,
`metricas.ts`— y la vista en `app/(hq)/hq/tablero/`.

**La decisión que gobierna el tablero: cada bloque cae solo** (**D-101**). El criterio 8 pide que con
el CRM caído la pantalla **se degrade**, no que se quede en blanco, así que cada bloque devuelve o su
contenido o su motivo. Y hay una segunda razón que solo se ve al pintarlo: **vacío y error son dos
estados canónicos distintos** de FU-12. Si un bloque devolviera un array vacío para las dos cosas, el
día que el CRM falle el tablero diría «todavía no hay nada» — una mentira tranquilizadora.

**Dos claves del CRM, de verdad** (**D-102**). `CRM_API_KEY_CAPTURE` escribe, `CRM_API_KEY_READ` solo
lee, y `sanear()` borra **las dos** de cualquier texto que salga. Leer con la clave de captura
funcionaría igual de bien — ese es exactamente el problema: el fallo no aparece hasta el día que hay
que revocar una y se descubre que apaga también la captura de leads. De paso se retiró un **bloque
duplicado de variables de CRM** en `.env.example`: los nombres de planificación y los de
implementación convivían, y una variable declarada dos veces es una variable que alguien pone en el
sitio que no se lee.

**El enlace profundo sale de la plantilla, y sin plantilla no hay enlace** (RF-54, criterio 2). No es
un caso degradado: la ruta del frontend del CRM está sin confirmar, y un enlace inventado lleva a un
404 que parece culpa del CRM. Lo mismo con una captura todavía en cola: sin contacto, sin enlace.

**El trabajo manual, visible al abrir** (criterio 7). Mientras el adaptador siga en `contact_note`,
el CRM no permite crear la oportunidad por clave de API: cada captura entregada deja un contacto y
una nota, y **alguien tiene que abrir el hueco**. El tablero cuenta cuántas esperan. Sin esa cifra
ese trabajo es invisible hasta que se pierde un lead.

**Verificación — `test:hq`, 28 comprobaciones contra PostgreSQL real y un doble del CRM:**

| Criterio | Cómo se comprueba |
|---|---|
| 1 · capturas del día | Se siembran tres: dos de hoy y una de hace dos días. Solo salen las dos |
| 2 · enlace profundo | **Sin plantilla no se pinta enlace**; con plantilla se construye con el id del contacto; una captura en cola no tiene ninguno |
| 3 · métricas | Marcadas `origen: "crm"` con marca de tiempo; la primera lectura llama a los **tres** informes de B.6 **con la clave de solo lectura**; la segunda **no vuelve a llamar** |
| 5 · artículos | El publicado trae los tres extractos y su URL; **el borrador aparece marcado y sin URL** |
| 7 · modo | El modo se ve, y con `contact_note` dice cuántas capturas esperan trabajo manual |
| 8 · CRM caído | El bloque de métricas señala el fallo, **su motivo no lleva la clave**, y **los otros ocho bloques siguen trayendo sus datos**. Al volver el CRM, vuelven solas |
| 9 · roles | `slg_admin` y `slg_operator` entran; `client_*` recibe **404**, que no confirma que el tablero exista |

### El freno nuevo: `check:hq` — la frontera (a) del alcance

RF-85 dice que HQ **no** gestiona leads, etapas, oportunidades ni pipeline. Eso escrito en un
documento no sobrevive a la prisa: una frontera de alcance no se cruza de golpe, se cruza con «ya que
estamos, un campito de etapa», y el campito no lo discute nadie porque parece pequeño. El freno
(**D-105**) mira tres cosas sobre `app/(hq)/` y `lib/hq/`: **vocabulario de pipeline en el código**
—no en los comentarios, que tienen que poder nombrar la regla—, **ninguna llamada al CRM que no sea
`GET`**, y que el tablero use la clave de solo lectura. Busca sobre el código **normalizado**, porque
con un `\b` a secas `etapaDelLead` y `pipelineStage` no caerían: en camelCase no hay frontera de
palabra, y es justo como se escribe el código de verdad.

Tiene **tres excepciones, nombradas y justificadas una a una**, todas para *contar* capturas que
siguen sin oportunidad (criterio 7). Guardar el identificador que el CRM devolvió y contar los que
faltan es lo contrario de gestionar: es señalar que el pipeline **está en otro sitio** y que alguien
tiene que ir. Ampliar esa lista obliga a discutir por qué la aparición nueva tampoco es gestión, que
es el efecto buscado.

Prueba negativa: una pantalla que cruza la frontera de las **tres** maneras —mueve etapas en
camelCase, hace `POST` al CRM y lee con la clave de captura—, y el freno se pone rojo por las tres.

### Limpieza que arrastró la unidad

`components/ShellDeApp.tsx` —el **prototipo** del octavo componente, de FU-10— tenía su propio
«estado vacío» y su propio «estado de error» al lado de los seis canónicos de FU-12: **dos
vocabularios para lo mismo**, que es exactamente lo que D-96 existe para impedir. Se retira; su tabla
y su ficha, que no estaban duplicadas, pasan a `components/app/TablaDeApp.tsx`, y el bloque 8 de
`/prototipo` enseña ahora el armazón de verdad con los seis estados.

**Verificación global.** `lint` · `check:content` (1338) · `check:secrets` (411) · `check:env` ·
`check:migrations` · `check:fronteras` (167) · `check:archivos` (220) · `check:contraste` ·
`check:motion` (221) · `check:cadenas` (15) · `check:shell` (33) · **`check:hq` (4)** ·
`build:standalone` · `check:js-budget` (78 rutas) · `check:runtime` (30) · `check:armazon` (60) ·
`check:blog` (33) · `check:paginas` (142) · `check:seo` (220) · `test:gesto` (20) ·
`check:terceros` (12) · `check:lighthouse` (96/97/93) · `check:brakes`: **veintiún frenos** ·
`test:db`: **367** comprobaciones.

**Lo que queda abierto, y por qué.** El tablero **no se ha visto renderizado en un navegador**:
`SUPERFICIES_ABIERTAS.hq` sigue en `false` y HQ devuelve 404 a todo el mundo con sesión válida
(RF-87), que es lo correcto mientras M3 siga abierto. Se comprobó que las rutas existen y responden
—`/hq` y `/hq/tablero` redirigen a `/acceder` sin sesión— y toda la lógica está verificada contra
PostgreSQL real y un doble del CRM. **La revisión visual del tablero queda como criterio abierto
hasta que la superficie se abra al cerrar M3**, igual que el criterio 7 de DU-07 espera al
despliegue. Y las métricas contra el **CRM real** siguen esperando **F.2-5**: las dos claves.

---

## 2026-09-13 · DU-14 — Empresas, proyectos, usuarios e invitaciones

**Qué se construyó.** Las tres pantallas que **convierten FU-07 en algo
consumible**: `/hq/empresas`, `/hq/proyectos` y `/hq/usuarios`, con sus Server Actions y sus
servicios en `lib/hq/`. Más `lib/auditoria/`, que faltaba: el registro de quién hizo qué **y de quién
intentó qué**.

**El registro apunta también los intentos** (**D-106**). El criterio 4 lo pide con todas las letras,
y es la mitad que casi nunca se implementa: un registro de solo éxitos contesta «¿quién borró esto?»
y no contesta **«¿alguien ha estado probando puertas?»**, que es la pregunta que avisa antes.
`conAuditoria()` envuelve toda escritura de HQ, así que el rechazo no se puede olvidar — y solo se
apunta como rechazo un `ErrorDeAutorizacion`: un fallo de base de datos no es alguien probando
puertas, y apuntarlo llenaría de ruido justo la consulta que importa.

**Una Server Action es un endpoint HTTP con otro nombre.** Cada una vuelve a resolver la sesión,
vuelve a exigir la sección y deja que el servicio aplique su fila de B.3: tres capas que fallan por
separado. Esconder el botón del formulario de «invitar a SLG» a un operador es correcto **y no es la
defensa** — la acción se puede llamar sin haber visto nunca el formulario.

**Revocar y reenviar son `POST`**, como «cerrar sesión» en FU-12 y por lo mismo: por GET los dispara
cualquier `<img src>` de cualquier página, y la invitación de alguien se caería sola.

**Verificación — `test:gestion`, 43 comprobaciones contra PostgreSQL real:**

| Criterio | Cómo se comprueba |
|---|---|
| 2 · nomenclatura | `«phoenix peex»`, `«Phoenix PEEX»`, `«SLG Readiness»`, un nombre inventado y el vacío: **ninguno vale**, y el rechazo lo hace **el servidor**, no solo el `<select>` |
| 3 · revocación | Se emite, se revoca y **el mismo testigo que valía hace un segundo ya no vale** |
| 4 · asignados | El operador **edita su proyecto** y **no** el ajeno; no crea empresas; no invita a SLG; no tiene `apikey.manage` ni `audit.read`. **Los cuatro intentos quedan auditados** |
| 6 · estados | Sin empresas · sin proyectos · **invitación caducada** · **correo fallido con la invitación viva y reenviable** |

### Cuatro defectos, y los cuatro los encontró la verificación

1. **RF-119 estaba incumplido y nadie lo había visto.** «Si el correo no sale, la invitación existe y
   es reenviable» era cierto para un fallo de **envío**, pero un fallo de **configuración** de SMTP
   lanzaba desde `enviarCorreo` y salía de `emitirInvitacion` como excepción — con la fila de la
   invitación **ya escrita**. La pantalla habría dicho «no se pudo crear» sobre algo que sí existía.
   Para RF-119 da igual por qué no salió el correo (**D-108**).
2. **Los once servicios de A.2 no cabían en el formulario.** La lista se derivaba de
   `LITERAL_TERMS`, y «AI Coaching for Directors» y «Customize Programs» no están ahí porque no son
   marcas registradas: **dos servicios de la oferta no se habrían podido dar de alta**. Ahora se
   derivan de la colección de contenido, así que «añadir un servicio es añadir un `.md`» (RF-27)
   también vale en HQ (**D-107**).
3. **Un slug repetido devolvía un error crudo de PostgreSQL** —un 500 por repetir un nombre—, y como
   el slug se deriva del nombre, repetirlo es lo más fácil del mundo (**D-109**).
4. **`"internal"` donde el vocabulario dice `"slg"`.** Lo paró la restricción
   `organization_type_valid` en la primera ejecución. Los vocabularios se reexportan ahora del
   esquema (**D-110**).

Y dos cosas que la base de datos hizo bien y conviene dejar escritas: **`audit_log` rechazó el
`DELETE` de la propia prueba** (RNF-29, migración 0003 — los apuntes se cuentan desde el instante en
que arranca la prueba, no en absoluto), y la clave ajena de un entregable **impidió que la limpieza
se llevara por delante los datos de la semilla**, porque el nombre «Cliente Demo» del criterio 1
choca con el de `db:seed`. Una prueba que borra datos que no ha creado es una prueba que rompe el
entorno.

**Verificación global.** `lint` · `check:content` · `check:secrets` (422) · `check:env` ·
`check:migrations` · `check:fronteras` (177) · `check:archivos` · `check:contraste` ·
`check:motion` (232) · `check:cadenas` (19) · `check:shell` (37) · `check:hq` (4) ·
`build:standalone` con las cuatro rutas de HQ · `check:js-budget` (78) · `check:runtime` (30) ·
`check:armazon` (60) · `check:blog` (33) · `check:paginas` (142) · `check:seo` (220) ·
`test:gesto` (20) · `check:terceros` (12) · `check:lighthouse` (96/96/92) · `check:brakes`:
**veintiún frenos** · `test:db`: **410** comprobaciones.

**Lo que queda abierto.** El **criterio 1** («Ricardo crea la empresa e invita a un usuario **desde
HQ**») y el **criterio 5** (gate **D8**: los tres métodos de acceso, la invitación aceptada por cada
uno, la vinculación por correo verificado, la recuperación y el cierre global, de punta a punta) no
se pueden cerrar todavía: el primero necesita la superficie abierta —HQ sigue en 404 por RF-87— y el
segundo necesita **F.2-2 y F.2-3**, los dos inicios de sesión sociales. Todo lo demás está construido
y verificado.

### Un arreglo de freno, de paso

`check:cadenas` daba un **falso rojo** sobre una firma de TypeScript: leía el `>` de una flecha
`=> void | Promise<void>` como si cerrara una etiqueta JSX y señalaba « void | Promise » como texto
visible escrito a mano. Un freno que da falsos rojos enseña a ignorarlo, que es peor que no tenerlo.
Su prueba negativa se volvió a ejecutar después del arreglo y sigue poniéndose roja por lo que debe.

---

## 2026-09-13 · DU-16 — Capturas web: lista, detalle de intentos y reintento manual

**Qué se construyó.** `/hq/capturas`: la lista **de todos los días** —no solo de hoy—, filtrable por
estado, documento y página; el **detalle de cada intento** leído de `crm_delivery` dentro de un
`<details>` por fila; y el **reintento manual**, que abre un ciclo nuevo y queda auditado. Detrás,
`lib/hq/reintento.ts`.

**No filtra por día y el tablero sí, a propósito.** El tablero pregunta «qué ha pasado hoy»; esta
pantalla pregunta «qué hay pendiente». Una captura fallida de hace tres días es justo la que hay que
ver, y con el día puesto no saldría nunca: así se pierde un lead sin que nadie haga nada mal.

**CF-1, resuelto y demostrado** (**D-111**). El reintento **abre un ciclo**: el contador vuelve a
cero dentro de un ciclo 2 y la escalera de espera vuelve a empezar. La prueba demuestra las tres
cosas que hacían falta para que la salida valga: la traza vieja **sigue entera** (cinco filas del
ciclo 1, ninguna pisada), el barrido siguiente escribe **en el ciclo 2** sin que el índice único
rechace nada, y el ciclo nuevo empieza otra vez por el intento 1 — los cinco de RF-50 son **por
episodio**.

**Es idempotente, y eso no es un detalle**: reintentar algo ya entregado crearía un contacto
duplicado en el CRM, en silencio. Se contesta «ya estaba entregada» y no se toca nada. Una captura
que sigue en cola tampoco se reintenta: la está intentando el barrendero.

**El detalle no enseña el cuerpo enviado** (**D-112**): lleva el correo, el nombre y el mensaje de la
persona, y esta pantalla se comparte en capturas cuando algo falla. Para diagnosticar basta con qué
se llamó, qué código contestó y qué devolvió.

**Verificación — `test:capturas`, 23 comprobaciones contra PostgreSQL real y un doble del CRM:**
cinco intentos hasta `failed` · lista con estado, intentos y último error · el detalle refleja
exactamente las filas · el reintento abre ciclo, limpia el último error y **queda auditado** · la
traza vieja intacta · el ciclo 2 entrega al volver el CRM · reintento sobre entregada: idempotente ·
sobre una en cola: no procede · **CRM caído durante el reintento**: se acepta igual y el intento
nuevo se apunta sin perder la captura · trabajo manual señalado por fila · enlace desde la plantilla.

### Dos cosas que enseñó la verificación

1. **La señal de «falta abrir el hueco a mano» no es un campo que falte: es el modo.** La prueba
   intentaba apagarla poniéndole `crm_opportunity_id` a una captura entregada en `contact_note`, y
   **la restricción `lead_capture_contact_note_shape` lo rechazó**: en ese modo el CRM no permite
   crear la oportunidad por clave de API (B.6), así que esa columna tiene que estar vacía. O sea que
   **todas** las de ese modo exigen trabajo manual, que es exactamente lo que dice R-04. La señal se
   apaga cambiando de modo, no rellenando un hueco.
2. **`check:shell` cazó la pantalla nueva** escribiendo su propio `role="status"` para la
   confirmación del reintento. La salida no fue relajar el freno sino ver que a los seis estados
   canónicos les faltaba vecino: una **confirmación** no es una situación de la pantalla, pero
   merece componente por la misma razón que ellos —el papel ARIA escrito a mano se olvida en la
   mitad de los sitios y no se nota mirando— (**D-113**).

**Verificación global.** Todos los frenos en verde · `check:brakes`: **veintiún frenos** ·
`test:db`: **433** comprobaciones · las **cinco** rutas de HQ compilan.

**Lo que queda abierto.** La revisión visual, como en DU-13 y DU-14: HQ sigue devolviendo 404
mientras M3 esté abierto (RF-87).

---

## 2026-09-13 · DU-17 — Claves de API y registro de auditoría

**Qué se construyó.** `/hq/claves` —crear con alcances, límite y caducidad **obligatorios**, y
revocar— y `/hq/auditoria` —el registro consultable y filtrable, **solo para `slg_admin`**—, con
`lib/hq/claves.ts` detrás. Con esto M3 tiene sus cinco pantallas.

**El secreto no pasa por la URL** (**D-114**). Lo cómodo sería `?clave=slg_…` después de crearla, y
esa URL acaba en el historial, en el registro del proxy, en el `Referer` de la petición siguiente y
en la primera captura de pantalla que alguien comparta. Viaja un identificador opaco de un solo uso;
el valor vive en memoria del servidor hasta que la pantalla lo enseña, y al enseñarlo se borra.
Recargar no lo vuelve a mostrar, y eso es el comportamiento correcto.

**La caducidad se deja vacía a propósito** (**D-115**). Prerrellenarla con «dentro de un año» haría
que todas las claves duraran un año porque nadie lo cambió: el defecto silencioso que R-14 existe
para evitar.

**Los alcances son casillas y se guardan tal cual** (**D-116**). Un `<select multiple>` esconde media
lista y se desmarca solo al hacer clic sin `Ctrl`; y expandirlos al guardar inventaría en la base de
datos una jerarquía que RF-147 prohíbe.

**La auditoría dice en voz alta que es inmutable.** No por transparencia: porque quien opera tiene
que saber que lo que hace **queda**, y esa expectativa es la mitad del valor de un registro. Los
intentos rechazados tienen su propio filtro — llevan sufijo `.denied` en la misma columna (D-106),
así que «enséñame lo que alguien intentó y no pudo» es una casilla, no una consulta.

**Verificación — `test:claves`, 31 comprobaciones contra PostgreSQL real:**

| Criterio | Cómo se comprueba |
|---|---|
| 1 · obligatorios | Sin alcances, con un alcance inventado, sin caducidad, con caducidad pasada, con límite cero y sin nombre: **ninguna se crea**, y quien lo impide es el servidor |
| 2 · una vez | El secreto vuelve al crear; en la base **solo la huella**; la primera visita lo enseña y **la segunda no**; el apunte de auditoría **no lo contiene** |
| 3 · revocación | Antes verifica, después **no**, en la petición siguiente y sin caché que invalidar |
| 4 · granularidad | `deliverables:write` **no** trae `deliverables:read`; el contexto lleva exactamente lo pedido |
| 5 · auditoría | `slg_admin` la lee; `slg_operator` recibe denegación **y su intento queda auditado** |
| 6 · inmutable | La prueba intenta un `UPDATE` y un `DELETE` **con el usuario dueño de la base** y **los dos fallan**; el apunte sigue con su acción original; y no existe función de editar ni borrar en `lib/hq` |
| 7 · estados | Sin claves · sin eventos · filtro sin resultados · **clave caducada**, que la lista da por muerta sin necesidad de revocarla |

**Verificación global.** Todos los frenos en verde · `check:brakes`: **veintiún frenos** ·
`test:db`: **464** comprobaciones · las **siete** rutas de HQ compilan.

**Lo que queda abierto.** La revisión visual, como en las demás de M3: HQ sigue devolviendo 404
mientras el milestone esté abierto (RF-87). El cierre de M3 con **DoD #4** necesita además la
superficie desplegada.

---

## 2026-09-13 · DU-15 — Entregables y avisos · **M3 completo en código**

**Qué se construyó.** `/hq/entregables` —los cinco tipos, por archivo o por enlace, con visibilidad
`client` o `internal` y **versionado desde el primer día**— y `/hq/avisos` —un aviso dirigido a **una
empresa**, con cuerpo en Markdown y vista previa de lo que verá el cliente—. Con esto HQ tiene sus
**nueve rutas** y M3 está construido entero.

**De paso se cierran los dos emisores que DU-12 dejó declarados**: `deliverable.published` y
`announcement.published` salen ya desde sus superficies, por las funciones de `lib/webhooks` que
impiden inventarse el payload. Ninguno lleva el título, el archivo ni el cuerpo: un webhook que sale
de nuestra infraestructura no puede ser la puerta por donde viaja material de un cliente (§10-6).

**Cada versión tiene su propio objeto** (**D-117**). Con la misma clave, la fila de la versión 1
apuntaría al archivo de la 2: el histórico existiría en la base y **mentiría**.

**La lista del cliente es otra función, no un parámetro** (**D-118**). Un filtro opcional es un
filtro que alguien olvida pasar, y aquí el olvido enseña material interno a un cliente.

**El archivo no pasa por el servidor.** El formulario manda nombre, tipo y tamaño; el servidor valida
los tres **antes de firmar** (RNF-25) y devuelve una URL de subida directa al bucket privado. Sin
firma no hay escritura posible, así que no existe ninguna ventana en la que un archivo no validado
esté en el bucket.

**Verificación — `test:entregables`, 40 comprobaciones contra PostgreSQL real:** los cinco tipos ·
MIME que no corresponde, archivo por encima del tope, tipo sin archivo y `link` con esquema que no es
http(s): **los cuatro rechazados y ninguno escrito** · la versión 2 con las dos consultables y
**objetos distintos** · `internal` que HQ ve y el cliente no · atribución `user` vs `api_key` con su
nombre · el aviso ligado a su empresa, guardado **tal como se escribió**, y sin aviso global.

### Dos defectos que encontró esta unidad, y ninguno era de ella

1. **El Markdown pintaba `href` de cualquier esquema.** Hasta ahora todo venía del repositorio y
   revisado; **los avisos de HQ los escribe una persona y los lee un cliente**, así que
   `[pulsa aquí](javascript:…)` deja de ser teórico. La regla salió del `.tsx` a
   `lib/content/markdown-seguro.ts` (**D-119**) porque dentro del JSX **solo se podía probar abriendo
   un navegador**, y se comprueba con `new URL()` y no con una lista negra: la prueba recorre
   `javascript:`, `JavaScript:`, ` javascript:`, `data:text/html`, `vbscript:` y `file:`.
2. **`check:js-budget` se puso ROJO al pasar de 150 KB**, y la causa no era una librería: `error.tsx`
   tiene que ser componente de cliente e **importa `content/ui/<lang>.json` entero**, así que las
   ciento cincuenta cadenas que M3 añadió para HQ viajaban al navegador de alguien que solo entra a
   leer el blog. Las siete de la 404 y la 500 pasan a `content/ui/error.<lang>.json` (**D-120**): la
   ruta más pesada baja de **150,2 KB a 142,3 KB** y el goteo queda cortado de raíz.

**Verificación global.** `lint` · `check:content` · `check:secrets` (436) · `check:env` ·
`check:migrations` · `check:fronteras` (188) · `check:archivos` · `check:contraste` ·
`check:motion` (246) · `check:cadenas` (25) · `check:shell` (41) · `check:hq` (4) ·
`build:standalone` con las **nueve** rutas de HQ · `check:js-budget` (**142,3 KB**) ·
`check:runtime` (30) · `check:armazon` (60) · `check:blog` (33) · `check:paginas` (142) ·
`check:seo` (220) · `test:gesto` (20) · `check:terceros` (12) · `check:lighthouse` (96/97/90) ·
`check:brakes`: **veintiún frenos** · `test:db`: **504** comprobaciones.

**Lo que queda abierto de M3.** Las cinco unidades están construidas y verificadas contra
PostgreSQL real, un doble del CRM y un doble de S3. Lo que falta **no es código**: la revisión visual
y el cierre de **DoD #4** necesitan la superficie abierta —HQ devuelve 404 mientras M3 esté abierto
(RF-87)— y el gate **D8** necesita **F.2-2** y **F.2-3**, los dos inicios de sesión sociales.

---

## 2026-09-13 · FU-13 — Batería de pruebas de aislamiento entre empresas

**Qué se construyó.** `scripts/auth/test-aislamiento.ts`: la batería que **demuestra** —no que
sugiere— que un `client_*` no lee nada de otra empresa ni alcanza ninguna ruta de `/hq`. Corre en
`test:db` **y en `check:ci`**, así que su fallo bloquea el despliegue (criterio 4, RNF-19).

**Se escribe antes que las pantallas del portal**, que es la mitad de su valor: cuando DU-18…DU-21
empiecen a leer datos de cliente, la red ya está puesta y una consulta que se salte el contexto se
pone roja el mismo día, no en la auditoría final.

**Convive con `test:isolation` y no la sustituye** (**D-121**). Aquella contesta «¿la política de
fila acota?»; esta contesta «¿las consultas que las pantallas van a llamar pasan por la política?».
Una política correcta con una consulta que la esquiva sigue siendo una fuga, y la consulta que la
esquiva se escribe arriba, no en SQL.

**Las quince comprobaciones.** Dos empresas con todo duplicado —proyecto, entregable, aviso,
usuario— y se comprueba en las dos direcciones: A ve **lo suyo** y **nada** de B, y B al revés. Que
se lea lo propio importa tanto como que no se lea lo ajeno: sin eso, una función rota que no
devuelve nunca nada pasaría por verde. Después, el criterio 3: A **pidiendo explícitamente** los
avisos de B recibe cero, y pidiendo los suyos los recibe — el filtro funciona, lo que no funciona es
cruzarlo. Y las **nueve** secciones de HQ, con los dos roles de cliente: denegación en las dieciocho
combinaciones.

### El fixture negativo, y el hallazgo que dejó por el camino

La primera versión del fixture usaba `withSystemScope`, y **no filtraba nada**: ese ámbito fija
`app.actor_role = 'system'`, que no está en la lista de roles que la política deja pasar, así que la
consulta mala devolvía cero. Hallazgo útil —**`withSystemScope` no abre las tablas con
`organization_id`**— pero como prueba negativa no valía: un fixture que no rompe nada no demuestra
que la batería sepa ponerse roja.

El fallo que **sí** pasa la política es el que RF-71 prohíbe con todas las letras: **construir el
contexto con un `organization_id` que llega en la petición** (**D-122**). Desde dentro de la base no
hay nada raro —alguien dijo que el actor pertenece a esa empresa— y por eso hay que atraparlo
arriba. Con el fixture puesto, la batería se pone roja y dice cuántas filas ajenas se filtraron.
Queda registrado en `check:brakes`, que sube a **veintidós frenos**.

**Verificación global.** `lint` · `check:fronteras` (188) · `check:secrets` (439) ·
`check:brakes`: **veintidós** · `test:db`: **519** comprobaciones.

---

## 2026-09-13 · Puesta en marcha — **la página deja de mandar a consolas y hace el trabajo**

**Qué lo motiva.** Ricardo se atascó en el §2.1 de `docs/deployment.md`, y tenía razón en las cinco
preguntas: *«¿qué consola? ¿dónde está? ¿tengo que entrar a una web?»*, *«¿dónde pongo la
contraseña?»*, *«las variables S3 dicen “de minio”, ¿eso qué significa?»*. El documento estaba
escrito para alguien que ya sabe que Easypanel tiene pestaña de consola — o sea, para quien no lo
necesita. Y el §4ter lo mandaba a la consola de MinIO a hacer a mano lo que la API hace en dos
llamadas.

**La respuesta no fue reescribir el documento y ya.** Fue **quitar el trabajo**:

`/api/ops` ahora **actúa** (**D-123**). Dos botones:

- **«Ponerle la contraseña al usuario de la base»** — hace el `ALTER ROLE slg_app` usando la conexión
  del rol dueño, que la aplicación ya tiene. Sustituye entero al «hazlo en la consola de
  `slgwebpostgres`». Es idempotente y, después, **comprueba que la aplicación conecta de verdad** —
  con una conexión nueva, no con el pool, que puede llevar dentro una conexión abierta con la
  contraseña vieja y diría que todo va bien mientras la siguiente petición falla.
- **«Crear los dos buckets y cerrarlos»** — crea `downloads` y `deliverables` si no están y pide el
  bloqueo de acceso anónimo. Sustituye a entrar a la consola de MinIO.

Y una tercera cosa que no es un botón pero es la que más tiempo ahorra: **un inventario de
variables**. Diecinueve filas con el nombre exacto que hay que escribir en Easypanel, para qué sirve
cada una, y si está puesta o falta. De las secretas dice *«puesta (34 caracteres; no se muestra)»*:
nunca el valor.

**Las acciones son de POST y no aceptan valores de la petición** (**D-124**). Un `ALTER ROLE`
alcanzable por GET lo dispara el prefetch del navegador y cualquier `<img src>`; y una ruta que
aceptara la contraseña por parámetro sería una ruta para cambiar la clave de la base desde fuera. La
contraseña sale de `APP_DB_PASSWORD`, o sea del mismo panel donde vive la cadena de conexión.
`check:runtime` lo comprueba **contra el servidor**: un GET con `accion` no ejecuta nada, y un POST
sin testigo es 404.

**Ninguna acción puede acabar en 500** (**D-125**), y eso lo encontró la prueba: la primera versión
devolvía «Internal Server Error» al pulsar el botón de los buckets sin `S3_ENDPOINT` — una pantalla
en blanco justo en el momento para el que la página existe. Ahora dice *«Falta la variable de entorno
S3_ENDPOINT»*.

**Lo que el código NO puede hacer, y sigue siendo suyo.** Pegar valores en Easypanel. Eso es todo. Y
dos de esos valores **ya existen y solo hay que copiarlos de un servicio a otro**: `MINIO_ROOT_USER`
y `MINIO_ROOT_PASSWORD` del servicio `minio` son credenciales S3 válidas, así que **no hace falta
entrar a la consola de MinIO ni crear una clave de acceso**. Crear una clave aparte es más limpio y
se puede hacer después; para arrancar, no.

### Verificación

`test:aprovisionar`, **12 comprobaciones contra un servidor S3 que responde de verdad**: sin
variables **cuenta cuál falta** en vez de lanzar; crea los dos buckets; **la segunda vez dice «ya
existía» y no falla** —un botón que falla la segunda vez es un botón que la gente teme pulsar—; y si
el servidor se rompe, sale fila roja y no excepción. Su propio doble tuvo un fallo: el bloqueo de
acceso anónimo viaja como `PUT /bucket?publicAccessBlock` y la marca está en la **consulta**, no en
la ruta, así que caía en la rama de «crear bucket».

Y la página completa, probada con el servidor `standalone` real: 404 sin testigo, 404 con testigo
incorrecto, el botón de la contraseña deja la base con *«Conecta como slg_app»*, el de los buckets
degrada con el nombre de la variable que falta, y una acción inventada no rompe nada.

`check:runtime` sube a **33** comprobaciones y `test:db` a **531**.

### El documento, reescrito

- **§0bis (nuevo)** — la ruta corta: cinco pasos, y dice desde el principio que **no hay consolas**.
- **§2.1** — seis pasos numerados. La cadena de conexión explicada **trozo a trozo**, con una tabla
  que dice de dónde sale cada uno y cuál te inventas tú. Dónde está la contraseña del dueño:
  Easypanel → `slgwebpostgres` → Environment → `POSTGRES_PASSWORD`. Qué significa «de minio»: copiar
  dos valores de un servicio a otro.
- **§2.2** — staging como «lo mismo con tres diferencias», con tabla.
- **§2.3 (nuevo)** — qué variable va en cada servicio, de un vistazo.
- **§4bis.0** — **corregido**: `slg-web` tenía bien el remitente; el que estaba mal era
  `slgweb-staging`. Queda anotado que la corrección anterior era falsa y que la fuente es el panel,
  no lo que yo supuse.
- **§4ter** — ya no manda a la consola de MinIO. Explica qué era esa pantalla de login que le salió y
  cuáles son sus credenciales, y deja claro que **no hace falta entrar**.

**Las cadenas de conexión de ejemplo van partidas en trozos a propósito**: escritas enteras, el
análisis de secretos pone el CI en rojo, y tiene razón aunque sea un ejemplo.

---

## 2026-09-13 · DU-18 — Inicio del portal con avisos

**Qué se construyó.** `/portal`: los avisos dirigidos a la empresa del usuario, con el cuerpo en
Markdown saneado y el estado vacío **redactado**.

**La pantalla no recibe ningún `organization_id`** (**D-127**), y esa es la unidad entera. Ni por
parámetro, ni por la URL, ni como prop: el filtrado lo hace la política de fila con el contexto de la
sesión. Por eso el criterio 1 —«los de otras empresas no aparecen **ni por enlace directo**»— es
cierto sin ninguna comprobación añadida: **no hay enlace que construir**. Lo que no existe no se
puede manipular.

**El estado vacío está redactado, no es un hueco** (criterio 2). Dice qué va a pasar y, sobre todo,
**que no hace falta volver a mirar**: el aviso llega por correo. Un portal al que hay que asomarse
por si acaso es un portal que nadie abre.

### El defecto que esta unidad destapó: el aviso no sabía en qué idioma estaba

`announcement` no guardaba idioma. Al ir a mostrar el aviso «tal como se entregó» (RF-72) resultó que
lo único que se podía poner en `lang` era **el idioma de la interfaz de quien lo lee** — o sea, el
atributo mentía. Y no es decorativo: `lang` es lo que hace que un lector de pantalla lea un aviso en
inglés con fonética inglesa en vez de deletrearlo en español, que es exactamente el caso de un
cliente internacional leyendo lo que SLG le escribió.

Migración **0012**: `announcement.locale`, con `CHECK (locale IN ('es','en'))` y defecto `es`. Lo
elige **quien publica**, en el formulario de `/hq/avisos`, porque se escribe a clientes
internacionales en inglés con el panel en español todos los días (**D-126**).

### Y un fallo de encadenado que solo aparece corriendo la suite entera

`test:webhooks` borraba sus capturas sin borrar antes su traza de `crm_delivery`, que las referencia
con `ON DELETE RESTRICT` —la traza de una entrega es evidencia y no se borra en cascada—. En
ejecuciones sueltas nunca había traza; encadenado detrás de `test:crm`, sí. **Los hijos primero.**

**Verificación.** `test:aislamiento` sube a **19** y cubre ya la superficie del portal: `client_member`
alcanza «avisos» y «entregables» y **no** alcanza «miembros», que es de `client_admin` — eso no es una
fuga, es la matriz haciendo su trabajo. `test:entregables` sube a **43** con el idioma del aviso.
`test:db`: **538** comprobaciones. Todos los frenos en verde, `check:brakes` **veintidós**.

**Lo que queda abierto.** Como el resto de M3 y M4: el portal **sigue devolviendo 404** mientras M4
esté abierto (RF-87), así que la revisión visual espera. Y DU-19 necesita el **subdominio del visor**
(D-45), que sigue sin fijarse.

---

## 2026-09-13 · DU-19 — Proyectos, entregables y visor aislado

**Qué se construyó.** `/portal/proyectos`, `/portal/proyectos/[id]` y
`/portal/entregables/[id]` con el **despacho por tipo desde el mapa**, más el visor en su propio
origen: `lib/visor/` y la ruta `/visor/[id]`.

**El `[PENDIENTE]` de D-45 queda cerrado**: el subdominio es **`visor.softlandingglobal.com`**
(**D-128**). Se llama «visor» y no «entregables» porque **nombra el mecanismo, no el contenido**: el
día que por ahí se sirva algo que no es un entregable, un nombre que describe el contenido obligaría
a elegir entre mentir y migrar URLs.

**Sin origen separado no se sirve nada** (**D-129**), y el caso que importa no es la variable vacía:
es la variable **apuntando al mismo dominio de la aplicación**. Todo compilaría, los `sandbox`
seguirían puestos, la pantalla funcionaría — y el documento compartiría origen con la sesión del
cliente. `visorEstaSeparado()` compara los dos orígenes, y `test:visor` prueba **ese caso aparte**,
porque es el que nadie prueba. Cuando no hay origen, el portal enseña un estado que lo dice en vez de
replegarse.

**Tres capas y ninguna sustituye a las otras** (**D-130**). La prueba lo enseña mejor que cualquier
explicación: el `<img>` externo del entregable hostil **sobrevive al saneado** —una imagen es
contenido legítimo de un informe— y lo corta la **política**; el `onmouseover` lo corta el
**saneado**; y si las dos fallaran, el **origen separado** impide que el script toque la sesión,
porque eso no lo decide nuestra configuración sino el navegador.

**El middleware corta el host antes que nada.** En `visor.softlandingglobal.com` solo vive
`/visor/...`: cualquier otra ruta es 404. Sin eso, el portal entero se serviría desde el subdominio
del visor — sin sesión, pero como una copia del sitio en otro dominio, que es una superficie más que
auditar y un sitio donde alguien acabaría poniendo la cookie «para que funcione». Y al revés:
`/visor/...` pedido en el dominio de la aplicación también es 404.

**El tipo decide con el mapa** (RF-142, criterio 4). La pantalla lee `especificacionDe(tipo).modo` y
pinta el modo. Añadir un tipo con un modo que ya existe **no toca ese archivo**.

**Verificación — `test:visor`, 25 comprobaciones contra un entregable hostil de verdad.** El
laboratorio (`scripts/ci/negative/visor/entregable-hostil.html`) parece un informe trimestral y hace
las siete cosas que el visor tiene que impedir: robar la cookie, llamar a la API con las credenciales
del navegador, cargar un píxel externo, ejecutar por atributo de evento, un enlace `javascript:`, un
formulario a otro dominio y un iframe anidado. Después del saneado no queda ni un `<script>`, ni un
`<iframe>`, ni un `<meta>` de redirección, ni un `<link>` externo, ni un `<form>`, ni un solo
atributo `on…` — **y el texto legítimo del informe sigue ahí**, porque sanear no es vaciar.

**Lo que queda abierto, y es honesto decirlo.** El criterio 3 pide que la prueba corra «contra el
visor servido desde su **origen separado definitivo**». Eso exige el subdominio desplegado, así que
lo que está verificado hoy son **las capas 2 y 3 en funcionamiento** y la **capa 1 declarada** —que
el visor se niega a servir si el origen no está separado—. La capa 1 *en funcionamiento* se verifica
cuando `visor.softlandingglobal.com` exista: un registro `A` en Hostinger y un dominio en Easypanel
apuntando al mismo servicio `slg-web`.

**Verificación global.** Todos los frenos en verde · `check:brakes`: **veintidós** · `test:db`:
**563** comprobaciones · las **cinco** rutas nuevas compilan.
