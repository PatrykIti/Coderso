import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("admin tailwind sources include widgets", async () => {
  const cssPath = path.resolve(
    process.cwd(),
    "core",
    "admin",
    "styles",
    "globals.css"
  );
  const content = await readFile(cssPath, "utf8");

  expect(content).toContain('@source "../**/*.{ts,tsx}";');
  expect(content).toContain('@source "../../widgets/**/*.{ts,tsx}";');
});

test("admin card border token maps onto card surfaces", async () => {
  const cssPath = path.resolve(
    process.cwd(),
    "core",
    "admin",
    "styles",
    "globals.css"
  );
  const content = await readFile(cssPath, "utf8");

  expect(content).toContain('[data-slot="card"]');
  expect(content).toContain("--border: var(--admin-card-border);");
  expect(content).toContain("--color-border: var(--admin-card-border);");
});
