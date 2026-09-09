---
type: Concepto
title: Contrato de captura web → CRM
description: Cómo la web entrega cada captura al CRM Softlanding Global con un adaptador de dos modos, cómo se encola y reintenta cuando el CRM no responde, y qué lee el tablero de HQ.
tags: [crm, captura, leads, adaptador, cola, reintentos, hq, integracion]
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md B.6, B.2, B.7, §5.1, §10-13, DoD #1, gate D7, F.2-5, §9"
  - "docs/decision_log.md D-19"
  - "planning/requirements.md RF-37 a RF-57"
---

# Contrato de captura web → CRM

**El CRM es el sistema de registro de leads. La web no lo es.** La web captura, entrega, guarda
evidencia y reintenta. No gestiona pipeline (§10-13). Esta frontera es la que hace que el proyecto
sea pequeño: cualquier propuesta de añadir etapas, asignación o valor de oportunidad a `lead_capture`
se rechaza por definición (RF-57).

El contrato técnico completo (formas de petición y respuesta, códigos, cabeceras) vive en
[../design_docs/api_contracts.md](../design_docs/api_contracts.md). Este archivo dice **qué** pasa y
**por qué**, para no tener que abrir aquel documento salvo cuando se implemente.

---

## 1. La secuencia, de un vistazo

1. **El visitante envía el formulario.** La web valida (correo corporativo, honeypot, límite de
   peticiones), persiste un registro `lead_capture` con `crm_sync_status: pending` **antes** de
   responder, y entrega el documento por URL firmada.
2. **El visitante nunca espera al CRM.** La entrega es inmediata; la sincronización ocurre en segundo
   plano (RF-39). Si el CRM está caído, el visitante no se entera.
3. **Un trabajo en segundo plano entrega la captura al CRM** por uno de los dos modos del adaptador
   (§2).
4. **La respuesta del CRM se persiste en la captura**: `crm_contact_id`, `crm_company_id`,
   `crm_opportunity_id`, `crm_sync_status`, `crm_attempts`, `crm_last_error` (RF-49). Cada intento
   deja además una fila `crm_delivery` con petición, código de respuesta y número de intento (RF-51).
5. **Llega un aviso por correo** a `support@softlandingglobal.com` con el resumen del lead y el enlace
   profundo a su ficha en el CRM (RF-53).

Las tres fuentes de captura recorren el mismo camino: `download` (descarga de documento), `contact`
(formulario de contacto) y `doctrine-request` (solicitud del documento completo de Doctrina) —
RF-43, RF-44.

## 2. El adaptador de dos modos (D-19)

La entrega al CRM se implementa como **un adaptador con dos modos, seleccionable por variable de
entorno**. Cambiar de modo no exige migrar datos ni tocar la unidad de captura (RF-46).

| Modo | Qué hace | Cuándo |
|---|---|---|
| **`contact_note`** | Busca el contacto por correo (`GET /contacts?q=`); si no existe lo crea (`POST /contacts` con nombre, correo, cargo, empresa como texto y `source: web`); después añade `POST /notes` sobre el contacto con el contexto de la captura: documento, ruta, idioma y UTM. | **Es lo único posible hoy.** La clave de API del CRM permite crear contactos y notas, pero **no** empresas ni oportunidades: eso solo se puede por sesión de usuario. |
| **`lead_admission`** | Envía `POST /api/v1/leads` con alcance `leads:write`, idempotente por correo + documento. El CRM crea o vincula la empresa por dominio del correo, crea el contacto, crea la oportunidad en la primera etapa del pipeline con fuente `web` y la nota de contexto. | Cuando el CRM implemente ese endpoint. Hasta entonces el modo permanece **inactivo** y el sistema opera en `contact_note` **sin degradación** (RF-48). |

**Por qué dos modos y no esperar al CRM.** El endpoint de admisión es un *spec-delta* en otro
repositorio, fuera de este proyecto. Con el adaptador, el milestone de conversión no queda bloqueado
por un cambio ajeno, y cuando el endpoint exista se enchufa sin reabrir la unidad de captura ni
migrar datos. El coste asumido: `api_contracts` especifica los dos modos y la unidad de captura
**prueba los dos**.

**Regla dura que ninguno de los dos modos puede romper**: nunca se usa un login de persona del CRM
como cuenta de servicio.

## 3. La cola de reintentos

Si el CRM responde error o no responde, la captura se reintenta con espera creciente:

`1 min → 10 min → 1 h → 6 h → 24 h`

Tras el **quinto** fallo la captura pasa a `failed`, genera **alerta en HQ** y **correo a
`support@`** (RF-50). Desde HQ se puede forzar el **reintento manual**, y el resultado queda auditado
(RF-52).

Esto no es una precaución teórica: **DoD #1 y el gate D7 exigen probarlo con el CRM apagado** — el
PDF se entrega igual, la captura queda en cola y se entrega al reintentar. Una implementación que no
sobreviva a esa prueba no está terminada.

## 4. La lectura para el tablero de HQ

El tablero **no calcula métricas comerciales**: las lee del CRM y las muestra.

| Lectura | Fuente |
|---|---|
| Métricas del pipeline | `GET /dashboard/metrics` |
| Embudo | `GET /reports/funnel` |
| Fuentes | `GET /reports/sources?currency=USD` |

Con una clave de **solo lectura** y **caché de 5 minutos** (RF-55). Junto a eso, HQ muestra las
capturas web del día con su estado de entrega y un **enlace profundo** a cada contacto en el CRM. Ese
enlace se construye desde una **plantilla configurable por variable de entorno, nunca codificada**,
porque la ruta de la ficha en el frontend del CRM está sin confirmar (RF-54,
`[PENDIENTE: confirmar ruta de ficha de contacto]`).

HQ lleva además un botón "Abrir CRM". El pipeline se gestiona **allí**.

## 5. Claves, secretos y auditoría

- **Dos claves distintas**, una por integración (RF-56):
  - "Website — captura": `contacts:write`, `activities:write`, `crm:read`
  - "Website — tablero": `crm:read`
- Ambas viven **solo** en variables de entorno de la plataforma de despliegue. En el repositorio se
  documentan **los nombres de las variables, nunca los valores** — el repositorio es público.
- Alcances mínimos, rotación anual, revocación inmediata si se filtra. Toda escritura queda auditada
  en los dos lados.
- Distinción del método que no se mezcla nunca: **MCP** es para que el agente *construya* (inspeccionar
  el CRM durante el desarrollo); **API + clave en variable de entorno** es para que el sitio *opere*
  en producción.
- `[PENDIENTE: creación de las dos claves en el CRM — F.2-5]`

## 6. Eventos que emite este camino

`lead.captured` · `lead.delivered_to_crm` · `download.completed` · `contact.submitted` ·
`doctrine.requested`. Se entregan por webhook firmado con HMAC-SHA256, con reintentos y tabla
`webhook_delivery`. Ningún flujo suscriptor es requisito de la v1.

## Enlaces

- Formas de petición y respuesta, códigos y cabeceras → [../design_docs/api_contracts.md](../design_docs/api_contracts.md)
- Entidades `lead_capture`, `crm_delivery`, `download_event` → [../design_docs/data_model.md](../design_docs/data_model.md)
- Qué formulario dispara esto y en qué página → [offer-structure](offer-structure.md)
- El registro de contenido del documento que se descarga → [content-schema](content-schema.md)
- Pantallas de HQ donde se ve el estado y se reintenta → [../design_docs/ui_wireframes.md](../design_docs/ui_wireframes.md)
