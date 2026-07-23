import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../../");

test("Vitest workers leave browser storage ownership to their DOM environment", () => {
  const config = readFileSync(path.join(root, "vitest.config.ts"), "utf-8");

  expect(config).toContain('execArgv: ["--no-experimental-webstorage"]');
  expect(config).not.toContain("--disable-warning");
  expect(config).not.toContain("--no-warnings");
});
