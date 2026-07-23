import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testFilePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(testFilePath), "../../../");

if (process.env.CODERSO_PRODUCTION_JSX_IMPORT_PROBE === "1") {
  await import("../../../core/services/pages/pageRendererV2");
  console.log("page-renderer-import=ok");
  console.log(`node-env=${process.env.NODE_ENV}`);
} else {
  test("production Bun imports the page renderer without a jsxDEV runtime failure", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--config=../bunfig.toml",
        "--preload=./server/productionReactRuntime.ts",
        "run",
        testFilePath,
      ],
      {
        cwd: path.join(root, "core"),
        encoding: "utf8",
        env: { ...process.env, CODERSO_PRODUCTION_JSX_IMPORT_PROBE: "1", NODE_ENV: "production" },
      }
    );
    const stderr = result.stderr;
    const stdout = result.stdout;

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect({ exitCode: result.status, stderr }).toEqual({ exitCode: 0, stderr: "" });
    expect(stdout).toContain("page-renderer-import=ok");
    expect(stdout).toContain("node-env=production");
    expect(`${stdout}\n${stderr}`).not.toContain("jsxDEV");
  });
}
