---
type: planning
title: 03_plan_contenidos
project: slg_website
description: Plan de reingeniería de contenidos y propuesta de valor del sitio público de SLG. Incluye tres alternativas de hero ES/EN, la nueva arquitectura narrativa de la home, la reubicación de ramas, servicios y doctrina, el inventario de prueba pendiente, el método con nombre, la ruta de conversión, la guía de tono, los cambios por tipo de página con sus implicaciones bilingües y las unidades FU/DU con criterios de aceptación.
tags: [slg, slg_website, planning, reingenieria, contenidos, propuesta-de-valor, copy, bilingue]
status: planning
timestamp: 2026-10-27
inputs:
  - planning/reingenieria/01_analisis_agenciaia.md   # ledger E-AIA-01…57
  - planning/reingenieria/01_analisis_prayaga.md     # ledger E-PRY-01…60
  - planning/reingenieria/01_analisis_slg_actual.md  # ledger E-SLG-01…84 (estado = origin/develop)
  - planning/reingenieria/02_sintesis_comparativa.md # principios P1…P8, brechas B-01…B-13, decisiones D-1…D-8
  - implementation/user_units.md                     # convenciones FU/DU, contrato A.3, compuertas
---

# 03 — Plan de contenidos y propuesta de valor

> **Estado: PLAN para aprobación de Ricardo (AGENTS.md, Planning Gate).** Este documento no cambia código ni
> contenido publicado. Ninguna unidad de §9 se ejecuta hasta que el plan esté aprobado y estén cerradas las
> decisiones de las que depende (§0.3).
>
> **Cómo leerlo.**
>
> - Las referencias `E-AIA-…`, `E-PRY-…` y `E-SLG-…` remiten a los ledgers de los análisis. `P1…P8`, `B-01…B-13`
>   y `D-1…D-8` remiten a la síntesis (`02_sintesis_comparativa.md`).
> - Todo el copy que aparece aquí es **BORRADOR**. Pasa por la compuerta de copy (FU-RC02) antes de publicarse, y en
>   esa compuerta lo aprueba o reescribe Ricardo.
> - `[PENDIENTE: Ricardo]` marca un dato que **solo Ricardo puede aportar**. Este plan no inventa cifras, casos,
>   clientes, duraciones ni precios. Un hueco se queda como hueco.
> - Todo el trabajo parte de **`origin/develop`** (lo publicado), no de `main` ni de esta copia local
>   (E-SLG-41, E-SLG-71).
> - **Corregido tras crítica** (`05_critica_y_riesgos.md`): C-01 (los `[PENDIENTE]` no pueden llegar a
>   `develop`, que es producción), C-04 (accesibilidad 100 como no-regresión), C-05 (prerender), C-06 (el mapa
>   reutiliza `/empieza-aqui` y `/en/start-here`), C-09 (una sola franja oscura), C-14 (montaje único de la
>   portada con el plan visual), C-15 (fases sin entregable), C-16 (escenas sin afirmar práctica no confirmada) y
>   C-17 (menú sin cambios de destino).

---

## 0. Alcance, límites y dependencias

### 0.1 Qué cubre este plan

Solo **contenido y propuesta de valor**: qué se dice, en qué orden, con qué prueba, con qué llamada a la acción y en
qué voz. La forma visual (escala tipográfica, espaciado, diagramas, motion y la aplicación de la skill
`apple-design` sin perder el minimalismo nórdico) es asunto del plan visual hermano. Aquí solo se fijan las
**restricciones de contenido** que ese plan debe respetar: una idea por viewport, nada detrás de una interacción y
dos préstamos visuales como mucho (número grande de fase y antes/después estático) (P7).

### 0.2 Qué no cubre

- No reabre el contrato A.3 de seis secciones de las páginas de servicio. Lo **rellena mejor** (§7.3).
- No toca la capa privada (portal, HQ, API) ni el blog, salvo para enlazarlos.
- No publica casos, cifras ni precios. Las fichas de caso y los formatos de encargo quedan como unidades
  **condicionadas** (§9.4).
- No toca `/assessment`. Su publicación es UNK (E-SLG-83) y su fricción es alta (E-SLG-59). Se deja como posible
  entrada secundaria futura.

### 0.3 Decisiones de Ricardo de las que depende (de la síntesis §7, más una nueva)

| ID | Decisión | Qué bloquea en este plan |
|---|---|---|
| **D-1** | La propuesta de valor vuelve a `/` y el mapa del sitio pasa a ser secundario | Toda la §2 y DU-RC01/DU-RC02. **Bloqueante.** |
| **D-2** | Marca maestra pública | El hero (el nombre que firma), el pie, la página Nosotros y FU-RC03 |
| **D-3** | Nombre público del método | §5 y FU-RC04. Mientras no se decida se usa el nombre de trabajo «Criterio primero» |
| D-4 | Publicar duraciones | Solo DU-RC08 (condicionada). El resto del plan funciona sin duraciones |
| D-5 | Publicar rangos o formatos de encargo | Solo DU-RC08 (condicionada) |
| **D-6** | Audiencia primaria única (directorios y comités) y el lugar de RETx (investigadores y estudiantes) | Los lectores por rol (§2.3) y el copy de Academy |
| D-7 | Fotografía de cabecera | La foto del fundador (§4) y el hero. El plan funciona en los dos casos |
| D-8 | Accesibilidad 100 frente al umbral de 95 | Solo el criterio de cierre de DU-RC06 |
| **D-9** *(nueva)* | **Nombres públicos de servicio.** Hoy `check:nomenclature` **exige** los literales con guion bajo (`SLG_Readiness`, `APP_Building`) y **prohíbe** traducirlos («CoO como Servicio», «Academia SLG») (`develop:site.config.ts:149-224`). Para aplicar P8 hay que elegir entre (a) renombrar los productos o (b) conservar el literal como etiqueta secundaria y titular por resultado | FU-RC03 y todas las DU de página. La recomendación está en §2.4 |

---

## 1. Nueva propuesta de valor: tres formulaciones de hero

**Requisitos comunes a las tres (P1).** La formulación es fija, sin rotación. Hay un solo H1. En la primera
pantalla aparecen **para quién** (directorios y comités), **qué problema** (decidir sobre IA con la información de
quien vende), **qué resultado** (qué preguntar, qué exigir y qué no comprar, con la capacidad dentro) y **un**
siguiente paso. No lleva cifras sin respaldo (`check:copy`) ni agenda. El CTA es una descarga, en rojo, porque es
el único uso permitido del rojo (E-SLG-09, 56, 58).

**Qué descarga el CTA de la home.** El documento de la puerta de entrada, el diagnóstico (Readiness, `d-06`)
(P6, B-07). Así la home y la página de entrada comparten una sola acción.

### Alternativa A — «Decidir con información propia» (posición)

| | ES | EN |
|---|---|---|
| **Titular (H1)** | Decide sobre inteligencia artificial con tu información, no con la de quien vende. | Decide on artificial intelligence with your own information, not the seller's. |
| **Subtítulo** | Trabajamos con directorios y comités de dirección. Te ayudamos a saber qué preguntar, qué exigir y qué no comprar, y la capacidad se queda dentro de tu empresa. | We work with boards and executive committees. We help you know what to ask, what to demand and what not to buy, and the capability stays inside your company. |
| **CTA primario** | Descargar el documento del diagnóstico | Download the diagnosis briefing |
| **Línea bajo el CTA** | A cambio de un correo corporativo, y nada más. | In exchange for a corporate email address, and nothing else. |

**Evidencia.** La posición es E-SLG-04 («no quieren hacerlo con la información que da quien vende»). El resultado
viene de la meta-description de `/servicios` («qué preguntar, qué exigir y qué no comprar»; `develop:content/pages/es/servicios.md:4`).
«La capacidad se queda dentro» procede de E-SLG-17. La línea bajo el CTA es E-SLG-09.
**Qué arregla.** B-01 y B-02. Pone el diferenciador (M-SLG-01) en el titular. Ninguna referencia puede decir esto
(E-AIA-02, E-PRY-01).
**Riesgo (INF).** Es la menos aforística de las tres. Su fuerza está en la nitidez, no en el giro.

### Alternativa B — «No vendemos IA» recuperada (contraste)

