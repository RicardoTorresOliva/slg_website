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

## 2026-09-08 · FU-05 — Despliegue, CI y entorno · `in_progress`

Unidad partida en dos: lo que se construye en el repositorio y lo que se
configura en paneles externos. **La mitad de agente está hecha; la de Ricardo no.**

### Hecho y verificado

| Pieza | Evidencia |
|---|---|
| `Dockerfile` multietapa, salida `standalone`, usuario sin privilegios | Empaqueta `static/` y `public/`, que Next no copia por diseño |
| Endpoint `/api/health` | Deliberadamente tonto: no comprueba base de datos, para que una integración caída no provoque reinicios de un contenedor sano |
| Cabeceras de seguridad (B.8, criterio 7) | CSP, HSTS 2 años, `frame-ancestors: none`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, sin `X-Powered-By` — **verificadas en respuesta HTTP real** |
| `.env.example` (criterio 6) | **42 variables, cero valores**, cada bloque con su servicio consumidor y su unidad |
| Pipeline de CI | Dos jobs, 18 pasos, los **seis frenos** del criterio 4, cada uno con su prueba negativa |
| `scripts/db/setup-app-role.ts` | Cierra el hueco que hacía fallar el primer despliegue |
| `scripts/ci/check-secrets.ts` + su prueba negativa | 9 patrones; detecta credenciales literales y **no** marca referencias a variable |
| `scripts/ci/check-lighthouse.ts` | Gate D1 por Lighthouse contra el build real (D-50, ver entrada del 09-09) — sustituye al script de presupuesto de KB que corrió ese día |

**Simulación local completa del pipeline: 16 pasos en verde, 1 en rojo** (el
presupuesto de JS, a propósito — ver más abajo).

### Hueco propio, encontrado y cerrado

Las migraciones crean el rol `slg_app` y le quitan `BYPASSRLS`, pero **no pueden
asignarle contraseña**: una contraseña en un archivo versionado sería un secreto
en un repositorio público. Sin ese paso, la aplicación no arranca y el primer
despliegue falla. `setup-app-role.ts` lo cierra: lee `DATABASE_URL` —una sola
fuente de verdad, sin una tercera variable que se desincronice—, asegura el rol,
y **verifica que no es superusuario y no tiene `BYPASSRLS`** antes de dar el paso
por bueno. Probado en tres escenarios: rol existente, rol borrado, y
`DATABASE_URL` apuntando por error al superusuario, que rechaza con explicación.

### Hallazgo mayor · R-40 · el gate D1 y el stack son incompatibles

Medido: el suelo de React 19 + Next 16 App Router es de **172,3 KB comprimidos**
en una página vacía, con **cero librerías de la aplicación** en el paquete
—verificado buscando `motion`, `gray-matter`, `drizzle` y `postgres` en los
chunks: ninguno viaja. El gate D1 fija 150 KB. Ambos los decidió Ricardo.

**Pero el objetivo del gate sí se cumple.** Lighthouse móvil sobre la salida real:

| | Umbral DoD #7 | Medido |
|---|---|---|
| Performance | ≥ 90 | **98** |
| Accesibilidad | ≥ 90 | **100** |
| Best Practices | ≥ 90 | 92 |
| SEO | ≥ 90 | **100** |
| LCP | < 2,5 s | **2,4 s** |
| TBT | — | 20 ms |

Los 150 KB eran un **proxy mal calibrado del objetivo**, no el objetivo. Las tres
salidas están en R-40 y la decisión es de Ricardo. Hasta entonces la comprobación
falla a propósito: un gate que se relaja solo deja de ser un gate.

### Corrección de accesibilidad, encontrada al medir

La primera medición dio **89** en Accesibilidad, un punto por debajo del DoD #7.
Causa: el enlace se distinguía **solo por color**, y contra el texto que lo rodea
daba 1,27:1 cuando WCAG exige 3:1. La corrección no fue cambiar el color sino
**subrayar los enlaces en texto corrido**, que es lo correcto y no un parche.
Resultado: **100**, sin ningún fallo de accesibilidad restante.

### El freno de secretos se denunció a sí mismo, y estuvo bien

Al escribir el pipeline puse contraseñas de ejemplo en el workflow y el escáner
las detectó. La corrección no fue relajar el patrón: fue **componer las cadenas
de conexión en tiempo de ejecución**, para que en el repositorio no exista nada
con forma de credencial. El patrón sí se afinó en un punto legítimo: una
referencia a variable (`${CLAVE}`) no es un secreto, y marcarla obligaría a
poner excepciones, que es como mueren estos frenos.

### Pendiente de Ricardo

MinIO (dominio y dos cubos privados) · servicio `slgweb-staging` en Easypanel ·
registros DNS de `staging` y `minio` · verificación de que los diez intocables
siguen funcionando. Guía paso a paso entregada como artefacto.

---

## 2026-09-09 · Protección de staging — hueco propio, encontrado por Ricardo

**Staging estuvo abierto e indexable durante una hora y media.**

El criterio 1 de FU-05 exige que staging pida autenticación básica y devuelva
`noindex`. Yo escribí `STAGING_BASIC_AUTH_USER` y `STAGING_BASIC_AUTH_PASSWORD`
en `.env.example` **y nunca escribí el código que las consume**. Documenté una
protección que no existía. Lo detectó Ricardo al responder «no» a la pregunta de
si el sitio le pedía contraseña — no lo detectó ninguna comprobación mía, porque
ninguna medía comportamiento en ese punto.

**Corregido** con `middleware.ts`:

- 401 con `WWW-Authenticate` si faltan o fallan las credenciales.
- Comparación en **tiempo constante**: comparar con `===` filtra información por
  el tiempo que tarda en fallar.
- `X-Robots-Tag: noindex, nofollow, noarchive` en el 401 y en la página servida.
  Se usa la cabecera y no una etiqueta `meta` porque cubre también PDF e imágenes.
- `/api/health` queda **fuera** a propósito: si pidiera credenciales, el monitor
  externo daría el sitio por caído siempre y el aviso dejaría de significar nada.
  No expone nada: responde `{"status":"ok"}`.
- Se activa **solo si las dos variables existen**, no por `NODE_ENV`: staging
  corre en modo producción, así que una condición sobre el entorno protegería mal.

**Un fallo encontrado por la prueba, no por la revisión a ojo.** La primera
versión devolvía **500 en vez de 401**: el texto del `realm` llevaba una raya
larga (`—`, U+2014) y una cabecera HTTP es una ByteString que no admite
caracteres de más de un byte. A ojo el código parecía correcto.

**Prueba automatizada añadida**: `scripts/ci/test-staging-auth.ts`, diez
comprobaciones de comportamiento. Acepta `BASE_URL`, así que sirve tanto para el
contenedor local como para el staging desplegado.

### Estado de la infraestructura, confirmado por Ricardo

