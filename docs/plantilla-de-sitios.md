# La plantilla de sitios — inventario de lo que nombra a SLG, y qué hacer con cada cosa

> Objetivo A de la sesión del 2026-09-18: **montar el sitio de un cliente en dos días** reutilizando
> este proyecto, sin volver a tardar dos semanas. Este archivo es el **primer paso concreto** que
> pedía la memoria: el inventario mecánico de todo lo que nombra a SLG fuera de `content/`, con una
> decisión por línea — motor con parámetro, o piel.
>
> **Lo que este archivo NO hace**: elegir el mecanismo. Repositorio plantilla, `site.config`,
> generador — eso se decide con Ricardo. Lo que hay aquí es el material con el que se decide: cuánto
> trabajo es cada opción, medido, no estimado.

## 0 · El recuento

`git grep -i -E "SLG|Softlanding|softlandingglobal"` sobre `app/ lib/ components/ scripts/
knowledge/ content/ui/`: **1.388 líneas en 128 archivos**. Ese número asusta y no debe: la mitad
larga no es marca. Clasificadas por lo que la palabra significa en cada línea:

| Categoría | Líneas | Qué es | Veredicto |
|---|---:|---|---|
| Prefijo técnico | 761 | `--slg-*` (tokens CSS), `data-slg-*`, `x-slg-ruta`, `slg-website` | **Motor, tal cual** |
| «SLG» = la casa | 347 | `ORG_TYPES=['slg','client']`, `esActorDeSLG`, `usuariosDeSlg`, `user.invite.slg` | **Motor, con etiqueta** |
| Vocabulario de roles | 133 | `slg_admin`, `slg_operator`, `agent_slg`, `slg_app` | **Motor, tal cual** |
| Marca | 121 | «SLG Agency», `softlandingglobal.com`, logotipos | **Piel — al config** |
| Oferta | 26 | `VoltAi by SLG`, `SLG_Readiness`, `VoltAi Academy`… | **Piel — a la estructura** |

**La conclusión que cambia el tamaño del trabajo: sólo 147 líneas (marca + oferta) son piel.** Las
otras 1.241 son vocabulario interno que ningún cliente ve nunca.

## 1 · Motor tal cual — no se toca

**El prefijo `slg-` de los identificadores técnicos.** `--slg-azul`, `[data-slg-tabla]`,
`x-slg-ruta`, el nombre del proyecto en Vercel. Es un espacio de nombres, no una marca: nadie lo lee
salvo quien edita el CSS. Renombrarlo a `--app-*` cruza `app/tokens.css`, `motion.css`, `mapa.css`,
`apple.css` y treinta componentes para no ganar nada. **Se queda.**

**El vocabulario de roles.** `slg_admin`, `slg_operator`, `client_admin`, `client_member`, y
`agent_slg` dentro de las políticas de fila (migraciones 0001 y 0015). Aquí «slg» no significa
«Softlanding Global»: significa **la casa que opera el sitio**, frente a la empresa cliente que entra
al portal. El modelo de dos lados es el motor entero; renombrarlo por cliente obliga a tocar
migraciones, políticas de PostgreSQL, la matriz B.3, siete guiones de prueba y `audit_log` —una tabla
que no admite `UPDATE`—. **Se queda**, y lo que el usuario ve es una etiqueta (ver §2).

**Las marcas de formato binario**: `SLGBK1` (cabecera de las copias cifradas, `lib/backup/cifrado.ts`)
y la extensión `.slgbk`. Cambiarlas invalida las copias ya hechas. **Se quedan.**

## 2 · Motor con etiqueta — la casa se llama como el config diga

Todo lo visible que hoy dice «SLG» y significa «la casa» ya sale de `content/ui/es.json` y
`content/ui/en.json` (18 cadenas en cada uno: `hq.users.slg`, `portal.ann.emptyText`,
`auth.signin.intro`…). Eso ya es piel, porque `content/` es piel. **Pero hay dos fugas**, y son el
primer arreglo concreto de esta lista:

| Fuga | Qué pasa |
|---|---|
| `lib/auth/acceso.ts:23` | El mensaje «Si tu empresa trabaja con SLG, solicita acceso a tu contacto en SLG» está **escrito en `lib/`**, en español, fuera del diccionario. |
| `lib/invitations/service.ts:362` | Igual: «Solicita una invitación nueva a tu contacto en SLG». |

Las dos son texto de cara al usuario con la marca dentro del motor. Al diccionario.

