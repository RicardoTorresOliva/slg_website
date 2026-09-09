---
type: Convención
title: Esquema de contenido (contenido como datos)
description: Las seis colecciones de contenido con su ruta y su frontmatter mínimo, y las cuatro reglas que el script de CI verifica antes de publicar a main.
tags: [contenido, okf, frontmatter, colecciones, i18n, ci]
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md B.4, A.5, A.3, §1 Constraints, DoD #3, DoD #9, DoD #10"
  - "planning/requirements.md RF-18 a RF-27, RF-128, RF-135 a RF-141"
---

# Esquema de contenido (contenido como datos)

**Regla de oro: si Ricardo quiere cambiar una frase, edita un `.md`.** Ninguna cadena de negocio vive
dentro de un componente. Esto no es una preferencia de arquitectura: es lo que hace pasar DoD #9
(Ricardo cambia un texto, añade una descarga y crea un cliente sin ayuda técnica) y DoD #3 (publicar
un artículo es añadir un `.md` y hacer push).

Las seis colecciones viven en `content/` con frontmatter OKF. El frontmatter **se valida en tiempo de
build**: un frontmatter inválido rompe el build, no se degrada en silencio (RF-19).

---

## 1. Las seis colecciones

| Colección | Ruta | Frontmatter mínimo |
|---|---|---|
| `page` | `content/pages/<lang>/<slug>.md` | `type: page`, `title`, `description`, `lang`, `pair`, `nav_order`, `updated` |
| `service` | `content/services/<lang>/<slug>.md` | `type: service`, `name` (nomenclatura literal), `branch` (`SLG_Academy` · `SLG_Enterprise` · `SLG_Factory` · `SLG_Holdings`), `parent`, `download` (slug del documento), `lang`, `pair` |
| `download` | `content/downloads/<lang>/<slug>.md` | `type: download`, `service`, `title`, `audience`, `learns[]`, `file_key`, `status` (`draft` · `coming-soon` · `published`), `lang`, `pair` |
| `post` | `content/blog/<lang>/<slug>.md` | `type: post`, `title`, `description`, `lang`, `pair` (slug del par o `null`), `date`, `tags`, `status` (`draft` · `published`), `cover`, `social: { hook, linkedin, x }`, `author` |
| `doctrine` | `content/doctrine/<lang>/*.md` | `type: doctrine_section`, `order` |
| `ui` | `content/ui/<lang>.json` | Cadenas de interfaz de las tres superficies (pública, HQ, portal) |

## 2. Reglas de estructura que no se ven en la tabla

**`service` — las seis secciones son parte del registro.** Además del frontmatter, cada registro
`service` lleva las secciones 1–6 del contrato de página como **bloques con encabezado fijo**
(RF-135). Falta un bloque, sobra uno, o se altera un encabezado = registro inválido, y el script lo
rechaza **antes** de que la página llegue a renderizarse. El contrato en sí está en
[offer-structure](offer-structure.md) §5. Estructura del registro ≠ orden de renderizado: son dos
requisitos distintos y ambos se verifican.

**`download` — el archivo nunca está en el repo.** El registro lleva metadatos y un `file_key`; el
PDF vive en el bucket privado. El repositorio es público: ningún PDF de descarga, entregable ni dato
de cliente entra en él. Añadir un documento = añadir su registro ES+EN y subir el archivo. Sin código,
sin despliegue manual (RF-27).

**`download.status: coming-soon`** es un estado de producto, no un error: la página se muestra,
**captura el correo igual**, no emite URL firmada y no dispara `download.completed` (RF-40). Es lo que
permite lanzar sin los once PDFs listos.

**`post.status` manda sobre la existencia del archivo.** Un `post` con `status: draft` no se sirve en
ninguna ruta pública ni en RSS, y sí aparece en HQ marcado como borrador (RF-22, RF-141). La
publicación se dispara del campo, nunca de que el archivo exista: así un editor futuro en HQ escribe
los mismos campos sin migrar nada.

**`post.social` se escribe desde el primer artículo**, aunque en v1 se redacte a mano. HQ muestra los
tres extractos listos para copiar y el evento `post.published` los transporta enteros, junto al enlace
canónico del artículo en su idioma (RF-25, RF-145).

**`ui` es un archivo por idioma.** Una clave presente en un idioma y ausente en el otro **rompe el
build**; nunca se degrada a cadena vacía en pantalla (RF-140).

## 3. La regla de paridad ES/EN — y su única excepción

- El campo `pair` enlaza cada `page` y cada `service` con su equivalente en el otro idioma.
- El script de CI **falla** si un `pair` apunta a un archivo inexistente o si falta el par (RF-20).
- **Excepción explícita**: un artículo puede existir solo en español. La paridad se exige en `page` y
  `service`, **no** en `post` (RF-26). Por eso `post.pair` admite `null`.

El español se sirve en la raíz y el inglés bajo `/en`. Ninguna redirección automática por idioma del
navegador sobrescribe la ruta pedida (RF-03), y el conmutador de idioma lleva a la **misma** página,
no a la portada (RF-04).

## 4. El script de CI — lo que verifica y cómo falla

Antes de cada publicación a `main`, un script verifica cuatro cosas (RF-128, B.4, DoD #10). **Falla el
pipeline, no solo avisa.**

| # | Comprobación | Por qué existe |
|---|---|---|
| 1 | **Frontmatter válido** en las seis colecciones | RF-19: el contenido roto no llega a producción disfrazado de página vacía |
| 2 | **`pair` existente** en `page` y `service` | Gate D4 (i18n): la paridad no se comprueba a ojo |
| 3 | **Nomenclatura literal** — ninguna variante traducida de las etiquetas obligatorias | Gate D5 y [naming-rules](naming-rules.md): "SLG_Fábrica" no puede llegar a producción |
| 4 | **Cero `[PENDIENTE]`** | DoD #10: los pendientes son visibles en staging y están **prohibidos** en producción |

El mismo criterio del punto 4 vale para lorem ipsum, cifras sin fuente y nombres de cliente sin
autorización.

## 5. Consecuencias de diseño

- **Ninguna cadena de negocio hardcodeada** en un componente. Un texto en el código es un defecto,
  aunque sea provisional.
- Mientras el copy no esté aprobado, las páginas se construyen **contra este esquema** con el texto
  marcado `[PENDIENTE: …]` — es exactamente lo que permite avanzar sin saltarse la compuerta de copy
  descrita en [method-sdd-icm](method-sdd-icm.md).
- La **lista de dominios de correo gratuito** del formulario de descarga vive también como dato
  editable (contenido o configuración), no incrustada en el código, para ampliarla sin desplegar
  (RF-32).

## Enlaces

- Qué páginas y servicios alimentan estas colecciones → [offer-structure](offer-structure.md)
- Qué nombres no se traducen nunca → [naming-rules](naming-rules.md)
- Qué ocurre con el correo que captura un `download` → [crm-integration](crm-integration.md)
- Las compuertas que ordenan copy y prototipo → [method-sdd-icm](method-sdd-icm.md)
- Modelo de datos de las entidades que no son contenido → [../design_docs/data_model.md](../design_docs/data_model.md)
