---
type: asset-profile
title: marketing-website
---

# Asset Profile: marketing-website

Una web **informativa** de cliente, construida sobre el motor de `slg_website` —con o sin área
privada—. El motor ya está hecho y probado; lo que cambia de un cliente a otro es **su ficha**
(`site.config.ts`) y **su contenido** (`content/`). Este perfil existe para que una web así no
arrastre el aparato de un sistema grande: ni modelo de datos que diseñar, ni API que documentar, ni
decenas de unidades. Se diseña la ficha, se escribe el contenido, se pasan seis gates y se publica.

Dos variantes, las dos del §2 de `docs/PLAYBOOK_REPLICACION.md`:

| Variante | Qué lleva | Módulos de la ficha |
|---|---|---|
| **A · Informativa** | Web pública en uno o dos idiomas, formulario de contacto; descargas y blog si el intake los pide | `intranet: false` · `api: false` |
| **B · Con área privada** | A + portal para los clientes del cliente, con invitaciones y entregables | `intranet: true` · `api: false` |

## design_docs
Los mínimos. El motor trae su propio diseño (`design_docs/` de la plantilla) y no se reescribe.
- ficha_del_sitio: `site.config.ts` — marca, dominio, idiomas, módulos, menú, oferta (ejes → líneas → servicios, slugs y rutas), fotos, nomenclatura. Sale del intake (`commands/leer-intake.md`) — [HIGH]
- mapa_de_contenido: la lista de registros de `content/` que el sitio necesita (páginas fijas, un registro de servicio por idioma, descargas, legales), cada uno con su estado de copy `temporal` o `aprobado` — [MEDIUM]
- pendientes_con_el_cliente: lo que el intake dejó abierto y quién lo resuelve; se cierra antes de publicar — [LIGHT]
- acceso_privado: solo variante B — quién es el primer administrador, qué roles existen y a quién se invita el primer día — [LIGHT]

## foundation_unit_examples
- Repositorio `web_<cliente>` creado desde la plantilla
- Base de datos gestionada con sus migraciones y un contenedor de archivos privado
- Proyecto en la plataforma de despliegue, conectado al repositorio, con las variables no secretas
- Secretos generados y cargados sin pasar por la conversación (`sitio:secretos`, paso 8 del §3)
- Marca aplicada: logo en `public/marca/`, fotos en `public/fotos/*.webp`, colores en la ficha

## deliverable_unit_completeness
Un DU es **una página, o un grupo de páginas del mismo tipo** (los servicios de una línea). Está
terminado solo cuando:
- Se sirve en su ruta, **en cada idioma de la ficha**, en la vista previa desplegada
- Su texto viene de `content/` y declara `copy: temporal` o `copy: aprobado`; ningún `[PENDIENTE]`
- Se llega a ella desde el menú o desde su página madre, y aparece en el sitemap
- Si lleva formulario, un envío de prueba **llega al buzón del cliente** (la variable del buzón de contactos, ver `commands/leer-intake.md` §4)
- Variante B: el responsable recibe su invitación, entra y ve su área
- Pasa el `quality_gate` de este perfil

Y **la web** está terminada cuando, además, el cliente aprobó la vista previa por escrito (correo 3
de `docs/intake/correos.md`) y el dominio responde con *Valid Configuration*.

## quality_gate
Los gates D1–D6 de `docs/gates.md`, que ya existen como órdenes, más la captura. Se aplican a cada DU
y, completos, antes de publicar. El resultado se anota en `docs/work_log.md`.

