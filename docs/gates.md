---
type: docs
title: Los trece gates del Anexo D, como comprobaciones
project: slg_website
status: active
timestamp: 2026-09-13
---

# Los trece gates del Anexo D — **verificables, no narrados**

**Qué es este archivo y por qué existe.** El Anexo D del brief describe los gates en prosa. La prosa
no se puede ejecutar, y un gate que solo se puede leer es un gate que se cumple «en general». RF-148
pide lo contrario: **cada gate escrito como checklist verificable o como script**, de modo que
extraerlos a un perfil propio sea **mover texto**, no reescribirlo.

Así que aquí cada gate tiene tres cosas y ninguna es una opinión:

- **Qué exige** — la línea del Anexo D, sin adornos.
- **Cómo se comprueba** — un comando que cualquiera puede ejecutar, o una checklist de pasos
  literales cuando la comprobación es necesariamente humana.
- **Su prueba negativa** — R-26: un freno que nunca se ha visto en rojo no cuenta como verde.

**`npm run check:anexo-d`** comprueba **este archivo**: que los trece estén, que cada uno declare una
comprobación real —un script que exista en `package.json` o una checklist con pasos— y que ninguno se
quede en prosa.

> **Lo que una comprobación humana NO es.** «Revisar que se ve bien» no es una checklist. Cada paso
> manual de aquí se escribe como algo que se hace y se observa, con un resultado que se puede anotar
> con un sí o un no.

---

## D1 · Rendimiento público

**Exige.** Lighthouse móvil ≥ 90 en las 4 categorías (Home + 1 servicio + 1 artículo); LCP < 2,5 s en
4G simulado; JS inicial de la capa pública < 150 KB comprimidos.

**Comprueba.** `npm run check:lighthouse` · `npm run check:js-budget`

**Prueba negativa.** `npm run check:brakes` → «presupuesto de JS inicial» con el umbral bajado a 1 KB:
cualquier página real lo supera y el freno tiene que frenar.

**Estado.** ✅ verde en local sobre la salida `standalone`. Las mismas dos órdenes corren en CI.

---

## D2 · Accesibilidad

**Exige.** Contraste AA en todas las combinaciones —el cyan `#50B4DC` y el tinte `#78B4DC` nunca como
texto sobre claro; `#2878B4` sobre blanco roto solo en tamaño grande—; teclado completo; `alt` en
imágenes; foco visible; formularios con etiqueta y error en línea.

**Comprueba.** `npm run check:contraste` (mide los tokens reales, no los declarados) ·
`npm run check:lighthouse` (categoría Accessibility ≥ 90).

**Checklist manual — teclado y foco**, que ninguna medición automática cubre:

1. Abrir la portada y recorrerla **solo con el tabulador**, de arriba abajo.
2. En cada parada: **se ve el anillo de foco** (dos capas, D-44) → sí / no.
3. Abrir el sheet móvil con el teclado y **cerrarlo con `Esc`** → sí / no.
4. Enviar el formulario de descarga con un correo inválido: el error aparece **junto al campo**, no
   en un cartel arriba → sí / no.
5. Recorrer una página de servicio con el lector de pantalla activado: los encabezados van en orden
   y las imágenes se anuncian → sí / no.

**Prueba negativa.** `check:contraste` contra el par prohibido: mide 2,4:1 y falla.

**Estado.** ✅ la parte medible. ⏳ la checklist manual, pendiente de ejecutarse y anotarse.

---

## D2b · Marca

**Exige.** Sin verde, amarillo ni naranja; rojo ≤ 2 instancias por viewport y **nunca de fondo**;
≤ 3 colores de marca por elemento; logo solo sobre claro, con margen de respeto y sin deformar;
Montserrat autoalojada.

**Comprueba.** `npm run check:contraste` (los tokens que existen) · `npm run check:terceros` (la
tipografía no viene de un CDN: si viniera, sería un tercero en la capa pública).