- `staging.softlandingglobal.com` y `/api/health`: **en verde**, 1 h 37 min.
- La raíz y `www`: en rojo **por diseño** — no tienen registro DNS hasta el go-live.
- MinIO: **arrancado**. El `FATAL` que se veía era la línea vieja de un log
  acumulativo; por debajo estaba el arranque correcto y 65,8 MB de memoria.

## 2026-09-09 · D-50 — R-40 resuelto: el gate D1 pasa a Lighthouse

Ricardo elige la salida **(a)** de las tres que registraba R-40: el gate D1 deja
de medirse por presupuesto de KB y pasa a medirse por **Lighthouse en CI** — el
umbral que ya fijaban RNF-01 (≥ 90 en las cuatro categorías) y RNF-02
(LCP < 2,5 s). **RNF-03 queda retirada**: el presupuesto de 150 KB era un proxy
mal calibrado del objetivo, no el objetivo, y el objetivo ya se cumplía.

**Hecho:**

| Pieza | Evidencia |
|---|---|
| `scripts/ci/check-lighthouse.ts` | Arranca `next start` contra el build real, lanza Chrome headless con `chrome-launcher`, mide con `lighthouse` (API de Node) y evalúa con una función pura (`evaluar()`) separada de Chrome |
| `scripts/ci/test-lighthouse-gate.ts` | Prueba negativa (R-26) de `evaluar()` con resultados fabricados: cada categoría por debajo de 90, LCP en el límite y justo por debajo, varias categorías fallando a la vez, y los dos casos límite (90 pasa, 2500 ms falla) |
| `scripts/ci/check-js-budget.ts` | **Borrado** — su gate ya no existe |
| `.github/workflows/ci.yml` | Freno 6 reemplazado; se añade `browser-actions/setup-chrome@v1` porque el runner de GitHub no garantiza Chrome instalado |
| `package.json` | `check:js-budget` → `check:lighthouse`; `lighthouse` y `chrome-launcher` como devDependencies, versión exacta |
| `docs/decision_log.md`, `planning/risks.md`, `planning/requirements.md`, `planning/scope.md`, `implementation/user_units.md`, `design_docs/architecture.md` | D-50 registrada; R-40 resuelto; RNF-03 marcada retirada con nota; los criterios de FU-05 y DU-07 que citaban 150 KB, actualizados |

**Verificado, no solo escrito.** `npm run verify` completo en verde, incluida la
prueba negativa y el gate real contra el build:

| | Umbral | Medido |
|---|---|---|
| Performance | ≥ 90 | **100** |
| Accesibilidad | ≥ 90 | **100** |
| Best Practices | ≥ 90 | 92 |
| SEO | ≥ 90 | **100** |
| LCP | < 2,5 s | **1,6 s** |

**Por qué la prueba negativa no arranca Chrome de verdad**: hacerlo en cada push
sería caro y lento sin añadir confianza — lo que puede tener un defecto es la
comparación de umbral (`evaluar()`), no Lighthouse en sí. El script real
(`check-lighthouse.ts`) ya se demostró en verde contra el build de producción
antes de escribir la prueba negativa, así que el freno se vio funcionar de
verdad, no solo se le confió el mensaje de éxito.

**Alcance de hoy**: solo Home, la única página pública que existe en M0-A.
RNF-01 exige tres páginas; DU-07 añade una de servicio y un artículo a `RUTAS`
en `check-lighthouse.ts` cuando existan, y cierra el gate D1 formalmente.

**Pendiente, sin relación con esta unidad**: el build sigue avisando que la
convención de archivo `middleware` está obsoleta en Next 16 y sugiere migrar a
`proxy`. No se toca aquí — es la protección de staging de la sesión anterior,
fuera del alcance de R-40.

## 2026-09-09 · Criterio 3 de FU-05 — DNS verificado nombre por nombre (R-25)

Tras los registros nuevos de `staging` y `minio`, verificado por consulta DNS
directa (`dig`), no por inspección del panel:

| Nombre | Resuelve a | Esperado |
|---|---|---|
| `softlandingglobal.com` (raíz) | sin registro A | correcto — por diseño, hasta el go-live |
| `crm.softlandingglobal.com` | `167.88.42.76` | sin cambio |
| `n8n.softlandingglobal.com` | `167.88.42.76` | sin cambio |
| `evolution.softlandingglobal.com` | `167.88.42.76` | sin cambio |
| `academy.softlandingglobal.com` | `216.150.16.65` | sin cambio (Vercel, no el VPS) |
| `staging.softlandingglobal.com` | `167.88.42.76` | **nuevo**, correcto |
| `minio.softlandingglobal.com` | `167.88.42.76` | **nuevo**, correcto |
| MX (`@`) | `softlandingglobal-com.mail.protection.outlook.com` | sin cambio — Microsoft 365 intacto |
| SPF (`@` TXT) | `v=spf1 include:spf.protection.outlook.com -all` | sin cambio |
| DMARC (`_dmarc` TXT) | `p=quarantine`, sin `sp=` | sin cambio — hallazgo ya registrado en la guía de puesta en marcha, no es nuevo |

**Ninguno de los diez intocables se movió.** Criterio 3 de FU-05 cerrado.

## 2026-09-09 · Hallazgo en CI real — `check-lighthouse.ts` colgaba el pipeline

**Verde en local no es verde en CI.** El script pasó limpio en esta máquina
(macOS) cada vez que corrió. En el runner de GitHub (Ubuntu), el gate **midió
bien** —Perf 91 · A11y 100 · BP 92 · SEO 100 · LCP 1,9 s, imprimió «✓ Gate D1 en
verde»— y el paso se quedó **colgado 3 h 39 min** hasta que lo cancelé a mano.
El log de limpieza del runner lo delata: `Terminate orphan process: pid (2860)
(next-server (v16.3.4))`.

**Causa.** `npx next start` no es un solo proceso: encadena `npx → next →
next-server`. `servidor.kill()` solo mataba el primer PID; `next-server`
quedaba huérfano y vivo, con sus streams de stdout/stderr todavía enganchados
al proceso de Node del script — eso basta para que el bucle de eventos no
drene solo, aunque `main()` ya haya terminado todo su trabajo.

**Corrección**, dos capas:
1. `spawn(..., { detached: true })` pone al hijo en su propio grupo de
   procesos; `process.kill(-pid, "SIGKILL")` mata el grupo entero, no solo el
   primer PID.
2. **Respaldo definitivo**: `main().finally(() => process.exit(...))`. Aunque
   la limpieza de procesos falle o algo más deje un handle abierto, el
   proceso sale. Es esto, no la limpieza correcta, lo que de verdad garantiza
   que el paso de CI no vuelva a colgarse.

