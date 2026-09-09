---
type: design_summary
title: design_summary
project: slg_website
description: Consolidación de todo lo que los cinco design_docs se auto-declararon — las 18 decisiones de diseño que exigen entrada en el decision_log (D-25…D-42), los 8 conflictos abiertos entre documentos con una resolución concreta propuesta para cada uno, los 26 huecos [PENDIENTE] deduplicados con dueño y milestone, y la lista corta de lo que Ricardo tiene que decidir antes de start-execution.
tags: [slg, slg_website, design-doc, design-summary, decisiones, conflictos, pendientes, okf, software-app]
status: design
level: SUMMARY
timestamp: 2026-09-08
sources:
  - "design_docs/data_model.md — §1.2, §2.1, §2.3, §2.6, §3.3, §3.10, §5.12, §11.1, §11.2, §11.3"
  - "design_docs/api_contracts.md — §2.1, §2.5, §2.7, §3.6, §3.7, §3.9, §6.3, §8.1, §8.2, §9.3, §9.4, §9.6, §10, §11.3, §11.9, §13.1, §13.2, §13.3, §13.4"
  - "design_docs/architecture.md — §2.5, §3.6, §5.3, §6.2, §6.3, §10.3, §11.3, §15.1, §15.2, §15.3"
  - "design_docs/style_guide.md — §2.2, §2.3, §4.2, §10, §11"
  - "design_docs/ui_wireframes.md — §1.4, §7.3, §8.1, §12"
  - "docs/decision_log.md — D-14…D-24, P-3, P-4, S-01"
  - "implementation/user_units.md — §0.6, §0.7, §5 (huecos 1, 5, 6, 13)"
  - "planning/requirements.md — RF-32, RF-34, RF-50, RF-52, RF-54, RF-71, RF-94, RF-95, RF-117, RNF-05, RNF-20, RNF-25"
  - "START_PROJECT.md v1.1 — §5.1, Anexo C (C.1), Anexo D (D2, D10), Anexo I-3, I-5, I-6, I-9, I-10"
---

# Resumen de diseño — slg_website

Los cinco `design_docs` declaran, cada uno en su sección final, lo que decidieron por su cuenta, lo
que dejaron abierto y dónde se contradicen entre ellos. Repartido por cinco documentos de 7.000
líneas, eso es invisible. Este documento **no decide nada nuevo**: recoge lo que ya está escrito, lo
deduplica y le pone dueño y milestone, para que Ricardo lo vea junto.

**Regla de este documento:** todo lo que aparece aquí está en alguno de los cinco documentos, en
`docs/decision_log.md` o en `implementation/user_units.md`. Lo que este documento **añade** —una
resolución propuesta para un conflicto, un identificador `D-NN` propuesto, un dueño— va marcado como
**[propuesta]**. Nada se rellena.

## 0. Qué declara realmente cada documento

| Documento | Decisiones propias declaradas | Conflictos declarados | Huecos declarados |
|---|---|---|---|
| `data_model.md` | **5** (§11.2) | — | **7** (§11.1) |
| `api_contracts.md` | **12** (§13.3) | **1** (§13.2) | **8** (§13.1) |
| `architecture.md` | **7**, A-01…A-07 (§15.3) | **2**, C-1 y C-2 (§15.2) | **10** (§15.1) |
| `style_guide.md` | **0** — no tiene sección de decisiones a registrar | **1** (§2.3, anillo de foco) | **4** (§11) |
| `ui_wireframes.md` | **0** — no tiene sección de decisiones a registrar | **0** | **11** (§12) |

> **Corrección a la premisa del encargo.** `style_guide.md` y `ui_wireframes.md` **no declaran
> "sus propias decisiones de diseño"**: ninguno de los dos tiene una sección equivalente a §11.2,
> §13.3 o §15.3. `style_guide` declara un conflicto y cuatro huecos; `ui_wireframes` declara once
> huecos y nada más. Lo que sí contienen y aquí se recoge: la regla derivada de contraste de
> `style_guide` §2.3 (que ningún otro documento fija) y la regla 404-no-403 de `ui_wireframes` §1.4
> y §8.1 (que coincide con A-03 de `architecture` y se agrupa con ella).

---

## 1. Decisiones de diseño tomadas por los documentos

Las **18 entradas** que hay que escribir en `docs/decision_log.md` al aprobar el plan. Salen de las
5 de `data_model` §11.2, las 12 de `api_contracts` §13.3, las 7 de `architecture` §15.3 y la regla
derivada de `style_guide` §2.3 — **24 declaraciones agrupadas en 18 entradas**, porque cinco eran
equivalentes o pertenecían a la misma decisión.

