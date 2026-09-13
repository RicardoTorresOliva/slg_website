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
  ]),
]);

export default eslintConfig;