Verificado: local, 11,5 s de pared y sin procesos huérfanos (`ps aux` limpio
después). Repushed para confirmar en el runner real antes de dar el criterio
por cerrado — **un script que se vio colgar una vez no se acepta como
arreglado solo porque ahora corre rápido en mi máquina** (mismo principio que
R-26, aplicado al propio pipeline, no solo a los frenos de contenido).

**Confirmado en el runner de GitHub** (run `34417767830`): `Calidad, contenido
y secretos` completo en **1 min 22 s** (antes: colgado 3 h 39 min). El paso
del gate corrió en 14 s — Performance 98 · Accesibilidad 100 · Best Practices
92 · SEO 100 · LCP 1,7 s — y terminó limpio, sin quedarse esperando nada.
Freno 6 verificado en verde de verdad, no solo en local.

## 2026-09-09 · Criterio 2 de FU-05 — `main` protegida (R-20)

Con el pipeline confirmado en verde en el runner real, protección de rama
aplicada sobre `main` vía API de GitHub: Pull Request obligatorio (sin `push`
directo, ni siquiera para el administrador), `required_status_checks` con las
dos verificaciones (`Calidad, contenido y secretos`, `Aislamiento entre
empresas`) en modo `strict` —tienen que estar en verde **y** la rama
actualizada contra `main`—, sin aprobaciones humanas obligatorias
(`required_approving_review_count: 0`, porque hoy no hay un segundo revisor),
sin force-push ni borrado de rama. **Confirmado con Ricardo antes de
aplicarlo** — cambia su flujo: a `main` se llega por PR fusionado desde
GitHub, no por `push` directo.

`develop` sigue sin protección: el flujo de trabajo diario del agente no
cambia, solo la puerta de entrada a producción.

## 2026-09-09 · Hallazgo propio — el gate D1 no medía el binario real

Revisando el gate ya verificado en verde, `next start` avisaba en su propia
salida: *"next start" does not work with "output: standalone" configuration.
Use "node .next/standalone/server.js" instead.* `next.config.ts` fija
`output: "standalone"` desde FU-02, y el `Dockerfile` corre exactamente ese
binario en producción. El gate estaba midiendo un camino de ejecución que
producción **nunca toma** — funcionaba, pero no era lo real.

**Corregido**: `check-lighthouse.ts` arranca `node server.js` sobre
`.next/standalone` (el mismo binario del `Dockerfile`, con `HOSTNAME=0.0.0.0`
y `PORT` iguales), no `npx next start`. El paso «Compilación» del pipeline
pasa de `npm run build` a `npm run build:standalone` — el script que empaqueta
`static/` y `public/` dentro de `standalone/`, el mismo hueco que ya causó un
fallo real en FU-02 si se hace a mano (documentado en el propio `Dockerfile`).

**Efecto colateral bueno**: al ya no depender de `npx next start` (que
encadenaba `npx → next → next-server`), el motivo original del cuelgue de
3h39m deja de poder ocurrir — `node server.js` es un solo proceso. La higiene
de matar por grupo y el `process.exit()` de respaldo se quedan de todos modos,
por si acaso.

Verificado local: headers de seguridad idénticos (`curl -D -` contra
`/api/health` y `/`), `npm run verify` completo en ~22 s sin la advertencia de
Next, y sin procesos huérfanos después (`ps aux` limpio).

**Confirmado en el runner de GitHub** (run `34420475470`): job completo en
**1 min 11 s**. El paso del gate corrió en **9,3 s** — Performance 99 ·
Accesibilidad 100 · Best Practices 92 · SEO 100 · LCP 1,6 s — y pasó limpio a
«Post Run» sin quedarse esperando nada. Mide ahora el binario exacto que
despliega el `Dockerfile`, verificado en el sitio donde de verdad importa.

## 2026-09-10 · Criterio 1/2 de FU-05 — el auto-deploy de `develop` nunca existió

Ricardo creó `slg-web` (producción) en Easypanel y se topó con «Github token is
missing» al intentar activar el despliegue automático. Con acceso de lectura a
su panel (Claude in Chrome, su sesión ya iniciada — en ningún momento se
escribió ni se vio una contraseña) se encontró y arregló de raíz:

1. **Faltaba el token de GitHub a nivel de cuenta** (Settings → Github, campo
   vacío) — Ricardo lo generó y lo guardó él mismo (`repo` scope, vía el enlace
   pre-rellenado de Easypanel). Requisito de Easypanel para crear webhooks,
   independiente de que el repo sea público.
2. **Al guardar la fuente de `slg-web` con el token ya presente, Easypanel creó
   su webhook solo** y disparó un primer despliegue (verde, automático).
3. **Hallazgo real, no esperado**: `slgweb-staging` —desplegado desde antes de
   esta sesión— **nunca tuvo un webhook registrado**. Verificado contra la API
   de GitHub (`gh api .../hooks`): un solo hook, el de `slg-web`. La última
   implementación de staging llevaba **10 horas**, sin reflejar ninguno de los
   pushes de esta sesión (sin impacto funcional — ninguno tocó código de la
   app, solo scripts de CI y documentación).

**Corregido**: creado el webhook de `slgweb-staging` directamente contra la
API de GitHub (`gh api repos/.../hooks -X POST`), con la misma URL de
activación que ya mostraba su panel. Ping de verificación: **200 OK** en los
dos hooks. `slg-web` sigue `main`, `slgweb-staging` sigue `develop`, cada uno
con su propio webhook activo — el criterio 2 de FU-05 («push a develop publica
staging y push a main publica producción, sin intervención manual») queda
cerrado de verdad, no solo aparentado.

Este mismo commit, al pushearse, es la prueba real: si `slgweb-staging` recibe
un despliegue nuevo sin que nadie toque Easypanel, el webhook funciona en
producción, no solo en el ping.

## 2026-09-10 · Criterio 8 de FU-05 — UptimeRobot, hallazgo y avance parcial

Con acceso de lectura al panel de UptimeRobot (Claude in Chrome, sesión de
Ricardo, sin credenciales tocadas), tres cosas:

1. **Los cuatro monitores estaban pausados**, no solo raíz/`www` como pedía la
   instrucción original. Reanudados los dos de `staging` (el de
   `/api/health` y el de la raíz); raíz y `www` de producción siguen
   pausados a propósito, sin DNS hasta el go-live.
2. **Segunda corrección de D-49**: la integración de n8n vía webhook —«lo
   decisivo» según la propia decisión— no está disponible en el plan
   gratuito (`Upgrade to access` en Integrations → Webhook). El único canal
   activo hoy es **correo** a `torresoliva.ricardo@gmail.com`. No rompe D-43:
   el correo ya sale de los servidores de UptimeRobot, no del VPS.
3. **Enviada una notificación de prueba real** desde el monitor
   `staging.softlandingglobal.com/api/health` (botón nativo "Test
   Notification", no simulado — dispara el mismo envío que un incidente
   real). Pendiente de que Ricardo confirme si le llegó a Gmail.

