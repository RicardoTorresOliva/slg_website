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
