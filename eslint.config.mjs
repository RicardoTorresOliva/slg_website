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
    // Copias de trabajo de agentes en paralelo: son otro checkout del mismo
    // repositorio. Sin esta exclusión, cada archivo se analiza dos veces y el
    // trabajo a medias de otra rama puede tumbar la verificación de esta.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
