import { runStartupMigrations } from "./startupMigrations";

await runStartupMigrations();

await import("./prod");
