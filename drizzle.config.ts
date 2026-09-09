import { defineConfig } from "drizzle-kit";

/**
 * Configuración de migraciones. Las migraciones son SQL versionado en el repo:
 * el método (SDD) exige que un cambio de esquema sea auditable en el diff, no
 * un efecto lateral de arrancar la aplicación.
 */
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