**Checklist manual — una pasada por pantalla**, porque «dos instancias por viewport» es una
observación, no una medición:

1. Portada, una página de servicio y un artículo, en móvil y en escritorio.
2. ¿Aparece algún verde, amarillo o naranja? → no debe.
3. ¿Cuántas instancias de rojo hay en el viewport? → **≤ 2**, y ninguna como fondo de bloque.
4. ¿Algún elemento mezcla más de 3 colores de marca? → no debe.
5. El logo: ¿sobre fondo claro, con su margen, sin estirar? → sí.

**Prueba negativa.** `check:terceros` contra una página que carga una fuente de Google: la detecta.

**Estado.** ⏳ la checklist manual, pendiente.

---

## D3 · Motion

**Exige.** Checklist C.4 aplicado; prueba con `prefers-reduced-motion`; **revisión cuadro a cuadro**
del sheet y del hero.

**Comprueba.** `npm run check:motion` (solo se animan `transform` y `opacity`, sin `@keyframes` en
interacciones agarrables) · `npm run test:gesto` (mide **cuadro a cuadro** las cuatro cláusulas de
RNF-45 en un navegador real: 1:1 con el dedo, rubber-band, cierre por velocidad y transferencia de
velocidad).

**Prueba negativa.** `check:brakes` → «las cuatro cláusulas del sheet, medidas cuadro a cuadro»
contra `negative/gesto/roto.html`: las cuatro tienen que salir en rojo, no una.

**Estado.** ✅ verde. Este gate encontró dos defectos que ningún `grep` podía ver: la CSP que impedía
hidratar y el cierre que ignoraba la velocidad del dedo.

---

## D4 · i18n

**Exige.** Paridad ES/EN en `page` y `service`; `hreflang` y `canonical` por idioma; el conmutador
conserva la ruta.

**Comprueba.** `npm run check:pairs` (paridad de registros) · `npm run check:seo` (`hreflang`
**recíproco**: si una mitad del par no declara la vuelta, los buscadores ignoran las dos) ·
`npm run check:armazon` (el conmutador lleva a la **misma** página en el otro idioma).

**Prueba negativa.** `check:brakes` → el gate de `pair` contra un registro huérfano.

**Estado.** ✅ verde.

---

## D5 · Fidelidad de contenido

**Exige.** Todo texto viene de `content/`; nomenclatura literal verificada; cero `[PENDIENTE]` ni
lorem en `main`; sin cifras sin fuente; sin clientes sin autorización.

**Comprueba.** `npm run check:cadenas` (cero texto escrito a mano en el armazón) ·
`npm run check:nomenclature` · `npm run check:pending -- --strict` (solo en `main`) ·
`npm run check:copy` · **`npm run check:produccion`** — este último sobre el **texto que el sitio
sirve**, no sobre los archivos de los que sale: un marcador que entra por `content/ui`, por una
plantilla o por un valor por defecto de un componente **no está en `content/`** y los otros gates lo
dan por bueno.

**Prueba negativa.** `check:brakes` → cuatro entradas: `[PENDIENTE]`, nomenclatura, copy sin respaldo
y «un marcador o una cifra sin fuente en el texto SERVIDO».

**Estado.** ✅ verde sobre 68 rutas públicas servidas.

---

## D6 · SEO técnico

**Exige.** Metadatos únicos, Open Graph, sitemap, robots, schema `Organization` + `Service`, páginas
404 y 500 propias.

**Comprueba.** `npm run check:seo` (220 comprobaciones sobre el servidor real).

**Prueba negativa.** `check:brakes` → `check-seo.ts` contra `negative/seo/`.

**Estado.** ✅ verde.

---

## D7 · Conversión de punta a punta

**Exige.** Prueba real: descarga → `lead_capture` → contacto + nota en el CRM → aviso por correo. Y el
caso de error: **CRM apagado** → la captura queda en cola, **el PDF se entrega igual**, y el reintento
funciona al volver.

