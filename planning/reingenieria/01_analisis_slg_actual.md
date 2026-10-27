# 01 — Análisis del estado actual: softlandingglobal.com (SLG)

> Ingeniería inversa (método REA) del sitio **propio** de Soft Landing Global / SLG Agency, como
> línea base para la reingeniería. Foco: **qué hace SLG y cómo lo cuenta** (contenido + presentación),
> más los tokens, el motion, la arquitectura de información y las restricciones que la reingeniería
> debe respetar.
>
> - Fecha de captura: 2026-10-27 · Herramienta: Apify `apify/web-fetch` con render JS (`wait: 3000`).
> - Páginas capturadas (7): `/` (markdown + links, y una vez HTML), `/servicios`, `/ai`,
>   `/ai/enterprise/readiness`, `/nosotros`, `/contacto`, `/doctrina`.
> - Captura condensada reproducible:
>   `/tmp/claude-0/-home-user-slg-website/8fe25825-a3b4-59ab-9308-a5e90ec3f395/scratchpad/captures/softlandingglobal.md`
>   (incluye run/dataset de Apify).
> - Prefijo de evidencia: **E-SLG**. Fuente **L** = captura en vivo (URL + encabezado); fuente **R** =
>   repositorio (`rama:archivo:línea`). Tipos: **OBS** (observado), **INF** (inferido), **UNK** (no
>   establecido).
> - Capturas de pantalla: **ninguna**. Nada de lo que aquí se diga sobre aspecto visual o animación
>   *en vivo* está observado; lo visual se documenta **desde el código** y se marca así.

---

## 0. HALLAZGO PREVIO QUE CONDICIONA TODO: el checkout local NO es lo que está publicado

La captura en vivo **no coincide** con el código de esta copia de trabajo
(`claude/gifted-mccarthy-uz6d54`, basada en `main` del 2026-09-21):

| | Copia local (`HEAD`) | Publicado (captura 2026-10-27) | `origin/develop` (2026-10-08) |
|---|---|---|---|
| Portada `/` | `Portada` con hero «No vendemos inteligencia artificial. Ayudamos a comprarla.» [E-SLG-40] | **«Empieza aquí»**, un mapa del sitio [E-SLG-01] | `MapaDelSitio` en `/` [E-SLG-41] |
| Eje de IA | `SLG_AI`, `SLG_Academy`… [E-SLG-40] | **`VoltAi by SLG`, `VoltAi Academy`…** [E-SLG-05] | `VoltAi by SLG` [E-SLG-44] |
| `/servicios` | no existe | existe: es la antigua portada [E-SLG-04] | existe [E-SLG-42] |
| Fotografía de cabecera | no hay `public/fotos` | `/fotos/*.webp` en cada página [E-SLG-04, 10, 15] | `components/Fotografia.tsx` [E-SLG-52] |

`origin/develop` va **167 commits por delante** de `HEAD` (`git log HEAD..origin/develop`) y su
código **sí** reproduce lo publicado (cadenas, rutas, nombres y estilos en línea coinciden con la
captura). **INF:** la producción se despliega desde `develop` (o una rama equivalente), no desde
`main`. **Por eso este análisis toma `origin/develop` como «estado actual»** (extraído con
`git archive` al scratchpad) y cita sus archivos como `develop:…`. Cualquier trabajo de reingeniería
debe partir de `develop`, no de esta copia; si no, se reescribiría un sitio que ya no existe.

Otras diferencias publicadas/repositorio: ninguna detectada entre `develop` y la captura en el texto
de las 7 páginas. **UNK:** si hay commits desplegados posteriores a `develop` (p. ej. la ruta
`/assessment` existe en `develop` [E-SLG-59] pero no se capturó ni aparece en los enlaces de la portada).

---

## 1. Resumen ejecutivo

SLG se presenta como **SLG Agency**, una agencia que **ayuda a directorios y comités de dirección a
decidir sobre IA sin depender de la información del vendedor** [E-SLG-04]. La idea es buena y
diferenciadora — es la mejor frase del sitio — pero **no está en la portada**: desde el 2026-09-18 la
portada es «Empieza aquí», un **mapa del sitio** cuyo primer viewport dice, literalmente, *«El mapa
del sitio en una página: qué hay, cómo se ordena y adónde lleva cada punto.»* [E-SLG-01]. El visitante
nuevo no sabe en la primera pantalla **para quién es, qué problema resuelve ni qué resultado obtiene**.

La oferta es amplia y está bien estructurada en código (1 eje de IA con 3 líneas y 10 servicios + 1
servicio suelto, Holdings) [E-SLG-44], pero **la nomenclatura es densa e inconsistente**: tres marcas
(SLG Agency / Softlanding Global / VoltAi by SLG), nombres con guion bajo (`SLG_Readiness`,
`APP_Building`), mezcla de inglés y español en etiquetas («para Researchers», «Army of Agents»)
[E-SLG-06, 46, 47]. **La prueba es casi inexistente por decisión explícita**: «no publicamos una cifra,
un caso ni un nombre de cliente sin autorización escrita» [E-SLG-12], y hay un freno de CI que lo
hace cumplir [E-SLG-56]. El único ancla de credibilidad es el fundador y una doctrina escrita.

En presentación, el sistema de diseño es **sobrio, accesible y disciplinado** (Montserrat, azules
metálicos, radios generosos, un único rojo para el CTA de descarga, reveal de 8 px una sola vez,
tres preferencias de sistema respetadas) [E-SLG-48…51]. Es una base buena para una reingeniería
nórdico-minimalista; lo que falla es **el relato**, no el sistema.