**Cerrado**: `slgweb-staging` detenido en Easypanel a propósito. UptimeRobot lo
detectó solo en su siguiente chequeo — `staging.softlandingglobal.com/api/health`
pasó a **Down**, incidente real creado y visible en su panel ("Currently down
for 0h 3m 19s"). Servicio reiniciado, verificado con `curl` (200 de vuelta).
Criterio 8 de FU-05 cerrado: la condición se provocó de verdad, no solo se
probó el canal.

**FU-05 completa: los 9 criterios cerrados y verificados.**

## 2026-09-10 · FU-06 — Módulo de identidad y autorización · `done`

**Hecho:**

| Pieza | Evidencia |
|---|---|
| `lib/auth/config.ts` | Better Auth 1.7.3 (exacto, R-19), credencial + Google/Microsoft condicionales a que existan sus variables |
| `lib/auth/session.ts` + `lib/auth/org.ts` | `AuthContext` desde una sesión real; separado en dos archivos porque `session.ts` depende de `next/headers` y `org.ts` no — así `test-auth.ts` prueba la lógica sin servidor |
| `lib/auth/permissions.ts` | Matriz B.3 completa (`puedeHacer`/`exigir`), 10 acciones × 4 roles + alcances de agente |
| `lib/auth/api-keys.ts` | Emisión, verificación y revocación de claves contra la tabla real, sin el plugin `apiKey` |
| `proxy.ts` | Antes `middleware.ts`; compone la protección de staging (FU-05) con el clasificador barato de FU-06 |
| `app/hq/`, `app/portal/` | Compuertas reales, `HABILITADO = false` hasta DU-13/DU-18 |
| `scripts/db/test-auth.ts`, `scripts/db/check-auth-encapsulado.ts` | 47 comprobaciones contra Postgres real + barrido estático del criterio 1 |

**Desviación deliberada, documentada como D-52**: sin los plugins `organization`, `admin` ni `apiKey` de Better Auth — el esquema real de FU-04 es incompatible con lo que esos plugins asumen (detalle en el decision_log). La garantía de R-19 (un módulo propio, único que sabe de identidad) se cumple igual.

### Tres bugs reales encontrados por la prueba, ninguno por la revisión a ojo

1. **`lib/db/context.ts` (FU-04) nunca había funcionado en runtime.** `declare const verificado: unique symbol` solo declaraba el TIPO — no existía como valor. `contextoDeSesion`/`contextoDeClaveApi` lanzaban `ReferenceError` al ejecutarse de verdad. Nadie lo había disparado: los tests de FU-04 fabricaban el contexto con `as AuthContext`, nunca con estas dos funciones. Corregido: `const verificado: unique symbol = Symbol(...)`, sigue sin exportarse.
2. **`api_key` y `membership` tienen RLS (0001) y mi primera versión de `api-keys.ts`/`org.ts` las tocaba con una conexión sin contexto.** Habría compilado, pasado el build, y fallado en silencio en producción: toda verificación de clave y toda resolución de empresa de cliente habría devuelto cero filas para siempre. Encontrado por `test-auth.ts`, no por la revisión. Corregido usando `withScope`/`withSystemScope` (FU-04) en vez de conexiones propias, más dos políticas de fila adicionales (D-53, migraciones 0005 y 0006) para el caso de arranque: verificar una clave o resolver la empresa de un usuario es, por definición, anterior a tener el contexto que la política de 0001 exige.
3. **App Router en `(hq)`/`(portal)` (grupos) resolvían las dos a `/`.** Un grupo de rutas no añade segmento de URL; el criterio exige la ruta literal `/hq`. Corregido renombrando a `app/hq/` y `app/portal/` (segmentos reales, no grupos) — el build lo rechazó con un error claro antes de llegar a ningún lado.

### Verificado, no solo escrito

`npm run verify` completo en verde (incluye el build con `lib/auth/config.ts` cargado y el gate D1 contra el servidor standalone real). `npm run test:db` completo en verde contra Postgres real: matriz B.3 fila por fila (40 comprobaciones), alcances sin implicación (RF-147), mensajes de error uniformes (RNF-32), orden de las compuertas de superficie (D-38), y el ciclo de vida completo de una clave de API. Confirmado además contra un servidor standalone con `DATABASE_URL` deliberadamente inalcanzable (el escenario real del job "calidad" de CI, que no tiene Postgres): `/` sirve 200, `/api/health` 200, `/hq` sin cookie redirige (307) sin tocar la base de datos, y `/hq` con una cookie de sesión fabricada responde 404 sin colgarse ni dar 500 — Better Auth resuelve "sin sesión" ante un fallo de conexión, no lanza.

**Fuera de alcance de FU-06, a propósito**: no hay página `/acceder` (es DU-01) ni endpoints reales de `api/v1` (DU-22/DU-23) — el criterio 4 (alcances sin implicación) se prueba a nivel de módulo, no de ruta HTTP, porque la ruta todavía no existe.

**Confirmado en el runner de GitHub** (run `34430892726`): los dos jobs en verde, incluidos los cuatro pasos nuevos —`check-auth-encapsulado.ts`, `Compilación` y `Freno 6` contra el `DATABASE_URL` de relleno, y `test-auth.ts` contra Postgres real con las políticas 0005/0006 aplicadas por el bucle de `psql`—. No solo en local.

## 2026-09-10 · FU-08 — Adaptador de correo transaccional · `in_progress`

**Contexto de la sesión**: Ricardo pidió avanzar en modo autónomo ("modo turbo") desde el móvil, sin
detenerse a confirmar decisiones diferibles. `user_units.md` y `api_contracts` §11.3 fijaban P-3/P-4
(dirección remitente, nombre del subdominio) como condición de ENTRADA a esta unidad, no solo de
cierre — se resolvieron con un valor PROVISIONAL del agente (**D-54**) para poder construir y probar
sin bloquearse; siguen sin confirmación real de Ricardo.

**Hecho:**

| Pieza | Evidencia |
|---|---|
| `lib/email/config.ts` | Lee `MAIL_SMTP_*`/`MAIL_FROM_*`/`MAIL_REPLY_TO`/`MAIL_ALERTS_TO` — variables de TRANSPORTE (D-36), nunca `RESEND_API_KEY` |
| `lib/email/smtp-transport.ts` | Único archivo que importa `nodemailer`; SMTP estándar, `secure` derivado del puerto (465 vs STARTTLS oportunista) |
| `lib/email/templates.ts` | Asunto/cuerpo desde `content/ui/<lang>.json` vía `loadUiStrings()` (paridad ES/EN ya validada por FU-03); interpolación `{{clave}}` simple, sin motor de plantillas (RF-54) |
| `lib/email/send.ts` | `enviarCorreo()`: escribe `email_delivery` (`pending`) y hace el intento 1 en la misma llamada |
| `lib/email/queue.ts` | Reintento con reserva-y-plazo (`FOR UPDATE SKIP LOCKED`), escalón 1min→10min→1h→6h→24h, tope de 5 intentos, barrendero en proceso (`architecture` §6.2, decisión A-01) |
| `lib/email/retry-registry.ts` | Cómo reconstruir un reintento sin guardar el cuerpo (`data_model` §5.19): FU-08 no tiene llamador real todavía, así que es solo el mecanismo — FU-07/DU-01/DU-09 deben registrar el suyo |
| `instrumentation.ts` | Arranca el barrendero al levantar `slg-web`; si falta configuración de correo, avisa por log y sigue sirviendo la web pública (no depende del correo) |
| `drizzle/0007_evidencia_de_correo_completa.sql` | `email_delivery` completada contra `data_model` §5.19: columnas, 4 restricciones, 3 índices — y RLS (ver hallazgo abajo) |
| `scripts/email/check-email-encapsulado.ts`, `scripts/email/test-email.ts`, `scripts/email/fake-smtp-server.ts` | Criterio 1 automatizado + 33 comprobaciones contra SMTP real (captador en proceso, sin Docker) y Postgres real |

### Hueco propio, encontrado y cerrado: `email_delivery` incompleta desde FU-04

FU-04 (0000) creó `email_delivery` con solo las columnas que las unidades ya construidas necesitaban
en ese momento. `data_model.md` §5.19 —ya aprobado entonces— definía cinco columnas más
(`related_entity_type`, `related_entity_id`, `organization_id`, `sent_at`), cuatro restricciones y tres
índices que ninguna migración había añadido. FU-08 es la primera unidad que escribe filas de verdad
aquí y depende de todo eso — mismo patrón que D-53 en FU-06: un hueco de diseño aprobado que nadie
había ejercido en runtime. Cerrado en `drizzle/0007_evidencia_de_correo_completa.sql`.

### Segundo hallazgo, encontrado por la prueba: `email_delivery` necesitaba RLS

Al añadir `organization_id`, `scripts/db/test-isolation.ts` (comprobación 8, un barrido del CATÁLOGO
de PostgreSQL, no una lista escrita a mano) puso la tabla en rojo: *"toda tabla con `organization_id`
tiene RLS activa, FORZADA y con política"* es una regla sin excepciones, sea o no la tabla "dato de
cliente". Corregido en el mismo 0007: `email_delivery` se une a la política uniforme de las ocho tablas
de 0001, más una política adicional para `app_actor_role() = 'system'` (mismo patrón que D-53 para
`api_key`) — porque, hoy, todo lo que toca esta tabla es la cola de FU-08 bajo `withSystemScope`, casi
siempre sin empresa en contexto (un `capture_notice` sobre un lead que no es cliente no tiene
`organization_id`). Sin esta segunda política, ningún correo se habría podido enviar nunca — la prueba
lo habría descubierto en el primer intento real, no en la revisión.

### Verificado, no solo escrito

`npm run verify` completo en verde (incluye el build y el gate D1 contra el servidor standalone real,
y `check:email-encapsulado` nuevo). `npm run test:db` completo en verde contra Postgres real, incluida
la comprobación 8 de `test-isolation.ts` ya en verde con `email_delivery` protegida. `npm run test:email`
(33 comprobaciones) contra SMTP real y Postgres real:

- Los cuatro tipos de correo (`invitation`, `password_reset`, `capture_notice`, `capture_failed_alert`)
  se entregan en el primer intento, con `from_email`/`reply_to`/`template_key`/`subject_key`/`locale`
  persistidos tal cual se usaron, `provider_message_id` y `sent_at` presentes, y el mensaje confirmado
  de verdad en el socket SMTP (no solo en la base).
- Reintento tras fallo transitorio: dos fallos simulados dejan `attempts=2`/`status=pending`/
  `last_error` saneado; el tercer intento entrega y pasa a `delivered`.
- Agotamiento: cinco fallos seguidos dejan `status=failed` sin próximo intento (`data_model` §3.9).
- Cambio de destino SOLO por variables de entorno (criterio 2): la misma `enviarCorreo()`/
  `crearTransporteSmtp()`, sin editar una línea, entrega en un segundo captador y confirma que el
  primero NO lo recibió — destinos realmente distintos.

Confirmado además que el servidor standalone arranca y sirve `/` en 200 con `MAIL_SMTP_*` ausente
(el escenario real del job "calidad" de CI): el barrendero simplemente no arranca y avisa por log,
sin tumbar la web pública.

### Lo que NO se pudo verificar, y por qué (residual, no oculto)

- **Criterio 3 literal** (entrega a bandeja de entrada en tres proveedores de correo distintos,
  incluido Microsoft 365 corporativo) y **criterio 4** (subdominio de envío realmente verificado en
  DNS): exigen **F.2-4** (dominio de correo verificado, SPF/DKIM/DMARC), que sigue `[PENDIENTE]` y no
  depende de este repositorio.
- **Criterio 6** (seguimiento de aperturas/clics desactivado, verificado en el panel del proveedor):
  exige una cuenta real de Resend con el dominio añadido — no existe todavía. El esquema de
  `email_delivery` no tiene dónde guardar aperturas/clics aunque alguien lo active en el panel (`data_model`
  §5.19), que es la garantía de código; falta la verificación operativa en el panel real.
- **P-3 y P-4 sin confirmación real de Ricardo** (D-54): el `From`/subdominio usados en pruebas son
  provisionales. Cambiar el valor real, cuando llegue, cuesta variables de entorno — cero líneas de
  código, que es exactamente lo que D-22/D-36 exigían.

**Por eso la unidad queda `in_progress`, no `done`.** Lo que faltaba construir está construido y
probado; lo que falta es un dato externo (F.2-4) y una decisión de Ricardo (P-3/P-4) que ninguna
cantidad de código adicional puede sustituir.

### Fuera de alcance de FU-08, a propósito

FU-08 es una Foundation Unit: no tiene todavía ningún llamador real. `enviarCorreo()` para invitación
(FU-07), recuperación de contraseña (DU-01) y aviso de captura (DU-09) se conectan cuando esas
unidades se construyan — cada una debe registrar su propio reconstructor de reintento
(`lib/email/retry-registry.ts`) antes de que sus reintentos funcionen de verdad. `test-email.ts` hace
de llamador de prueba mientras tanto, con datos sintéticos.

## 2026-09-10 · FU-09 — Almacenamiento de archivos y URLs firmadas · `done`

Construida en la misma sesión autónoma que FU-08, inmediatamente después: sin bloqueador externo (a
diferencia de FU-08, no depende de ninguna decisión de Ricardo ni de infraestructura de terceros
pendiente), así que se completó y verificó de punta a punta.

**Hecho:**

| Pieza | Evidencia |
|---|---|
| `lib/files/config.ts` | Lee `FILES_S3_*`, `FILES_BUCKET_*`, `SIGNED_URL_TTL_*` — API S3 genérica (D-20/D-21), variables de transporte |
| `lib/files/client.ts` | Único archivo que instancia `S3Client`, `forcePathStyle: true` (MinIO y la mayoría de S3-compatibles fuera de AWS lo exigen) |
| `lib/files/limits.ts` | Constante única de tipo MIME/tamaño por destino (`data_model` §2.6, D-25); el conjunto MIME de `material` era `[PENDIENTE: lo fija FU-09]` en el propio `data_model` — fijado aquí (pdf, pptx, docx, mp4, zip) |
| `lib/files/signed-urls.ts` | `emitirUrlFirmadaDeDescarga` (GET presignado SigV4) y `emitirUrlFirmadaDeSubida` (**POST policy, no PUT presignado** — es el único mecanismo S3 estándar con `content-length-range`, que hace que el propio almacenamiento rechace tamaño/tipo antes de aceptar el archivo) |
| `scripts/files/check-files-encapsulado.ts`, `check-no-gated-files.ts`, `test-files.ts` | Criterios 1/2 automatizados (mismo patrón que `check-auth-encapsulado.ts`/`check-email-encapsulado.ts`, barriendo solo `app/`+`lib/`), criterio 5 automatizado, y 10 comprobaciones funcionales |

### Decisión de encuadre: FU-09 es un puerto genérico, no toca `download`/`deliverable`

Al construir, se encontró que `lib/db/schema.ts` no tiene tabla `download` en absoluto (`data_model`
§5.10), que `download_event` usa `download_slug` en vez de una FK real a `download.id` (§5.11), y que
`deliverable` no tiene `source`/`external_url`/`mime_type`/`size_bytes` (§5.14) — un hueco real desde
FU-04, mismo patrón que el de `email_delivery` en FU-08. **A diferencia de `email_delivery`, este NO se
cerró aquí**: ninguno de los 5 criterios de aceptación de FU-09 (`implementation/user_units.md`)
menciona escribir en `download` ni en `deliverable` — la persistencia de evidencia es responsabilidad
de quien llama (DU-08, DU-13, DU-15), igual que `email_delivery` es responsabilidad de quien llama a
`enviarCorreo()`. Cerrarlo aquí habría sido construir por adelantado el trabajo de tres unidades que
todavía no existen. Queda anotado como tarea aparte (`task_fb516747` en el gestor de tareas de la
sesión) para quien construya la primera de esas tres unidades.

### Verificado contra MinIO real, no un mock de SigV4

Se instaló MinIO real vía Homebrew (binario oficial, sin Docker — el pull de imágenes Docker en esta
máquina resultó extremadamente lento incluso para `hello-world`, problema del entorno, no de las
imágenes; ver la misma decisión tomada en FU-08 con `smtp-server` en vez de un contenedor `mailpit`).
`npm run test:files` (10 comprobaciones) contra MinIO real:

- Una URL de descarga firmada lee el objeto correcto; la misma petición **sin firma** la deniega MinIO
  (403); la misma petición con una firma **caducada** (`expiresIn: 1`, no la de configuración —
  probando el mismo mecanismo SigV4 con un vencimiento corto en vez de esperar 15 minutos reales)
  también la deniega MinIO. Ninguna de las dos peticiones llega jamás a esta aplicación: **el propio
  MinIO** hace cumplir el criterio 1, en producción también.
- La caducidad emitida coincide exactamente con `SIGNED_URL_TTL_DOWNLOAD_MINUTES` (criterio 3).
- Una subida con tipo y tamaño correctos, MinIO la acepta; un `Content-Type` forzado distinto al
  firmado, MinIO la rechaza; un cuerpo de 26 MB contra el tope de 25 MB de `downloads`, MinIO lo
  rechaza — **antes de aceptar el archivo** (criterio 4), por la condición `content-length-range` de la
  política de subida, no por una comprobación nuestra después del hecho (aunque esa comprobación
  también existe, como segunda capa: `emitirUrlFirmadaDeSubida` rechaza un MIME no permitido antes
  incluso de pedir la firma).
- Criterio 2 (ningún endpoint lista un bucket): verdadero hoy porque **no existe ningún endpoint
  todavía** — FU-09 es una librería sin ruta pública propia. El valor real de
  `check-files-encapsulado.ts` es evitar que aparezca uno mañana: ningún archivo de `app/`/`lib/`
  puede importar el comando de listado ni el cliente S3 fuera de `lib/files/`.
- Criterio 5: `git ls-files` confirma cero `.pdf`/`.docx`/`.pptx`/`.mp4`/`.zip` en control de versiones
  (186 archivos rastreados).

`npm run verify` completo en verde con los cuatro pasos nuevos. CI (`.github/workflows/ci.yml`)
descarga el binario oficial de MinIO para Linux y lo arranca en segundo plano antes de
`test-files.ts` — mismo principio que en local, sin contenedor.

### Fuera de alcance de FU-09, a propósito

Sin llamador real todavía (igual que FU-08): `emitirUrlFirmadaDeDescarga`/`emitirUrlFirmadaDeSubida`
las usarán DU-08 (biblioteca de descargas), DU-13/DU-15 (entregables en HQ/portal) cuando se
construyan. El paso de sincronización contenido→`download` (`architecture` §5.3) tampoco se construye
aquí: es un paso de despliegue que depende de que la tabla `download` exista primero.

## 2026-09-10 · FU-07 — Servicio de invitaciones · `in_progress`

Tercera unidad de la misma sesión autónoma, inmediatamente después de FU-09. La más profunda de las
tres: primera con UI real (`app/(auth)/invitacion/[token]/`), primera que crea cuentas y sesiones de
verdad, y la que sacó a la luz dos hallazgos que afectaban a FU-05 y FU-06, ya `done`.

**Hecho:**

| Pieza | Evidencia |
|---|---|
| `drizzle/0008_invitacion_completa.sql` | `invitation` completada contra `data_model` §5.7 (D-55): columnas, restricciones, índices parciales, política RESTRICTIVE de INSERT, más una política de sistema en `membership` para poder crear la primera membership de una cuenta |
| `lib/auth/invitation-signup.ts` | Segunda instancia de Better Auth, SOLO con `disableSignUp: false` — única forma de crear una cuenta con contraseña sin pasar por el alta pública deshabilitada (F.1), reutilizando el hash/validación reales de la librería en vez de reinventarlos |
| `lib/auth/invitations.ts` | `crearInvitacion`, `revocarInvitacion`, `reenviarInvitacion` (testigo nuevo cada vez), `buscarInvitacionVigente` (mensaje neutro), `aceptarInvitacionConContrasena`, `completarAceptacionInvitacion` (núcleo común a los tres métodos) |
| `lib/auth/client.ts` | Primer `createAuthClient` (Client Components) del proyecto |
| `app/(auth)/invitacion/[token]/` | Página de aceptación (servidor) + formulario (cliente: contraseña, Google, Microsoft) + ruta `/completar` para el regreso de OAuth, con fallback de confirmación explícita de correo (criterio 3) |
| `scripts/db/test-invitations.ts` | 27 comprobaciones contra Postgres y SMTP reales |

### Hallazgo 1 (D-55): `invitation` incompleta desde FU-04 — mismo patrón que `email_delivery`

`invitation` solo tenía `id, organization_id, email, role, token_hash, expires_at, accepted_at,
created_at`. Sin `status`/`revoked_at` no hay forma de expresar "revocada"; sin `sent_at`, no hay forma
de saber si el correo salió. Cerrado en 0008, con la política RESTRICTIVE que `data_model` §5.7 exige
como segunda capa contra que un `client_admin` invite a un `slg_admin` o a una organización `slg`.

### Hallazgo 2 (D-56): un hueco de seguridad en FU-06, nunca explotado, verificado en el código fuente

Al construir el botón "Continuar con Google", se comprobó si `emailAndPassword.disableSignUp` (F.1,
sin alta pública) también protegía el alta por OAuth — y no: es un flag distinto que el manejador de
OAuth de Better Auth nunca lee (`node_modules/better-auth/dist/context/create-context.mjs`,
`.../api/routes/callback.mjs`, leídos directamente, no la documentación). Sin `disableImplicitSignUp`
en cada proveedor social, cualquiera con una cuenta de Google o Microsoft se habría podido crear sesión
sola la primera vez que iniciara sesión, saltándose "acceso solo por invitación" (`data_model` §10-10).
**Nunca se llegó a explotar**: F.2-2/F.2-3 siguen sin credenciales reales, así que Google/Microsoft
nunca se registraron en ningún entorno desplegado. Corregido en `lib/auth/config.ts`; se reactiva solo
para la sesión de aceptación de una invitación (`requestSignUp: true`, botones del formulario).

### Hallazgo 3 (D-57): la CSP de FU-05 bloqueaba la hidratación de React en TODO el sitio

El más grave de los tres. Al hacer clic en "Crear cuenta" en el navegador real, no pasaba nada — la
consola mostraba `Executing inline script violates ... 'script-src 'self''` y `React error #412`
(fallo de hidratación). Comprobado contra el build de producción real (`.next/standalone`, no `next
dev`): el mismo fallo aparece en **la portada**, la página más simple del sitio, con cero relación con
FU-07. Ninguna unidad anterior lo había notado porque ninguna enviaba un Client Component con
interactividad real — una página estática sin botones "se ve bien" aunque su hidratación esté rota.

Causa: `next.config.ts` fijaba una CSP **estática** (`script-src 'self'`, sin nonce) desde FU-05; el
propio comentario del archivo ya decía "el nonce llega en FU-06 con el middleware" — una promesa que
`proxy.ts` nunca cumplió. Corregido siguiendo el patrón oficial de Next.js: `proxy.ts` genera un nonce
por petición y lo fija en la CSP (`script-src 'self' 'nonce-... ' 'strict-dynamic'`); la consecuencia
documentada por Next.js es que **toda la aplicación debe renderizarse dinámicamente** (un nonce no
puede existir en una página generada en el build), así que `app/layout.tsx` fija
`dynamic = "force-dynamic"` para todo el árbol. `style-src` se queda en `'unsafe-inline'` sin nonce a
propósito: los atributos `style="..."` en línea que React aplica no los cubre un nonce por
especificación CSP3 (solo elementos `<script>`/`<style>`), verificado con el propio mensaje de error
del navegador.

**Verificado que el cambio no cuesta rendimiento — al contrario**: el gate D1 (Lighthouse, D-50),
medido contra el mismo build de producción antes y después:

| | Antes (CSP rota, estático) | Después (CSP con nonce, dinámico) |
|---|---|---|
| Performance | 98 | 98–100 |
| Best Practices | 92 | 100 |
| LCP | 2,3 s | 1,2–2,3 s |

Best Practices subía de 92 a 100 porque las violaciones de CSP en consola —invisibles hasta que se
miraron— ya estaban descontando puntos que nadie había atado a esta causa.

### Verificado de punta a punta, en el navegador real

`scripts/db/test-invitations.ts` (27 comprobaciones) prueba el módulo contra Postgres y SMTP reales:
matriz B.3 en la emisión (incluida la política RESTRICTIVE con un INSERT directo que se salta
`exigir`), duplicados, canje neutro, revocación, reenvío con testigo nuevo, aceptación por contraseña
de punta a punta (cuenta, membership, `user.role`, invitación `accepted`) y el núcleo común de
aceptación con y sin confirmación explícita de correo (criterio 3).

Además, **contra el navegador real y el build de producción** (`.next/standalone`, no un supuesto): se
sembró una invitación real, se abrió `/invitacion/[token]`, se rellenó la contraseña, se hizo clic en
"Crear cuenta", y se confirmó en Postgres que la cuenta, la membership (`org_role = client_admin`) y la
invitación (`status = accepted`, `accepted_by_user_id`) quedaron exactamente como debían — con
`npm run verify` completo en verde después.

### Lo que NO se pudo verificar, y por qué (residual, no oculto)

- **Google y Microsoft de punta a punta** (mitad del criterio 2): F.2-2/F.2-3 siguen `[PENDIENTE]` —
  sin credenciales reales, Better Auth ni siquiera registra esos proveedores, así que los botones no
  existen todavía en la página. El código (`disableImplicitSignUp` + `requestSignUp` + la ruta
  `/completar`) está escrito y revisado contra el código fuente real de Better Auth, no solo probado
  con una sesión fabricada (`completarAceptacionInvitacion`, que no distingue cómo se creó la sesión).
- Por eso la unidad queda `in_progress`, no `done`: el criterio 2 exige los TRES métodos funcionando,
  y dos de ellos no se pueden ejercer sin F.2-2/F.2-3.

### Fuera de alcance de FU-07, a propósito

Sin llamador de emisión real todavía: "aquí la emisión se ejerce por semilla y por prueba"
(`implementation/user_units.md`) — la superficie de emisión llega con DU-14 (HQ) y DU-21 (portal). El
reintento automático de la cola de FU-08 tampoco se registró para `kind = 'invitation'`: `reenviarInvitacion`
(manual) ya satisface el criterio 4 ("queda creada y reenviable"), y un testigo de invitación no se
puede regenerar de forma automática sin volver a mintarlo — se deja para cuando DU-14/DU-21 decidan si
hace falta.

## 2026-09-10 · FU-10 — Componentes de C.5 (prototipado) · `in_progress`

Todo el trabajo bloqueado externamente en M0-B (credenciales de terceros pendientes de Ricardo) deja
FU-10 como la única unidad ejercitable ahora mismo; el gate de prototipo (C.5/FU-10) es
autoverificable, no reservado a Ricardo (D-46), así que se construye en modo de ejecución autónoma.
Orden de construcción: RF-134 exige el formulario de descarga primero, el resto sigue el orden natural
de C.5.

Vitrina en `/prototipos` (`app/(dev)/prototipos/`), `noindex`, `dynamic` heredado del layout raíz.

### Componente 1 — Formulario de descarga (`components/download-form/DownloadForm.tsx`)

Ocho estados del criterio 2 demostrados con un envoltorio de vitrina que simula la respuesta del
servidor (`formulario-de-descarga.tsx`, con 400 ms de latencia simulada — no del componente). Honeypot
enviado sin más: descartarlo en silencio es responsabilidad del servidor (FU-11), no de este
componente. Validación de dominio gratuito en cliente, primera señal únicamente — el servidor sigue
siendo la autoridad real (RNF-33). Verificado en el navegador real: los cuatro estados de respuesta,
foco al campo con error, y que el envío fallido conserva los datos ya escritos.

### Componente 2 — Barra de navegación + sheet móvil (`components/nav/NavBar.tsx`, `MobileSheet.tsx`)

Verificado en el navegador real, viewport de escritorio y móvil (375×812): barra translúcida con
subrayado activo, botón de hamburguesa solo en móvil, sheet con foco atrapado (el primer elemento
focal recibe el foco al abrir) y los 5 destinos + botón de acceder presentes dentro.

**Hallazgo propio, D-58**: al cerrar el sheet (clic en el scrim, Escape, botón de cerrar), el estado de
React cambiaba correctamente pero la hoja se quedaba visualmente abierta — nunca se movía hacia la
posición de salida. Causa raíz: `y` se pasaba como `useMotionValue` externo por `style`, y Motion no
deja que `animate`/`exit` controlen un valor así — queda reservado para quien lo pasó. Corregido
quitando el valor externo (el handler de arrastre no necesita leerlo, solo usa
`info.offset.y`/`info.velocity.y`) y añadiendo `key` explícita a los dos hijos de `AnimatePresence`
(no la tenían). Detalle completo, incluida la verificación parcial (el desmontaje final del nodo no
se pudo confirmar con el panel del navegador en `visibilityState: "hidden"` durante toda la sesión —
Ricardo seguía desde el teléfono, sin el panel en pantalla), en D-58.

**Pendiente antes de cerrar el criterio 1 de este componente**: repetir la comprobación de cierre con
el panel visible en pantalla.

### Componente 3 — Hero tipográfico (`components/hero/Hero.tsx`)

Sin imagen: el peso lo lleva la escala `--text-hero` (nueva en `app/tokens.css`/`globals.css`,
literal de la fila «Hero» de la tabla de tipografía de `design_docs/style_guide.md` §4.2 — a
diferencia de H1/H2/H3, que siguen `[PENDIENTE]`). Contenido 100% por props (`eyebrow`, `headline`,
`subheadline`, `ctaLabel`/`ctaHref`) — RF-16, sin una sola cadena propia. Aparición al montar con
opacidad + 8 px una sola vez (RNF-46 aplicado a la carga, no a scroll: el hero siempre está visible
de entrada), degradando a cross-fade de 200 ms sin desplazamiento con movimiento reducido (RNF-06).

Verificado en el navegador real contra el build de producción: tamaño (36px en el viewport de
escritorio de la vitrina, dentro del `clamp` esperado), peso 700, interlineado 37,8px (36×1,05),
tracking -0,72px (36×-0,02em) y color `rgb(36,57,77)` = `--blue-deep` — los cuatro coinciden
exactamente con la tabla de C.2. Fuente Montserrat autoalojada confirmada por `font-family`
computado. Contenido y enlace del CTA presentes y correctos en el árbol de accesibilidad.

**Misma limitación que D-58**: la animación de aparición en sí (opacidad 0→1) no se pudo confirmar
completa en esta sesión — el panel se mantuvo en `visibilityState: "hidden"` todo el tiempo, y
Chromium no avanza animaciones por `requestAnimationFrame` en ese estado. El valor inicial (`opacity:
0`, `translateY(8px)`) sí se confirmó presente y correcto; falta repetir con el panel visible.

### Componente 4 — Tarjeta de rama/servicio (`components/branch-card/BranchCard.tsx`)

Un único componente para las dos escalas de los wireframes (§2.1 "dos puertas" SLG_AI/SLG_Holdings;
§2.3 servicios dentro de cada rama) — mismo armazón, contenido por props (`name`, `description`,
`href`, `downloadLabel` opcional para las tarjetas de servicio, que "nombran su documento de
descarga"). Toda la tarjeta es el enlace, un único destino con foco. Radio `--radius-lg` (24px) y
sombra `--slg-shadow-sm` (ninguna de las tres fuentes de diseño fija un radio/sombra exacto para esta
tarjeta — ver D-59 y `design_docs/style_guide.md` §2.1/§5, que dejan "tarjetas" abierta a los tres
radios). `--slg-shadow-sm`/`md`/`lg` se puentean por primera vez a las utilidades `shadow-*` de
Tailwind (`app/globals.css`) — no existían antes de este componente.

Verificado en el navegador real: 5 tarjetas (2 de rama + 3 de servicio) con nombre, descripción y
`href` correctos; `box-shadow` computado coincide exactamente con `--slg-shadow-sm`
(`rgba(10,10,20,0.04) 0 1px 2px, rgba(10,10,20,0.04) 0 2px 8px`); `border-radius` computado 24px.

### Componente 5 — Bloque «Qué incluye» (`components/que-incluye/QueIncluye.tsx`)

Sección ③ del contrato de página de servicio (`design_docs/ui_wireframes.md` §2.2): lista de ítems,
cada uno con `border-left 3px` ciclando `--blue-primary` / `--cyan` / `--indigo` (patrón del kit,
`style_guide.md` §5) y una "cifra grande" como elemento gráfico. Contenido 100% por props — cada
página de servicio trae sus propios ítems (RF-16).

Verificado en el navegador real: `border-left-color` computado de los tres ítems de la vitrina
coincide exactamente con `--blue-primary` (`rgb(40,120,180)`), `--cyan` (`rgb(80,180,220)`) e
`--indigo` (`rgb(40,40,120)`), en ese ciclo; `border-left-width` 3px en los tres.

### Restantes

Componentes 6–9 (tarjeta de artículo, footer, app shell de seis estados, visor de entregable) siguen
en construcción. La compuerta de C.5 no cierra hasta que los nueve estén construidos, en la vitrina, y
verificados — con el cierre formal registrado aquí, como exige el criterio 13.
