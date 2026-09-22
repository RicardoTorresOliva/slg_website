---
type: Plantilla
title: Los cuatro correos al cliente de una web nueva
description: Plantillas en texto plano de los correos de envío del formulario, faltantes, revisión de la vista previa y entrega; sus campos variables y de dónde sale cada uno; nota de estilo para enviarlos en HTML con la marca de Softlanding Global.
tags: [intake, correos, plantilla, clientes]
timestamp: 2026-09-22
lang: es
---

# Los cuatro correos al cliente

Son los cuatro momentos del §5 de `docs/PLAYBOOK_REPLICACION.md` en que se escribe al cliente:

| # | Correo | Paso del §5 | Cuándo |
|---|---|---|---|
| 1 | Envío del formulario | 1 | Día 0 |
| 2 | Faltantes | 3 | Solo si la comprobación de los ★ de `commands/leer-intake.md` §2 deja alguno sin cumplir |
| 3 | Revisión de la vista previa | 11 | Día 3 |
| 4 | Entrega con accesos | 15 | Día 5, con el dominio ya en línea |

Claude los deja como borrador en Gmail —o pegados en el chat si el conector no responde— y **Ricardo
pulsa Enviar**. Ningún correo sale sin él.

La carpeta del cliente no tiene correo propio: al compartirla (paso 2 del §5), Google Drive manda su
aviso con el enlace, y el correo 2 lo repite si faltan archivos.

## Cómo suenan

Cercanos, con energía, y sin vender: el cliente ya compró. Se tutea, como el formulario. Frases
cortas; cada párrafo dice una cosa; lo que el cliente tiene que hacer se ve sin buscarlo.

Fuera de estos correos: «espero que te encuentres bien», «no dudes en», «estaremos encantados»,
«quedo atento», «llevar tu negocio al siguiente nivel», «solución integral», «de primer nivel»,
«a tu disposición», los signos de exclamación y los emojis. Si una frase podría ir en el correo de
cualquier agencia, se quita.

## Campos variables

Entre dobles llaves. Claude los rellena todos antes de dejar el borrador; si uno queda sin valor, el
borrador no se deja.

| Campo | Qué es | De dónde sale | Correos |
|---|---|---|---|
| `{{nombre}}` | Nombre de pila del responsable | Hoja: primera palabra de `Nombre y apellido de la persona responsable del proyecto` (en el correo 1, lo que Ricardo diga en el chat) | 1–4 |
| `{{correo_responsable}}` | Destinatario | Hoja: `Correo corporativo de la persona responsable` (en el correo 1, el que dé Ricardo) | 1–4 |
| `{{empresa}}` | Nombre comercial | Hoja: `Nombre comercial` (en el correo 1, el que dé Ricardo) | 1–4 |
| `{{enlace_formulario}}` | Enlace público del brief | `docs/PLAYBOOK_REPLICACION.md` §7.4 | 1 |
| `{{lista_faltantes}}` | Un faltante por línea, con lo que el cliente tiene que hacer | `commands/leer-intake.md` §2, columna «Si no» | 2 |
| `{{enlace_carpeta}}` | La carpeta `Intake · <cliente>` | Conector de Drive: `search_files` con `title contains 'Intake · <cliente>'` | 2 |
| `{{aviso_fecha}}` | Una frase si la fecha pedida ya no llega; vacío si llega | Hoja: `Fecha en la que te gustaría lanzar la web`, contra 5 días hábiles | 2 |
| `{{enlace_vista_previa}}` | URL de la vista previa | Proyecto de la plataforma de despliegue (paso 7 del §5) | 3 |
| `{{lista_pendientes}}` | Los pendientes cuyo «Quién» es el cliente, uno por línea | `docs/intake/pendientes.md` del repositorio del cliente | 3 |
| `{{fecha_limite_revision}}` | Último día para responder sin mover el lanzamiento | Plan: el día 4 del §5 | 3 |
| `{{fecha_lanzamiento}}` | Día de publicación | Plan: el día 5 del §5 | 3 |
| `{{dominio}}` | El dominio, sin `https://` | `dominio.produccion` de `site.config.ts` | 3, 4 |
| `{{aprobador}}` | Quien aprueba, va en copia | Hoja: `¿Quién aprueba la web antes de publicarla?` | 3 |
| `{{buzon_contactos}}` | Adónde llegan los mensajes | Variable del buzón de contactos (`commands/leer-intake.md` §4.3) | 4 |
| `{{enlace_acceso}}` | Entrada al área privada | `https://{{dominio}}` + la ruta de acceso del motor | 4, solo con área privada |
| `{{enlace_manual}}` | El manual de la web del cliente | El `README` de `web_<cliente>`, compartido como documento | 4 |