| | ES | EN |
|---|---|---|
| **Titular (H1)** | No vendemos inteligencia artificial. Te ayudamos a decidir cuál comprar, cuál construir y cuál no. | We do not sell artificial intelligence. We help you decide what to buy, what to build and what to leave alone. |
| **Subtítulo** | Para directorios y comités de dirección que tienen que decidir sobre IA y no quieren hacerlo con la información que da quien vende. | For boards and executive committees that have to decide on AI and do not want to do it on the information supplied by whoever is selling. |
| **CTA primario** | Descargar el documento del diagnóstico | Download the diagnosis briefing |

**Evidencia.** La primera frase es la de Ricardo, tanto la versión actual (E-SLG-04) como la anterior, «Ayudamos a
comprarla» (E-SLG-40), que la síntesis valora como más nítida. La segunda frase sustituye «Construimos juntos tu
futuro con ella» (B-02, hype según E-SLG-04 y P5) e incorpora **construir** (INF: es probablemente la razón por la
que Ricardo dejó «comprarla», ya que Factory construye) sin perder el contraste. El subtítulo es E-SLG-04 casi
literal en los dos idiomas (`develop:content/pages/en/services.md`).
**Qué arregla.** B-01 y B-02, con el mínimo cambio sobre texto ya aprobado.
**Riesgo (INF).** El titular es largo, con dos frases. En móvil puede ocupar más de una pantalla con el escalado
actual del hero (E-SLG-53). Lo resuelve el plan visual o se acorta.

### Alternativa C — Dolor como titular (patrón Prayaga)

| | ES | EN |
|---|---|---|
| **Titular (H1)** | ¿Tu comité tiene que decidir sobre IA y la única información que tiene es la de quien vende? | Does your committee have to decide on AI with nothing but the seller's information? |
| **Subtítulo** | SLG trabaja con directorios y comités de dirección: primero criterio, después diagnóstico y solo entonces construcción. Sin licencias, sin comisiones y sin dependencia al terminar. | SLG works with boards and executive committees: judgement first, then diagnosis, and only then construction. No licences, no commissions and no dependence when we finish. |
| **CTA primario** | Descargar el documento del diagnóstico | Download the diagnosis briefing |

**Evidencia.** El patrón es E-PRY-05 (H1-dolor, el único de los tres sitios que se acerca a la prueba de los 5
segundos). La secuencia es E-SLG-10. «Sin licencias ni comisiones» es E-SLG-12. La dependencia es E-SLG-17.
**Qué arregla.** B-01 y B-04 a la vez, porque el dolor ya está en el hero.
**Riesgo (INF).** Un titular-pregunta cede la iniciativa. La voz de SLG es afirmativa y aforística
(E-SLG-08, 10, 24), y la pregunta retórica es un recurso de agencia. Además, duplica la sección de dolor (§2.1,
bloque 2).

### Recomendación

**A como titular**, y la primera frase de B, «No vendemos inteligencia artificial.», como **antetítulo** (eyebrow)
de una línea. Razones (INF):

1. A es la única que cumple las cuatro piezas **solo con el titular y el subtítulo**, sin depender de un giro.
2. El antetítulo conserva la frase más reconocible de Ricardo (E-SLG-04, 40) sin alargar el H1.
3. C se descarta como hero, pero su mecanismo entra en la sección de dolor, que es donde funciona en Prayaga
   (E-PRY-05, 06).
4. Si Ricardo prefiere su frase completa como H1, **B es la alternativa válida**, y el plan no cambia en nada más.

**Longitud real (corregido tras crítica, C-13).** El H1 de A tiene unos 82 caracteres en ES y el subtítulo unos
170. Es más que los «unos 60 caracteres» que suponía el plan visual. La condición «las cuatro piezas en la primera
pantalla a 360×740» se valida en el prototipo de DU-42 con este texto. Si no cabe, **se acorta el subtítulo**
(p. ej. «Para directorios y comités de dirección: qué preguntar, qué exigir y qué no comprar.»), no se baja la
escala tipográfica por debajo de la que fije FU-21.

**Prueba de cumplimiento (P1).** Cinco lectores que no conocen SLG ven solo la primera pantalla durante 5 segundos
y repiten para quién es, qué problema resuelve y qué ofrece como siguiente paso. Si 4 de 5 lo consiguen, pasa. La
prueba se hace en DU-RC06, sobre la página renderizada y en los dos idiomas.

---

## 2. Arquitectura narrativa de la home

### 2.1 Sección por sección

La lógica es **hero → dolor → resultado → método → entrada → reglas → cuándo no → quién responde → cierre**. Cada
bloque hace un trabajo distinto y ocupa un viewport (RNF-44). Bloques que salen de la home: el mapa del sitio, que
va a una ruta propia (§2.2); «Los ejes de la Agencia», que se sustituye por el método (B-10); y «Últimos
artículos», que pasa a un enlace en el bloque de Doctrina (P7: menos cosas).

| # | Bloque | Trabajo | Contenido (borrador) | Prueba que necesita | CTA |
|---|---|---|---|---|---|
| 0 | Barra | Navegar | *Corregido tras crítica (C-17):* **los destinos del menú no cambian** (Empieza aquí · Servicios · Blog · Nosotros + «Acceder» secundario, E-SLG-58; coincide con 04 §5.1). Solo cambia el destino de `nav.start`, que pasa de `/` al mapa (`/empieza-aqui`, `/en/start-here`). El logo lleva a la portada. Sustituir Blog por Doctrina es una decisión aparte de Ricardo, no de este plan | — | Ninguno nuevo |
| 1 | **Hero** | Vender (P1) | §1, alternativa recomendada | Ninguna: la frase es la prueba de foco | **Primario**: descarga del diagnóstico (rojo) |
| 2 | **Dolor con escena** | Que el lector se reconozca (P2) | Titular: «Tres situaciones que vemos en comités que deciden sobre IA» `[PENDIENTE: Ricardo confirma que las tres escenas salen de su práctica; si no, el titular no dice «vemos»: «Tres situaciones de comités que deciden sobre IA»]` *(corregido tras crítica, C-16)*. Escenas, una por línea:<br>· «El piloto funcionó en la demo y nunca llegó a producción.»<br>· «Las tres propuestas que compara el comité las escribieron los tres que quieren venderle.»<br>· «La herramienta ya está pagada y nadie dentro sabe mantenerla sin quien la vendió.» | Ninguna cifra. Son escenas, no estadísticas (E-PRY-27 como patrón; contraejemplo E-PRY-28) | Ninguno |
| 3 | **Lo que cambia** (antes/después estático) | Hacer tangible el resultado (B-02) | Dos columnas fijas, tres filas:<br>· Decides con la información de quien vende → Decides con criterio propio y evidencia por dimensión.<br>· Compras la herramienta y luego buscas el problema → Primero sabes qué bloquea y después decides qué construir.<br>· Al terminar dependes del proveedor → Al terminar la capacidad está dentro. | Las tres filas derivan de E-SLG-10, 15 y 17. No hay fotos ni deslizador (contraejemplo E-AIA-17) | Ninguno |
| 4 | **El método** | Ordenar la oferta (P4) | Las cuatro fases numeradas, cada una con: qué resuelve, una línea «si estás aquí…», su entregable, la compuerta y el enlace a la línea que la ejecuta (§5) | Entregables enumerados (M-AIA-08), parte de ellos `[PENDIENTE: Ricardo]` (§4) | Enlaces de texto a las líneas (no son CTA) |
| 5 | **La puerta de entrada** | Dar un primer paso con nombre (P6) | «Si no sabes por dónde empezar, empieza por saber dónde estás.» + alcance: diagnóstico de preparación en **once dimensiones**, «se entregan las once» (E-SLG-15), evidencia por dimensión, orden de prioridad y documento presentable ante directorio (`develop:content/services/es/readiness.md`) | Especificidad del entregable. Duración: `[PENDIENTE: Ricardo, D-4]`, no se publica sin dato | **El mismo** CTA primario (misma acción que el hero; no es un segundo CTA) |
| 6 | **Cuatro reglas y la postura sobre la prueba** | Confianza sin prueba (P3) | Las cuatro reglas con **una sola redacción** (§5.3) + «No revendemos licencias. No cobramos comisión de ningún proveedor.» + la postura: «No publicamos una cifra, un caso ni un nombre de cliente sin autorización escrita. Por eso aquí no hay logos.» (E-SLG-12) | Es la prueba. Mismo texto que en Nosotros, desde una sola fuente en `content/` | Ninguno |
| 7 | **Cuándo no conviene comprar IA (todavía)** | Ganar credibilidad renunciando (P5) | Ver §2.5 | Ninguna; se apoya en la voz (E-SLG-08, 10) y en el patrón de E-AIA-32 | Ninguno |
| 8 | **Quién responde** | Dar rostro a la responsabilidad (M-PRY-07 adaptado) | «SLG Agency Inc. es una compañía constituida en Florida. La dirige Ricardo Torres Oliva.» + dos o tres líneas de trayectoria verificable `[PENDIENTE: Ricardo]` + enlace a Nosotros y a LinkedIn (E-SLG-14) | Trayectoria y fotografía del fundador (§4, P-03, D-7) | Enlace de texto a Nosotros |
| 9 | **Doctrina** (banda clara `paper`; *corregido tras crítica, C-09:* la única franja oscura de la página es la del bloque 6, DD-6 de 04) | Autoridad por escrito | Pull-quote: «Lo que hay que dejar de hacer pesa más que lo que hay que empezar.» (E-SLG-08) + «Publicamos criterio, no novedades.» (E-SLG-24) + enlaces «Leer la doctrina» y «Ver los artículos» | Ninguna | Enlaces de texto |
| 10 | **Holdings** (una línea) | Segunda audiencia sin competir con la primera | «¿Vas a construir u operar una compañía fuera de tu mercado de origen? Eso es Holdings: un punto único de responsabilidad sobre el conjunto.» (E-SLG-07) | — | Enlace de texto a `/holdings` |
| 11 | **Cierre** | Repetir el siguiente paso | «Si después de leer el documento quieres conversar, escríbenos.» (copy actual de `/gracias`) + el CTA primario | — | **El mismo** CTA primario + «Escríbenos» como enlace de texto, nunca botón rojo |
| 12 | Pie | Higiene y verificabilidad | Razón social y jurisdicción en texto (M-PRY-09 adaptado), **Mapa del sitio**, Doctrina, Descargas, Contacto y legales | — | — |

