---
type: Convención
title: Nomenclatura obligatoria, marca pública y tono
description: Los nombres literales e intraducibles, cuándo se dice SLG Agency y cuándo Softlanding Global, la regla de la D de DAL OS, y las reglas de tono que gobiernan todo el texto del sitio.
tags: [nomenclatura, marca, tono, i18n, copy, ci]
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md §1 Constraints, §10-7, A.1, B.4, Anexo D (gate D5)"
  - "planning/requirements.md — Convenciones que gobiernan todos los requisitos, RF-128"
---

# Nomenclatura obligatoria, marca pública y tono

Esta es la convención que un script de CI **verifica y hace fallar el build** (RF-128, punto 3). No es
una guía de estilo: es una restricción ejecutable. Una variante traducida de cualquier etiqueta de la
lista es un error de compilación, no una elección de redacción.

---

## 1. Nombres literales e intraducibles

Se escriben **exactamente así en los dos idiomas**. No se traducen, no se localizan, no se pluralizan
en español, no se les cambia el guion bajo por espacio, y no se les añade artículo dentro del propio
nombre.

| Nombre | Es |
|---|---|
| `SLG_AI` | Rama de servicios de IA |
| `SLG_Holdings` | La otra rama |
| `SLG_Academy` | Línea de `SLG_AI` |
| `SLG_Enterprise` | Línea de `SLG_AI` |
| `SLG_Factory` | Línea de `SLG_AI` |
| `SLG_Readiness` | Servicio de `SLG_Enterprise` |
| `SLG_Implement` | Servicio de `SLG_Enterprise` |
| `APP_Building` | Servicio de `SLG_Factory` |
| `AGE_Building` | Servicio de `SLG_Factory` |
| `CoO as a Service` | Servicio de `SLG_Factory` |
| `Phoenix PEEx` | Programa de `SLG_Academy` |
| `Phoenix TEAx` | Programa de `SLG_Academy` |
| `Phoenix RETx` | Programa de `SLG_Academy` |

**Errores típicos que el script debe cazar**: `SLG_Fábrica`, `SLG Factory`, `SLG-Factory`,
`slg_factory` en texto visible, `Academia SLG`, `CoO como Servicio`, `Phoenix Peex`, `Fénix PEEx`.

En el menú, estas etiquetas son el destino. Nunca una etiqueta genérica tipo "Inicio"/"Home" como
destino de menú: el logo lleva a Home (RF-01).

## 2. Marca pública: SLG Agency, y cuándo no

- **La marca pública del sitio es `SLG Agency`.** Es lo que dice la web, lo que dice el wordmark y lo
  que espera el visitante.
- **"Softlanding Global" solo en contexto `SLG_Holdings`.** Fuera de ese contexto no aparece como
  marca de la web.
- La entidad legal es **SLG Agency Inc.** (Florida), y así se nombra en Nosotros y en las páginas
  legales.
- El dominio es `softlandingglobal.com` — el dominio no es la marca, y que el dominio diga
  "softlandingglobal" no autoriza a llamar así a la agencia en el copy.
- **Lema**: *Precision with Purpose*.
- `[PENDIENTE: confirmar si el tagline "The discipline of going global" se usa en SLG_Holdings]`

## 3. Regla dura de DAL OS

**La "D" de DAL OS se expande SIEMPRE como Destrucción Creativa.** En español y en inglés, en el
copy, en la interfaz, en HQ y en cualquier documento del proyecto. Sin variantes ni sinónimos. Ver
[doctrine-summary](doctrine-summary.md).

## 4. Tono

- **Ejecutivo, sobrio, claridad quirúrgica.** El lector es C-suite, fundador o miembro de directorio,
  llega desde LinkedIn, con poco tiempo y en móvil.
- **Autoridad, no entusiasmo. Cero hype de IA.** Nada de superlativos, exclamaciones, "revoluciona",
  "transforma radicalmente" ni promesas sin sustancia.
- **No vendemos, ayudamos a comprar.** El texto informa; el único CTA de una página de servicio es su
  descarga.
- **Una idea por viewport.**
- **Sin alarmismo** en la sección "para quién y qué problema": el comprador se reconoce en dos frases,
  no se le asusta.
- **Marcos de la casa cuando aporten**, no como vocabulario decorativo: Digital Geography · Market
  Fracking · Hyperflexibility · Agentic Mindset · Destrucción Creativa · Antifragilidad · AI Literacy.

## 5. Nada inventado

Precios, casos, cifras, nombres de clientes y testimonios **solo con dato verificado y autorización
explícita**. Si falta el dato: `[PENDIENTE: …]`, visible en staging y **prohibido en producción**.

El gate **D5** y el script de CI comprueban en `main`: cero `[PENDIENTE]`, cero lorem ipsum, ninguna
cifra sin fuente y ningún nombre de cliente sin autorización.

## 6. Otras reglas de escritura del proyecto

**Notación de origen** — tres numeraciones que antes colisionaban, y aquí son disjuntas:

| Token | Significa |
|---|---|
| `§N` | Sección del brief |
| `§10-N` | Decisión HITL de Ricardo, fila N de §10 |
| `A.N` `B.N` `C.N` `F.N` | Sección de anexo, siempre con punto |
| `D1`…`D12`, `D2b` | Gate del Anexo D, **sin guion** |
| `DoD #N` | Prueba N de la Definition of Done |
| `D-14`…`D-23` | Decisión registrada en el `decision_log`, **con guion** |
| `D-01`…`D-11` | Los once **documentos de descarga**. Aparecen en el texto, nunca como origen |

**Categorías, no productos**, donde Ricardo no ha elegido producto (AGENTS.md Regla 7). Se escribe
"el proveedor de correo transaccional" y "object storage S3-compatible externo", nunca un nombre
comercial; y ambos se diseñan detrás de un adaptador con variables de entorno, para que la elección
sea reversible sin tocar código. El stack ya decidido en §7 y §10 **sí** se nombra.

**Repositorio público**: cero secretos, cero valores de credencial, cero detalle operativo de
incidencias de seguridad. En la documentación solo aparecen **nombres** de variables de entorno,
nunca valores (RF-129).

**Fuera de alcance con nombre propio**: `Phoenix Academy` (`academy.softlandingglobal.com`) queda
fuera; solo se enlaza desde `SLG_Academy` mientras siga vivo (§10-7).

## Enlaces

- Dónde vive cada nombre en el mapa de páginas → [offer-structure](offer-structure.md)
- Dónde se valida la nomenclatura → [content-schema](content-schema.md) §4
- Origen del tono → [doctrine-summary](doctrine-summary.md)
- Reglas visuales que acompañan a estas verbales → [brand-tokens](brand-tokens.md)