Las líneas marcadas `[solo si …]` se borran enteras cuando no aplican, marca incluida.

## 1 · Envío del formulario

**Asunto:** {{empresa}}: el brief de tu nueva web

```text
Hola, {{nombre}}:

Para empezar la web de {{empresa}} necesitamos conocerla bien. Lo hemos
reunido en un brief de unos quince minutos:

{{enlace_formulario}}

Si una pregunta todavía no tiene respuesta, marca «No sé» y la resolvemos
contigo. Al terminar te llega un enlace para corregir lo que quieras.

Después te compartimos una carpeta de Google Drive para el logo, las fotos,
el manual de marca y los textos o presentaciones que tengas. No necesitas
cuenta de Google para usarla, así que puedes ir reuniendo esos archivos
desde hoy.

Con el brief y la carpeta completos, son cinco días hábiles hasta publicar,
tu revisión incluida.

Ricardo Torres Oliva
Softlanding Global
The discipline of going global
```

## 2 · Faltantes

**Asunto:** {{empresa}}: lo que nos falta para arrancar

```text
Hola, {{nombre}}:

Gracias por el brief. Ya estamos trabajando con lo que nos mandaste. Para
arrancar del todo nos falta esto:

{{lista_faltantes}}

Los archivos van a tu carpeta:
{{enlace_carpeta}}

Lo demás, respóndelo en este correo o corrígelo en el brief desde el
enlace que te llegó al enviarlo.

Los cinco días hábiles empiezan a contar cuando tengamos todo.
[solo si la fecha pedida ya no llega] {{aviso_fecha}}

Ricardo Torres Oliva
Softlanding Global
The discipline of going global
```

Cada línea de `{{lista_faltantes}}` empieza por un guion y dice **qué hacer**, no qué falta:
«— Sube tu logo a la carpeta, en SVG o PNG», no «— Logo».

## 3 · Revisión de la vista previa

**Asunto:** {{empresa}}: tu web, lista para revisar

**Copia:** {{aprobador}}

```text
Hola, {{nombre}}:

La web de {{empresa}} ya se puede ver:

{{enlace_vista_previa}}

Es una vista previa: solo la ve quien tiene el enlace, y todo se puede
cambiar. Recórrela en el móvil y en el ordenador, y mándanos lo que
quieras cambiar en una lista, con la página de cada cosa. Una línea por
cambio basta.

Y necesitamos que nos confirmes esto:

{{lista_pendientes}}

Si nos respondes antes del {{fecha_limite_revision}}, publicamos el
{{fecha_lanzamiento}} en {{dominio}}. Tu visto bueno, y el de quien va en
copia, deja los textos aprobados tal como estén entonces.

Ricardo Torres Oliva
Softlanding Global
The discipline of going global
```

## 4 · Entrega con accesos

**Asunto:** {{empresa}}: tu web está en línea