**Regla del CTA en la home.** Hay una sola acción primaria, la descarga del diagnóstico, que puede aparecer en el
hero, en la entrada y en el cierre. Son tres botones para **la misma** acción y nunca dos en el mismo viewport (rojo
1–2 por viewport, E-SLG-48). Todo lo demás son enlaces de texto.

### 2.2 Qué pasa con el mapa del sitio y con `/servicios` (sujeto a D-1)

- **Mapa del sitio.** Se conserva tal cual (`MapaDelSitio.tsx`, generado desde la ficha, sin animación;
  E-SLG-43) en una **ruta propia**. *Corregido tras crítica (C-06):* no se crean rutas nuevas. Se reutilizan
  **`/empieza-aqui` y `/en/start-here`**, que ya existen y que en `develop` hacen hoy `permanentRedirect` a `/` y
  a `/en` (`develop:app/(public)/en/start-here/page.tsx`). Se retira esa redirección y la ruta vuelve a servir el
  mapa con su registro `empieza-aqui` / `start-here`, sin cambiar el contenido. Así no hay redirecciones nuevas,
  ningún enlace externo se rompe y el slug ES no queda huérfano (la versión anterior de este plan solo redirigía
  el EN). La ruta se declara en la ficha y en el motor (`lib/sitio/motor.ts`), y `check:paginas` y `check:seo`
  (sitemap, hreflang recíproco) la cubren. Se enlaza desde el menú (`nav.start`), el pie y Nosotros.
- **`/servicios`.** Deja de ser «la casa comercial» (su hero y su arco pasan a `/`, E-SLG-42) y se convierte en
  **«Todos los servicios»**: el índice de los once servicios agrupados por **fase del método**, con el lector y el
  entregable de cada uno en una línea. Se conserva la URL, así no se rompen enlaces. Es la entrada para quien ya
  sabe lo que busca.

### 2.3 Cómo se re-presentan las 4 ramas, los 22 servicios y la doctrina

**Principio (INF, M-SLG-05).** El método ordena la oferta. Las tres líneas de VoltAi coinciden con tres fases, y
la cuarta fase, la transferencia, es transversal. Holdings queda fuera del método como una segunda puerta para
otra audiencia.

| Fase del método | Línea que la ejecuta | Servicios (11 por idioma, 22 registros) | Entrada **por problema** («si estás aquí…») | Entrada **por resultado** |
|---|---|---|---|---|
| 01 · Criterio | VoltAi Academy | Phoenix PEEx · Phoenix TEAx · Phoenix RETx · Customize Programs · AI Coaching for Directors | «Tengo que decidir sobre IA y no sé qué preguntar al proveedor.» | Sabes qué preguntar, qué exigir y qué no comprar |
| 02 · Diagnóstico y arquitectura | VoltAi Enterprise | SLG_Readiness | «No sé dónde está mi empresa, y sospecho que el entusiasmo interno no es la respuesta.» (adaptado de `readiness.md`) | Un punto de partida que puedes defender ante el comité |
| 03 · Construcción | VoltAi Enterprise + VoltAi Factory | SLG_Implement · APP_Building · AGE_Building · CoO as a Service | «Ya sabemos qué hay que hacer; falta construirlo sin quedar atados.» | Lo priorizado, construido en tu stack y por fases |
| 04 · Transferencia | Transversal: cierre de cada encargo | (no es un servicio vendible: es el criterio de cierre de todos) | — | La capacidad se queda dentro |
| Fuera del método | Holdings by SLG | Holdings | «Voy a construir u operar una compañía fuera de mi mercado.» | Un punto único de responsabilidad (E-SLG-07) |

**Observaciones (INF).**

- SLG_Implement es Enterprise en la ficha, pero por su trabajo es construcción. **No se mueve en la ficha**: el
  método lo muestra en la fase 03 y la página de Enterprise explica que la línea cubre «dónde estamos» (02) y
  «cómo llegamos» (03), como ya dice hoy (`develop:content/pages/es/slg-enterprise.md`).
- **Las cuatro ramas** (overview `/ai` + tres líneas) se mantienen como páginas, pero cambian de trabajo: `/ai`
  pasa a ser **la página del método**, y cada línea, **la página de su fase** (§7.2).
- **La doctrina** (Phoenix Doctrine, DAL OS) queda como el **porqué** y el método como el **cómo**. La doctrina se
  enlaza desde el método («Por qué primero criterio → Doctrina») y la home la cita en la franja. Las siglas se
  expanden en su primera aparición: «DAL OS» → `[PENDIENTE: Ricardo, desarrollo de la sigla]` (P8).

### 2.4 Nombres públicos de servicio (depende de D-9 y de D-2)

**Recomendación por fases (INF).**

- **Fase 1, sin renombrar productos.** El **titular** de cada servicio describe el resultado en el idioma de la
  página, y el **literal** del producto queda como etiqueta secundaria. Esto respeta `check:nomenclature` tal como
  está y aplica P8 en lo que lee el visitante.
- **Fase 2, si Ricardo lo decide.** Se renombran los productos sin guion bajo y se actualizan la ficha y el freno
  de nomenclatura en una sola unidad (FU-RC03).

| Literal actual | Titular público ES (borrador) | Titular público EN (borrador) | Lector por rol (borrador, D-6) |
|---|---|---|---|
| Phoenix PEEx | Programa de criterio para directores | Judgement programme for directors | Miembros de directorio |
| Phoenix TEAx | Programa de criterio para la alta dirección | Judgement programme for senior executives | Alta dirección. **Hay que resolver la incoherencia con su descarga, dirigida a gerentes** (E-SLG-46) `[PENDIENTE: Ricardo]` |
| Phoenix RETx | Programa para investigación y formación universitaria | Programme for research and university education | Investigadores y estudiantes. **Su sitio en la oferta depende de D-6** |
| Customize Programs | Programas a medida para tu organización | Programmes tailored to your organisation | Responsables de formación o de transformación |
| AI Coaching for Directors | Acompañamiento individual a quien dirige | One-to-one coaching for those who lead | Presidente, consejero o director general |
| SLG_Readiness | Diagnóstico de preparación para la IA, en once dimensiones | AI readiness diagnosis, in eleven dimensions | Comité de dirección antes de invertir |
| SLG_Implement | Implementación por fases de lo que el diagnóstico priorizó | Phased implementation of what the diagnosis prioritised | Comité y dirección de operaciones o tecnología |
| APP_Building | Aplicaciones a medida, en tu stack | Custom applications, on your stack | Dirección que ya decidió qué construir |
| AGE_Building | Agentes de IA a medida para un proceso concreto | Custom AI agents for a specific process | Dueño del proceso |
| CoO as a Service | Dirección de operaciones con agentes, como servicio | Operations management with agents, as a service | Dirección general de empresas pequeñas o medianas `[PENDIENTE: Ricardo]` |
| Holdings by SLG | Construir y operar una compañía fuera de su mercado de origen | Building and operating a company outside its home market | Fundadores y accionistas que internacionalizan |