| Gate | Orden | Qué tiene que dar |
|---|---|---|
| D1 Rendimiento | `npm run check:lighthouse` · `npm run check:js-budget` | Lighthouse móvil ≥ 90 en las cuatro categorías; JS inicial < 150 KB |
| D2 Accesibilidad | `npm run check:contraste` · checklist manual de `docs/gates.md` §D2 | Contraste AA con los colores **del cliente**; foco visible |
| D2b Marca | `npm run check:terceros` · pasada por pantalla | Ninguna tipografía ni script de terceros no declarado; logo sobre claro y sin deformar |
| D3 Motion | `npm run check:motion` | Solo `transform` y `opacity` |
| D4 i18n | `npm run check:pairs` · `npm run check:seo` · `npm run check:armazon` | Pares completos; `hreflang` recíproco (si hay dos idiomas) |
| D5 Contenido | `npm run check:cadenas` · `npm run check:nomenclature` · `npm run check:copy` · `npm run check:pending -- --strict` | Cero texto en el armazón; nombres de la oferta literales; cero `[PENDIENTE]` antes de `main` |
| D6 SEO | `npm run check:seo` | Metadatos únicos, Open Graph, sitemap, robots, 404 y 500 propias |
| Captura | Navegador, móvil (375 px) y escritorio | Portada, una página de servicio y contacto, en cada idioma. Van al correo de revisión y se citan en el `work_log` |

Además, siempre: `npm run check:secrets` en verde. El resto de los frenos del motor (`check:ci`)
corre en CI igual que en `slg_website`; este perfil no los quita, solo no los convierte en criterio
de terminado.

## deliverable_format
- Un repositorio privado `web_<cliente>`, desplegable por sí solo, con su `README` de cliente
- La web en línea en el dominio del cliente
- Un correo de entrega con los accesos (correo 4 de `docs/intake/correos.md`)

## publication_step      # CATEGORÍA, no producto
- Plataforma de despliegue sin servidor propio, conectada al repositorio: cada cambio da una vista previa y `main` publica producción
- Base de datos relacional gestionada con almacenamiento de archivos del mismo proveedor
- Proveedor de correo transaccional por SMTP, con el remitente en un subdominio de envío
- DNS del cliente apuntado a la plataforma, sin tocar los registros de su correo

> En los sitios de Softlanding Global estas categorías se resuelven hoy como **Vercel + Supabase**
> (y un proveedor SMTP); la decisión y su porqué están en `docs/PLAYBOOK_REPLICACION.md` §2. El
> perfil la cita, no la fija.

## stack_candidates      # categorías; se confirman con el usuario, nunca por defecto
- despliegue: [plataforma sin servidor con vistas previas por rama | contenedor en servidor propio, solo si el cliente exige sus datos en su servidor]
- datos y archivos: [base relacional gestionada + almacenamiento del mismo proveedor | almacenamiento compatible S3 propio]
- correo: [proveedor SMTP transaccional]
- analítica: [ninguna | analítica sin cookies de terceros — solo si el intake la pide]
- CRM: [ninguno (aviso por correo) | CRM compatible con la cola actual | adaptador nuevo en `lib/crm`]

## tooling_candidates    # se evalúan por coste
- conector de la base gestionada: crear el proyecto, migrar, crear el contenedor de archivos sin contraseña en la conversación
- conector de la plataforma de despliegue: proyecto, variables no secretas, dominios
- conector de almacenamiento en la nube: leer la hoja del intake y la carpeta del cliente
- navegador automatizado: las capturas del gate y la comprobación de la vista previa

## knowledge_bundles     # OKF
- Ninguno obligatorio. La ficha y `content/` son el conocimiento del sitio

## Lo que este perfil NO pide

| No pide | Por qué | Cuándo sí |
|---|---|---|
| `data_model`, `api_contracts`, `architecture` | El motor ya los tiene y no se tocan | Si el cliente pide una función que el motor no tiene: entonces es otro proyecto, con `software-app` |
| Entrar con Google o Microsoft | Invitación + contraseña ya funciona | Si el intake lo marca **y** el cliente entrega las credenciales de su proveedor de identidad |
| API v1 para agentes | Una web informativa no la usa | Nunca en este perfil (`api: false`) |
| Copias cifradas a un almacenamiento externo | Bastan las copias automáticas de la base gestionada | Si el contrato exige retención larga |
| Panel de operación (`/hq`) | Sin área privada no hay nada que operar | Variante B |
| Doctrina, academia, mapa de servicios de SLG | Son de SLG, no del motor | Nunca (`doctrina: false`) |
| Una unidad por componente | Se trabaja por página | — |
