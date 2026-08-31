import { pathToFileURL } from "node:url";
import { resolveInsideRoot, SmokeError, type SmokeInput, type SmokeSuiteId } from "./contracts";
import { isSmokeAdapter, type SmokeAdapter } from "./adapters/types";

export interface SmokeSuiteDescriptor {
  readonly id: SmokeSuiteId;
  readonly adapterPath: string;
  loadFixedAdapter(root: string): Promise<SmokeAdapter>;
}

const ADAPTER_PATHS: Readonly<Record<SmokeSuiteId, string>> = Object.freeze({
  "task-540": "scripts/runtime-smoke/adapters/task-540.ts",
  "task-547": "scripts/runtime-smoke/adapters/task-547.ts",
  "task-554": "scripts/runtime-smoke/adapters/task-554.ts",
  "widget-contract": "scripts/runtime-smoke/adapters/widget-contract.ts",
  "production-boundary": "scripts/runtime-smoke/adapters/production-boundary.ts",
  "task-487": "scripts/runtime-smoke/adapters/task-487.ts",
  "task-488": "scripts/runtime-smoke/adapters/task-488.ts",
  "task-490": "scripts/runtime-smoke/adapters/task-490.ts",
  "task-491": "scripts/runtime-smoke/adapters/task-491.ts",
  "task-492": "scripts/runtime-smoke/adapters/task-492.ts",
  "task-511": "scripts/runtime-smoke/adapters/task-511.ts",
  "task-517": "scripts/runtime-smoke/adapters/task-517.ts",
  "task-493": "scripts/runtime-smoke/adapters/task-493.ts",
  "detail-page-v2": "scripts/runtime-smoke/adapters/detail-page-v2.ts",
  "task-105-l05": "scripts/runtime-smoke/adapters/task-105-l05.ts",
});

function adapterDefault(loaded: unknown): unknown {
  if (loaded === null || typeof loaded !== "object") return undefined;
  const direct = Reflect.get(loaded, "default");
  if (isSmokeAdapter(direct)) return direct;
  if (direct === null || typeof direct !== "object") return direct;
  return Reflect.get(direct, "default");
}

function descriptor(id: SmokeSuiteId): SmokeSuiteDescriptor {
  const adapterPath = ADAPTER_PATHS[id];
  return Object.freeze({
    id,
    adapterPath,
    async loadFixedAdapter(root: string): Promise<SmokeAdapter> {
      const absolute = resolveInsideRoot(root, adapterPath, "adapter path");
      let loaded: unknown;
      try {
        loaded = await import(pathToFileURL(absolute).href);
      } catch (error) {
        throw new SmokeError("smoke_adapter_unavailable", `${id} adapter is unavailable`, {
          cause: error,
        });
      }
      // tsx exposes one CJS-interop default wrapper when this fixed TypeScript module is loaded
      // by the Node-owned orchestrator. Bun exposes the adapter directly. Accept exactly those
      // two shapes and let the strict adapter contract reject everything else.
      const candidate = adapterDefault(loaded);
      if (!isSmokeAdapter(candidate) || candidate.suiteId !== id) {
        throw new SmokeError("smoke_adapter_unavailable", `${id} adapter contract is invalid`);
      }
      return candidate;
    },
  });
}

const DESCRIPTORS = new Map<SmokeSuiteId, SmokeSuiteDescriptor>([
  ["task-540", descriptor("task-540")],
  ["task-547", descriptor("task-547")],
  ["task-554", descriptor("task-554")],
  ["widget-contract", descriptor("widget-contract")],
  ["production-boundary", descriptor("production-boundary")],
  ["task-487", descriptor("task-487")],
  ["task-488", descriptor("task-488")],
  ["task-490", descriptor("task-490")],
  ["task-491", descriptor("task-491")],
  ["task-492", descriptor("task-492")],
  ["task-511", descriptor("task-511")],
  ["task-517", descriptor("task-517")],
  ["task-493", descriptor("task-493")],
  ["detail-page-v2", descriptor("detail-page-v2")],
  ["task-105-l05", descriptor("task-105-l05")],
]);

export const staticSmokeRegistry = Object.freeze({
  ids(): readonly SmokeSuiteId[] {
    return Object.freeze([...DESCRIPTORS.keys()]);
  },
  require(input: Pick<SmokeInput, "suite"> | SmokeSuiteId): SmokeSuiteDescriptor {
    const id = typeof input === "string" ? input : input.suite;
    const found = DESCRIPTORS.get(id);
    if (found === undefined) {
      throw new SmokeError("smoke_argument_invalid", "suite is not registered");
    }
    return found;
  },
});
