import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Los fixtures negativos están ROTOS a propósito: es su trabajo. Pasarlos
    // por el linter es pedirle que arregle la prueba de que el freno frena.
    "scripts/ci/negative/**",
    // Los worktrees del agente son COPIAS COMPLETAS del repositorio, a veces de
    // otra línea de código. Lintarlas duplica cada aviso y, cuando la copia es
    // vieja, inventa errores en archivos que ya no existen: 583 en la primera
    // vez que pasó. No son fuente de este proyecto.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