---

## 2. Checklist de preguntas (estado final)

| # | Pregunta | Evidencia necesaria | Estado |
|---|---|---|---|
| 1 | Propuesta de valor (hero verbatim, rapidez de comprensión) | Texto del primer viewport de `/` y de `/servicios` | **Respondida** |
| 2 | Arquitectura de la oferta | Ficha de oferta, páginas de eje/línea/servicio | **Respondida** |
| 3 | Prueba | Nosotros, servicios, frenos de copy | **Respondida** (ausencia documentada) |
| 4 | Método | `/ai`, servicios, doctrina | **Parcial** (hay método implícito, no nombrado) |
| 5 | Arco narrativo de la home | Orden de bloques en `/` y `/servicios` | **Respondida** |
| 6 | CTAs (texto, número, fricción) | Capturas + componentes de formulario | **Respondida** (colocación visual **UNK**) |
| 7 | Tono y vocabulario | Texto capturado | **Respondida** |
| 8 | Presentación | Tokens, componentes, motion (código) | **Parcial**: código sí; aspecto renderizado **UNK** (sin captura visual) |
| 9 | Dispositivos de confianza/conversión | Capturas + componentes | **Respondida** |
| 10 | Debilidades | Todo lo anterior | **Respondida** |
| 11 | Brechas de la propuesta de valor de SLG + primera pantalla verbatim | `/` | **Respondida** |
| A | Tokens actuales | `develop:app/tokens.css`, `site.config.ts`, componentes | **Respondida** |
| B | Sistema de motion | `Reveal.tsx`, `motion.css` | **Respondida** (comportamiento en vivo **UNK**) |
| C | Arquitectura de información | `site.config.ts`, contenido, enlaces | **Respondida** |
| D | Restricciones (bilingüe, a11y, prerender, frenos) | `package.json`, `scripts/`, requisitos | **Respondida** |

---

## 3. Ledger de evidencia

