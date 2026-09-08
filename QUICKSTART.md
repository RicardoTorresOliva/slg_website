# APP_Builder v4.1 — Quickstart

Procedimiento operativo del template: una preparación única y, a partir de ahí, un flujo estándar
por cada proyecto nuevo. Todos los punteros de plataforma vienen **pre-instalados en la raíz**
(`CLAUDE.md` + `.claude/` para Claude Code, `.cursor/` para Cursor, `AGENTS.md` leído nativamente
por el resto). Cada herramienta lee únicamente el suyo e ignora los demás: el template funciona en
cualquier plataforma sin paso de instalación.

---

## Preparación única del template (2 minutos)

**Dónde:** GitHub (navegador) y, para el paso 2, la terminal integrada de su IDE.

1. **Cree un repositorio Git** con el contenido de esta carpeta y publíquelo en GitHub como
   repositorio plantilla (Settings → "Template repository"). Nombre sugerido:
   `APP_Builder-Template_v4.1`.
2. **Haga ejecutables los scripts:**

   ```
   chmod +x scripts/*.sh install-adapter.sh
   ```

3. **(Opcional) Active los gates de verificación:** copie `ci/app-builder-gates.yml` a
   `.github/workflows/` *o* `ci/pre-commit-config.yaml` a `.pre-commit-config.yaml`.

El template queda listo para usarse en Claude Code, Cursor, Antigravity o cualquier otra plataforma.

---

## Flujo por cada proyecto nuevo

**Dónde:** GitHub para el paso 1; su IDE agéntico (Claude Code Desktop, Cursor, etc.) para el resto.

1. **Duplique la plantilla** (en GitHub: "Use this template") y cree un **repositorio privado por
   caso** con el nombre del proyecto. No inicie un caso con `git clone` del repositorio canónico:
   heredaría el linaje git del molde.
   *Nota GitHub Desktop:* al clonar se crea siempre una subcarpeta con el nombre del repositorio;
   seleccione como destino la carpeta *padre*, no una carpeta intermedia pre-creada.
2. **Abra el proyecto en su IDE.** La gobernanza se carga automáticamente, sin acción adicional.
3. **(Opcional, recomendado la primera vez)** ejecute `/bootstrap` — detecta la plataforma y
   confirma el setup. Si se omite, `/init-project` lo ejecuta en su paso 0.
4. **Describa el proyecto:** complete `START_PROJECT.md` (o descríbalo en el chat).
5. **Planifique:** ejecute `/init-project`. El agente:
   - selecciona el **Asset Profile** (software-app / research-report / data-product /
     intelligence-product…) y lo confirma con usted,
   - formula las preguntas bloqueantes,
   - **explora opciones de stack y presenta 2–3 con trade-offs para que usted elija** (sin defaults),
   - descompone el trabajo en Foundation Units + Deliverable Units agrupadas por milestones,
   - y presenta el plan. **No produce nada hasta recibir aprobación.**
6. **Apruebe el plan.**
7. **Construya:** ejecute `/start-execution`. El agente corre el pre-flight check y produce el
   activo, con review independiente por milestone.
8. **Si la sesión se corta:** abra una conversación nueva y ejecute `/session-start` — retoma
   exactamente donde quedó.
9. **Tras la entrega, para cambios:** ejecute `/iterate` y describa el cambio.

> En v4.1 la única decisión nueva al inicio es **el tipo de activo (Asset Profile)**. Reglas,
> calidad, documentación, verificación y optimización de tokens las gestiona el sistema. El stack
> lo elige el usuario, no el sistema.

---

## Cambios respecto a v3.1

| v3.1 | v4.1 | Motivo |
|------|------|--------|
| Prompt 0 para generar el template | **Eliminado** — el template se entrega completo | Menos pasos (via negativa) |
| `CLAUDE.md` único, solo Claude Code | `AGENTS.md` + punteros pre-instalados por plataforma | Corre en cualquier plataforma sin instalación |
| `start_project_prompt` | `START_PROJECT.md` | Mismo rol, ahora con selección de perfil |
| `/init-project`, `/start-execution`, `/session-start`, `/review`, `/iterate` | **Sin cambios** | Continuidad del flujo conocido |
| Infrastructure Tasks / User Journeys | Foundation Units / Deliverable Units | Genérico para cualquier activo, no solo software |
| Stack por defecto (JWT, Docker…) | Exploración + elección del usuario (HITL) | Antifragilidad: sin lock-in |

---

## Estado del template

**Operativo:** el flujo completo descrito arriba para los perfiles `software-app`,
`research-report`, `data-product` e `intelligence-product`.

**Refinamiento pendiente (no bloquea el uso):** la capa de conocimiento OKF se genera durante
`init-project`; el template no incluye todavía bundles pre-construidos. La carpeta `examples/`
está disponible para incorporar proyectos de referencia, siempre etiquetados como ejemplos y
nunca referenciados por el núcleo.