> **CERRADO el 2026-09-21.** Las dos eran además **copias**: `auth.signin.error` y
> `auth.invitation.invalid` ya decían exactamente lo mismo en los dos idiomas, y las dos pantallas
> ya pintaban la clave, no la constante. Así que no hubo que escribir cadenas nuevas, sino **dejar
> de duplicarlas**: `lib/` exporta ahora la clave (`CLAVE_DEL_MENSAJE_NEUTRO`,
> `CLAVE_DE_TESTIGO_INVALIDO`) y quien enseña el texto lo resuelve en el idioma que toque. El campo
> `mensaje` de `ResultadoDeAceptacion` pasó a llamarse `claveDeMensaje`, que es lo que de verdad
> lleva. Un barrido por `lib/` confirma que no quedaba ninguna tercera: todo lo demás que dice «SLG»
> ahí dentro es comentario, vocabulario de roles o la identidad de §3.1.

## 3 · Piel — lo que un `site.config` tiene que dar

Aquí está el trabajo real. Ordenado por lo que hay que decidir, no por archivo.

### 3.1 Identidad (13 sitios, todos con la cadena literal «SLG Agency»)

| Dónde | Qué |
|---|---|
| `lib/content/nomenclature.ts:102` | `PUBLIC_BRAND = "SLG Agency"` — la fuente que los frenos citan |
| `lib/content/seo.ts:43,58,63,81,97,122` | título, `siteName`, `alt` de la imagen social, y el **JSON-LD**: razón social «SLG Agency Inc.» y `support@softlandingglobal.com` |
| `lib/content/rss.ts:24,28` | título del canal |
| `app/layout.tsx:17` | título por defecto del sitio |
| `app/(auth)/*/page.tsx` (6 archivos) | «Acceder · SLG Agency», «Sign in · SLG Agency»… |
| `app/(public)/**/page.tsx` (9 archivos) | `titulo: … ?? "SLG Agency"` como respaldo |
| `components/Wordmark.tsx:33,63` | etiqueta por defecto y `/marca/isotipo-slg.svg` |
| `components/ArmazonPublico.tsx:129` | `/marca/logo-softlanding-global.webp` |
| `lib/mail/templates.ts:64,65,74,78` | «Te han invitado a SLG Agency» × 2 idiomas |
| `lib/auth/better-auth.ts:161` | `invitadoPor: "SLG Agency"` en el correo de verificación |
| `lib/mail/smtp.ts:61` | `MAIL_FROM_NAME ?? "SLG Agency"` — **ya es variable**, sólo sobra el respaldo |

### 3.2 Dominio (4 sitios con `softlandingglobal.com` escrito a mano)

`lib/content/seo.ts:21`, `lib/content/rss.ts:75` y `app/api/ops/route.ts:126` lo usan como respaldo de
`NEXT_PUBLIC_SITE_URL`; `components/OverviewDeRama.tsx:75` enlaza
`https://academy.softlandingglobal.com` **sin respaldo ninguno**. El respaldo es lo peligroso: un
sitio de cliente al que se le olvide la variable no falla, **publica el dominio de SLG** en sus
etiquetas sociales. El config manda; sin config, error de compilación.

> **CERRADO el 2026-09-21 — la parte del respaldo, que era la peligrosa.** Los tres respaldos (y un
> cuarto que el inventario no vio, `scripts/ci/check-seo.ts:68`, que hacía que el propio freno del
> SEO midiera los `canonical` de otro dominio) se han reducido a **una sola función**,
> `baseDelSitio()` en `lib/content/sitio.ts`, que **no inventa nada**: sin `NEXT_PUBLIC_SITE_URL`
> lanza, y como la llaman `app/sitemap.ts`, `app/robots.ts` y el `metadatosDe()` de las 58 rutas
> mientras Next prerenderiza, **el error sale al compilar**, no al servir. Es el sitio correcto por
> una razón concreta: `NEXT_PUBLIC_*` se incrusta en el momento de compilar, así que comprobarla más
> tarde sería comprobarla cuando ya no se puede arreglar.
>
> No hizo falta freno nuevo, y eso era lo que había que mirar antes de escribir uno:
> `lib/ops/variables.ts` ya la declaraba `obligatoria: true`, `.env.example` ya la listaba,
> `check:env` ya exige que toda variable que el código lea esté en esa plantilla y `check:literacy`
> ya exige que el manual la explique. Lo único que faltaba era que el **código** se creyera lo que el
> proyecto ya declaraba. El CI la pone ahora en los dos trabajos que compilan.
>
> Lo que **sigue abierto de §3.2**: el enlace de `components/OverviewDeRama.tsx:75`, que no es un
> respaldo sino una URL de la oferta — es piel de §3.1/§3.3 y se decide con el resto.