Los identificadores `D-25`…`D-42` son **[propuesta]**: continúan la numeración del `decision_log`,
que hoy llega a D-24.

| ID | Origen | Decisión, en una frase | Por qué el brief no la fijaba | Impacto si Ricardo la revierte |
|---|---|---|---|---|
| **D-25** | `data_model` §2.6 | Tamaño máximo de subida por destino: **25 MB** en `downloads`, **50 MB** en `deliverables` (`pdf`/`material`), **5 MB** en `html`, **1 MB** en `md`, tope duro **50 MB** | RNF-25 dejó el número abierto y mandó fijarlo aquí | Bajo si sube; alto si baja: FU-04 y FU-09 usan la constante única, y el presupuesto del tramo gratuito de R2 (10 GB-mes) está calculado sobre estos topes |
| **D-26** | `data_model` §3.3 | `organization.status` con **2** valores (`active`, `archived`) y `project.status` con **3** (`active`, `completed`, `archived`), deliberadamente mínimos | B.2, RF-77 y RF-79 piden «estado» sin enumerarlo | Añadir estados comerciales (`paused`, `negotiation`) mueve la frontera (a) de `scope.md`: eso es el CRM, no la web. Cambiar el enumerado después es migración de datos |
| **D-27** | `data_model` §1.2, §2.1, §2.3 | Convenciones de esquema en la frontera con Better Auth: **PK `text` uniforme** en las 19 tablas, **enumerados como `text` + `CHECK` nombrado** en vez de tipo `ENUM` nativo, renombres **`member`→`membership`** y **`apikey`→`api_key`**, alcances en columna propia `scopes`, `timestamptz` en todas las fechas *(agrupa 3 de las 5 de §11.2)* | El brief no entra en el tipo de las claves ni en cómo se escriben los enumerados | Muy alto después de la primera migración: es el tipo de la clave primaria de las 19 tablas. Prácticamente irreversible una vez FU-04 corre |
| **D-28** | `api_contracts` §11.9 | Caducidad de las URLs firmadas: **15 min** descarga pública · **10 min** entregable del portal · **30 min** subida por API. Tres variables de entorno, no tres constantes | RNF-20 dejó el número abierto y mandó fijarlo aquí | Bajo: son variables de entorno. Alargarlas debilita el gate D10; acortarlas rompe la descarga desde móvil con mala cobertura (DoD #1) |
| **D-29** | `api_contracts` §2.1, §2.5, §2.7, §3.9 | Forma transversal de `/api/v1`: **sobre de error único** (`code` estable, `message` sin internos, `request_id` = `audit_log.id`), **paginación por cursor opaco** (50 por defecto, 200 máximo), **sin `PATCH`, `PUT` ni `DELETE`**, y `openapi.json` **generado** de los mismos esquemas que validan *(agrupa 4 de las 12 de §13.3)* | B.5 pide una API v1 con alcances; no fija forma de error, paginación, verbos ni cómo se produce la especificación | Alto una vez publicada: cambiar la forma del error o la paginación es romper a todo consumidor. Antes de M5 el coste es cero |
| **D-30** | `api_contracts` §8.1 | En la cola del CRM, **las cinco esperas preceden a los cinco intentos** (1 min → 10 min → 1 h → 6 h → 24 h), para conservar los cinco números de RF-50 dentro del tope de cinco intentos del `data_model`. **Resuelve C-1** | B.6-3 y RF-50 enumeran cinco esperas; el esquema acota a cinco intentos. Solo encajan si cada espera precede a un intento | Medio: la alternativa (primer intento inmediato) obliga a descartar la espera de 24 h o a subir el tope a 6 intentos, lo que toca la restricción `crm_delivery_attempt_bounded`. Coste asumido hoy: el contacto llega al CRM ~1 min después de la captura |
| **D-31** | `api_contracts` §3.6 | Una **clave acotada a una empresa** ve solo entregables `client` **publicados**; una **clave de SLG** lo ve todo | B.5 fija alcances por verbo, no visibilidad por fila | Alto: es la regla que sostiene el aislamiento en la superficie de agentes (DoD #5, gate D9). Relajarla filtra borradores de una empresa a otra |
| **D-32** | `api_contracts` §9.3, §9.4 + `architecture` A-07 | Contrato criptográfico y de garantía de los webhooks: cabecera **`X-SLG-Signature`**, cadena firmada **`<timestamp>.<cuerpo crudo>`**, tolerancia de **5 min**, **dedupe por `X-SLG-Delivery`**, y entrega **«al menos una vez»** *(agrupa la decisión de `api_contracts` con A-07, que es la misma)* | B.7 exige «firma HMAC-SHA256 en cabecera» y no fija nombre, cadena, tolerancia ni garantía de entrega | Alto tras el primer suscriptor: cambiar la cadena firmada invalida toda verificación existente. Antes, cero |
| **D-33** | `api_contracts` §10.1, §10.3, §10.4, §10.6, §10.8 | Los webhooks **no transportan** correo, nombre, token, cuerpo de aviso ni URL firmada — solo identificadores y el hecho | El brief lista los nueve eventos, no su carga útil | Bajo técnicamente, alto en promesa: es privacy-first aplicado. Revertirlo saca datos personales a un canal saliente |
| **D-34** | `api_contracts` §3.7 | `publish` es **obligatorio y sin valor por defecto** en `POST /announcements` | B.5 no dice si publicar es el defecto | Bajo, pero un defecto implícito publica avisos a clientes por omisión: el fallo es silencioso y visible para el cliente |
| **D-35** | `api_contracts` §6.3 | **Plantillas exactas de la nota del CRM**, una por `source`, con las siete reglas de composición | B.6-2 da un ejemplo de nota, no un contrato | Bajo: cambiar la plantilla no migra nada. Pero las notas ya escritas en el CRM quedan con el formato viejo |
| **D-36** | `api_contracts` §11.3 | El adaptador de correo **habla SMTP estándar**: no existe variable de SDK propietario, y esa ausencia es la decisión. **[propuesta: anotarlo bajo D-22 en vez de darle ID propio]** — materializa la condición de diseño que D-22 ya impone | D-22 lo exige como condición; ningún documento lo había materializado en variables | Bajo hoy, alto mañana: es lo que hace que cambiar de proveedor cueste tres variables y ninguna línea |
| **D-37** | `architecture` §6.2, §6.3 (A-01, A-02) | Ejecución de colas: el ejecutor **vive dentro del servicio `slg-web`**, no en un servicio aparte ni en un orquestador externo (A-01), y reclama trabajo por **reserva con plazo empujando `next_attempt_at`**, sin estado «en curso» nuevo (A-02) *(agrupa A-01 y A-02: son la misma decisión de ejecución)* | El brief no dice dónde corre el trabajo en segundo plano; RF-115 solo exige que n8n sea opcional | Medio: separar el trabajador es la salida de escape ya documentada (§6.7) y no reabre el esquema. Cambiar el mecanismo de reserva sí toca las tres colas a la vez |
| **D-38** | `architecture` A-03 + `ui_wireframes` §1.4, §8.1 | **404, nunca 403**, al cruzar de superficie o de empresa *(agrupa: los dos documentos dicen lo mismo)* | RF-71 dice literalmente «404/403»: deja la ambigüedad abierta | Bajo de construir, alto de seguridad: un 403 confirma que la ruta o el recurso existen. Es coherente con los mensajes neutros de RF-59 |
| **D-39** | `architecture` A-04 (§2.5) | En `/api/v1`, el **límite de peticiones (429) se comprueba antes que el alcance (403)** | El brief fija ambos controles, no su orden | Bajo: es una línea de middleware. Invertirlo deja que una clave martillee endpoints prohibidos sin consumir cuota |
| **D-40** | `architecture` A-05 (§3.6) | La **caché de métricas del CRM vive en memoria del proceso**, no en una tabla | RF-55 exige caché de 5 minutos y no dice dónde | Bajo: un reinicio cuesta una lectura. Llevarla a tabla obliga a declararla en `data_model` |
| **D-41** | `architecture` A-06 (§5.3) | El **espejo de la tabla `download` se sincroniza en el despliegue y nunca borra filas** | B.4 define el puente contenido↔base de datos sin decir qué pasa al retirar un documento | Alto: borrar filas rompe la trazabilidad de las capturas anteriores, que apuntan a `download` como ancla de identidad |
| **D-42** | `style_guide` §2.3 **[propuesta: el documento no la declara como decisión a registrar]** | Regla derivada de los contrastes medidos: **si una sección oscura necesita cyan legible, la sección es `--indigo`, no `--blue-deep`** (2,8:1 vs 5,3:1), y **`--line` divide pero no delimita** un control (1,6:1) | El Anexo C admite el cyan como acento en secciones oscuras sin medir el contraste sobre cada fondo | Bajo de construir, pero revertirlo es publicar texto que falla AA: choca de frente con el gate D2 y RNF-04 |

---

## 2. Conflictos entre documentos

Los **cuatro declarados** por los propios documentos, más **cuatro encontrados al leerlos**. Cada uno
propone una resolución concreta.

> **Estado a 2026-09-08: dos ya no están abiertos.** **CF-3** lo cierra **D-44** (anillo de foco de
> dos capas) y **CF-4** lo cierra **D-45** (origen separado del visor, normativo). Ambos quedan aquí
> con su resolución escrita, ya propagada a los documentos afectados; se conservan como traza, no como
> conflicto vivo.

| ID | Documentos en desacuerdo | En qué | Quién debería ceder, y por qué | Resolución propuesta **[propuesta]** |
|---|---|---|---|---|
| **CF-1** *(declarado: `api_contracts` §13.2 ≡ `architecture` C-2)* | `api_contracts` §8.2 **vs** `data_model` §5.12 | El reintento manual de RF-52 sobre una captura `failed` no cabe: `crm_delivery_attempt_bounded` acota `attempt` a 1…5 y `crm_delivery_attempt_unique` es `UNIQUE (lead_capture_id, attempt, endpoint)`. Un sexto episodio no cabe y reutilizar 1…5 colisiona | **`data_model`**. `api_contracts` no puede divergir del esquema sin convertirse en un defecto, y ya se abstuvo de usar la columna: la declaró como hueco | **Spec-delta del `data_model` antes de DU-16**: columna `cycle integer NOT NULL DEFAULT 1` en `crm_delivery`, restricción a `UNIQUE (lead_capture_id, cycle, attempt, endpoint)`, y el reintento manual abre ciclo nuevo con `crm_attempts = 0`. Conserva la traza del ciclo anterior y mantiene el tope de cinco intentos **por ciclo**. *Nota: `architecture` C-2 es este mismo conflicto declarado por segunda vez, y manda resolverlo en **DU-09**, no en un spec-delta antes de **DU-16**. Se unifica la vía: spec-delta primero, DU-09 lo consume* |
| **CF-2** *(declarado: `architecture` C-1)* | `architecture` §15.2 **vs** `api_contracts` §8.1 | `architecture` declara abierta la contradicción «cinco esperas contra cinco intentos» y dice **«no se decide aquí»**; `api_contracts` **ya la decidió** (las esperas preceden a los intentos, los cinco escalones se usan). DU-09 recibiría dos instrucciones | **`architecture`**. Es la que dice no decidir; la otra decidió y razonó el coste | Registrar **D-30** y marcar C-1 como **cerrada** en `architecture` §15.2, con puntero a `api_contracts` §8.1. Cero cambios de código: es una línea de documento |
| ~~**CF-3**~~ ✅ **RESUELTO por D-44** *(declarado: `style_guide` §2.3)* | `style_guide` §2.3 **vs** Anexo C.1 del brief | C.1 lista `--cyan` entre los usos de «anillos de foco». Medido, `--cyan` sobre `--paper` da **2,4:1**: un anillo solo de cyan **no cumple** RNF-05 ni el gate D2 | **El brief (C.1)**. El número es medido sobre los hexadecimales del propio kit; no es una preferencia | ✅ **Cerrado por D-44 (2026-09-08)**: **anillo de foco de dos capas** — capa exterior `--cyan` `#50B4DC`, capa interior `--blue-primary` `#2878B4` o `--ink`; `--cyan` nunca solo. Las dos capas conservan la intención cromática del kit y añaden el contraste que faltaba: es una **precisión** del Anexo C, no una contradicción. Token en **FU-02**, verificación en **FU-10**. Propagado a `style_guide` §2.3 y §11-1, `ui_wireframes` §3.2 y `knowledge/brand-tokens.md` |
| ~~**CF-4**~~ ✅ **RESUELTO por D-45** *(encontrado)* | `data_model` §3.10 y `ui_wireframes` §7.3 **vs** `architecture` §11.3 y §15.1-10 | Dos documentos afirman como normativo que el visor de HTML se sirve **desde origen separado**; `architecture` solo exige `iframe sandbox` sin `allow-same-origin` + CSP estricta, y declara el origen separado como **hueco abierto** («si se sirve **además** desde un origen aislado») | **`architecture`**. Dos documentos ya lo prometen y R-11 lo pide; dejarlo como opcional es prometer una defensa que puede no construirse | ✅ **Cerrado por D-45 (2026-09-08)** a favor de lo que `data_model` §3.10 y `ui_wireframes` §7.3 ya prometían: el **origen separado (subdominio propio) es normativo**. El `iframe sandbox` sin `allow-same-origin` y la CSP estricta **se mantienen** como defensa en profundidad, no como alternativa. Escrito en `architecture` §11.3 y §15.1-10, ruta de entrega declarada en `api_contracts` §3.6; se construye en **DU-19**. Queda `[PENDIENTE: nombre del subdominio del visor, se fija en M4]` |
| **CF-5** *(encontrado)* | `architecture` §11.3 **vs** `data_model` §2.6 | `architecture` cita **«25 MB según `data_model` §2.6»** al hablar de la validación de subidas de entregables. `data_model` §2.6 fija 25 MB **solo** para el bucket `downloads`; `deliverables` es **50 MB**, con tope duro de 50 MB | **`architecture`**. Es una cita mal traída de una tabla de cinco filas | Corregir `architecture` §11.3 a: «25 MB en `downloads`, 50 MB en `deliverables`, tope duro de 50 MB». Sin corregir, FU-09 puede implementarse rechazando entregables legítimos de entre 25 y 50 MB |
| **CF-6** *(encontrado; el propio `user_units` lo declara en su §5-5)* | `implementation/user_units.md` §0.7 y §5-5 **vs** `docs/decision_log.md` D-21/D-22 y los cinco `design_docs` | `user_units` escribe el correo transaccional y el destino de backups **por categoría, sin producto**, y declara que nombrarlos es «conflicto a resolver antes de ejecutar FU-08 y FU-14». D-21 y D-22 ya eligieron **Cloudflare R2** y **Resend**, y los cinco `design_docs` los nombran. *(`ui_wireframes` arrastra lo mismo en su notación, que dice «D-14…D-20», y en su Registro)* | **`user_units`**. La Regla 7 prohíbe nombrar productos que Ricardo **no** haya elegido; estos los eligió el 2026-09-08 | Actualizar `user_units` §0.7 y §5-5 a D-21/D-22 **conservando la cláusula de adaptador** (FU-08 habla SMTP, FU-14 habla API S3 genérica), y ampliar la notación de `ui_wireframes` a «D-14…D-24». No reabre ninguna unidad |
| **CF-7** *(encontrado; deriva del anterior)* | `implementation/user_units.md` §0.6 y §5-1/§5-6 **vs** la realidad del repositorio | `user_units` afirma que **faltan cuatro de los cinco `design_docs`** y que RNF-20 y RNF-25 siguen abiertos, y por eso declara **bloqueadas FU-04, FU-09, DU-22 y DU-23**. Los cinco existen y ambos umbrales están cerrados (D-28, D-25) | **`user_units`**. Se escribió en el paso 7, antes de que existieran cuatro de los cinco documentos | Actualizar §0.6 y §5-1/§5-6: **el bloqueo declarado se levanta**. Es la corrección que más desbloquea del lote, y no toca ninguna unidad |
| **CF-8** *(declarado en tres sitios, no es desacuerdo entre `design_docs`)* | `START_PROJECT.md` §5.1 y RF-117 **vs** D-24 | El brief y RF-117 fijan `support@softlandingglobal.com` como **remitente**; D-24 lo invalida al aislar el envío en un subdominio dedicado. `api_contracts` §11.3, `architecture` §10.3 y `user_units` §5-13 ya lo declaran desactualizado | **El brief**. Es exactamente lo que el encargo advierte: el brief está obsoleto en esto | Se cierra con **P-3 y P-4 en M0**, antes de FU-08 (ver H-01 y H-02). Anotar la corrección en `planning/requirements.md` junto a RF-117, y recordar que `support@` sigue siendo el **destinatario** de los avisos (RF-53) y, previsiblemente, el `Reply-To` |

---

## 3. Huecos `[PENDIENTE]` consolidados

Los **7 + 8 + 10 + 4 + 11 = 40 huecos declarados** por los cinco documentos colapsan en **26 filas
reales**: el mismo hueco citado en tres documentos es **una** fila. Dos de los cuarenta **ya están
cerrados** y se anotan bajo la tabla.

«Quién lo cierra»: **Ricardo** = decisión suya · **Agente** = lo cierra la unidad al construir ·
**Externo** = depende de un tercero o de otro repositorio.

| # | Hueco | Dónde vive | Quién lo cierra | Milestone / unidad |
|---|---|---|---|---|
| **H-01** | **P-4** — nombre exacto del subdominio de envío | `data_model` §11.1-1 · `api_contracts` §13.1-5 · `architecture` §15.1-1 · `user_units` §5-13 · `decision_log` P-4 | **Ricardo** | **M0**, antes de FU-08 (M0-B) |
| **H-02** | **P-3** — dirección remitente visible: `From` en el subdominio con `Reply-To` a `support@`, o `From` en la raíz apoyada solo en alineación DKIM | `data_model` §11.1-2 · `api_contracts` §13.1-5 · `architecture` §15.1-2, §10.3 · `decision_log` P-3 | **Ricardo** | **M0**, antes de FU-08 (M0-B) |
| **H-03** | Tipos y valores exactos de los registros DNS del subdominio de envío | `architecture` §15.1-3 | **Externo** (panel del proveedor, F.2-4) + agente | **M0**, tras H-01 |
| **H-04** | `organization.primary_contact` (B.2): ¿usuario de la empresa con `FK` y `SET NULL`, o texto libre? | `data_model` §11.1-3 | **Ricardo** | **Antes de FU-04** (M0-A) — cambia el tipo de columna antes de la primera migración |
| **H-05** | Persistencia del límite de peticiones (RF-34): tabla o almacén en memoria | `data_model` §11.1-4 · `api_contracts` §13.1-7 | **Agente** | **FU-11** (M2). Si es tabla, se declara en `data_model` **antes** de escribirla |
| **H-06** | Dónde vive la lista de dominios de correo gratuito (RF-32, marcado `asumido`); debe ser dato editable sin desplegar | `data_model` §11.1-5 · `api_contracts` §13.1-6 y §11.8 (`FREE_EMAIL_DOMAINS_SOURCE`) | **Agente**, con confirmación de Ricardo por ser `asumido` | **FU-11** (M2) |
| **H-07** | MIME aceptados para `deliverable.type = 'material'` (el tamaño ya está fijado por D-25) | `data_model` §11.1-6 · `api_contracts` §13.1-8 | **Agente** | **FU-09** (M0-B) |
| **H-08** | Nombres exactos de los campos del CRM en `POST /contacts` y `POST /notes` | `api_contracts` §13.1-1 | **Agente con Ricardo**, contra `~/Dev/crm_slg` o el MCP del CRM | **Antes de DU-09** (M2); el resultado se registra en `work_log` |
| **H-09** | Forma exacta de `POST /api/v1/leads` y de su respuesta (modo `lead_admission` de D-19): **el endpoint no existe** | `api_contracts` §13.1-2, §7.1 | **Externo** — el `/iterate` del repositorio del CRM | Fuera de este proyecto. **No bloquea M2**: es justo lo que D-19 evita con el adaptador de dos modos |
| **H-10** | Forma exacta de `/dashboard/metrics`, `/reports/funnel` y `/reports/sources` | `api_contracts` §13.1-3, §8.3 | **Agente**, contra el MCP de solo lectura del CRM | **Antes de DU-13** (M3) |
| **H-11** | Ruta real de la ficha de contacto en el frontend del CRM (plantilla `CRM_CONTACT_URL_TEMPLATE`) | `api_contracts` §13.1-4, §8.4 · `architecture` §15.1-8 · `ui_wireframes` §12-7 | **Ricardo** (F.2-5, Anexo I-9) | **Antes de DU-09** (M2). Degrada sin romper: si falta, el enlace no se pinta |
| **H-12** | Intervalo del barrido de colas (restricción dura: **< 60 s**) | `architecture` §15.1-5 | **Agente** | **DU-09** (M2), se registra en `decision_log` |
| **H-13** | Duración del plazo de reserva de una fila reclamada (restricción dura: mayor que el tiempo máximo de espera de la llamada externa, `CRM_TIMEOUT_MS`) | `architecture` §15.1-6 | **Agente** | **DU-09** (M2) |
| **H-14** | Mecanismo exacto de programación de la copia diaria en la plataforma | `architecture` §15.1-7 | **Agente** | **FU-14** (M5) |
| **H-15** | Si el cerrojo por cola se activa desde v1 o solo al escalar réplicas | `architecture` §15.1-9 | **Ricardo / operación** | **No bloquea**. Se registra en `decision_log` cuando aparezca una segunda réplica |
| ~~**H-16**~~ | ~~Origen aislado del visor de HTML de entregables — **es el conflicto CF-4**~~ | `architecture` §11.3, §15.1-10 · `data_model` §3.10 · `ui_wireframes` §7.3 · `api_contracts` §3.6 | — | ✅ **Cerrado por D-45**: origen separado **normativo**, sandbox y CSP como defensa en profundidad. **Agente construye en DU-19** (M4). Queda solo `[PENDIENTE: nombre del subdominio, M4]` |
| ~~**H-17**~~ | ~~Token del anillo de foco — **es el conflicto CF-3**~~ | `style_guide` §2.3, §11-1 · `ui_wireframes` §3.2 · `knowledge/brand-tokens.md` | — | ✅ **Cerrado por D-44**: anillo de dos capas, exterior `--cyan`, interior `--blue-primary` o `--ink`. Token en **FU-02** (M0-A), verificación en **FU-10** (M1-A) |
| **H-18** | Tamaño e interlineado web de H1, H2 y H3; interlineado de caption y eyebrow. El kit los da en puntos de documento impreso, que no se traducen a pantalla | `style_guide` §11-2, §4.2 | **Agente propone** (las celdas «propuesta» ya están escritas), **Ricardo aprueba** | **FU-02** (M0-A) + `decision_log` |
| **H-19** | Logo **SLG Agency** (SVG + PNG), favicon, imagen Open Graph y Montserrat en `woff2` (400/600/700, subconjunto latino). El logo del kit es *Softlanding Global Academy*: otra marca, no sirve | `style_guide` §11-3, §10 · `ui_wireframes` §12-10 · R-35, Anexo I-5 | **Externo** | **Requisito de go-live**, no de M1. El respaldo tipográfico de C.3 permite construir el sitio entero sin ellos |
| **H-20** | Si el tagline *«The discipline of going global»* se usa en `SLG_Holdings` | `style_guide` §11-4 · `ui_wireframes` §2.3 | **Ricardo** | **FU-01** |
| **H-21** | Redacción de **todas** las cadenas ES/EN: titulares, mensajes de error, textos de estado vacío, datos de contacto y jurisdicción del pie, biografía y mentorías de Nosotros, y el plazo de respuesta de la variante *contacto* de `/gracias` *(agrupa §12-1, §12-9 y §12-11)* | `ui_wireframes` §12-1, §12-9, §12-11 | **Externo / Ricardo** (se produce en `SLG_Overhauling`) | **FU-01**, compuerta de M1-A |
| **H-22** | Qué documento de los once se destaca en Home y con qué criterio rota | `ui_wireframes` §12-2, §2.1 | **Ricardo** | **FU-01** |
| **H-23** | Si existe archivo del documento completo de Doctrina (no figura entre D-01…D-11) | `ui_wireframes` §12-3, §2.4 · Anexo I-3 | **Ricardo** | **FU-01** |
| **H-24** | Texto legal de privacidad y términos | `ui_wireframes` §12-4, §2.9 · F.2-1, Anexo I-6 | **Externo / Ricardo** | Antes del go-live; visible en staging hasta entonces |
| **H-25** | URL del calendario de «Agenda tu Sesión Cero» (RF-94, marcado `asumido`) | `ui_wireframes` §12-8, §7.7 · Anexo I-10, F.2-6 | **Ricardo** | **DU-21** (M4). Degrada a «próximamente» sin romper la pantalla |
| **H-26** | **[encontrado, no declarado en §13.1]** Si, sin suscriptor configurado, se crea fila en `webhook_delivery` con destino `none` y `status = 'delivered'`, o simplemente no se crea fila. `api_contracts` §9.6 dice «lo decide FU/DU-12» y no lo lista entre sus ocho huecos | `api_contracts` §9.6 | **Agente** | **DU-12** (M2). Afecta a si la evidencia de un hecho existe cuando nadie escucha |

### Dos huecos que **ya están cerrados** y siguen citados como abiertos

| Hueco | Quién lo citaba abierto | Dónde se cerró |
|---|---|---|
| Caducidad de la URL firmada, en minutos (RNF-20) | `data_model` §11.1-7 · `architecture` §15.1-4 · `ui_wireframes` §12-5 · `user_units` §0.6 | **`api_contracts` §11.9** → **D-28** (15 / 10 / 30 min) |
| Tamaño máximo de subida, en MB (RNF-25) | `ui_wireframes` §12-6 · `user_units` §0.6 | **`data_model` §2.6** → **D-25** (25 / 50 / 5 / 1 MB, tope 50) |

Ambos son los dos umbrales que `user_units` §0.6 declara bloqueantes de **FU-04, FU-09, DU-22 y
DU-23**. Con D-25 y D-28 registradas, **ese bloqueo se levanta** (ver CF-7).

---

## 4. Lo que Ricardo tiene que decidir antes de `start-execution`

Ser honesto es parte del encargo, así que: **nada de lo consolidado obliga a replanificar**. Los 39
unidades, los 194 requisitos y los cinco `design_docs` se sostienen. Lo que sí hay es una lista corta
de cuatro cosas que **sí** bloquean la primera unidad, y una pasada de correcciones documentales.

### 4.1 Bloquea de verdad — hay que resolverlo antes de arrancar

| # | Qué | Por qué bloquea | Cuánto cuesta decidirlo |
|---|---|---|---|
| **1** | **Aprobar el bloque D-25…D-42 y escribirlo en `docs/decision_log.md`** | Los propios documentos lo exigen: `data_model` §11.3 no permite la primera migración sin registrar sus cinco, y `api_contracts` §13.4 no da la API por buena sin las suyas. **FU-04 es unidad de M0-A**: es de las primeras que se ejecutan | Una lectura de la tabla §1 y un sí. Si algo no le convence, es ahí donde se dice |
| **2** | **H-04 — `organization.primary_contact`: ¿usuario con `FK` o texto libre?** | Cambia el tipo de una columna **antes** de la primera migración. Decidirlo después es migración de datos | Una frase |
| ~~**3**~~ | ~~**CF-3 / H-17 — el token del anillo de foco**~~ | ✅ **Ya no bloquea: cerrado por D-44** (2026-09-08). El anillo es de **dos capas** —exterior `--cyan`, interior `--blue-primary` o `--ink`—, así que FU-02 ya puede producir el token y FU-10 verificarlo contra el gate D2 y RNF-05 | Decidido |
| **4** | **S-01 — verificación de higiene de credenciales** | Precede a FU-05, que es la unidad que carga variables de entorno de producción. Se sigue fuera de este repositorio | Una rotación, fuera del repositorio |

### 4.2 Decidir el alcance, no urgente pero mejor ahora

| # | Qué | Por qué conviene ahora |
|---|---|---|
| ~~**5**~~ | ~~**CF-4 / H-16 — ¿el visor de HTML se sirve desde origen separado, sí o no?**~~ | ✅ **Decidido: sí. D-45** (2026-09-08). Los cuatro documentos dicen ya lo mismo —`architecture` §11.3, `data_model` §3.10, `ui_wireframes` §7.3 y `api_contracts` §3.6—; el sandbox y la CSP se mantienen como defensa en profundidad. Se construye en DU-19 (M4), con el nombre del subdominio pendiente de M4 |
| **6** | **Autorizar la pasada de correcciones documentales: CF-2, CF-5, CF-6, CF-7** | Son ediciones de documento, cero código, y ninguna reabre una unidad. CF-7 **levanta un bloqueo declarado** sobre FU-04, FU-09, DU-22 y DU-23. CF-5 evita que FU-09 se construya con el tope equivocado |
| **7** | **CF-1 — confirmar la vía del `cycle`** | La resolución ya está escrita y razonada en `api_contracts` §8.2; solo hay que confirmar que se hace por **spec-delta del `data_model`** antes de DU-16, y no dos veces en dos sitios |

### 4.3 Puede esperar a M0 sin bloquear nada

- **H-01 y H-02 (P-4 y P-3)**: se fijan en M0 antes de **FU-08**, que está en **M0-B**, no en la
  primera tanda. El `decision_log` ya los tiene registrados como abiertos con esa fecha.
- **H-03**: depende de H-01 y del panel del proveedor (F.2-4).
- **H-18**: el agente ya trae la propuesta escrita en `style_guide` §4.2; se aprueba dentro de FU-02.
- **H-19 a H-25**: son de FU-01, de M4 o del go-live, y todos degradan sin romper.
- **H-05 a H-08, H-10 a H-14, H-26**: los cierra el agente dentro de su unidad, con el resultado
  registrado. Ninguno necesita a Ricardo salvo H-06 (confirmación de un `asumido`) y H-11.

---

## Registro

- `2026-09-08` — Creado tras el paso 6 de `init-project`, consolidando las secciones finales de los
  cinco `design_docs` (`data_model` §11, `api_contracts` §13, `architecture` §15, `style_guide` §2.3
  y §11, `ui_wireframes` §12), contrastadas con `docs/decision_log.md` (D-14…D-24, P-3, P-4, S-01) e
  `implementation/user_units.md` (§0.6, §0.7, §5). **24 declaraciones de decisión agrupadas en 18
  entradas propuestas** (D-25…D-42), **8 conflictos** —4 declarados por los documentos y 4
  encontrados al leerlos (CF-4, CF-5, CF-6, CF-7)—, cada uno con resolución concreta propuesta, y
  **40 huecos declarados deduplicados en 26 filas**, más **2 ya cerrados** que tres documentos siguen
  citando como abiertos. Se corrige la premisa del encargo en un punto: **`style_guide` y
  `ui_wireframes` no declaran decisiones propias a registrar**; solo conflicto y huecos el primero, y
  solo huecos el segundo. Sin nombrar ningún producto que Ricardo no haya elegido en HITL
  (AGENTS.md Regla 7). Sin valores de credencial ni detalle operativo de S-01: el repositorio es
  público (§10-6).
- `2026-09-08` — **D-44 y D-45** cierran **CF-3** y **CF-4**, y con ellos **H-17** y **H-16**. El §2
  los marca RESUELTOS, el §4.1-3 deja de bloquear el arranque y el §4.2-5 deja de ser una pregunta de
  alcance. Propagado a `style_guide` §2.3 y §11, `ui_wireframes` §3.2 y §7.3,
  `knowledge/brand-tokens.md`, `architecture` §11.3 y §15.1-10, `data_model` §3.10 y `api_contracts`
  §3.6 y §13.1. Único resto abierto: `[PENDIENTE: nombre del subdominio del visor, se fija en M4]`.