**Comprueba.** `npm run test:crm` (contra un doble del CRM y PostgreSQL real, incluido el CRM caído y
el reintento) · `npm run test:descargas` · `npm run test:correo` (contra un SMTP real).

**Checklist manual — la prueba con el CRM de verdad**, que un doble no puede dar:

1. En staging, pedir un documento con un correo corporativo real.
2. Llega el PDF → sí / no.
3. En el CRM aparece el contacto **con su nota** («Descargó D-01 desde …») → sí / no.
4. Llega el aviso al buzón de alertas, con el enlace directo a la ficha → sí / no.
5. Apagar el CRM, repetir con otro correo: **el PDF llega igual** y la captura queda `pending` → sí / no.
6. Volver a encender el CRM y esperar un ciclo: la captura pasa a `delivered` → sí / no.

**Estado.** ✅ el mecanismo, contra dobles. ⏳ la checklist, que necesita el CRM real y el despliegue.

---

## D8 · Identidad de punta a punta

**Exige.** Login por los **tres** métodos; invitación aceptada por cada método; vinculación por correo
verificado; recuperación de contraseña; cierre de sesión global.

**Comprueba.** `npm run test:acceso` (39 comprobaciones contra el servidor real, con navegador
simulado y cookies) · `npm run test:invitaciones` · `npm run test:permisos`.

**Checklist manual — los dos métodos sociales**, que necesitan registros externos:

1. Entrar con **Google** en staging → sí / no.
2. Entrar con **Microsoft 365** → sí / no.
3. Aceptar una invitación con cada uno de los tres métodos → sí / no / no.
4. Cerrar sesión en todos los dispositivos desde un navegador y comprobar que **el otro queda
   fuera** → sí / no.

**Estado.** ⏳ bloqueado por **F.2-2** y **F.2-3** (los registros de Google y Entra). El método de
contraseña está verificado.

---

## D9 · Aislamiento

**Exige.** Pruebas automatizadas: `client_*` no accede a otra empresa ni a `/hq`; `slg_operator` no
crea claves; clave con alcance insuficiente → **403**; sin clave → **401**; exceso → **429**.

**Comprueba.** `npm run test:aislamiento` (21 comprobaciones contra la política de fila real) ·
`npm run test:permisos` (la matriz B.3 entera: 17 acciones × 4 roles, más los seis alcances) ·
`npm run test:api` (124 comprobaciones por HTTP: los cinco casos de 401, el 403 que no dice qué
alcance faltaba, el 429 con su cabecera, y las **doce celdas** de alcance × ruta) ·
`npm run test:shell` · `npm run test:materiales` · `npm run test:miembros`.

**Prueba negativa.** `check:brakes` → «una consulta que toma el `organization_id` del parámetro»: el
fixture construye el contexto desde el parámetro en vez de desde la sesión, y la política **no lo
para** — por eso ese fallo hay que atraparlo arriba.

**Estado.** ✅ verde.

---

## D10 · Archivos

**Exige.** Las URLs firmadas caducan; el visor de HTML va en sandbox; tipo y tamaño validados; sin
listado público de buckets.

**Comprueba.** `npm run test:archivos` (40 comprobaciones contra un servidor S3 real, con los cinco
límites de `data_model` §2.6) · `npm run check:archivos` (ninguna orden de listado en el código, y
cero entregables versionados) · `npm run test:visor` (25 comprobaciones contra un entregable
**hostil** que hace las siete cosas que el visor tiene que impedir) · `npm run test:descargas`.

**Prueba negativa.** `check:brakes` → «listado de un bucket en el código» y «entregable versionado en
un repositorio público».

**Estado.** ✅ verde. El criterio de DU-19 que pide la prueba **contra el origen separado desplegado**
sigue abierto: hoy está verificada la capa 1 **declarada** y las capas 2 y 3 en funcionamiento.

---

## D11 · Operación

