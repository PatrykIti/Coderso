import { runStartupMigrations } from "./startupMigrations";
import { runStartupAssistantDocsReindex } from "./startupAssistantDocs";

await runStartupMigrations();
await runStartupAssistantDocsReindex();

await import("./prod");
