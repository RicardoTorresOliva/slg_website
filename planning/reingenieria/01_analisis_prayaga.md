# 01 — Análisis de referencia: prayaga.biz

> Ingeniería inversa (método REA) de la web de **Prayaga Solutions** (consultora peruana de datos,
> analítica e IA) como referencia para la reingeniería del sitio de **Soft Landing Global (SLG)**.
> Foco: **qué hacen y cómo lo cuentan** (contenido + presentación).
>
> - Fecha de captura: 2026-10-27 · Herramienta: Apify `apify/web-fetch` con render JS (`wait: 3000`).
> - Páginas capturadas (7): `/`, `/nosotros/`, `/soluciones/`, `/soluciones/artificial-intelligence-2/`,
>   `/soluciones/business-analytics/`, `/contacto/`, `/blog/`.
> - Captura condensada reproducible: `/tmp/claude-0/-home-user-slg-website/8fe25825-a3b4-59ab-9308-a5e90ec3f395/scratchpad/captures/prayaga.md`
>   (incluye los IDs de dataset de Apify de cada página).
> - Prefijo de evidencia: **E-PRY**. Tipos: **OBS** (observado en la captura), **INF** (inferido de
>   observaciones), **UNK** (no establecido).

---

## 1. Resumen ejecutivo

Prayaga es una consultora de datos con base en Lima y oficina en Coral Gables (FL). Lleva una web
WordPress + Elementor muy cargada que cuenta lo que hace como **un catálogo de seis "líneas de
negocio"** (Business Analytics + AI, Cloud Services, Data Integration, Artificial Intelligence, IoT
Software Development, Data Governance) [E-PRY-07]. El *hero* es un **slider rotativo de dos
mensajes** ("Datos en decisiones accionables" / "Datos conectados, sin fricción") con un CTA de
diagnóstico [E-PRY-01, E-PRY-02, E-PRY-03]. Lo **mejor** del sitio: (1) una sección de **dolores en
lenguaje del cliente** justo después del hero ("¿Tus datos están frenando tus decisiones?")
[E-PRY-05]; (2) las **páginas de servicio**, que siguen una plantilla consultiva sólida y repetible:
desafíos → por qué nosotros → beneficios → tipología → método 01–04 → casos → formulario
[E-PRY-24…E-PRY-31]; (3) **prueba con nombres reales** de clientes (UPC, PUCP, UARM, Pan American
Silver, American Dream) con un resultado narrado y vídeo [E-PRY-13].

Lo **peor**: la propuesta de valor no dice **para quién** es (ni sector, ni tamaño, ni rol)
[E-PRY-50]; la oferta es una **lista de capacidades técnicas** sin paquetes, fases con precio ni
resultados comprometidos [E-PRY-08]; la prueba tiene **números de antigüedad contradictorios**
(2001 / 2009 / "más de 20 años") [E-PRY-11, E-PRY-17, E-PRY-36] y **ninguna métrica de resultado
cuantificada** por caso (el único porcentaje, "hasta 40%", no tiene fuente) [E-PRY-28]; hay **una
docena de CTA con 5 destinos diferentes** (form, chat HubSpot, chat de IA de terceros, WhatsApp,
"Agenda" que apunta a `#`) [E-PRY-41]; y hay **descuidos editoriales** visibles (erratas, meta
descriptions copiadas de otra página, "seis" vs "siete" líneas, blog parado desde 2022)
[E-PRY-44…E-PRY-48]. Una FAQ incluso pregunta "No termino de entender lo que ofrecen" [E-PRY-21]:
el propio sitio admite el problema de claridad.

**Para SLG**: tomar la **plantilla de página de servicio** (dolor → método numerado → caso → un único
siguiente paso), la **sección de dolores con el lenguaje del cliente**, los **casos con
nombre + sector + país + resultado**, y el patrón "Ventas dice 100, finanzas dice 90" (un dolor
concreto y memorable) [E-PRY-27]. **Rechazar** el slider de hero, los flip-boxes, los carruseles
autoplay, la pluralidad de canales de CTA, las métricas sin fuente y el catálogo de capacidades sin
destinatario.

---

## 2. Checklist de preguntas (estado)

| # | Pregunta | Evidencia necesaria | Estado | Evidencias |
|---|---|---|---|---|
| 1 | Propuesta de valor: hero literal; rapidez con que se entiende para quién / problema / resultado | Texto del hero, H1, title/meta, primera sección | **Respondida** (texto). **Parcial** en "rapidez percibida" (sin vista renderizada) | E-PRY-01…06, E-PRY-50 |
| 2 | Arquitectura de oferta: nombres, agrupación, paquetes, fases, precio | Home, /soluciones/, páginas de servicio | **Respondida** | E-PRY-07, 08, 24, 26, 29, 30 |
| 3 | Prueba: casos, métricas, logos, testimonios, certificaciones, fundadores, cifras | Secciones de casos, contadores, logos, equipo | **Respondida** (texto y estructura). **Parcial** en logos (imágenes no capturadas) | E-PRY-09…18, 28, 36 |
| 4 | Método: ¿proceso con nombre? ¿cómo se muestra? | Sección "¿Cómo lo hacemos?" | **Respondida** | E-PRY-31, 32, 33 |
| 5 | Arco narrativo de la home, sección por sección | Orden de H1–H3 y widgets en DOM | **Respondida** | §4, E-PRY-01…22 |
| 6 | CTAs: texto, número, ubicación, fricción | Botones, enlaces, formularios, chats | **Respondida**. **Parcial** sobre comportamiento de "Agenda tu asesoría gratuita" (href `#`) | E-PRY-03, 19, 20, 37…43 |
| 7 | Tono y vocabulario | Copys de todas las páginas | **Respondida** | E-PRY-04, 27, 34, 35 |
| 8 | Presentación visual: tipografía, color, densidad, imagen, iconos, motion, componentes | HTML (clases, data-settings), CSS, capturas de pantalla | **Parcial**: componentes y motion configurado **observados**; tipografía, paleta global, imágenes y espaciado **desconocidos** (CSS e `<img>` no presentes en la captura) | E-PRY-51…60 |
| 9 | Dispositivos de confianza y conversión (FAQ, garantías, riesgo, urgencia, chat) | FAQ, chat, garantías, textos legales | **Respondida** | E-PRY-21, 22, 39, 40, 42 |
| 10 | Debilidades | Todo lo anterior | **Respondida** | §12 |
| 11 | Ideas transferibles a SLG | Síntesis + alcance SLG (`planning/scope.md`) | **Respondida** | §13 |