**Dos ambigüedades que se cierran aquí.**

1. «CoO» significa dos cosas: Company of One en Nosotros y dirección de operaciones en el servicio (E-SLG-62).
   **Propuesta:** en Nosotros se deja de usar la sigla y se dice «una compañía de una persona con agentes y sistemas».
2. Los titulares de Factory, «Crea Agentes IA para cualquier escenario» y «Construye aplicaciones escalables y
   robustas» (E-SLG-47), se sustituyen por los de la tabla.

### 2.5 Bloque «Cuándo no conviene comprar IA (todavía)» (borrador, P5)

Cuatro criterios en la voz de SLG. Ninguno lleva cifra.

| ES | EN |
|---|---|
| Cuando todavía no puedes decir qué decisión o qué proceso debería cambiar. | When you still cannot say which decision or which process should change. |
| Cuando los datos que alimentarían la herramienta no los defiende nadie dentro. | When nobody inside can vouch for the data that would feed the tool. |
| Cuando la única comparación disponible la escribió quien vende. | When the only comparison available was written by the seller. |
| Cuando nadie dentro va a poder mantenerla el día que se vaya el proveedor. | When nobody inside will be able to maintain it the day the vendor leaves. |

Cierre del bloque: «Empezar por el final (la IA) es la forma más cara de descubrir que no hacía falta.»
(E-SLG-10). EN: `develop:content/pages/en/ai.md`, frase equivalente ya traducida.

---

## 3. Lo que se elimina o se reescribe en el copy actual

