import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const packageJsonPath = path.resolve(import.meta.dir, "../../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  scripts?: Record<string, string>;
};

test("package scripts keep precommit explicit, expose admin seed, and avoid install-time prepare hooks", () => {
  const scripts = packageJson.scripts ?? {};

  expect(scripts.prepare).toBeUndefined();
  expect(scripts.precommit).toBe("bun run format:staged && bun run precommit:check");
  expect(scripts["precommit:check"]).toContain("bun --cwd core lint");
  expect(scripts["precommit:check"]).toContain("bun --cwd core lint:types");
  expect(scripts["db:seed:admin"]).toBe(
    "set -a; [ ! -f .env ] || . ./.env; set +a; bun core/db/seed.ts"
  );
});