```text
Hola, {{nombre}}:

{{dominio}} ya está publicada.

Lo que necesitas saber:

— Los mensajes del formulario de contacto llegan a {{buzon_contactos}}.
  Manda uno de prueba desde {{dominio}}/contacto para verlo con tus ojos.
[solo si hay área privada] — Tu acceso: {{enlace_acceso}}, con tu correo. La contraseña es la que elegiste al aceptar la invitación; nosotros no la conocemos.
[solo si gestionamos el DNS] — Tu correo funciona igual que antes: sus registros no se han tocado.
— El manual de tu web, con cómo pedir un cambio y qué hacer si algo
  falla: {{enlace_manual}}

Para cualquier cambio, responde a este correo.

Ricardo Torres Oliva
Softlanding Global
The discipline of going global
```

**Ninguna contraseña ni clave va en este correo**, ni en ningún otro: el acceso al área privada se
activa con la invitación, y la contraseña la elige el propio cliente.

## Versión en inglés

Se escribe cuando **el responsable** escribe en inglés —su respuesta al brief, o su primer correo—,
no cuando la web lleva inglés: el idioma del correo es el de la persona. La versión inglesa lleva los
mismos párrafos, los mismos campos y la misma firma, con el asunto traducido.

**El correo 1 en inglés no sirve todavía**: el brief está solo en español. A un cliente que no lo lee
se le hace el brief por llamada y Claude rellena la hoja con Ricardo; o se crea antes una versión
inglesa del formulario.

## Si se envía en HTML

Gmail manda texto plano sin problema; el HTML es opcional y solo si Ricardo lo pide. Entonces, con
el Kit de Softlanding Global:

| Elemento | Estilo |
|---|---|
| Fondo del correo | `#F4F6F9` |
| Tarjeta | Blanca, 600 px de ancho máximo, centrada, esquinas de 12 px |
| Cabecera | Logo horizontal con tagline, sobre blanco, con un borde inferior de 2 px `#2878B4` |
| Títulos | `#14648C` |
| Texto | `#0A0A14` |
| Texto secundario (firma, pie) | `#5A6470` |
| Enlaces | `#50B4DC`, **siempre subrayados** |
| Líneas divisorias | 1 px `#C8CCD3` |
| Rojo `#DC141E` | Como mucho **un** acento por correo (el botón de la vista previa en el correo 3, por ejemplo); nunca de fondo de un bloque |
| Tipografía | `Montserrat, Arial, Helvetica, sans-serif`: la mayoría de los lectores de correo no cargan Montserrat y caen en Arial |
| Pie | «Softlanding Global · The discipline of going global» en `#5A6470` |

`#50B4DC` sobre blanco mide **2,4:1** —por debajo de AA, y por eso la web no lo usa como texto
(`app/tokens.css`)—. En el correo va siempre subrayado, para que el enlace se reconozca por la forma
y no solo por el color.

Estructura mínima, con estilos en línea porque Gmail descarta los `<style>`:

```html
<body style="margin:0;background:#F4F6F9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#FFFFFF;border-radius:12px;font-family:Montserrat,Arial,Helvetica,sans-serif;">
        <tr><td style="padding:24px 32px;border-bottom:2px solid #2878B4;">
          <img src="https://raw.githubusercontent.com/RicardoTorresOliva/slg_website/develop/docs/intake/logo-softlanding-global.png"
               alt="Softlanding Global" width="240" style="display:block;">
        </td></tr>
        <tr><td style="padding:32px;color:#0A0A14;font-size:15px;line-height:1.6;">
          <h1 style="margin:0 0 16px;color:#14648C;font-size:20px;">{{titulo}}</h1>
          <!-- párrafos del correo en texto plano, uno por <p> -->
          <p style="margin:0 0 16px;">…</p>
          <p style="margin:0;"><a href="{{enlace}}" style="color:#50B4DC;text-decoration:underline;">{{enlace}}</a></p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #C8CCD3;color:#5A6470;font-size:13px;">
          Ricardo Torres Oliva · Softlanding Global · The discipline of going global
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
```

`{{titulo}}` es el asunto sin el nombre de la empresa; `{{enlace}}`, el enlace principal del correo
(formulario, carpeta, vista previa o dominio).