---

## 3. Ledger de evidencia

Fuentes abreviadas: **H** = https://prayaga.biz/ · **S** = /soluciones/ · **AI** =
/soluciones/artificial-intelligence-2/ · **BA** = /soluciones/business-analytics/ · **N** =
/nosotros/ · **C** = /contacto/ · **B** = /blog/ · **H-html** = HTML renderizado de la home.

| ID | Tipo | Fuente | Cita | Hallazgo |
|---|---|---|---|---|
| E-PRY-01 | OBS | H · slider hero, slide 1 (H2) | "Datos en decisiones accionables" | El hero no es un H1 fijo sino un slide H2 rotativo. |
| E-PRY-02 | OBS | H · slider hero, slide 1 (descripción) | "Convierte datos fragmentados en decisiones inteligentes en tiempo real, impulsadas por IA, que reducen el trabajo manual y aceleran el ROI." | Subtítulo: problema (datos fragmentados) + resultado (menos trabajo manual, ROI). Sin destinatario. |
| E-PRY-03 | OBS | H · slider hero, ambos slides | "Inicia tu diagnóstico de Data & AI" | CTA de hero orientado a diagnóstico; slide 1 enlaza a `#nosotros`, slide 2 a `/contacto/` (destinos inconsistentes). |
| E-PRY-04 | OBS | H · slider hero, slide 2 | "Datos conectados, sin fricción" / "Unifica fuentes, elimina silos y convierte datos dispersos en una base confiable para analítica e IA." | Segundo mensaje de hero compite con el primero. |
| E-PRY-05 | OBS | H · primera sección tras hero (H1) | "¿Tus datos están frenando tus decisiones?" | El único H1 de la home es una pregunta-dolor. |
| E-PRY-06 | OBS | H · 4 icon-box bajo el H1 | "Sin una ruta clara hacia IA y automatización — Muchas organizaciones quieren adoptar IA, pero no tienen claro por dónde empezar." | Cuatro dolores en lenguaje de cliente: datos desconectados, reportes manuales, poca visibilidad, sin ruta a IA. |
| E-PRY-07 | OBS | H · "Nuestras Líneas de Negocios" | "En Prayaga contamos con seis líneas de negocio para potenciar tus datos" | Oferta = 6 líneas con prefijo de marca "Prayaga …". |
| E-PRY-08 | INF | H, S · tarjetas de líneas | "Implementamos Microsoft Fabric, una arquitectura unificada en la nube…" | Las líneas están nombradas por **tecnología/capacidad**, no por resultado ni por comprador. Sin paquetes, duración ni precio en ninguna página capturada. |
| E-PRY-09 | OBS | H · "Nosotros" (H1) | "Desde 2009, Prayaga ha ayudado a más de 80 empresas en Latinoamérica y Estados Unidos…" | Prueba agregada: año + nº de empresas + geografía. |
| E-PRY-10 | OBS | H · "Nosotros" | "Prayaga, de origen hindú, representa la conexión de ríos." | Historia de nombre usada como metáfora del servicio (conectar fuentes). |
| E-PRY-11 | OBS | N · "¿Cómo nació PRAYAGA?" | "En el 2001, Magali y Ricardo observaron que las organizaciones implementaban soluciones analíticas que no iban acorde…" | Origen narrado con fundadores por nombre de pila; año 2001 ≠ 2009 de la home. |
| E-PRY-12 | OBS | H · "Nuestro Equipo" | "Magali Sevillano — CEO y fundadora de Prayaga" | Equipo con nombre y cargo (5 en home, 8 en /nosotros/), incluyendo puestos administrativos. |
| E-PRY-13 | OBS | H · "Casos de Éxito" (carrusel) | "Con un roadmap analítico, se estructuraron los proyectos de datos en Pan American Silver. Se implementó un Data Warehouse…" | 5 casos con cliente nombrado, sector, país (emoji bandera) y resultado narrado. |
| E-PRY-14 | OBS | H · "Casos de Éxito" (carrusel) | "Ver video" | Cada caso remite a un vídeo en popup de Elementor. |
| E-PRY-15 | OBS | H · "Casos de Éxito" (segundo bloque, flip-box) | "PROBLEMA Laboratorio Farmacéutico con presencia en Perú y Bolivia… SOLUCIÓN En Prayaga desarrollamos una aplicación web…" | Segundo bloque de casos anónimos con formato Problema/Solución; el texto aparece duplicado en DOM. |
| E-PRY-16 | INF | H · ambos bloques de casos | "…agilizó las transacciones comerciales, aumentó la eficiencia, personalizó las búsquedas…" | Ningún caso aporta una cifra de resultado (tiempo, coste, %). Resultados cualitativos. |
| E-PRY-17 | OBS | H-html · widgets `counter` | prefijo "+", valores 20 / 80 / 250; etiquetas "Años", "Empresas", "Proyectos" | Contadores animados +20 años, +80 empresas, +250 proyectos. |
| E-PRY-18 | OBS | H-html · `image-carousel` ×2 | "Empresas que confiaron en nosotros" / "Tecnologías y Partners" | Carrusel de 10 logos de clientes (8 visibles en escritorio) y 5 de partners, ambos en autoplay. Logos concretos: UNK. |
| E-PRY-19 | OBS | H · formulario `#formulario-home` | "Déjanos tus datos y nos contactaremos contigo a la brevedad posible." | Formulario a mitad de página (tras "Nosotros"). |
| E-PRY-20 | OBS | H-html · Contact Form 7 | campos `your-name`, `your-company`, `your-position`, `your-telephone`, `your-email`, `aceptar` | 5 campos + casilla de términos + reCAPTCHA: fricción media-alta para un primer contacto. |
| E-PRY-21 | OBS | H · FAQ (accordion) | "No termino de entender lo que ofrecen, ¿brindan sistemas y programas?" | La FAQ recoge explícitamente la confusión del visitante sobre la oferta. |
| E-PRY-22 | OBS | H · FAQ | "¿Es necesario adquirir la totalidad de los servicios ofrecidos?" — "Cada línea de negocio es independiente…" | FAQ usada para reducir miedo a compra grande (modularidad). |
| E-PRY-23 | OBS | H · banda CTA | "Nos encontramos en un entorno de cambios acelarados." | Errata ("acelarados") en un bloque de conversión; repetido en /nosotros/. |
| E-PRY-24 | OBS | S · H1 | "Soluciones de Analítica de Datos para Empresas Inteligentes" | Página índice de servicios con H1 más claro que la home. |
| E-PRY-25 | OBS | S, BA · "¿Por qué Prayaga?" | "Servicio integral — 6 líneas de negocio integradas para transformar tus datos en decisiones" | Diferenciadores genéricos: Servicio integral, Calidad, Personalización, Equipo. |
| E-PRY-26 | OBS | BA · "¿Te enfrentas a estos desafíos?" | "Tomar decisiones a ciegas — Las acciones se basan en intuición mas que en datos claros…" | Página de servicio abre con 5 desafíos. |
| E-PRY-27 | OBS | BA · desafío 5 | "Ventas dice 100, finanzas dice 90. Si cada areá muestra cifras distintas, hay un problema de fondo" | El dolor más concreto y memorable de todo el sitio (escena reconocible). |
| E-PRY-28 | OBS | AI · beneficios | "Automatiza tareas y reduce hasta 40% los gastos operativos" | Única cifra de impacto; sin fuente, sin caso asociado. |
| E-PRY-29 | OBS | BA · "¿Qué tipo de analítica necesita tu negocio?" | "Analítica Descriptiva … Diagnóstica … Predictiva … Prescriptiva" | Tipología en escalera de madurez como herramienta de autodiagnóstico. |
| E-PRY-30 | OBS | AI · "¿Dónde genera más impacto la IA en tu negocio?" | "Atención al cliente · Marketing y ventas · Finanzas y riesgos · Operaciones y logística" | Casos de uso por área funcional. |
| E-PRY-31 | OBS | S, BA, AI · "¿Cómo lo hacemos?" | "01 Evalúa y Planifica · 02 Construye e Inicia · 03 Accede y Automatiza · 04 Soporte Continuo" | Método en 4 pasos numerados, sin nombre propio ni duración ni entregables. |
| E-PRY-32 | OBS | S, BA, AI · orden en DOM | "### 01 … ### 02 … ### 04 … ### 03" | El paso 04 precede al 03 en el DOM. |
| E-PRY-33 | INF | E-PRY-32 | — | Probable rejilla 2×2 o zigzag que se lee bien en escritorio pero se reordenaría mal en móvil o lector de pantalla. Comportamiento visual real: UNK. |
| E-PRY-34 | OBS | AI · desafío 5 | "Impacto difícil de medir — Las soluciones no están alineadas a indicadores de negocio, por lo que su valor es difuso o no comprobable" | Reconocen el dolor de la medición, pero el propio sitio no mide resultados (ver E-PRY-16). |
| E-PRY-35 | OBS | N · Visión | "Queremos convertirnos en la mejor empresa consultora en análisis de datos y automatización inteligente…" | Tono institucional y de superlativo genérico. |
| E-PRY-36 | OBS | H, N · "Nuestra Experiencia" | "Contamos con más de 20 años de experiencia en el mercado local e internacional y un equipo senior…" | "+20 años" choca con "Desde 2009" (≈17 años en 2026). Contradicción numérica. |
| E-PRY-37 | OBS | BA, AI · hero de servicio | "Agenda tu asesoría gratuita" (href `#`) | CTA de reserva cuyo destino en la captura es `#`. Si abre popup o calendario: UNK. |
| E-PRY-38 | OBS | BA, AI · cierre | "¿No agendaste tu cita?" | El cierre presupone un calendario que la captura no muestra. |
| E-PRY-39 | OBS | H, C · enlaces | "Contáctanos Ahora" → `#hs-chat-open`; "Accede a nuestro Chat aquí" | El chat de HubSpot funciona como CTA principal en varios botones. |
| E-PRY-40 | OBS | H-html · iframes | `iamgloria.ai/gloria-injected-chat/…mode=bubble` | Segundo chat (asistente de IA de terceros "Gloria") además del de HubSpot. |
| E-PRY-41 | OBS | H · links | `api.whatsapp.com/send/?phone=51980547249&text=Hola, he visto su página web…` | WhatsApp con mensaje prellenado como canal adicional. |
| E-PRY-42 | OBS | H-html · iframes `google_maps` ×2 | "Conoce Nuestra Oficina" — Lima y "1423 ponce de leon blvd … coral gables, fl" | Dirección física doble (Perú/EE.UU.) como señal de solidez. |
| E-PRY-43 | INF | E-PRY-03, 19, 37, 39, 40, 41 | — | ≥12 CTA en la home hacia 5 destinos distintos (form, chat HubSpot, chat Gloria, WhatsApp, /contacto/): sin un único siguiente paso. |
| E-PRY-44 | OBS | S · meta description | "…cuenta con siete líneas de negocio…" | La meta dice 7 líneas; la página muestra 6. |
| E-PRY-45 | OBS | AI · meta description | "Con Planning and Forecasting desarrollamos soluciones para la planificación y el control de las operaciones financieras…" | La meta de la página de IA es de otro servicio (copiada). |
| E-PRY-46 | OBS | C · subtítulo | "Unificamos data de diferentes fuentes de información que proporcionan una visión integral del negocio." | El subtítulo de Contacto es el texto de Data Integration (plantilla sin adaptar). |
| E-PRY-47 | OBS | B · entrada más reciente | "Prayaga 26 de octubre de 2022" | Blog sin publicaciones desde hace 4 años; temas de 2021–2022 ("Tendencias … para el 2022"). |
| E-PRY-48 | OBS | H-html · title | "Potenciamos tus Datos con Soluciones de Automatización" | El `<title>` de la home habla de "automatización"; el hero, de "decisiones". Mensaje dual. |
| E-PRY-49 | OBS | H · URLs de servicios | `/soluciones/data-integration-2/`, `/lineas-de-negocio/cloud-services/` | Slugs con "-2" y dos árboles (`/soluciones/` y `/lineas-de-negocio/`) para lo mismo. |
| E-PRY-50 | INF | E-PRY-01…07 | — | Los primeros tres bloques no dicen **para quién** (sector, tamaño, rol). El destinatario se infiere solo por logos/casos (universidades peruanas, minería). |
| E-PRY-51 | OBS | H-html · `slides` data-settings | `"autoplay":"yes","autoplay_speed":5000,"transition":"slide","transition_speed":500` | Hero en carrusel autoplay de 5 s con flechas. |
| E-PRY-52 | OBS | H-html · `nested-carousel` data-settings | `"autoplay":"yes","autoplay_speed":5000,…"arrows":"yes","pagination":"bullets"` | Casos en carrusel autoplay (1 slide en móvil, 2 en tablet). |
| E-PRY-53 | OBS | H-html · clases | `elementor-widget-flip-box` (17), `elementor-flip-box--effect-fade`, `--effect-zoom` | Líneas de negocio, equipo y casos anónimos usan tarjetas que giran o se funden al hover: el contenido clave queda oculto en la cara trasera. |
| E-PRY-54 | OBS | H-html · data-settings | `"animation":"fadeIn"` (3) | Animaciones de entrada `fadeIn` puntuales. |
| E-PRY-55 | OBS | H-html · widgets | `icon-box` 4, `counter` 3, `accordion` 1, `video` 1, `image-carousel` 2, `eael-feature-list` 1 | Inventario de componentes: tarjetas con icono, contadores, acordeón, vídeo, carruseles de logos, lista de rasgos. |
| E-PRY-56 | OBS | H-html · scripts/ids | `hs-web-interactives-*`, `fb-pxl-ajax-code`, `_hjSafeContext`, `tp-language` | Stack de marketing: HubSpot, píxel de Facebook, Hotjar, TranslatePress (ES/EN). |
| E-PRY-57 | OBS | H-html · atributos inline | `#425b76` (×7), `#15295a` (×3), `#fafbff`, `#0073c5`, `#f1faf8` | Únicos colores visibles: azules marino/acero y fondos casi blancos. La paleta global vive en CSS no capturado. |
| E-PRY-58 | UNK | H-html · `<head>` | `<head><title>…</title>` (sin `<style>` ni `<link>` de fuentes) | Tipografía, escala, espaciado y paleta completa: **no establecidos**. |
| E-PRY-59 | OBS | S · imágenes | `Beneficio-DI-3.png`, `Beneficio-CLO-6.png` (2022/07) | Iconos de servicio en PNG de 2022; en Nosotros, fotos de equipo reales (`Equipo-Prayaga-reunion-2.jpg`, 2023). |
| E-PRY-60 | UNK | H · hero y casos | — | Imágenes de fondo del slider, aspecto de logos y vídeos: **no visibles** en la captura (el actor elimina `<img>` y estilos). |

