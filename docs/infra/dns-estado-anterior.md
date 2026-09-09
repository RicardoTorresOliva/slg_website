---
type: Registro
title: Zona DNS de softlandingglobal.com — estado anterior
description: Captura íntegra de la zona ANTES de cualquier cambio de este proyecto. Requisito del criterio 3 de FU-05 y mitigación de R-25.
tags: [infra, dns, hostinger, estado-anterior]
timestamp: 2026-09-08
fuente: Panel DNS de Hostinger, aportado por Ricardo
---

# Zona DNS — estado anterior · 2026-09-08

Capturada **antes** de añadir ningún registro de este proyecto. Es el punto al que
volver si algo sale mal (R-25, criterio 3 de FU-05).

| Tipo | Nombre | Contenido | TTL |
|---|---|---|---|
| CNAME | `academy` | `d705210bf404c0f8.vercel-dns-017.com` | 500 |
| CNAME | `selector2._domainkey` | `selector2-softlandingglobal-com._domainkey.softlandingglobal.onmicrosoft.com` | 3600 |
| CNAME | `selector1._domainkey` | `selector1-softlandingglobal-com._domainkey.softlandingglobal.onmicrosoft.com` | 3600 |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | 3600 |
| A | `evolution` | `167.88.42.76` | 3600 |
| A | `n8n` | `167.88.42.76` | 300 |
| A | `crm` | `167.88.42.76` | 14400 |
| A | `abril` | `167.88.42.76` | 300 |
| A | `easypanel` | `167.88.42.76` | 300 |
| A | `panel` | `167.88.42.76` | 300 |
| A | `xic` | `167.88.42.76` | 300 |
| A | `sabha` | `167.88.42.76` | 300 |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:ricardo.torres@softlandingglobal.com` | 3600 |
| TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all` | 3600 |
| MX | `@` | `softlandingglobal-com.mail.protection.outlook.com` | 14400 |

## Lo que esta captura confirma

- **La raíz no resuelve.** No hay registro `A @` ni `CNAME www`. Coincide con lo que
  dice el brief: hoy `softlandingglobal.com` no sirve nada.
- **`staging` no existe todavía.** Es el único registro que este proyecto añade en M0-A.
- **El correo está íntegramente en Microsoft 365** (D-23): `MX`, el `SPF` de la raíz,
  los dos selectores DKIM y `autodiscover`. Ninguno se toca.

## Lo que esta captura CORRIGE del brief

El §7 del brief lista como intocables `crm`, `n8n`, `evolution`, `academy` y los MX.
**La zona real tiene cinco subdominios más** que apuntan al mismo VPS y que el brief
no menciona:

| Subdominio | | |
|---|---|---|
| `abril` | `167.88.42.76` | Sistema no documentado en el brief |
| `xic` | `167.88.42.76` | Sistema no documentado en el brief |
| `sabha` | `167.88.42.76` | Sistema no documentado en el brief |
| `easypanel` | `167.88.42.76` | El propio panel de control |
| `panel` | `167.88.42.76` | Alias del panel, probablemente |

**Consecuencia:** la lista de «no tocar» de R-25 se amplía de 5 a 10 nombres. Y hay
más carga en el VPS de la que el plan suponía, lo que refuerza R-25 (un solo servidor)
y hace más valiosa la monitorización externa de D-49.

## Hallazgo sobre el correo, relevante para D-24

El registro `_dmarc` es `p=quarantine` **y no lleva etiqueta `sp=`**. Cuando `sp` falta,
la política de los subdominios **hereda la de la raíz**. Es decir: el subdominio de envío
dedicado que fija D-24 nacerá bajo política **quarantine**, no bajo `none`.

Consecuencia práctica: los correos del subdominio irán a la carpeta de correo no deseado
mientras su SPF y su DKIM no estén perfectos. No es un impedimento —es lo correcto desde
el punto de vista de seguridad— pero significa que **no habrá periodo de gracia**: hay que
verificar el dominio en el proveedor y comprobar la entrega antes de invitar a un cliente real.

Alternativa si molesta durante la puesta en marcha: añadir `sp=none` temporalmente al
registro `_dmarc` y retirarlo al confirmar la entrega. **Es tocar el DNS del correo, así
que es decisión de Ricardo y no se hace sin su visto bueno.**