| Texto actual | Dónde | Problema | Tratamiento |
|---|---|---|---|
| «Empieza aquí / El mapa del sitio en una página…» como hero | `/` | Orienta, no vende (B-01) | Pasa a `/mapa` (§2.2) |
| «Construimos juntos tu futuro con ella.» | `/servicios` | Resultado difuso, tópico (B-02) | Sustituido (§1) |
| «La agencia trabaja sobre dos ejes, y conviene elegir antes de seguir leyendo.» | `/servicios` | Pide decidir antes de entender (B-10) | Eliminado; el método ordena la oferta |
| «Por qué VoltAi»: Volta, «poner la inteligencia en movimiento», «transformar el potencial…» | `/ai` | Hype (B-11, E-SLG-11) | **Se elimina de `/ai`**. Si Ricardo quiere la historia del nombre, va **una vez** y en dos líneas en Nosotros, sin la promesa final. Depende de D-2 |
| «…el único contexto en el que la marca se escribe Softlanding Global.» | `/servicios` | Regla interna en el copy público (E-SLG-06) | Eliminada |
| Backticks literales en negritas («**\`VoltAi Academy\`**») | `/ai` y overviews | Artefacto de render (E-SLG-25) | Se corrige en origen (`content/`) |
| «Compuertas… pasa por decisiones complejas» frente a «compuerta de aprobación tuya» | Nosotros frente a servicios | Dos redacciones (E-SLG-16, 17) | Una sola (§5.3) |
| «Sin formulario de calificación» encima de un formulario | Contacto | Se lee como contradicción (E-SLG-18) | §7.5 |
| «empresa_web» en el texto extraído | Contacto, Doctrina | Campo trampa expuesto (E-SLG-19, 72) | Corrección de código en DU-RC05 (fuera del alcance de copy, pero se lista aquí) |
| «para Researchers», «Army of Agents», «fundamentos Lindy», «Agentic Mindset» | Taglines, Nosotros | Spanglish y jerga (E-SLG-46) | Se traduce o se explica en su primera aparición |

---

## 4. Prueba: lo que SLG tiene que aportar

**Postura (P3).** SLG no compite en volumen de prueba. Compite en **especificidad verificable y coherencia**. Lo que
sigue es lo que hace falta para que esa especificidad sea completa. **Nada de esta lista se rellena con datos
inventados**, y todo lo que lleve cifra pasa por `check:copy` con su respaldo declarado.

| ID | Qué hace falta | Para qué bloque | Estado |
|---|---|---|---|
| P-01 | **Casos autorizados por escrito**. Por cada uno: situación, línea base, intervención, resultado y plazo (plantilla M-AIA-06/M-PRY-06) | Fichas de caso (DU-RC07, condicionada) | `[PENDIENTE: Ricardo]` ¿Existe al menos un cliente dispuesto a autorizarlo? Si no, la unidad no se abre |
| P-02 | **Métricas de resultado** con fuente | Ninguno en v1 | `[PENDIENTE: Ricardo]` Ninguna se publica sin respaldo. Hoy no hay ninguna |
| P-03 | **Trayectoria del fundador** en 2–3 líneas verificables: cargos, sectores y qué son **ACP** y **SelectUSA/SGWIT**, con su nombre completo | Home, bloque 8; Nosotros | `[PENDIENTE: Ricardo]` Hoy solo hay un enlace a LinkedIn (E-SLG-14) |
| P-04 | **Fotografía del fundador** propia, no de stock | Home, bloque 8; Nosotros | `[PENDIENTE: Ricardo]` + D-7 |
| P-05 | **Nombres de cliente** publicables | Ninguno salvo autorización | `[PENDIENTE: Ricardo]` Por defecto, ninguno; se mantiene la postura |
| P-06 | **Las once dimensiones del diagnóstico, por su nombre** | Home, bloque 5; página de Readiness | `[PENDIENTE: Ricardo]` ¿Se pueden publicar los nombres? Es la prueba de especificidad más fuerte disponible |
| P-07 | **Entregable por fase** del método (qué documento o activo recibe el cliente al cerrar cada fase) | Método (§5) | Fase 02 resuelta desde el copy actual. Fases 01, 03 y 04: `[PENDIENTE: Ricardo]` |
| P-08 | **Índice de muestra** del informe de Readiness (sin datos de cliente) | Página de Readiness | `[PENDIENTE: Ricardo]` Opcional |
| P-09 | **Qué ha construido SLG para sí misma** («Cliente Cero», E-SLG-13), en una lista mostrable | Nosotros | `[PENDIENTE: Ricardo]` Qué piezas se pueden nombrar |
| P-10 | **Quién es el «soporte experto de terceros»** que menciona Nosotros | Nosotros | `[PENDIENTE: Ricardo]` Opcional; si no se puede nombrar, la frase se mantiene o se retira |
| P-11 | **Duración** del diagnóstico y de cada fase (D-4) | Bloque 5, método | `[PENDIENTE: Ricardo]` Sin dato real no se publica |
| P-12 | **Formato de encargo** por fase: alcance, quién participa por parte del cliente y, si se decide, rango (D-5) | Condicionada (DU-RC08) | `[PENDIENTE: Ricardo]` |
| P-13 | Estado de los documentos de descarga D-04 y D-05 (Customize Programs, AI Coaching), producidos fuera de este repositorio (D-17 de `scope.md`) | CTA de dos servicios | `[PENDIENTE: Ricardo]` Confirmar que existen en ES y EN |

**Prueba disponible hoy, sin esperar a nadie:** las cuatro reglas, «sin licencias ni comisiones», la postura sobre
la prueba, las once dimensiones con «se entregan las once», la doctrina escrita y los artículos
(E-SLG-08, 12, 15, 17, 20, 24). La home se puede publicar solo con esto.

---

## 5. El método: proceso con nombre y visual

### 5.1 Nombre (D-3)

| Candidato | ES | EN | A favor (INF) | En contra (INF) |
|---|---|---|---|---|
| **Recomendado** | **Criterio primero** | **Judgement First** | Es literalmente la doctrina de `/ai` («primero criterio…», E-SLG-10). Se entiende sin glosario. No añade sigla | Suena a principio más que a proceso. Se compensa con las fases numeradas |
| Alternativa | Las cuatro compuertas | The Four Gates | Pone la reversión de riesgo en el nombre | Hace protagonista el control, no el resultado |
| Alternativa (depende de D-2) | Aterrizaje suave | Soft Landing | Une método y marca (Soft Landing Global) | Solo funciona si la marca maestra es Soft Landing. Riesgo de metáfora blanda |

### 5.2 Fases

| # | Fase ES / EN | Qué resuelve | Entregable | Compuerta (decides tú) | Línea |
|---|---|---|---|---|---|
| 01 | **Criterio** / Judgement | Que quien decide sepa qué preguntar, qué exigir y qué no comprar | `[PENDIENTE: Ricardo, P-07]` (p. ej. el material del programa y una guía de preguntas al proveedor) | Avanzar · Ajustar · Descartar | VoltAi Academy |
| 02 | **Diagnóstico y arquitectura** / Diagnosis and architecture | Saber dónde está la empresa y qué bloquea | Informe de **once dimensiones**, con evidencia por dimensión, orden de prioridad razonado y presentable ante directorio (E-SLG-15; `readiness.md`) | Avanzar · Ajustar · Descartar | VoltAi Enterprise |
| 03 | **Construcción** / Construction | Construir lo priorizado, por fases y en tu stack | `[PENDIENTE: Ricardo, P-07]` | Avanzar · Ajustar · Descartar, por cada fase de construcción | VoltAi Enterprise (Implement) + VoltAi Factory |
| 04 | **Transferencia** / Transfer | Que la capacidad se quede dentro | `[PENDIENTE: Ricardo, P-07]` | **Criterio de cierre:** «Si al terminar sigues dependiendo de nosotros, el trabajo no está hecho.» (E-SLG-17) | Transversal |

**Las tres salidas de la compuerta (M-AIA-04 adaptado).** La síntesis las llama «escalar, ajustar o descartar»
(E-AIA-36). Este plan propone **«avanzar, ajustar o descartar»** (EN: *proceed, adjust or stop*) porque no todas
las fases son pilotos que se escalan (INF). La decisión final es de Ricardo en la compuerta de copy. Texto de
apoyo: «Descartar no es un fracaso: lo entregado hasta ahí es tuyo.» Ese texto es INF a partir de «sin lock-in»
(E-SLG-17), así que **Ricardo debe confirmar que es cierto contractualmente** `[PENDIENTE: Ricardo]`.

**Orden de entrada.** «No hay un orden obligatorio, pero sí uno recomendable» (E-SLG-10). Se dice así, sin
prometer nada más.

### 5.3 Una sola redacción de las cuatro reglas (sustituye a E-SLG-16 y E-SLG-17)

| ES | EN |
|---|---|
| **Sin lock-in.** Nada de lo que construimos te ata a nosotros ni a un proveedor. | **No lock-in.** Nothing we build ties you to us or to a vendor. |
| **Agnósticos de tecnología.** Trabajamos con la que ya tienes o implementamos la que más convenga. | **Technology-agnostic.** We work with what you already have, or implement whatever suits best. |
| **Compuertas de aprobación.** Cada fase termina en una decisión tuya, y la siguiente no empieza sin ella. | **Approval gates.** Every phase ends in a decision of yours, and the next one does not start without it. |
| **La capacidad se queda dentro.** Si al terminar sigues dependiendo de nosotros, el trabajo no está hecho. | **The capability stays inside.** If you still depend on us when we finish, the work is not done. |

Se publica desde **un solo registro** de `content/` (es/en), que usan la home, Nosotros, `/ai` y la sección
«Cómo trabajamos» de cada servicio (P3, prueba de cumplimiento).

### 5.4 Forma visual (restricciones para el plan visual)

- Es un **diagrama estático**: cuatro fases con **número grande** como encabezado (M-PRY-05) y la compuerta como
  marca entre fases. En pantallas anchas va horizontal y en móvil vertical. **El orden del DOM es el de lectura**
  (contraejemplo E-PRY-32).
- Es **un solo componente**, alimentado desde `content/` y usado en `/`, `/ai`, los overviews de línea (con la fase
  propia resaltada) y los servicios (marcando «este servicio vive en la fase N»).
- Sin flip, tab, carrusel ni animación por fase. Como mucho, el reveal de 8 px una sola vez (E-SLG-50, 51).
- Texto por fase: nombre, una línea de qué resuelve y una línea de entregable. Lo demás va en la página de la línea.

---

## 6. CTAs, ruta de conversión y tono

### 6.1 CTA primario por tipo de página

| Página | CTA primario | Forma | Secundario (solo enlace de texto) |
|---|---|---|---|
| Home `/` | Descargar el documento del diagnóstico (`d-06`) | Botón rojo; correo corporativo | Escríbenos |
| `/ai` (método) | El mismo documento del diagnóstico | Botón rojo | Doctrina |
| Overview de línea | El documento del servicio de entrada de la línea: Academy → PEEx `[PENDIENTE: Ricardo, cuál es la entrada de Academy]`; Enterprise → Readiness; Factory → `[PENDIENTE: Ricardo]` | Botón rojo | Todos los servicios de la línea |
| Servicio | **Su** descarga (contrato A.3 §5, sin cambios) | Botón rojo | Siguiente paso: escríbenos (A.3 §6) |
| `/servicios` (índice) | Ninguno de conversión: es un índice | — | — |
| Nosotros | Escríbenos | Botón secundario, nunca rojo | Leer la doctrina |
| Contacto | Enviar el mensaje | Formulario existente | Correo directo |
| Gracias | Ninguno de conversión | — | Doctrina y «escríbenos» |

### 6.2 Ruta de conversión

```
Hero (posición) → Dolor (se reconoce) → Lo que cambia → Método (entiende el orden)
  → Entrada: diagnóstico de once dimensiones → Cuatro reglas + postura (confía)
  → Descarga con correo corporativo → /gracias → lectura del documento
  → «Si después de leerlo quieres conversar, escríbenos» → /contacto
```

- **Fricción mínima y constante.** Solo el correo corporativo (E-SLG-09). No se añaden campos (contraejemplo
  E-PRY-20).
- **Prohibido** (freno o principio): agenda, «Sesión Cero» en público, chat, WhatsApp, popups, contadores, logos y
  segundo CTA en servicio (E-SLG-56; síntesis §4.2).
- **`/gracias`** se mantiene y añade una sola línea con qué leer mientras tanto (la doctrina). No ofrece reunión.
- **Medición.** Si la analítica privacy-first existente (DU-12) lo permite sin terceros, se registra la página de
  origen de cada descarga, para saber si la home convierte. Opcional, sin código nuevo de seguimiento.

### 6.3 Guía de tono de voz

**Registro.** Consultivo, afirmativo, aforístico y anti-venta. En ES, tuteo, como ya hace el sitio, y
«directorio» y «comité de dirección» como términos de audiencia. En EN, **inglés británico**, como el sitio actual
(«programme», «licence», «authorisation»), y ninguna traducción literal del ES cuando la frase pierde fuerza.

| Haz | Ejemplo | No hagas | Ejemplo (evidencia) |
|---|---|---|---|
| Nombra a quién | «Para directorios y comités de dirección que…» | Hablar a todos | «para cualquier escenario» (E-SLG-47) |
| Describe una escena | «El piloto funcionó en la demo y nunca llegó a producción.» | Usar estadísticas de mercado como prueba | «El 84 % de los vendedores…» (E-AIA-41) |
| Promete un resultado verificable | «Se entregan las once: no hay un resumen que oculte la que salió mal.» (E-SLG-15) | Prometer un futuro | «Construimos juntos tu futuro» (E-SLG-04) |
| Renuncia en voz alta | «No revendemos licencias. No cobramos comisión.» (E-SLG-12) | Usar urgencia o miedo a quedarse fuera | «La IA ya no es una opción…» (E-AIA-06) |
| Usa frases cortas y una idea por frase | «Publicamos criterio, no novedades.» (E-SLG-24) | Metáforas de energía o movimiento | «poner la inteligencia en movimiento» (E-SLG-11) |
| Expande la sigla la primera vez | «Phoenix PEEx, el programa de criterio para directores» | Siglas, guiones bajos o Spanglish sin traducir | «para Researchers», «Army of Agents» (E-SLG-46) |
| Una sola redacción por idea | Las cuatro reglas de §5.3 | Dos versiones de la misma regla | E-SLG-16 frente a 17 |
| Habla al lector, no de la marca | «Decides con criterio propio.» | Reglas internas o superlativos | «la marca se escribe Softlanding Global» (E-SLG-06); «la mejor empresa consultora» (E-PRY-35) |
| Di lo que no hay y por qué | «Por eso aquí no hay logos.» | Contradecir lo que se ve | «Sin formulario» encima de un formulario (E-SLG-18) |

**Prueba mecánica.** `check:copy` y `check:nomenclature` pasan en ES y EN **sin excepciones nuevas**. La revisión
de tono la firma Ricardo en FU-RC02.

---

## 7. Cambios por tipo de página

### 7.1 Portada (`/`, `/en`)

Pasa de mapa del sitio a la arquitectura de §2.1. Depende de D-1. El registro de contenido de la portada es
nuevo. El de `empieza-aqui` / `start-here` se mueve a `/mapa` / `/en/site-map` (§2.2).

### 7.2 Overview de rama (`/ai`, `/ai/academy`, `/ai/enterprise`, `/ai/factory`)

- **`/ai`** se convierte en **la página del método**: hero «Criterio primero» (o el nombre que decida D-3), el
  diagrama de cuatro fases, la correspondencia fase → línea, las tres salidas de la compuerta y el bloque «Cuándo
  no conviene» (o un enlace a él, si ya está en la home). **Se retira «Por qué VoltAi»** (§3).
- **Cada línea** sigue este orden: fase del método que ocupa (diagrama con su fase resaltada) → dolor de la línea
  (una escena) → servicios de la línea, con titular por resultado, lector y entregable en una línea cada uno →
  CTA del servicio de entrada (§6.1).
- Se corrigen los backticks literales (E-SLG-25). Los criterios de aceptación de DU-04 siguen vigentes: cada
  overview enlaza a todos sus servicios.

### 7.3 Página de servicio (11 × 2) — dentro del contrato A.3

El orden de las seis secciones **no cambia** (DU-05, RF-06). Cambia lo que va dentro:

| Sección A.3 | Hoy | Cambio |
|---|---|---|
| 1 · Para quién y qué problema | Texto en prosa | Primera línea con la fórmula **«Para [rol] que tiene que [decisión]»** (M-AIA-07) + **una escena** (M-PRY-02). El rol sale de la tabla de §2.4 |
| 2 · Qué es | Variable | Titular por resultado (§2.4) + literal del producto como etiqueta + **«Este servicio vive en la fase N del método»** |
| 3 · Qué incluye | Solo es concreto en Readiness | **«Qué recibes»**: entregables enumerados en todos los servicios (M-AIA-08). Lo que no exista va como `[PENDIENTE: Ricardo]` y no se publica en `main` (RNF-18) |
| 4 · Cómo trabajamos | Cuatro reglas redactadas por servicio | Registro único de §5.3 + compuerta con tres salidas + **2–3 objeciones visibles**, sin acordeón: «¿Tengo que contratar todo?» y «¿Trabajáis con nuestro stack?» (M-PRY-08 adaptado) |
| 5 · Descarga | Único CTA | Sin cambios. Se añade una línea de qué contiene el documento |
| 6 · Siguiente paso | «Escríbenos» | Sin cambios |

### 7.4 Nosotros (`/nosotros`, `/en/about`)

- Orden propuesto: **quién responde** (fundador y razón social, que hoy están al final, E-SLG-14) → por qué
  existimos (texto actual) → las cuatro reglas (registro único) → lo que no hacemos y la postura sobre la prueba →
  Cliente Cero (P-09) → **comparativa honesta**, opcional (M-AIA-10 adaptado) → dónde empezar.
- **Comparativa honesta** (borrador, en ES; se traduce en FU-RC02). Columnas: de quién es la información y quién se
  queda con la capacidad. Filas: gran consultora · integrador o vendedor · hacerlo internamente · SLG. **Sin
  superlativos ni cifras.** Se apoya en E-SLG-07. Si Ricardo no la quiere, se omite sin afectar al resto.
- «CoO (Company of One)» se sustituye por una descripción (§2.4). «Fundamentos Lindy» se explica o se retira.
- La historia del nombre (Volta o Soft Landing) aparece **una vez**, solo si D-2 la sostiene.

### 7.5 Contacto (`/contacto`, `/en/contact`)

- Se reescribe la contradicción: «Escríbenos a support@… o usa el formulario. No te pedimos datos para calificarte
  ni te proponemos una llamada de descubrimiento: si tienes una pregunta concreta, te contestamos con detalle.»
  (E-SLG-03, 18).
- El campo trampa «empresa_web» sale del árbol de accesibilidad y del texto extraído (E-SLG-19, 72, 84). Es una
  corrección de código dentro de DU-RC05 y se verifica con un lector de pantalla.
- Razón social y jurisdicción en texto (ya está). Sin mapas (M-PRY-09 adaptado).

### 7.6 Implicaciones bilingües (transversales)

1. **Paridad estricta.** Cada registro nuevo o movido (portada, método, reglas, mapa) existe en ES y EN con `pair`
   recíproco. `check:pairs` y el hreflang recíproco de `check:seo` en verde.
2. **El EN no es una traducción literal.** El hero EN se escribe para un comité anglófono. Los borradores de §1 son
   el punto de partida, no el texto final.
3. **Inglés británico** en todo el EN, coherente con el contenido existente.
4. **Claves de UI** (`content/ui/{es,en}.json`) para los rótulos nuevos: «Mapa del sitio», las etiquetas de fase y
   las salidas de la compuerta. Validadas en build.
5. **Rutas.** Los slugs de servicio no cambian, así que no se rompen URL. El mapa vuelve a `/empieza-aqui` y
   `/en/start-here`, que dejan de redirigir a la portada (C-06). El ítem de menú `nav.start` conserva el rótulo
   «Empieza aquí» / «Start here» y cambia de destino.
9. **Prerender (corregido tras crítica, C-05).** La portada y todas las páginas tocadas siguen siendo estáticas
   (`x-nextjs-prerender: 1`, E-SLG-21): el contenido se lee de `content/` en build, sin `cookies()`, `headers()`
   ni `searchParams` en la portada, y el formulario de descarga sigue siendo la única isla de cliente.
6. **Nomenclatura.** Si D-9 elige renombrar, el freno lleva los literales nuevos **y** las variantes prohibidas en
   los dos idiomas a la vez.
7. **Longitud.** El ES suele ocupar más que el EN. El límite de longitud del hero (una pantalla en móvil) se valida
   sobre la versión **ES**.
8. **`check:copy` en los dos idiomas.** Sus patrones cubren ES y EN («más de», «more than»). Ningún borrador de este
   plan los dispara; la compuerta lo confirma.

---

## 8. Matriz de trazabilidad: principio → bloque → unidad

| Principio | Brechas | Dónde se aplica | Unidad |
|---|---|---|---|
| P1 | B-01, B-02 | Hero de `/` | FU-RC02, DU-RC01 |
| P2 | B-04, B-05 | Bloque 2 de `/`, sección 1 de servicio, overviews | FU-RC02, DU-RC01, DU-RC03, DU-RC04 |
| P3 | B-03, B-08 | Bloque 6 de `/`, Nosotros, servicios | FU-RC04, DU-RC01, DU-RC05 |
| P4 | B-06, B-10, B-07 | Bloque 4 de `/`, `/ai`, overviews, servicios | FU-RC04, DU-RC03 |
| P5 | B-11 | Bloque 7 de `/`, `/ai` (retirada de Volta) | FU-RC02, DU-RC03 |
| P6 | B-07, B-01 | Bloques 1, 5 y 11 de `/`, CTA por página | DU-RC01, DU-RC03 |
| P7 | B-13 | Restricción transversal; la ejecuta el plan visual | todas |
| P8 | B-09, B-12, B-05 | Nombres, artefactos, glosario | FU-RC03, DU-RC04, DU-RC05 |

---

## 9. Unidades de trabajo (FU/DU)

### 9.0 Convenciones

- Se siguen las de `implementation/user_units.md` §0. **FU** = trabajo fundacional sin salida consumible. **DU** =
  algo que el visitante usa de punta a punta. Las seis condiciones de completitud del perfil y el `QG` se dan por
  exigidas en toda DU y no se repiten.
- **Numeración provisional con prefijo `RC`** (reingeniería de contenidos), para no chocar con FU-01…FU-15 y
  DU-01…DU-30 ni con las unidades del plan visual hermano. Se renumeran al consolidar el plan de reingeniería en
  `user_units.md`.
- **Compuerta de copy.** Igual que FU-01 en la v1: ninguna DU de página se declara construible hasta que FU-RC02
  esté aprobada. Antes se puede construir contra el esquema con texto `[PENDIENTE: …]`, visible en staging y
  prohibido en `main` (RNF-18).
- **Corregido tras crítica (C-01): `develop` es producción.** El sitio publicado se compila desde `develop`
  (E-SLG-71), y en `develop` `check:pending` solo **avisa** (modo no estricto, `scripts/content/check-pending.ts`).
  Por tanto «prohibido en `main`» no protege el sitio real. Regla para esta reingeniería: el texto con
  `[PENDIENTE]` vive **solo en la rama de trabajo y en su despliegue de vista previa**. Ningún merge a `develop`
  sin `CONTENT_STRICT=1 npm run check:pending` en verde y sin la entrada de FU-RC02 en `decision_log`. Donde
  este plan dice «no pasa a `main`», léase «no pasa a `develop` ni a `main`».
- **Las decisiones de Ricardo no son unidades.** Son acciones previas (§0.3), igual que en `user_units.md` §1.
- Cada unidad pasa por `/review` antes de darse por cerrada (AGENTS.md Regla 3).

### 9.1 Acción previa de Ricardo (no es una unidad)

Cerrar **D-1, D-2, D-3, D-6 y D-9** y registrarlas en `docs/decision_log.md`. D-4, D-5, D-7 y D-8 pueden esperar,
porque solo afectan a unidades condicionadas o a criterios de cierre. Entregar los `[PENDIENTE: Ricardo]` de §4
que pueda, como mínimo **P-03, P-06 y P-07**.

### 9.2 Fundaciones

#### FU-RC01 · Base de trabajo sobre `origin/develop` e inventario de contenido afectado

| Campo | Contenido |
|---|---|
| **Tipo** | **FU** |
| **Depende de** | — |

**Qué produce.** Una rama de trabajo creada desde `origin/develop` y un inventario de los registros de `content/`
(es/en), las claves de UI, las rutas (`lib/content/rutas.ts`) y los frenos (`check:copy`, `check:nomenclature`,
`check:paginas`, `check:seo`, `check:pairs`) que tocan las DU de este plan.

**Criterios de aceptación.**
1. La rama parte de `origin/develop`; el commit base queda anotado en `work_log`.
2. `check:ci` pasa en verde **antes** de cualquier cambio, como línea base.
3. El inventario lista, por cada bloque de §2.1 y §7, el archivo de origen actual o «nuevo».
4. Se confirma contra `rutas.ts` y `lib/sitio/motor.ts` que el mapa puede volver a `/empieza-aqui` y
   `/en/start-here` retirando su `permanentRedirect` (C-06).
5. Se confirma qué rama despliega producción y si existe un despliegue de vista previa para la rama de trabajo
   (C-01). Si no existe, se crea antes de FU-RC02.

---

#### FU-RC02 · Copy maestro bilingüe de la reingeniería — compuerta de aprobación

| Campo | Contenido |
|---|---|
| **Tipo** | **FU** (compuerta) |
| **Depende de** | FU-RC01; decisiones D-1, D-2, D-3, D-6 y D-9 |

**Qué produce.** El texto final, en ES y EN, de: el hero (§1), los bloques 2–11 de la home (§2.1), «Cuándo no
conviene» (§2.5), las cuatro reglas en una sola redacción (§5.3), las fases y las salidas de la compuerta (§5.2),
los titulares por resultado y el lector de los 11 servicios (§2.4), las escenas por línea, el copy de Nosotros y de
Contacto (§7.4, §7.5) y la línea nueva de `/gracias`.

**Criterios de aceptación.**
1. Todo el texto vive en `content/` (es/en), nunca en componentes (RF-16, `check:cadenas`).
2. Cada dato que solo Ricardo puede aportar aparece como `[PENDIENTE: Ricardo, P-NN]`. Ninguno se rellena por
   inferencia.
3. `check:copy` y `check:nomenclature` pasan en los dos idiomas **sin excepciones nuevas**.
4. Ninguna frase de E-SLG-04 («tu futuro»), E-SLG-11 ni E-SLG-47 queda sin reescribir. Ninguna regla interna
   (E-SLG-06) llega al copy público.
5. El hero cumple las cuatro piezas de P1 en ES y en EN (revisión documentada).
6. Ricardo aprueba el copy y la aprobación queda en `docs/decision_log.md`. **Sin esa entrada, ninguna DU de página
   se publica.**

---

#### FU-RC03 · Nomenclatura pública en la ficha y en el freno

| Campo | Contenido |
|---|---|
| **Tipo** | **FU** |
| **Depende de** | D-2, D-9; FU-RC01 |

**Qué produce.** La marca maestra (D-2) y la política de nombres (D-9) reflejadas en `site.config.ts`
(`nomenclatura`) y en `check:nomenclature`: literales correctos, variantes prohibidas y, si D-9 = (b), el campo
«titular público» por servicio separado del literal.

**Criterios de aceptación.**
1. Ninguna etiqueta **visible** al visitante contiene `_` (P8). Si D-9 = (b), el literal solo aparece como etiqueta
   secundaria con su titular por resultado al lado.
2. «CoO» deja de tener dos significados en el copy público (E-SLG-62).
3. Toda sigla (PEEx, TEAx, RETx, DAL OS) se expande en su primera aparición en cada página.
4. El freno rechaza las variantes antiguas en ES y EN; hay prueba con un caso válido y uno inválido por idioma.

---

#### FU-RC04 · Registros compartidos: método, cuatro reglas y postura sobre la prueba

| Campo | Contenido |
|---|---|
| **Tipo** | **FU** |
| **Depende de** | FU-RC02 (texto); D-3 (nombre del método). El componente visual del diagrama lo produce el plan visual |

**Qué produce.** Tres registros de contenido de **fuente única** (es/en): `metodo` (nombre, cuatro fases, qué
resuelve, entregable, compuerta y línea), `reglas` (§5.3 + «sin licencias ni comisiones») y `postura-prueba`
(E-SLG-12). También el esquema que valida sus campos.

**Criterios de aceptación.**
1. Las reglas aparecen en home, Nosotros, `/ai` y servicios **desde el mismo registro**. Una búsqueda en `content/`
   no encuentra otra redacción de la regla de la compuerta (E-SLG-16/17).
2. *Corregido tras crítica (C-15).* El campo `entregable` de cada fase admite tres estados: texto aprobado,
   `[PENDIENTE]` (valida en la rama de trabajo, bloquea el merge a `develop`) u **omitido de forma explícita**
   (`entregable: null`), en cuyo caso la fase se publica con «qué resuelve» y sin línea de entregable. El esquema
   rechaza en build el campo ausente sin esa marca. Así se reconcilia este criterio con el riesgo de §10.
3. Paridad ES/EN con `pair` recíproco.
4. El orden de las fases en los datos es el orden de lectura (01 → 04).

### 9.3 Entregables

#### DU-RC01 · Portada nueva ES/EN

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Depende de** | FU-RC02 *(compuerta cerrada)*, FU-RC04, D-1; componentes del plan visual (hero, diagrama del método, antes/después) |

**Qué produce.** `/` y `/en` con los bloques 0–12 de §2.1 en ese orden.

*Corregido tras crítica (C-14).* DU-RC01 y DU-47 (`04_…`) describían el mismo montaje de la portada. Son **una
sola unidad**: DU-RC01 aporta el contenido y el orden, DU-47 la forma, y se cierra cuando se cumplen los criterios
de las dos. Al consolidar en `user_units.md` queda un único número.

**Criterios de aceptación.**
1. Un solo H1 fijo. Ningún componente rota ni se mueve solo (P1, `check:motion`).
2. La primera pantalla contiene para quién, problema, resultado y el CTA, **en móvil y en escritorio** y en los dos
   idiomas.
3. La sección de dolor es la segunda. Contiene tres escenas sin cifras.
4. Un solo CTA primario (descarga de `d-06`). El rojo no aparece más de dos veces por viewport. Todo lo demás son
   enlaces de texto.
5. Las cuatro reglas y la postura sobre la prueba vienen de FU-RC04. Ni logos, ni contadores, ni estadísticas de
   terceros.
6. Ningún contenido detrás de flip, tab, carrusel o acordeón.
7. Estado resuelto: si `d-06` no está disponible en un idioma, el bloque de entrada muestra el enlace a la página
   del diagnóstico en lugar de un botón roto.
8. Lighthouse móvil ≥ 90 en rendimiento, SEO y buenas prácticas, y **accesibilidad 100** en `/` y `/en`
   (*corregido tras crítica, C-04:* el encargo pide mantener el 100; es criterio de aceptación de la unidad, no
   opcional. D-8 decide solo si el freno de CI sube de 95 a 100). Si la línea base de FU-20 no da 100, se
   corrige primero. Se registra en `work_log`.
9. La portada sigue prerenderizada (`x-nextjs-prerender: 1`) en los dos idiomas (C-05).

**Gates.** `QG` · `check:ci` completo.

---

#### DU-RC02 · Mapa del sitio reubicado y `/servicios` como índice por fase

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Depende de** | DU-RC01, D-1, FU-RC01 (rutas confirmadas) |

**Qué produce.** El mapa de vuelta en `/empieza-aqui` y `/en/start-here` (C-06), enlazado desde el menú, el
pie y Nosotros. `/servicios` y `/en/services` reescritos como «Todos los servicios», agrupados por fase.

**Criterios de aceptación.**
1. El componente del mapa no cambia (sigue generado desde la ficha y sin animación, E-SLG-43).
2. `/empieza-aqui` y `/en/start-here` responden 200 con el mapa (ya no redirigen a la portada). No se crea
   ninguna redirección nueva. `check:paginas` y `check:seo` (sitemap y hreflang recíproco) en verde.
3. `/servicios` lista los 11 servicios, cada uno bajo su fase, con titular por resultado, lector y enlace. No tiene
   hero comercial ni CTA de conversión.
4. Ningún enlace interno del sitio apunta a una ruta antigua.

---

#### DU-RC03 · `/ai` como página del método y overviews de línea por fase

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Depende de** | FU-RC02, FU-RC04, DU-RC01 |

**Qué produce.** `/ai` y las tres líneas, en ES y EN, según §7.2.

**Criterios de aceptación.**
1. `/ai` muestra el método completo desde FU-RC04 y **no** contiene el bloque «Por qué VoltAi» (E-SLG-11).
2. Cada línea muestra el diagrama con **su** fase resaltada, una escena y sus servicios con titular, lector y
   entregable. Siguen vigentes los enlaces completos de DU-04.
3. Un solo CTA primario por página (§6.1). Si el servicio de entrada de una línea está `[PENDIENTE]`, la página no
   pasa a `main`.
4. Cero backticks literales en el texto renderizado (E-SLG-25).

---

#### DU-RC04 · Las once páginas de servicio rellenadas dentro del contrato A.3

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Depende de** | FU-RC02, FU-RC03, FU-RC04 |

**Qué produce.** Las 22 páginas (11 × 2) con los cambios de §7.3.

**Criterios de aceptación.**
1. Las seis secciones A.3 siguen en su orden fijo. Siguen vigentes **todos** los criterios de DU-05: único CTA,
   nada de Sesión Cero, nada de terceros.
2. La sección 1 empieza con «Para [rol] que tiene que [decisión]» y contiene una escena.
3. La sección 2 indica la fase del método. La sección 3 enumera los entregables (o los marca `[PENDIENTE]`, que
   bloquea `main`).
4. La sección 4 usa el registro único de reglas y contiene 2–3 objeciones visibles, sin acordeón.
5. Se resuelve la incoherencia entre el lector de TEAx y el de su descarga (E-SLG-46).
6. Ningún titular contiene `_` (si D-9 = b, el literal va como etiqueta).

---

#### DU-RC05 · Nosotros, Contacto y Gracias

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Depende de** | FU-RC02, FU-RC04; P-03 (trayectoria) para publicar el bloque del fundador |

**Qué produce.** Las tres páginas en ES y EN según §7.4, §7.5 y §6.2, más la corrección del campo trampa.

**Criterios de aceptación.**
1. En Nosotros, el fundador y la razón social aparecen **antes** de las reglas. Las reglas y la postura vienen de
   FU-RC04.
2. La comparativa (si Ricardo la aprueba) no contiene superlativos ni cifras y pasa `check:copy`.
3. Contacto ya no contiene la contradicción «sin formulario» + formulario.
4. «empresa_web» no aparece en el árbol de accesibilidad ni en el texto extraído; el honeypot sigue funcionando
   (la prueba existente de FU-11 sigue en verde).
5. `/gracias` no ofrece reunión ni agenda.

---

#### DU-RC06 · Verificación: prueba de los 5 segundos y cierre de la reingeniería de contenidos

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** (verificación de punta a punta) |
| **Depende de** | DU-RC01…DU-RC05 |

**Qué produce.** Evidencia, en staging y sobre la página **renderizada**, de que la propuesta llega. Esto cubre el
límite heredado de los análisis, que no tuvieron render (E-SLG-80).

**Criterios de aceptación.**
1. **Prueba de 5 segundos** con cinco lectores ajenos a SLG, por idioma: al menos 4 de 5 repiten para quién,
   problema y siguiente paso. El resultado se registra en `work_log`. Si no pasa, se vuelve a FU-RC02, no se
   maquilla.
2. Recorrido completo home → descarga → `/gracias` → contacto en ES y EN, con teclado y en móvil.
3. `check:ci` completo en verde. Lighthouse: accesibilidad 100 en las páginas tocadas (C-04); el freno de CI
   según D-8. `CONTENT_STRICT=1 npm run check:pending` en verde antes del merge a `develop` (C-01).
4. Barrido de la §3: ninguna frase marcada para eliminar sigue publicada.
5. Revisión independiente (`/review`) sin hallazgos bloqueantes.

### 9.4 Unidades condicionadas (no se abren hasta que exista el dato)

#### DU-RC07 · Fichas de caso *(condicionada a P-01)*

Plantilla situación → línea base → intervención → resultado → plazo, con la autorización escrita referenciada en
`decision_log` y las cifras declaradas para `check:copy`. **Criterio de apertura:** al menos un caso autorizado. Sin
eso, la postura sobre la prueba (P3) sigue siendo la respuesta.

#### DU-RC08 · Duración y formato de encargo por fase *(condicionada a D-4 y D-5)*

Se añade la duración y/o el formato (alcance, quién participa y, si se decide, el rango) a cada fase del método y al
bloque de entrada. **Criterio de apertura:** dato real aportado por Ricardo y patrón aceptado por `check:copy`.

### 9.5 Grafo de dependencias

```
Ricardo: D-1, D-2, D-3, D-6, D-9 (+ P-03, P-06, P-07)
        │
FU-RC01 ──► FU-RC02 (compuerta de copy) ──► FU-RC04 ─┐
   │              │                                   │
   └──► FU-RC03 ◄─┘ (D-2, D-9)                        │
                                                      ▼
        plan visual (componentes) ──────────────► DU-RC01 ──► DU-RC02
                                                      │
                                                      ├──► DU-RC03
        FU-RC03 + FU-RC04 ───────────────────────► DU-RC04
        FU-RC04 ─────────────────────────────────► DU-RC05
                                                      │
                                DU-RC01…05 ──────► DU-RC06
   (condicionadas) P-01 ──► DU-RC07 · D-4/D-5 ──► DU-RC08
```

**Orden recomendado (INF, por impacto/esfuerzo, síntesis §8):** FU-RC01 → decisiones → FU-RC02 → FU-RC03 y FU-RC04
→ **DU-RC01** (cierra B-01, B-02, B-03, B-04, B-07 y B-08) → DU-RC03 → DU-RC04 → DU-RC05 → DU-RC02 → DU-RC06.

---

## 10. Riesgos de contenido

| Riesgo | Mitigación |
|---|---|
| Ricardo mantiene el mapa en `/` (D-1 = no) | El plan se aplica a `/servicios` como página de destino y el mapa se queda. Pierde fuerza (B-01 sigue abierta), pero las demás unidades valen igual |
| Los entregables por fase (P-07) no llegan | Las fases sin entregable se publican con «qué resuelve» y sin línea de entregable (`entregable: null`, FU-RC04 criterio 2). **No se inventa uno**, y un `[PENDIENTE]` nunca llega a `develop` (C-01, C-15) |
| La home se alarga y pierde la idea por viewport | Los bloques 7 a 10 se pueden fusionar o mover a `/ai` sin tocar el resto. La validación de DU-RC06 decide |
| Los nombres por resultado chocan con la identidad de producto de Ricardo | D-9 opción (b): el literal se conserva como etiqueta, y no se pierde nada |
| El EN se queda como traducción literal | FU-RC02 exige revisión del EN como texto propio. DU-RC06 prueba con lectores anglófonos |