---

## 4. Arquitectura de la home (sección por sección)

Orden extraído del DOM renderizado (H-html). "Trabajo" = qué intenta conseguir la sección.

| # | Sección | Componente | Trabajo que hace | Evidencia |
|---|---|---|---|---|
| 0 | Cabecera: Nosotros · Soluciones (6) · Blog · Contacto · Mesa de ayuda · EN · WhatsApp | menú WP | Navegación por categorías internas; "Mesa de ayuda" mezcla soporte a clientes con captación. | links de H |
| 1 | **Hero rotativo** — 2 slides, mismo CTA "Inicia tu diagnóstico de Data & AI" | `slides` autoplay 5 s | Promesa (datos → decisiones con IA) y primer CTA. Dos mensajes compiten. | E-PRY-01…04, 51 |
| 2 | **Dolor** — H1 "¿Tus datos están frenando tus decisiones?" + 4 dolores | 4 `icon-box` | Identificación: el visitante se reconoce. **La sección más eficaz.** | E-PRY-05, 06 |
| 3 | **Oferta** — "Nuestras Líneas de Negocios", 6 tarjetas | 6 `flip-box` | Catálogo de capacidades; la descripción larga está en la cara oculta. | E-PRY-07, 08, 53 |
| 4 | **Nosotros** (H1 #2) — "Desde 2009… más de 80 empresas", metáfora de los ríos, 3 rasgos, vídeo | `eael-feature-list` + `video` | Credibilidad institucional y relato de marca. | E-PRY-09, 10 |
| 5 | **Formulario** — "Descubre como convertir tus datos en mejores decisiones" | Contact Form 7 (5 campos) | Captura temprana para quien ya está convencido. | E-PRY-19, 20 |
| 6 | **Equipo** — 5 personas + "Ver Más" | 5 `flip-box` | Humanizar, mostrar que hay gente real (incluye administración). | E-PRY-12 |
| 7 | **Banda CTA** — "Transforma tu empresa al siguiente nivel" + 2 botones | botones | Recordatorio de conversión (chat y formulario). | E-PRY-23, 39 |
| 8 | **Casos con nombre** — 5 casos, "Ver video" | `n-carousel` autoplay | Prueba social específica (cliente, sector, país). | E-PRY-13, 14, 52 |
| 9 | **Casos anónimos** — Problema/Solución | `flip-box` | Profundidad técnica (FTP, DWH, MicroStrategy). | E-PRY-15 |
| 10 | **Experiencia** — "+20 años / +80 empresas / +250 proyectos" | 3 `counter` | Prueba cuantitativa agregada. | E-PRY-17, 36 |
| 11 | **Logos de clientes** (10) | `image-carousel` autoplay | Prueba social por marca. | E-PRY-18 |
| 12 | **Tecnologías y Partners** (5) | `image-carousel` autoplay | Credencial por asociación tecnológica. | E-PRY-18 |
| 13 | **Oficina** — 2 mapas | `google_maps` ×2 | Solidez física, doble presencia LatAm/EE.UU. | E-PRY-42 |
| 14 | **FAQ** — 5 preguntas | `accordion` | Objeciones: alcance (ERP/SAP), modularidad, "no entiendo qué ofrecen". | E-PRY-21, 22 |
| — | Flotantes: chat HubSpot, chat Gloria (IA), banner HubSpot | iframes / scripts | Conversación inmediata. | E-PRY-39, 40, 56 |

**Lectura del arco.** Problema (2) → Oferta (3) → Quiénes (4) → **Pedido** (5) → Gente (6) → Pedido
(7) → **Prueba** (8–12) → Lugar (13) → Objeciones (14). [INF] El formulario aparece **antes** que
toda la prueba: se pide el dato antes de demostrar. La prueba fuerte (casos con nombre) está en el
puesto 8 de 14 y dentro de un carrusel automático, es decir, tarde y en movimiento. Hay dos H1
("¿Tus datos…?" y "Nosotros"), lo que diluye la jerarquía.

---

## 5. Propuesta de valor

- **Hero literal** (slide 1): "Datos en decisiones accionables" + "Convierte datos fragmentados en
  decisiones inteligentes en tiempo real, impulsadas por IA, que reducen el trabajo manual y
  aceleran el ROI." [E-PRY-01, 02]. Slide 2: "Datos conectados, sin fricción" [E-PRY-04].
- **Title de la home**: "Potenciamos tus Datos con Soluciones de Automatización" [E-PRY-48].
- **H1 real**: "¿Tus datos están frenando tus decisiones?" [E-PRY-05].

| Dimensión | ¿Se entiende en los primeros segundos? | Juicio |
|---|---|---|
| **Problema** | Sí: datos fragmentados, trabajo manual, falta de tiempo real. | Claro, pero genérico (vale para cualquier consultora de BI). |
| **Resultado** | A medias: "decisiones", "ROI", "menos trabajo manual", sin magnitud ni plazo. | Abstracto. |
| **Para quién** | **No.** Ni sector, ni tamaño, ni rol (CFO, COO, TI). | Ausente [E-PRY-50]. |
| **Por qué ellos** | Tarde (sección 4 y 10) y con cifras inconsistentes. | Débil. |
| **Cómo** | No en la home; solo en las páginas de servicio (método 01–04). | Escondido. |

[INF] Tres formulaciones conviven (decisiones accionables / datos conectados / automatización)
y el slider las alterna, así que el visitante puede ver un mensaje distinto según el momento en que
llegue. La rapidez real de comprensión con la página renderizada es **UNK** (no hay captura visual),
pero en el texto el "qué" se entiende en un vistazo y el "para quién" no se entiende nunca.

---

## 6. Oferta

- **Unidad de oferta**: "línea de negocio" (6), todas con el prefijo "Prayaga …": Business Analytics
  + AI · Cloud Services · Data Integration · Artificial Intelligence · IoT Software Development ·
  Data Governance [E-PRY-07].
- **Criterio de agrupación**: por **disciplina técnica**. Cloud Services se ancla a un producto
  concreto (Microsoft Fabric) [E-PRY-08]. IoT es una línea de desarrollo de software que no encaja
  con el resto (datos/IA).
- **Paquetización**: ninguna. Ni niveles, ni fases con nombre comercial, ni duración, ni precio, ni
  "desde". La FAQ aclara la modularidad: "Cada línea de negocio es independiente" [E-PRY-22].
- **Puerta de entrada**: "diagnóstico de Data & AI" (hero) y "asesoría gratuita" (servicios)
  [E-PRY-03, 37]. Es la única pista de producto de entrada, pero no se describe (qué incluye, cuánto
  dura, qué entregable).
- **Dentro de cada servicio** (BA, AI): desafíos → por qué Prayaga → beneficios → tipología (4
  tipos de analítica / 4 áreas de impacto) → método → tecnologías → casos → formulario
  [E-PRY-26…31]. La **tipología** es la mejor herramienta de oferta: deja que el visitante se ubique
  ("Descriptiva → Prescriptiva") [E-PRY-29].
- **Arquitectura de URLs**: dos árboles (`/soluciones/` y `/lineas-de-negocio/`) y slugs con `-2`
  [E-PRY-49]. [INF] La oferta se reorganizó sin reordenar la información.

---

## 7. Prueba

| Tipo de prueba | Qué hay | Concreción | Ubicación | Evidencia |
|---|---|---|---|---|
| Casos con nombre | American Dream (EE.UU.), UPC, UARM, PUCP, Pan American Silver (Perú) | **Alta en identidad** (nombre, sector, país), **baja en resultado** (sin cifras) | Home #8 (carrusel), repetidos en BA/AI | E-PRY-13, 16 |
| Vídeo de caso | "Ver video" por caso (popup) | Contenido: UNK | Home #8 | E-PRY-14 |
| Casos anónimos | Farmacéutica Perú/Bolivia, universidad, telco pública | Técnica (FTP, DWH, MicroStrategy), sin resultado medible | Home #9 (flip-box) | E-PRY-15 |
| Cifras agregadas | +20 años · +80 empresas · +250 proyectos | Redondas, **contradictorias** con "Desde 2009" y "En el 2001" | Home #4 y #10, /nosotros/ | E-PRY-09, 11, 17, 36 |
| Cifra de impacto | "hasta 40% los gastos operativos" | **Sin fuente ni caso** | AI · beneficios | E-PRY-28 |
| Logos | 10 clientes, 5 partners | Identidades: UNK (imágenes no capturadas) | Home #11–12 (carrusel autoplay) | E-PRY-18 |
| Fundadores / equipo | Nombre + cargo, historia de origen | Media: humaniza, pero sin trayectoria ni credenciales | Home #6, /nosotros/ | E-PRY-11, 12 |
| Certificaciones | "Staff experto, certificado…" | **Afirmación sin certificación nombrada** | S, BA | E-PRY-25 |
| Testimonios citados | **Ninguno** en texto | — | — | (ausencia observada) |
| Presencia física | Lima + Coral Gables, mapas, teléfonos, horario | Alta | Home #13, /contacto/ | E-PRY-42 |

[INF] La prueba es **amplia pero no profunda**: mucha variedad de señales y ninguna que cierre
el círculo "problema → intervención → número". Lo irónico es que en la página de IA ellos mismos
señalan como dolor del cliente que el valor "es difuso o no comprobable" [E-PRY-34].

---

## 8. Método

- **Existe** y se repite idéntico en /soluciones/, BA y AI: **01 Evalúa y Planifica → 02 Construye e
  Inicia → 03 Accede y Automatiza → 04 Soporte Continuo** [E-PRY-31].
- **Sin nombre propio** (no es "el método Prayaga"), sin duración, sin entregables por fase y sin
  criterio de salida. En AI se adapta el texto ("Creamos un roadmap priorizado de implementación")
  [captura AI].
- **Presentación**: números grandes como encabezado (H3 "01"…"04") + título + párrafo. En el DOM el
  orden es 01, 02, 04, 03 [E-PRY-32], lo que sugiere una rejilla 2×2 o un zigzag visual [E-PRY-33,
  INF]. El aspecto real (líneas conectoras, iconos) es **UNK**.
- **No aparece en la home.** El visitante de la home nunca ve el "cómo".
- Elemento metodológico complementario: la **escalera de analítica** (Descriptiva → Diagnóstica →
  Predictiva → Prescriptiva) [E-PRY-29], que funciona como modelo de madurez implícito.

---

## 9. CTAs

| Texto | Destino / mecanismo | Dónde | Evidencia |
|---|---|---|---|
| "Inicia tu diagnóstico de Data & AI" | `#nosotros` (slide 1) · `/contacto/` (slide 2) | Hero ×2 | E-PRY-03 |
| (formulario) "Descubre como convertir tus datos en mejores decisiones" | CF7, 5 campos + términos + reCAPTCHA | Home #5; repetido en S | E-PRY-19, 20 |
| "Ver Más" | /nosotros/ | Equipo | captura H |
| "Contáctanos Ahora" | `#hs-chat-open` (chat HubSpot) | Banda CTA, /nosotros/ ×2 | E-PRY-39 |
| "CONTACTANOS AHORA" | `#formulario-home` | Banda CTA | captura H |
| "VER MÁS" ×6 | páginas de servicio | Tarjetas de líneas | captura H |
| "Ver video" ×5 | popup Elementor | Casos | E-PRY-14 |
| "Agenda tu asesoría gratuita" | `#` (comportamiento UNK) | Hero de BA/AI | E-PRY-37 |
| "Habla con un experto en analítica" / "…en AI" | `#` | Mitad de BA/AI | captura BA/AI |
| "¿No agendaste tu cita?" + formulario | CF7 | Cierre BA/AI | E-PRY-38 |
| "Accede a nuestro Chat aquí" | chat HubSpot | /contacto/ | E-PRY-39 |
| Burbuja de chat "Gloria" | iframe iamgloria.ai | Flotante global | E-PRY-40 |
| WhatsApp (mensaje prellenado) | api.whatsapp.com | Cabecera/flotante (ubicación exacta UNK) | E-PRY-41 |
| Suscripción al blog | formulario | /blog/ | captura B |

**Recuento** [INF, E-PRY-43]: la home tiene ≥12 CTA con 5 mecanismos distintos. **Fricción**: el
formulario pide cargo y teléfono además de email y empresa; el CTA de "diagnóstico" promete un
producto que no se describe en ninguna parte; "Agenda" no lleva a un calendario visible. No hay
lead magnet (descargable) ni una oferta de entrada definida con alcance.

---

## 10. Tono de voz y vocabulario

- **Registro**: tuteo comercial ("tus datos", "tu negocio"), mezcla de **consultivo** en los dolores
  ("no tienen claro por dónde empezar") y **promocional genérico** en los bloques institucionales
  ("Transforma tu empresa al siguiente nivel", "la mejor empresa consultora") [E-PRY-06, 23, 35].
- **Jerga**: alta densidad de términos técnicos en inglés y español mezclados: *Data & AI*, *insights*,
  *silos*, DWH, ETL, Microsoft Fabric, MicroStrategy, FTP. Nombres de servicio en inglés en un sitio en
  español ("Artificial Intelligence", "IoT Software Development").
- **Nivel de "hype" de IA**: **moderado**. "Impulsadas por IA", "tiempo real" se repiten como muletilla
  (15 apariciones de "tiempo real" en el DOM de la home, contando los duplicados de carrusel), pero la IA se baja a casos de uso concretos
  (chatbots, scoring, mantenimiento predictivo) [E-PRY-30]. El "hasta 40%" sí es *hype* sin respaldo
  [E-PRY-28].
- **Mejor frase**: "Ventas dice 100, finanzas dice 90." [E-PRY-27]: una escena reconocible, no una abstracción.
- **Peores**: "Potenciamos tu negocio con el poder de los datos", "Estándares de excelencia en cada
  solución implementada" [E-PRY-25]: intercambiables con cualquier competidor.
- **Cuidado editorial**: bajo (erratas "acelarados", "areá", "mas" sin tilde, "transformalos")
  [E-PRY-23, 27].

---

## 11. Presentación visual

> Límite fuerte: el HTML devuelto no incluye CSS, `<img>` ni `<svg>` [E-PRY-58, 60]. Lo que sigue
> distingue lo **observado** (componentes y configuración de motion) de lo **desconocido**.

| Aspecto | Observado | Desconocido |
|---|---|---|
| **Plataforma** | WordPress + Elementor (+Pro: slides, nested carousel, flip-box), HTMega, Essential Addons, CF7, TranslatePress [E-PRY-55, 56] | Tema base |
| **Tipografía** | — (solo `font-family:tahoma` en un atributo aislado) | Familias, pesos, escala: **UNK** |
| **Color** | Inline: azul marino `#15295a`, azul acero `#425b76`, azul `#0073c5`, fondos `#fafbff` / `#f1faf8` [E-PRY-57] | Paleta global, color de CTA: **UNK** |
| **Densidad** | 14 secciones en la home, ~17 flip-boxes, 3 carruseles, 2 mapas, 1 vídeo, 1 formulario, FAQ [E-PRY-55] → **densidad alta** (INF) | Espaciado / ritmo vertical: **UNK** |
| **Imagen** | Fotos reales de equipo en /nosotros/ (2023); iconos PNG de 2022 en servicios; ilustración SVG en Contacto; miniaturas de stock en el blog (p. ej. Unsplash) [E-PRY-59] | Fondos del hero, estilo de logos: **UNK** |
| **Iconografía** | Font Awesome residual (`check`, `minus`, `caret-square-down`) en listas y acordeón | Estilo de iconos de los icon-box: **UNK** |
| **Motion (configurado)** | Hero autoplay 5 s/slide 500 ms; casos autoplay 5 s; 2 carruseles de logos autoplay 5 s; flip-box con efecto fade/zoom; 3 `fadeIn` de entrada; contadores animados [E-PRY-51…54, 17] | Cómo se ve realmente, si respeta `prefers-reduced-motion`: **UNK** (no hay indicio en el DOM) |
| **Componentes** | Slider, icon-box, flip-box, feature-list, vídeo, formulario, contadores, carruseles de logos, mapas, acordeón | — |

[INF] El lenguaje visual es el de una **plantilla corporativa de Elementor**: cada idea va en un
widget distinto, mucho movimiento automático e información clave detrás de interacciones (cara
trasera de flip-box, slide 2 del hero, slides 2–5 de casos). Es lo contrario de un sistema sobrio.

---

## 12. Debilidades

1. **Sin destinatario.** Ni el hero ni el H1 dicen a quién sirven [E-PRY-50]. La FAQ "No termino de
   entender lo que ofrecen" lo confirma [E-PRY-21].
2. **Mensaje rotativo y dual.** Dos slides + un `<title>` de "automatización" = tres propuestas
   [E-PRY-01, 04, 48].
3. **Oferta = catálogo técnico.** Seis líneas por disciplina, una de ellas (IoT) fuera de foco; sin
   paquetes, fases comerciales, plazos ni precio [E-PRY-07, 08].
4. **Prueba sin números de resultado.** Casos con nombre pero sin métricas; la única cifra ("hasta
   40%") no tiene fuente [E-PRY-16, 28].
5. **Cifras de trayectoria contradictorias.** 2001 / 2009 / "+20 años" [E-PRY-11, 09, 36].
6. **Afirmaciones sin respaldo.** "Staff experto, certificado" sin certificaciones nombradas
   [E-PRY-25].
7. **Orden narrativo invertido.** Formulario (#5) antes de la prueba (#8–12); casos dentro de un
   carrusel automático [§4].
8. **Exceso de canales de CTA.** Form, chat HubSpot, chat IA Gloria, WhatsApp, /contacto/ y "Agenda"
   que apunta a `#` [E-PRY-37, 39, 40, 41, 43].
9. **Contenido oculto tras interacción.** Flip-boxes para servicios, equipo y casos; en táctil el
   *hover* no existe [E-PRY-53] (INF sobre la experiencia móvil).
10. **Movimiento automático generalizado.** 4 carruseles autoplay [E-PRY-51, 52, 18]; sin evidencia
    de soporte de movimiento reducido (UNK).
11. **Descuido editorial y de SEO.** Erratas; meta de IA copiada de "Planning and Forecasting"; meta
    de Soluciones con "siete líneas"; subtítulo de Contacto copiado; slugs `-2`; dos árboles de URL
    [E-PRY-23, 44, 45, 46, 49].
12. **Blog abandonado.** Última entrada en octubre de 2022 [E-PRY-47]: una señal de inactividad para
    una consultora que vende IA.
13. **Método invisible desde la home** y sin nombre, entregables ni duración [E-PRY-31].
14. **Duplicación de DOM** (casos y desafíos repetidos para carruseles) [E-PRY-15]: ruido para
    lectores de pantalla y para SEO (INF).

---

## 13. Ideas transferibles a SLG

Contexto SLG aplicado (de `planning/scope.md`): ramas Academy / Enterprise / Factory, páginas de
servicio con **contrato de seis secciones** y **la descarga como CTA único**, «Siguiente paso» sin
agenda embebida, página `/doctrina`, diseño `apple-design` sobrio con `prefers-reduced-motion`.

| Idea | Tal cual / adaptar / rechazar | Por qué |
|---|---|---|
| **Sección de dolores justo después del hero**, 3–4 dolores en lenguaje del cliente [E-PRY-05, 06] | **Adaptar** | Es lo que mejor funciona en Prayaga. En SLG: dolores de un comprador **nombrado** (dirección general / COO) y sin icon-box decorativo; tipografía y aire en lugar de tarjetas. |
| **Un dolor-escena concreto** tipo "Ventas dice 100, finanzas dice 90" [E-PRY-27] | **Tal cual** (el patrón, no la frase) | Una escena verificable vale más que cinco abstracciones. SLG debería tener una por rama (p. ej., "el piloto de IA que funcionó en la demo y nunca llegó a producción"). |
| **Plantilla fija de página de servicio** (desafíos → por qué → beneficios → tipología → método → casos → cierre) [E-PRY-26…31] | **Adaptar** | Coincide con el contrato A.3 de SLG (seis secciones en orden fijo). Recortar "por qué nosotros" genérico y cerrar con **un único CTA** (la descarga), no con un formulario de contacto. |
| **Tipología como autodiagnóstico** (Descriptiva → Prescriptiva) [E-PRY-29] | **Adaptar** | Encaja con `readiness` de SLG_Enterprise: una escalera de madurez de IA en 4 niveles que el lector use para ubicarse. Con criterios observables por nivel, no con adjetivos. |
| **Método numerado 01–04** [E-PRY-31] | **Adaptar** | SLG debe ir más allá: **ponerle nombre** (vinculado a la Doctrina), con duración, entregable y criterio de salida por fase, y mostrarlo **en la home**. Orden de DOM = orden de lectura (evitar el 01-02-04-03). |
| **Casos con cliente + sector + país + resultado** [E-PRY-13] | **Adaptar** | Mantener la ficha de identidad, pero **exigir una cifra de resultado y un plazo** por caso. Sin cifra verificable, no se publica. |
| **Vídeo de caso en popup** [E-PRY-14] | **Rechazar** (para v1) | Coste de producción alto y fricción. Para SLG basta con un texto de caso legible y, si existe, una cita atribuida. |
| **Contadores animados (+20 / +80 / +250)** [E-PRY-17] | **Rechazar** | La animación no aporta nada y, en Prayaga, las cifras se contradicen. Si SLG usa cifras, mejor estáticas, con fecha de corte y coherentes con el resto del sitio. |
| **Historia de nombre / origen** ("conexión de ríos") [E-PRY-10] | **Adaptar** | "Soft Landing" admite una metáfora igual de potente (aterrizaje suave de la IA en la operación). Usarla **una vez**, en /nosotros o /doctrina, no como relleno en la home. |
| **Fundadores con nombre y cargo** [E-PRY-12] | **Adaptar** | Mostrar solo a las personas que dan la cara ante el cliente, con trayectoria verificable (LinkedIn), no un organigrama con puestos administrativos. |
| **FAQ para objeciones de alcance y modularidad** [E-PRY-22] | **Adaptar** | Útil al final de las páginas de servicio ("¿necesito contratar todo?", "¿trabajáis con nuestro stack?"). Nunca una FAQ que confiese que no se entiende la oferta: eso se arregla en el hero. |
| **CTA de "diagnóstico" como puerta de entrada** [E-PRY-03] | **Adaptar** | Buena idea de producto de entrada, pero SLG debe **definirlo** (qué incluye, cuánto dura, qué entrega) y canalizarlo por la descarga o el contacto, según el contrato A.3. |
| **Slider de hero con varios mensajes** [E-PRY-01, 04, 51] | **Rechazar** | Una sola propuesta de valor, fija: para quién + problema + resultado. El autoplay viola la sobriedad y la accesibilidad. |
| **Flip-boxes para servicios, equipo y casos** [E-PRY-53] | **Rechazar** | Esconden el contenido clave y no funcionan en táctil. En SLG, el contenido va visible, en listas o tarjetas estáticas. |
| **Carruseles autoplay de casos y logos** [E-PRY-18, 52] | **Rechazar** | Movimiento no solicitado. Si hay logos, una fila estática y monocroma con pocos logos verificados. |
| **Múltiples canales de conversión** (2 chats, WhatsApp, form, agenda) [E-PRY-43] | **Rechazar** | SLG ya decidió un CTA único por página. Un chat de IA de terceros, además, contradice el posicionamiento de "implementación sobria de IA". |
| **Formulario de 5 campos con cargo y teléfono** [E-PRY-20] | **Rechazar** | SLG captura con email corporativo validado (D-16). Menos campos y más valor a cambio (el documento). |
| **Doble presencia física con mapas** [E-PRY-42] | **Adaptar** | La dirección y el país dan confianza. Basta con texto en el pie/contacto; dos iframes de Google Maps son peso y rastreo innecesarios. |
| **Cifras de impacto genéricas** ("hasta 40%") [E-PRY-28] | **Rechazar** | Contradice la sobriedad y la credibilidad. Solo cifras con fuente (caso propio o estudio citado). |
| **Blog como "Hub de información"** [E-PRY-47] | **Adaptar** | Solo si hay cadencia sostenible. Mejor pocas piezas de doctrina y fechadas que un hub parado desde 2022. Lección: un blog muerto resta credibilidad. |
| **Prefijo de marca en cada servicio** ("Prayaga X") [E-PRY-07] | **Adaptar** | SLG ya usa `SLG_Academy / Enterprise / Factory`. Mantener el prefijo para las ramas, **no** para cada servicio, y nombrar los servicios por resultado, no por tecnología. |
| **Tecnologías y partners** [E-PRY-18] | **Adaptar** | Solo si hay partnership real y verificable. Si no, mejor mencionar el stack en el texto del método, sin logos. |

---

## 14. Desconocidos y límites de la captura

- **Sin vista renderizada.** Las herramientas de navegador de REA (CDP) no pueden cargar el sitio
  por la política de red del contenedor. Por tanto **no se ha visto** la página: ni el *above the
  fold*, ni la jerarquía tipográfica real, ni el contraste, ni el espaciado [E-PRY-58, 60].
- **HTML saneado.** El actor de Apify devolvió un HTML sin `<style>`, sin `<link>` de fuentes, sin
  `<img>` y sin `<svg>`. Tipografía, paleta global, imágenes del hero y logos: **UNK**. Los colores
  listados son solo los que aparecen en atributos inline [E-PRY-57].
- **Motion**: solo se conoce la **configuración** declarada (autoplay, velocidades, efectos de
  flip-box, `fadeIn`), no su ejecución, su suavidad ni si respeta `prefers-reduced-motion`
  [E-PRY-51…54].
- **Comportamiento de CTAs con `#`** ("Agenda tu asesoría gratuita", "Habla con un experto"):
  probablemente popups de Elementor o HubSpot, pero **UNK** [E-PRY-37].
- **Contenido de los vídeos** de casos y del vídeo institucional: **UNK** [E-PRY-14].
- **Identidad de los 10 logos de clientes y 5 partners**: **UNK** [E-PRY-18].
- **Versión EN** (`/en/`) y páginas de Cloud Services, Data Integration, IoT y Data Governance: **no
  capturadas** (fuera del presupuesto de 4–6 subpáginas). Se asume la misma plantilla que BA/AI por
  enlaces y estructura compartida (INF, no verificado).
- **Mesa de ayuda** (`/mesa-de-ayuda/`) y libro de reclamaciones: no capturados.
- **Ubicación exacta del enlace de WhatsApp** (cabecera o botón flotante): **UNK** [E-PRY-41].
- **Experiencia móvil**: las conclusiones sobre flip-boxes en táctil y el orden 01-02-04-03 son
  **inferencias** a partir del DOM y de los `data-settings` responsive, no observaciones [E-PRY-33].
