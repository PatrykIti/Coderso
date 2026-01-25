import type { Config } from "drizzle-kit";

export default {
  schema: "./core/db/schema.ts",
  out: "./core/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