### 3.3 Estructura — ejes, líneas y servicios (lo más caro)

Cinco tablas escritas a mano describen la oferta de SLG, y de ellas cuelga casi todo lo demás:

| Archivo | Qué contiene | Quién lo consume |
|---|---|---|
| `lib/content/rutas.ts` | `DESTINOS`, `EJES` (`voltai`, `holdings`), `RAMAS`, `SERVICIOS` y sus pares ES/EN | `MapaDelSitio`, `Regreso`, `Portada`, `BarraDeNavegacion` |
| `lib/content/schema.ts:25-28` | las cuatro ramas como **tipo** (`"VoltAi Academy"`…) | validación de frontmatter |
| `lib/content/nomenclature.ts:19-76` | 7 nombres correctos y **30 patrones de error** (`SLG_AI` → `VoltAi by SLG`, traducciones, capitalizaciones) | `check:nomenclature` |
| `components/Fotografia.tsx:18` | `POR_RUTA`: 20+ rutas → nombre de foto | la portada y cada servicio |
| `scripts/ci/check-armazon.ts:34` y `check-paginas.ts:31` | los cuatro destinos del menú y los seis bloques de la portada | dos de los 29 frenos |

**Lo bueno**: `MapaDelSitio`, `Regreso` y `Portada` ya **derivan** de la tabla; no hay que reescribir
componentes, hay que cambiar de dónde sale la tabla. **Lo caro**: los 30 patrones de nomenclatura son
trabajo editorial por cliente, no mecánico — un cliente sin nombres compuestos tendrá tres, no
treinta. La tabla debe poder quedarse **vacía** sin que `check:nomenclature` se caiga.

### 3.4 Contenido y activos (ya son piel, sólo se listan para el playbook)

`content/**` (92 registros, 76 en `copy: temporal`), `content/ui/*.json`, `public/marca/`,
`public/fotos/` (11 WebP), `app/tokens.css`.

## 4 · Lo que sale de aquí, para decidir con Ricardo

1. **El config no lleva sólo marca: lleva estructura.** Un `site.config` con nombre, dominio, logotipo
   y colores cubre §3.1 y §3.2 —26 sitios, media tarde— y no toca §3.3, que es donde está el trabajo.
   La pregunta no es «¿config?», es **«¿la estructura de ejes/líneas/servicios se declara en un
   archivo, o cada cliente tiene su `rutas.ts`?»**. Las dos son defendibles: derivar cuesta un
   generador y paga desde el segundo cliente; copiar cuesta cero y paga hasta el tercero.
2. **Los frenos son el riesgo escondido.** `check:nomenclature`, `check:armazon`, `check:paginas`,
   `check:seo` y `check:copy` validan **contra la oferta de SLG**. Con estructura por config hay que
   parametrizarlos también, o un sitio de cliente arranca con cinco frenos en rojo y alguien los
   apaga — y un freno apagado no vuelve a encenderse nunca.
3. ~~**Dos arreglos que valen la pena aunque no haya plantilla**: las dos fugas de §2 y el respaldo
   de dominio de §3.2. Son defectos hoy, en este sitio, no deuda de plantilla.~~ **Hechos el
   2026-09-21**, y por eso mismo: eran defectos de este sitio, así que no esperaron a la decisión de
   §4.1. Nada de lo que sigue abierto depende de ellos.
4. **Lo que no hay que rehacer**: `docs/blog-editor.md`, `lib/colas`, el sistema de regreso, el mapa,
   los 29 frenos y `AGENTS.md` + `profiles/software-app`. Todo eso es motor sin una sola línea de SLG.

## 5 · Infraestructura por cliente (la receta, no el código)

Ya existe y está probada en este proyecto; el playbook `crear-sitio` la ejecutaría:

- **Base**: proyecto Supabase nuevo → `npm run db:migrate` (rol dueño, host directo) → bucket privado
  → `npm run auth:primer-admin` para la primera cuenta (ver `scripts/auth/primer-admin.ts`).
- **Web**: proyecto Vercel, variables en Production y Preview desde un `ops/<cliente>.env` fuera del
  repo, protección SSO desactivada, DNS en el registrador.
- **Correo**: subdominio de envío verificado en el proveedor (DKIM + SPF); `/api/ops` lo comprueba
  antes de mandar nada.
- **CRM**: opcional. Con `crm: false` en la ficha, cada captura se avisa por correo al buzón del
  cliente (`MAIL_LEADS_TO`, obligatoria en ese caso) y queda `notified` en HQ; no se intenta ninguna
  entrega (paso 5b).