| ID | Fuente | Ubicación | Cita (≤25 palabras) | Tipo |
|---|---|---|---|---|
| E-SLG-01 | L | `https://www.softlandingglobal.com/` · H1 | «Empieza aquí» / «El mapa del sitio en una página: qué hay, cómo se ordena y adónde lleva cada punto.» | OBS |
| E-SLG-02 | L | `/` · cuerpo | «Todo lo que publica SLG Agency cuelga de este árbol. Cada nodo lleva su nombre, una línea que dice qué es…» | OBS |
| E-SLG-03 | L | `/` · «Accesos desde cualquier página» | «Contacto — Escríbenos. Sin formulario de calificación y sin llamada de descubrimiento.» | OBS |
| E-SLG-04 | L | `/servicios` · H1 + apoyo | «No vendemos inteligencia artificial. Construimos juntos tu futuro con ella.» / «…no quieren hacerlo con la información que da quien vende.» | OBS |
| E-SLG-05 | L | `/servicios` · «Los ejes de la Agencia» | «La agencia trabaja sobre dos ejes, y conviene elegir antes de seguir leyendo.» | OBS |
| E-SLG-06 | L | `/servicios` · «Holdings by SLG» | «…el único contexto en el que la marca se escribe **Softlanding Global**.» | OBS |
| E-SLG-07 | L | `/servicios` · «Holdings by SLG» | «Un punto único de responsabilidad sobre el conjunto, que es la diferencia con contratar cinco asesorías.» | OBS |
| E-SLG-08 | L | `/servicios` · «Doctrina» | «> Lo que hay que dejar de hacer pesa más que lo que hay que empezar.» | OBS |
| E-SLG-09 | L | `/servicios` · «Descargas destacadas» | «Se entregan a cambio de un correo corporativo, y nada más.» | OBS |
| E-SLG-10 | L | `/ai` · cuerpo | «primero criterio, después diagnóstico/arquitectura, y solo entonces construcción. Empezar por el final (la IA) es la forma más cara…» | OBS |
| E-SLG-11 | L | `/ai` · «Por qué VoltAi» | «VoltAi nace en su honor… poner la inteligencia en movimiento… transformar el potencial de cada empresa en resultados concretos.» | OBS |
| E-SLG-12 | L | `/nosotros` · «Lo que no hacemos» | «no publicamos una cifra, un caso ni un nombre de cliente sin autorización escrita… no vas a encontrar ninguno.» | OBS |
| E-SLG-13 | L | `/nosotros` · intro | «Somos nuestro propio Cliente Cero… SLG Agency tiene la estructura de una CoO (Company of One)» | OBS |
| E-SLG-14 | L | `/nosotros` · «Quiénes somos» | «La dirige **Ricardo Torres Oliva**, cuyo recorrido profesional y sus mentorías —ACP, SelectUSA/SGWIT— están en su perfil de LinkedIn.» | OBS |
| E-SLG-15 | L | `/ai/enterprise/readiness` · «Qué incluye» | «El diagnóstico recorre **once dimensiones**, y se entregan las once: no hay un resumen que oculte la que salió mal.» | OBS |
| E-SLG-16 | L | `/ai/enterprise/readiness` · «Cómo trabajamos» | «Cada fase pasa por una compuerta de aprobación tuya antes de que empiece la siguiente.» | OBS |
| E-SLG-17 | L | `/nosotros` · «cuatro reglas» | «**Compuertas de aprobación.** Cada fase pasa por decisiones complejas antes de que empiece la siguiente.» | OBS |
| E-SLG-18 | L | `/contacto` · cuerpo + formulario | «Escríbenos a support@softlandingglobal.com…» · campos «Tu nombre · Tu apellido · Correo corporativo · Cuéntanos en qué estás · Enviar» | OBS |
| E-SLG-19 | L | `/contacto` y `/doctrina` · formulario | texto extraído «empresa\_web» antes de los campos | OBS |
| E-SLG-20 | L | `/doctrina` · DAL OS | «**AI Literacy.** Criterio, no manejo de herramientas… qué preguntar, qué exigir y cómo verificar lo que le prometen.» | OBS |
| E-SLG-21 | L | `/` · cabeceras | `x-nextjs-prerender: 1` · `x-vercel-cache: HIT` · `<title>SLG Agency</title>` | OBS |
| E-SLG-22 | L | `/` · HTML (limpio) | H1 `font-size:clamp(2rem, 6vw, 3.25rem); line-height:1.08; letter-spacing:-0.02em; color:var(--slg-blue-deep)` | OBS |
| E-SLG-23 | L | `/` · links | 27 enlaces: menú (`/`, `/servicios`, `/blog`, `/nosotros`, `/acceder`, `/en`) + árbol completo de 10 servicios + Holdings + doctrina + legales | OBS |
| E-SLG-24 | L | `/servicios` · «Últimos artículos» | «Publicamos criterio, no novedades.» + 3 artículos (2026-09-17, -12, -08) | OBS |
| E-SLG-25 | L | `/ai` · markdown | negritas con backticks literales: «**\`VoltAi Academy\`** — formar criterio…» | OBS |
| E-SLG-40 | R | `HEAD:content/pages/es/home.md:14` | «No vendemos inteligencia artificial. Ayudamos a comprarla.» | OBS |
| E-SLG-41 | R | `develop:app/(public)/page.tsx:5-15` | «La portada es «Empieza aquí»: el mapa del sitio (decisión de Ricardo, 2026-09-18)… La portada anterior vive en `/servicios`.» | OBS |
| E-SLG-42 | R | `develop:app/(public)/servicios/page.tsx` | «`/servicios` — la casa comercial (decisión de Ricardo, 2026-09-18): los bloques de RF-09 que antes eran la portada.» | OBS |
| E-SLG-43 | R | `develop:components/MapaDelSitio.tsx:29-31` | «CSS puro con conectores… sin JavaScript de cliente, sin librerías y sin nada animado. Un mapa que se mueve no se lee de un vistazo.» | OBS |
| E-SLG-44 | R | `develop:site.config.ts:77-128` | ejes `VoltAi by SLG` → líneas Academy (5), Enterprise (2), Factory (3); `sueltos: [Holdings by SLG]` | OBS |
| E-SLG-45 | R | `develop:site.config.ts:29-31` | `nombre: "SLG Agency"`, `razonSocial: "SLG Agency Inc."`, `lema: "Precision with Purpose."` | OBS |
| E-SLG-46 | R | `develop:content/services/es/*.md:4` (tagline) | PEEx «para Directores» · TEAx «para C-suite» · RETx «para Researchers y estudiantes» · CoO «Army of Agents» | OBS |
| E-SLG-47 | R | `develop:content/services/es/age-building.md:4`, `app-building.md:4` | «Crea Agentes IA para cualquier escenario» · «Construye aplicaciones escalables y robustas» | OBS |
| E-SLG-48 | R | `develop:site.config.ts:36-46` | primario `#2878b4`, profundo `#24394d`, acento `#50b4dc`, tinte `#78b4dc`, secundario `#282878`, alerta `#dc141e`, tinta `#0a0a14`, línea `#c8ccd3`, papel `#ffffff` | OBS |
| E-SLG-49 | R | `develop:app/tokens.css:69-115` | `--slg-ink-2:#5a6470`, `--slg-paper-2:#f4f6f9`, radios 12/16/24 px, sombras multicapa, `blur(20px) saturate(180%)`, Montserrat | OBS |
| E-SLG-50 | R | `develop:app/motion.css:23-31` | `--slg-spring: cubic-bezier(0.22, 1, 0.36, 1)`; 350 ms; press 100 ms · `scale 0.97`; reveal 8 px | OBS |
| E-SLG-51 | R | `develop:components/Reveal.tsx:5-21` | «Reveal al scroll (RNF-46): opacidad + 8 px, **una sola vez**… NACE VISIBLE, y se esconde solo lo que está fuera de pantalla.» | OBS |
| E-SLG-52 | R | `develop:components/Fotografia.tsx:6-20`, `ArmazonPublico.tsx:87` | «Fotografía de cabecera… no es contenido editorial: es atmósfera… `alt=""` EN TODAS» | OBS |
| E-SLG-53 | R | `develop:design_docs/style_guide.md:188` vs `develop:components/piezas.tsx:196` | Guía: Hero `clamp(2.25rem, 5vw, 4.5rem)`; código: `clamp(2rem, 6vw, 3.25rem)` | OBS |
| E-SLG-54 | R | `develop:design_docs/style_guide.md:203-207` | «Las cifras del copy… **Sustituyen a la fotografía**: son el recurso visual del sitio» | OBS |
| E-SLG-55 | R | `planning/requirements.md:371` (RNF-44) | «Una idea por viewport, blanco generoso, cero fotografía de stock y cero clichés visuales de IA» | OBS |
| E-SLG-56 | R | `develop:scripts/content/check-copy.ts:7-17` | «ningún texto público ofrece agenda… El único llamado a la acción de una página de servicio es su descarga… cero cifras, premios, casos…» | OBS |
| E-SLG-57 | R | `develop:scripts/ci/check-lighthouse.ts:62-65` | umbrales por defecto: performance 90 · accessibility **95** · best-practices 90 · seo 90 | OBS |
| E-SLG-58 | R | `develop:components/BarraDeNavegacion.tsx:110-111` | «Secundario a propósito: el CTA de la capa pública es la descarga, no el login (§10-8). Nunca rojo.» | OBS |
| E-SLG-59 | R | `develop:content/pages/es/assessment.md:4` | «Un cuestionario de 15 a 25 minutos para que conozcamos tu punto de partida. Es opcional y no filtra a nadie.» | OBS |
| E-SLG-60 | R | `develop:components/Portada.tsx:53` vs `ArmazonPublico.tsx:87` | comentario «Hero… Sin fotografía» · pero el armazón pinta `<Fotografia>` y `/servicios` muestra `home.webp` | OBS |
| E-SLG-61 | R | `develop:package.json:45` | `check:ci` encadena ~40 frenos (contenido, cadenas, contraste, motion, js-budget, paginas, seo, lighthouse…) | OBS |
| E-SLG-62 | R | `develop:content/pages/es/nosotros.md:12` + `site.config.ts` «CoO as a Service» = «dirección de operaciones» | «CoO (Company of One)» vs servicio CoO = dirección de operaciones | OBS |
| E-SLG-63 | R | `develop:site.config.ts:70-75` | menú: `nav.start` (/), `nav.services` (/servicios), `nav.blog`, `nav.about` (+ `Acceder`) | OBS |
| E-SLG-70 | — | inferencia | La primera pantalla de `/` no comunica para quién, qué problema ni qué resultado | INF (de 01, 02) |
| E-SLG-71 | — | inferencia | El sitio en producción se compila desde `develop`, no desde `main` | INF (de 0, 21, 41) |
| E-SLG-72 | — | inferencia | «empresa\_web» es la etiqueta del campo trampa anti-abuso (D-164) y aparece en el texto accesible/extraído | INF (de 19) |
| E-SLG-80 | — | — | Aspecto visual renderizado (fotografías, contraste real, densidad percibida, árbol con conectores) | UNK |
| E-SLG-81 | — | — | Comportamiento real de reveal, sheet móvil y press en producción | UNK |
| E-SLG-82 | — | — | Si las fotos `/fotos/*.webp` son de stock o propias | UNK |
| E-SLG-83 | — | — | Si `/assessment` está publicado y enlazado | UNK |
| E-SLG-84 | — | — | Si «empresa\_web» es visible para usuarios videntes | UNK |

---

## 4. Arquitectura de la home (sección por sección)

### 4.1 `/` — «Empieza aquí» (la portada real)

| Orden | Bloque | Trabajo que hace | Evidencia |
|---|---|---|---|
| 0 | Barra: logo/wordmark, banderas de idioma, menú (Empieza aquí · Servicios · Blog · Nosotros), «Acceder» secundario | Navegación | E-SLG-23, 58, 63 |
| 1 | Hero tipográfico: «Empieza aquí» + «El mapa del sitio en una página…» | **Orienta, no persuade** | E-SLG-01, 22 |
| 2 | Párrafo de instrucciones de lectura del árbol | Meta-explicación | E-SLG-02 |
| 3 | Árbol (izq.→der.): raíz «SLG Agency» → VoltAi by SLG → 3 líneas → 10 servicios con *tagline*; Holdings; Doctrina; Blog; Nosotros | Inventario | E-SLG-23, 43 |
| 4 | «Accesos desde cualquier página»: Descargas · Contacto | Salidas | E-SLG-03 |
| 5 | Pie: 6 enlaces + derechos | — | `develop:ArmazonPublico.tsx:101-116` |

Sin fotografía (la ficha no le da una) [E-SLG-52]. Sin animación (decisión explícita) [E-SLG-43].

### 4.2 `/servicios` — «la casa comercial» (antigua portada)

| Orden | Bloque | Trabajo | Evidencia |
|---|---|---|---|
| 0 | Foto de cabecera `home.webp` | Atmósfera | E-SLG-60 |
| 1 | Hero: «No vendemos inteligencia artificial. Construimos juntos tu futuro con ella.» + apoyo | **Propuesta de valor** | E-SLG-04 |
| 2 | «Los ejes de la Agencia» (2 puertas) | Segmentar | E-SLG-05 |
| 3 | «VoltAi by SLG»: 3 tarjetas con nº de servicios | Oferta | E-SLG-44 |
| 4 | «Holdings by SLG» desarrollado + enlace | Oferta 2 | E-SLG-06, 07 |
| 5 | Franja oscura Doctrina: pull-quote + «Leer la doctrina» | Autoridad | E-SLG-08 |
| 6 | Últimos artículos (3) | Autoridad/frescura | E-SLG-24 |
| 7 | Descargas destacadas (3) + «Ver todas» | **Conversión** (correo corporativo) | E-SLG-09 |

**INF:** el mejor arco del sitio (valor → oferta → doctrina → contenido → descarga) está en la
segunda página del menú; la portada lo reemplazó por un índice.

---

## 5. Propuesta de valor (P1) y primera pantalla (P11)

**Primera pantalla de la portada, verbatim** [E-SLG-01]:

> **Empieza aquí**
> El mapa del sitio en una página: qué hay, cómo se ordena y adónde lleva cada punto.

**Propuesta de valor real**, en `/servicios` [E-SLG-04]:

> **No vendemos inteligencia artificial. Construimos juntos tu futuro con ella.**
> Trabajamos con directorios y comités de dirección que tienen que decidir sobre IA y no quieren
> hacerlo con la información que da quien vende.

Rapidez de comprensión:

- En `/`: **para quién — no; problema — no; resultado — no** [E-SLG-70]. Solo «qué hay».
- En `/servicios`: **para quién — sí** (directorios y comités); **problema — sí, implícito**
  (asimetría de información frente al vendedor); **resultado — vago** («construimos juntos tu
  futuro»). La versión anterior, «Ayudamos a comprarla» [E-SLG-40], era más nítida y coherente con
  el apoyo; la actual suaviza el contraste y introduce un tópico («tu futuro»).
- La meta-description de `/servicios` sí es concreta: «qué preguntar, qué exigir y qué no comprar»
  (`develop:content/pages/es/servicios.md:4`) — pero no aparece en el hero.

---

## 6. Oferta (P2)

- **Dos ejes** declarados [E-SLG-05], pero en la ficha **uno es eje y otro es «servicio suelto»**
  [E-SLG-44]: VoltAi by SLG (IA) y Holdings by SLG (construir y operar compañías fuera de su mercado).
- **VoltAi by SLG → 3 líneas, 10 servicios:**
  - *VoltAi Academy* (5): Phoenix PEEx («para Directores»), Phoenix TEAx («para C-suite»), Phoenix
    RETx («para Researchers y estudiantes»), Customize Programs, AI Coaching for Directors.
  - *VoltAi Enterprise* (2): SLG_Readiness (diagnóstico, 11 dimensiones), SLG_Implement.
  - *VoltAi Factory* (3): APP_Building, AGE_Building, CoO as a Service («Army of Agents»).
- **Empaquetado:** cada servicio = página + un documento descargable [E-SLG-09]. **Sin precios, sin
  niveles, sin duración** visibles en las páginas capturadas. Fases: solo la secuencia recomendada
  «criterio → diagnóstico/arquitectura → construcción» [E-SLG-10] y las «compuertas de aprobación»
  [E-SLG-16].
- **INF:** los nombres son internos (guiones bajos, siglas PEEx/TEAx/RETx) y obligan a leer la
  *tagline* para entender qué es cada cosa.

---

## 7. Prueba (P3)

- **Casos, métricas, logos, testimonios: ninguno**, por política explícita [E-SLG-12] y por freno de
  CI que bloquea porcentajes, importes, multiplicadores, premios, superlativos y «caso de éxito» sin
  respaldo [E-SLG-56].
- **Fundador:** Ricardo Torres Oliva, al final de `/nosotros`, con enlace a LinkedIn y mentorías
  «ACP, SelectUSA/SGWIT» sin explicar [E-SLG-14].
- **Sustitutos de prueba presentes:** doctrina escrita (Phoenix Doctrine, DAL OS) [E-SLG-08, 20];
  «Cliente Cero» (lo construyeron para sí mismos) [E-SLG-13]; artículos [E-SLG-24]; documentos
  descargables [E-SLG-09]; especificidad del entregable (11 dimensiones, «se entregan las once»)
  [E-SLG-15].
- **INF:** la renuncia a la prueba está convertida en argumento («por eso no vas a encontrar
  ninguno»), pero vive en `/nosotros`, lejos de donde el visitante decide.

---

## 8. Método (P4)

- **No hay un método nombrado y dibujado.** Hay piezas: secuencia recomendada de 3 pasos
  [E-SLG-10], compuertas de aprobación por fase [E-SLG-16], cuatro reglas «que no negociamos»
  (sin lock-in, agnósticos, compuertas, capacidad dentro) [E-SLG-17].
- La **doctrina** (Phoenix Doctrine + DAL OS: Destrucción Creativa, Antifragilidad, AI Literacy)
  funciona como marco filosófico, no como proceso de trabajo [E-SLG-20].
- Incoherencia: la misma regla se formula como «compuerta de aprobación **tuya**» [E-SLG-16] y como
  «pasa por **decisiones complejas**» [E-SLG-17].

---

## 9. CTAs (P6)

| CTA | Texto | Dónde | Fricción | Evidencia |
|---|---|---|---|---|
| Descarga | «Descargar el documento» / «Descargar» | Cada servicio, `/servicios`, `/descargas` | Correo corporativo; botón **rojo** (único uso del rojo) | E-SLG-09, `develop:FormularioDeDescarga.tsx:187` |
| Contacto | «Escríbenos» | Final de servicio, `/nosotros`, accesos de `/` | Correo directo o formulario de 4 campos | E-SLG-18 |
| Doctrina completa | «Pedir el documento» | `/doctrina` | Formulario nombre/apellido/correo | captura `/doctrina` |
| Leer doctrina | «Leer la doctrina» | Franja de `/servicios` | Ninguna | E-SLG-08 |
| Acceder | «Acceder» | Barra, secundario, nunca rojo | Login (portal) | E-SLG-58 |
| Assessment | cuestionario 15–25 min | `develop:/assessment` | Alta | E-SLG-59 (publicación **UNK**) |

- **Prohibido por freno:** agenda/calendario embebido y «Sesión Cero» en la capa pública [E-SLG-56].
  No hay WhatsApp, chat ni lead magnet distinto de los documentos.
- **Contradicción:** «Sin formulario de calificación» y, debajo, un formulario [E-SLG-18]. **INF:** se
  refiere a que no *califica*, pero se lee como contradicción.
- La portada `/` **no tiene ningún CTA de conversión**: solo enlaces a Descargas y Contacto [E-SLG-03].

---

## 10. Tono de voz y vocabulario (P7)

- **Consultivo, anti-venta, aforístico**: «Publicamos criterio, no novedades» [E-SLG-24]; «Lo que hay
  que dejar de hacer pesa más…» [E-SLG-08]; «Empezar por el final (la IA) es la forma más cara de
  descubrir que no hacía falta» [E-SLG-10]. Es la voz más valiosa del sitio.
- **Nivel de hype bajo** en general… salvo puntos: «poner la inteligencia en movimiento… transformar
  el potencial de cada empresa en resultados concretos» [E-SLG-11]; «Crea Agentes IA para cualquier
  escenario», «escalables y robustas» [E-SLG-47]; «Army of Agents» [E-SLG-46]; «Construimos juntos tu
  futuro» [E-SLG-04].
- **Jerga propia** alta: DAL OS, Phoenix PEEx/TEAx/RETx, CoO, Cliente Cero, «fundamentos Lindy»,
  «Agentic Mindset». **Spanglish** en etiquetas: «para Researchers», «Customize Programs», «AI
  Coaching for Directors».
- **Reglas internas filtradas al público**: «el único contexto en el que la marca se escribe
  Softlanding Global» [E-SLG-06].

---

## 11. Presentación (P8) — desde el código; lo renderizado es UNK

### 11.1 Tokens actuales (`develop`)

**Color** (valores en `site.config.ts`, nombres y reglas en `tokens.css`) [E-SLG-48, 49]:

| Token | Valor | Regla de uso |
|---|---|---|
| `--slg-blue-primary` | `#2878b4` | Enlaces (`--slg-link`), anillo de foco interior; 4,7:1 |
| `--slg-blue-deep` | `#24394d` | H1, titulares, wordmark, franja oscura; 11,9:1 |
| `--slg-cyan` | `#50b4dc` | Nunca texto sobre claro (2,4:1); acento en oscuro |
| `--slg-blue-tint` | `#78b4dc` | Solo fondo al 20–40 % |
| `--slg-indigo` | `#282878` | H3, datos destacados |
| `--slg-red` | `#dc141e` | **Solo** CTA de descarga y alertas; 1–2 por viewport |
| `--slg-ink` | `#0a0a14` | Cuerpo; 19,7:1 |
| `--slg-ink-2` | `#5a6470` | Secundario; 6,0:1 |
| `--slg-line` | `#c8ccd3` | Divisores, bordes |
| `--slg-paper` / `--slg-paper-2` | `#ffffff` / `#f4f6f9` | Fondos |

Prohibiciones duras: sin verde/amarillo/naranja; rojo nunca decorativo; máx. 3 colores por gráfico;
logo nunca sobre oscuro (`develop:app/tokens.css:22-26`).

**Tipografía**: Montserrat autoalojada 400/600/700, fallbacks del sistema; Bebas Neue/Oswald solo
eyebrows (guía) [E-SLG-49]. Escala **implementada**:

| Nivel | Implementado | Guía de estilo |
|---|---|---|
| Hero | `clamp(2rem, 6vw, 3.25rem)` · 1.08 · −0.02em · 700 | `clamp(2.25rem, 5vw, 4.5rem)` · 1.05 [E-SLG-53] |
| Apoyo hero | `clamp(1rem, 2.2vw, 1.1875rem)` · 1.6 · `ink-2` | — |
| H2 de bloque | `clamp(1.5rem, 3.5vw, 2.125rem)` · 1.15 · −0.015em · 700 · `blue-deep` | 600 · `blue-primary` (propuesta) |
| Cuerpo | `1.0625rem` · 1.6–1.7 | `1.0625rem` · 1.6 |
| Pull-quote | `clamp(1.25rem, 3vw, 1.75rem)` · 1.3 · 600 | — |
| Nodo del mapa | `1rem` · 600 / línea `0.875rem` | — |

**Espaciado y layout**: contenedor `72rem`, gutter `1.25rem`; hero `5rem 0 3rem`, máx. `44rem`;
bloques `3.5rem 0`; texto de apoyo máx. `42rem`; rejillas `auto-fit minmax(18rem|15rem, 1fr)` con
`gap 1.25rem`; tarjeta `1.5rem` de padding (`develop:Portada.tsx:52,282-320`, `piezas.tsx:191-215`).
**No hay escala de espaciado tokenizada**: todo son literales en estilos en línea.

**Radios** 12/16/24 px; **sombras** multicapa sm/md/lg; **material** `blur(20px) saturate(180%)`;
**foco** anillo de dos capas (blue-primary 2 px + cyan 4 px) [E-SLG-49].

### 11.2 Componentes

Hero tipográfico, tarjetas de servicio/artículo (borde 1 px + radio 16), franja oscura con cita,
árbol con conectores CSS, bloque «Qué incluye», formularios (descarga, contacto, doctrina,
assessment), barra translúcida, **sheet móvil arrastrable** (`SheetMovil.tsx`), banderas de idioma,
«Regreso» (migas), fotografía de cabecera. **No hay** carruseles, tabs ni acordeones en la capa
pública capturada. **Iconografía:** no observada (UNK visualmente).

### 11.3 Motion presente [E-SLG-50, 51]

- Solo `transform` y `opacity`; spring `cubic-bezier(0.22, 1, 0.36, 1)` 350 ms; press en
  `pointerdown` `scale(0.97)` 100 ms; cero `transition-delay`.
- `Reveal`: opacidad + 8 px, una vez, **nace visible** y solo esconde lo que está debajo del viewport;
  rescate a 3 s; visible al imprimir.
- Sheet móvil con seguimiento 1:1, momentum `d≈0.998`, rubber-band (guía §6).
- Preferencias: `prefers-reduced-motion` → cross-fade 200 ms; `prefers-reduced-transparency` → material
  opaco; `prefers-contrast: more` → bordes `ink-2`.
- La portada (mapa) **no anima nada** a propósito [E-SLG-43].
- **UNK:** cómo se ve/siente en producción [E-SLG-81].

### 11.4 Imaginería

Una foto WebP de cabecera por página (`/fotos/<clave>.webp`), decorativa (`alt=""`) [E-SLG-52].
Choca con la guía («las cifras **sustituyen a la fotografía**») [E-SLG-54] y con el comentario de la
propia Portada («Sin fotografía») [E-SLG-60]. Si son de stock: **UNK** [E-SLG-82]; RNF-44 lo prohíbe
[E-SLG-55].

---

## 12. Confianza y conversión (P9)

- **Riesgo invertido real y bien formulado**: sin lock-in, stack del cliente, compuertas de aprobación,
  capacidad transferida, «si al terminar sigues dependiendo de nosotros, el trabajo no está hecho»
  [E-SLG-16, 17]; no revenden licencias ni cobran comisión [E-SLG-12]. **Es el mejor activo de
  confianza del sitio y está repartido entre `/nosotros` y cada servicio**, nunca en la portada.
- Sin FAQ, sin garantía explícita con nombre, sin urgencia, sin chat (por diseño).
- Datos legales: SLG Agency Inc., Florida; correo público [E-SLG-18].
- Campo trampa «empresa\_web» presente en el texto extraído [E-SLG-19, 72]; visibilidad **UNK** [E-SLG-84].

---

## 13. Debilidades (P10)

1. **La portada no dice qué hace SLG.** Un mapa del sitio como primera pantalla traslada al visitante
   el trabajo de orientarse [E-SLG-01, 70].
2. **Tres marcas en una casa**: dominio *softlandingglobal.com*, título *SLG Agency*, eje *VoltAi by
   SLG*, «Softlanding Global» solo para Holdings, lema en inglés «Precision with Purpose.» que no se ve
   en la captura [E-SLG-06, 45].
3. **«Dos ejes» que no son simétricos**: Holdings es un servicio suelto sin líneas; VoltAi tiene 10
   servicios. Pedir «elegir antes de seguir leyendo» presupone que el visitante entiende la diferencia
   [E-SLG-05, 44].
4. **Nomenclatura interna**: guiones bajos, siglas, Spanglish; *taglines* incoherentes con la
   audiencia de las descargas (TEAx «para C-suite» vs. descarga para «Gerentes y ejecutivos que
   reportan…») [E-SLG-46].
5. **«CoO» significa dos cosas**: Company of One (Nosotros) y dirección de operaciones (servicio)
   [E-SLG-62].
6. **Prueba cero** y la explicación de por qué está escondida en Nosotros [E-SLG-12].
7. **Método disperso**: secuencia, compuertas y reglas existen pero no se nombran ni se dibujan; dos
   redacciones distintas de la misma regla [E-SLG-16, 17].
8. **Huecos de tono**: el relato de Volta y «poner la inteligencia en movimiento» rompe la sobriedad
   del resto [E-SLG-11]; *taglines* de Factory genéricas [E-SLG-47].
9. **Artefactos de render**: backticks literales dentro de negritas en `/ai` [E-SLG-25]; reglas de
   marca internas en el copy público [E-SLG-06].
10. **Contradicción en Contacto**: «sin formulario» + formulario [E-SLG-18].
11. **Deriva entre guía y código**: escala del hero [E-SLG-53]; fotografía vs. «cifras como imagen»
    [E-SLG-54, 60]; no hay escala de espaciado como token.
12. **Deriva entre ramas**: `main`/copia local ≠ producción [§0].

---

## 14. Brechas de la propuesta de valor de SLG (P11, adaptada)

| Brecha | Tipo | Dónde | Evidencia |
|---|---|---|---|
| La propuesta de valor no está en `/` | **Enterrada** | Vive en `/servicios`, segundo ítem del menú | E-SLG-01, 04, 41 |
| Resultado prometido difuso («tu futuro») | **Abstracta** | Hero de `/servicios` | E-SLG-04 |
| La concreción («qué preguntar, qué exigir, qué no comprar») solo en meta-description y en Academy | **Enterrada** | `servicios.md:4`, tarjeta Academy | E-SLG-04 |
| Diferenciador (independencia del vendedor, sin comisiones ni lock-in) disperso | **Enterrado** | Nosotros + pie de cada servicio | E-SLG-12, 16 |
| Sin prueba de ningún tipo en el recorrido de decisión | **No probada** | Todo el sitio | E-SLG-12, 56 |
| Entregables concretos (11 dimensiones) no visibles desde la entrada | **Enterrada** | `/ai/enterprise/readiness` | E-SLG-15 |
| Audiencia que se dispersa: directorios, C-suite, gerentes, investigadores, estudiantes, fundadores que internacionalizan | **Débil** | Taglines y descargas | E-SLG-46, `servicios` Descargas |
| El fundador (único activo humano de confianza) al final de Nosotros | **Enterrado** | `/nosotros` | E-SLG-14 |

---

## 15. Arquitectura de información (`develop`)

```
/ (Empieza aquí · mapa)
├── /servicios (casa comercial · bloques RF-09)
│   ├── /ai  VoltAi by SLG
│   │   ├── /ai/academy     VoltAi Academy     → phoenix-peex · phoenix-teax · phoenix-retx · customize-programs · ai-coaching
│   │   ├── /ai/enterprise  VoltAi Enterprise  → readiness · implement
│   │   └── /ai/factory     VoltAi Factory     → app-building · age-building · coo-as-a-service
│   └── /holdings  Holdings by SLG (servicio suelto)
├── /doctrina   (Phoenix Doctrine · DAL OS; 2 registros por idioma)
├── /blog       (6 es · 4 en; etiquetas; RSS)
├── /nosotros
├── /descargas  (11 documentos por idioma, uno por servicio)
├── /contacto · /gracias · /legal/{terminos,privacidad} · /assessment (develop)
├── /acceder    (portal; capa privada)
└── /en/…       (espejo: /en/services, /en/start-here, /en/about, /en/ai/…, etc.)
```

- **«Cuatro ramas / overviews»**: las 3 líneas de VoltAi (Academy, Enterprise, Factory) + el overview
  del eje `/ai` (`OverviewDeRama.tsx`); Holdings no tiene overview de línea.
- **22 servicios** = **11 registros por idioma × 2** (10 de IA + Holdings) — `content/services/{es,en}`.
- Páginas: 14 por idioma. Descargas: 11 por idioma. Doctrina: 2 por idioma.
- Menú: Empieza aquí · Servicios · Blog · Nosotros · (Acceder) [E-SLG-63]. Pie: Empieza aquí,
  Doctrina, Descargas, Contacto, Términos, Privacidad.
- El mapa se **genera** desde la ficha (`EJES`, `RAMAS`, `SERVICIOS`): añadir un servicio a la ficha lo
  añade al árbol sin tocar el componente [E-SLG-43].

---

## 16. Restricciones que la reingeniería debe respetar

1. **Partir de `origin/develop`**, no de `main` ni de esta copia [§0].
2. **Bilingüe es/en con paridad**: cada registro tiene `pair`; claves UI en `content/ui/{es,en}.json`
   validadas en build (`app/(public)/layout.tsx`); `check:pairs`, hreflang recíproco (`check:seo`).
3. **Cero cadenas de negocio en componentes** (RF-16, `check:cadenas`): todo texto vive en `content/`.
4. **Color solo por tokens** (FU-02); colores de marca desde `site.config.ts`; `check:contraste` mide
   AA; cyan nunca como texto sobre claro; rojo solo CTA de descarga (1–2 por viewport).
5. **Accesibilidad**: requisitos RNF-04/05 (AA, teclado, foco visible de dos capas, `alt`, etiquetas);
   **gate de Lighthouse en CI = accesibilidad ≥ 95** por defecto [E-SLG-57]. El objetivo «100» que se
   plantea para la reingeniería **es más exigente que el freno actual**: habrá que subir
   `LH_MIN_ACCESSIBILITY` o tratarlo como objetivo de revisión.
6. **Prerender/estático**: páginas públicas prerenderizadas (`x-nextjs-prerender: 1`) [E-SLG-21];
   `check:paginas` compara rutas servidas con la ficha; JS inicial < 150 KB gzip (`check:js-budget`);
   Lighthouse móvil ≥ 90 en rendimiento/SEO/buenas prácticas; LCP < 2,5 s.
7. **Motion**: solo `transform`/`opacity`, reveal 8 px una vez, reduced-motion → 200 ms cross-fade
   (`check:motion`); sin parallax, sin fondos en movimiento, sin bucles.
8. **Frenos de copy** (`check:copy`, `check:nomenclature`): sin cifras/porcentajes/importes/premios/
   superlativos/«caso de éxito» sin respaldo `[PENDIENTE]`; **sin agenda ni «Sesión Cero»** en público;
   el único CTA de una página de servicio es su descarga; nombres de marca literales y variantes
   prohibidas definidas en `site.config.ts:149-224`.
9. **RNF-44**: una idea por viewport, blanco generoso, cero stock, cero clichés visuales de IA.
10. **Modo oscuro fuera de v1**, pero todos los tokens deben ser variables.
11. Fuente autoalojada; cero peticiones a terceros (`check:terceros`).

---

## 17. Desconocidos y límites de la captura

- Sin capturas de pantalla ni CDP: **todo lo visual en vivo es UNK** [E-SLG-80, 81].
- El HTML devuelto por Apify viene limpio (sin `<head>`, sin `<nav>`, sin hojas de estilo): no permite
  confirmar fuentes cargadas ni librerías; se confirman solo estilos en línea del hero [E-SLG-22].
- No se capturó `/en`, `/holdings`, `/descargas`, `/blog`, ni `/assessment` [E-SLG-83].
- Naturaleza de las fotos (stock o propias): UNK [E-SLG-82].

## 18. Revisión final del checklist

| # | Estado | Nota |
|---|---|---|
| 1 Propuesta de valor | Respondida | Verbatim de `/` y `/servicios` |
| 2 Oferta | Respondida | 1 eje + 3 líneas + 10 servicios + Holdings; sin precios |
| 3 Prueba | Respondida | Ausencia deliberada, reforzada por freno |
| 4 Método | Parcial | Piezas sin nombre; doctrina ≠ proceso |
| 5 Arco narrativo | Respondida | `/` = mapa; arco real en `/servicios` |
| 6 CTAs | Respondida | Colocación visual UNK |
| 7 Tono | Respondida | Consultivo con huecos de hype |
| 8 Presentación | Parcial | Código sí; render UNK |
| 9 Confianza | Respondida | Riesgo invertido fuerte pero disperso |
| 10 Debilidades | Respondida | 12 puntos |
| 11 Brechas SLG | Respondida | 8 brechas |
| A–D Tokens/motion/IA/restricciones | Respondidas | Basadas en `develop` |