**Exige.** Despliegue automático desde `main`; staging desde `develop`; **backup + restauración
probada**; variables de entorno documentadas sin valores; monitor de caída.

**Comprueba.** `npm run test:respaldos` (27 comprobaciones: copia, cifrado, subida, purga y
**restauración desde una copia antigua** en otra base de datos) · `npm run check:env` (77 variables
declaradas, todas documentadas y **sin un solo valor**) · `npm run check:literacy` (todas aparecen en
el manual) · `npm run check:runtime` (cabeceras y compuerta de staging sobre el servidor real).

**Checklist manual — lo que necesita el VPS**:

1. Un push a `develop` publica staging sin tocar nada → sí / no.
2. Un push a `main` publica producción → sí / no.
3. La copia diaria deja objetos en el bucket externo → sí / no.
4. **Restaurar en staging desde una copia de hace más de un día** y comprobar los datos → sí / no.
5. Apagar **el VPS entero** y comprobar que el aviso del monitor llega por un canal que **no depende
   del VPS** → sí / no.

**Estado.** ⏳ el mecanismo está verificado en laboratorio; los cinco pasos necesitan el despliegue.

---

## D12 · Literacy

**Exige.** README operativo **probado por Ricardo** (DoD #9); cada especificación enlazada desde
`knowledge/index.md`.

**Comprueba.** `npm run check:literacy` (las siete tareas están escritas; todo documento de diseño y
todo concepto están enlazados y registrados; ninguna variable viaja con su valor).

**Checklist manual — la prueba que da nombre al gate**, y que un script no puede hacer:

1. Ricardo **cambia un texto** siguiendo solo el README → sin atascos / con atascos (anótalos).
2. Ricardo **añade una descarga** → sin atascos / con atascos.
3. Ricardo **crea un cliente e invita** → sin atascos / con atascos.
4. **Cada atasco es un defecto del manual**: se corrige y se vuelve a probar.

**Prueba negativa.** `check:brakes` → tres entradas: un design doc que el índice no enlaza, una tarea
del manual que desaparece, y una variable sin explicar o **con su valor escrito al lado**.

**Estado.** ✅ la parte mecanizable. ⏳ la prueba con Ricardo, que es el criterio 2 de DU-24.

---

## Resumen

| Gate | Automático | Manual pendiente | Estado |
|---|---|---|---|
| D1 Rendimiento | `check:lighthouse` · `check:js-budget` | — | ✅ |
| D2 Accesibilidad | `check:contraste` · `check:lighthouse` | teclado, foco, lector | ⏳ |
| D2b Marca | `check:contraste` · `check:terceros` | una pasada por pantalla | ⏳ |
| D3 Motion | `check:motion` · `test:gesto` | — | ✅ |
| D4 i18n | `check:pairs` · `check:seo` · `check:armazon` | — | ✅ |
| D5 Contenido | `check:cadenas` · `check:nomenclature` · `check:pending` · `check:copy` · `check:produccion` | — | ✅ |
| D6 SEO | `check:seo` | — | ✅ |
| D7 Conversión | `test:crm` · `test:descargas` · `test:correo` | CRM real | ⏳ |
| D8 Identidad | `test:acceso` · `test:invitaciones` · `test:permisos` | Google y Microsoft | ⏳ |
| D9 Aislamiento | `test:aislamiento` · `test:permisos` · `test:api` · `test:shell` | — | ✅ |
| D10 Archivos | `test:archivos` · `check:archivos` · `test:visor` · `test:descargas` | visor desplegado | ✅ |
| D11 Operación | `test:respaldos` · `check:env` · `check:literacy` · `check:runtime` | despliegue y monitor | ⏳ |
| D12 Literacy | `check:literacy` | la prueba con Ricardo | ⏳ |

**Seis en verde, siete esperando algo que no es código.** Ninguno de los siete espera a que alguien
escriba más: esperan un despliegue, dos registros de OAuth, el CRM real, o a una persona haciendo
algo y anotando el resultado.
