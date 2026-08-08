import { resolve } from "node:path";
import type { PlaywrightCliNativeCommand } from "../../../../browser/playwright-cli-dispatcher";
import { SmokeError } from "../../../../contracts";
import type { Task540ExecutionMemory } from "../composition/memory";
import type { Task540NativeAction, Task540NativePlan } from "../composition/contracts";
import { materializeTask540RunCodeSource } from "./materialization/source-compiler.mjs";

export interface Task540BrowserSecrets {
  readonly ADMIN_EMAIL: string;
  readonly ADMIN_PASSWORD: string;
}

export type Task540BrowserNativeCommand = PlaywrightCliNativeCommand;

export type Task540StandaloneMaterialization =
  | { readonly kind: "source"; readonly source: string }
  | { readonly kind: "native"; readonly command: Task540BrowserNativeCommand }
  | { readonly kind: "close" }
  | { readonly kind: "session-absence" };

function literal(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

function requireSecret(value: string | undefined): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 32_768 ||
    value.includes("\0")
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 browser secret is unavailable");
  }
  return value;
}

function resolveSelector(ref: unknown, plan: Task540NativePlan): string {
  if (ref === null || typeof ref !== "object" || Array.isArray(ref)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 selector ref is invalid");
  }
  const templateId = Reflect.get(ref, "templateId");
  const args = Reflect.get(ref, "args");
  const template =
    typeof templateId === "string" ? plan.registries.selectors[templateId] : undefined;
  if (
    template === null ||
    typeof template !== "object" ||
    !Array.isArray(args) ||
    args.length !== 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 selector ref is unsupported");
  }
  const parts = Reflect.get(template, "parts");
  if (!Array.isArray(parts) || parts.length !== 1 || typeof parts[0] !== "string") {
    throw new SmokeError("smoke_output_invalid", "TASK-540 selector template is unsupported");
  }
  return parts[0];
}

function resolvePathRef(
  ref: unknown,
  plan: Task540NativePlan,
  memory: Task540ExecutionMemory
): string {
  const key = ref !== null && typeof ref === "object" ? Reflect.get(ref, "key") : undefined;
  const descriptor = typeof key === "string" ? plan.registries.paths[key] : undefined;
  if (typeof descriptor === "string") {
    if (descriptor.startsWith("http")) return descriptor;
    const origins = Reflect.get(plan.fixtureBlueprint, "origins");
    const admin =
      origins !== null && typeof origins === "object" ? Reflect.get(origins, "admin") : null;
    if (typeof admin !== "string" || !descriptor.startsWith("/")) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 path origin is invalid");
    }
    return admin + descriptor;
  }
  if (descriptor === null || typeof descriptor !== "object" || Array.isArray(descriptor)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 path ref is invalid");
  }
  const template = Reflect.get(descriptor, "template");
  const captures = Reflect.get(descriptor, "captures");
  if (typeof template !== "string" || !Array.isArray(captures)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 path template is invalid");
  }
  let path = template;
  for (const capture of captures) {
    if (typeof capture !== "string") {
      throw new SmokeError("smoke_output_invalid", "TASK-540 path capture is invalid");
    }
    const value = memory.captures.get(capture);
    if (value === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 path capture is absent");
    }
    path = path.replace(`{${capture}}`, encodeURIComponent(value));
  }
  const origins = Reflect.get(plan.fixtureBlueprint, "origins");
  const admin =
    origins !== null && typeof origins === "object" ? Reflect.get(origins, "admin") : null;
  if (typeof admin !== "string" || !path.startsWith("/") || path.includes("{")) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 path expansion drifted");
  }
  return admin + path;
}

function ledgerInstallSource(): string {
  return `async (page) => {
    const context = page.context();
    if (!Object.prototype.hasOwnProperty.call(context, "__wf540ScenarioLedger")) {
      const ledger = { current: null, consoleErrors: [], pageErrors: [], transitions: [] };
      const bound = new WeakSet();
      const instrument = (candidate) => {
        if (bound.has(candidate)) return;
        bound.add(candidate);
        candidate.on("console", (message) => {
          if (message.type() === "error" && ledger.consoleErrors.length < 64) {
            ledger.consoleErrors.push(message.text().slice(0, 512));
          }
        });
        candidate.on("pageerror", (error) => {
          if (ledger.pageErrors.length < 64) {
            ledger.pageErrors.push(String(error?.message ?? error).slice(0, 512));
          }
        });
      };
      Object.defineProperties(context, {
        __wf540ScenarioLedger: { value: ledger, configurable: false, writable: false },
        __wf540StartScenarioEpoch: { value: (scenario) => {
          if (ledger.current !== null) {
            ledger.transitions.push(Object.freeze({
              scenario: ledger.current,
              consoleErrors: Object.freeze([...ledger.consoleErrors]),
              pageErrors: Object.freeze([...ledger.pageErrors]),
            }));
          }
          ledger.current = scenario;
          ledger.consoleErrors.length = 0;
          ledger.pageErrors.length = 0;
          return true;
        }, configurable: false, writable: false },
        __wf540ReadScenarioLedger: { value: () => Object.freeze({
          scenario: ledger.current,
          consoleErrors: Object.freeze([...ledger.consoleErrors]),
          pageErrors: Object.freeze([...ledger.pageErrors]),
        }), configurable: false, writable: false },
      });
      context.on("page", instrument);
      for (const candidate of context.pages()) instrument(candidate);
    }
    context.__wf540StartScenarioEpoch("setup");
    await page.goto("about:blank");
    return { ok: true };
  }`;
}

function wrapActionSource(input: {
  readonly action: Task540NativeAction;
  readonly source: string;
  readonly startScenarioEpoch: boolean;
  readonly screenshotPath?: string;
}): string {
  return `async (page) => {
    const context = page.context();
    if (${input.startScenarioEpoch ? "true" : "false"}) {
      if (typeof context.__wf540StartScenarioEpoch !== "function") {
        throw new Error("wf540_scenario_ledger_absent");
      }
      context.__wf540StartScenarioEpoch(${literal(input.action.scenario)});
    }
    const authoredOutput = await (${input.source})(page);
    const projection = typeof context.__wf540ReadLogProjection === "function"
      ? context.__wf540ReadLogProjection()
      : null;
    const fallback = typeof context.__wf540ReadScenarioLedger === "function"
      ? context.__wf540ReadScenarioLedger()
      : { consoleErrors: [], pageErrors: [] };
    const consoleErrors = Array.isArray(projection?.aggregate?.consoleErrors)
      ? projection.aggregate.consoleErrors.map((entry) => String(entry.text ?? entry).slice(0, 512))
      : fallback.consoleErrors;
    const pageErrors = Array.isArray(projection?.aggregate?.pageErrors)
      ? projection.aggregate.pageErrors.map((entry) => String(entry.text ?? entry).slice(0, 512))
      : fallback.pageErrors;
    const visibleEffect = await page.evaluate(() => {
      const body = document.body;
      const style = body ? getComputedStyle(body) : null;
      return {
        bodyVisible: Boolean(body && style && style.display !== "none" && style.visibility !== "hidden"),
        colorScheme: style?.colorScheme ?? "normal",
        height: Math.max(document.documentElement?.clientHeight ?? 0, 0),
        width: Math.max(document.documentElement?.clientWidth ?? 0, 0),
      };
    });
    return {
      actionId: ${literal(input.action.id)},
      authoredOutput,
      consoleErrors,
      listenerEpochStartedBeforeNavigation: true,
      pageErrors,
      scenarioId: ${literal(input.action.scenario)},
      screenshotPath: ${literal(input.screenshotPath ?? null)},
      visibleEffect,
    };
  }`;
}

export function buildTask540BrowserActionSource(input: {
  readonly action: Task540NativeAction;
  readonly plan: Task540NativePlan;
  readonly memory: Task540ExecutionMemory;
  readonly root: string;
  readonly secrets: Task540BrowserSecrets;
  readonly firstBrowserActionInScenario: boolean;
}): string {
  let source: string;
  if (input.action.executable.type === "browser-run-code") {
    source = materializeTask540RunCodeSource({
      action: input.action,
      plan: input.plan,
      captures: input.memory.captures,
      priorOutputs: input.memory.priorOutputs,
      variables: input.memory.variables,
      root: input.root,
      browserCwd: input.root,
      runtimeConfig: input.memory.runtimeConfig(),
    });
  } else if (input.action.executable.operationId === "open-about-blank") {
    source = ledgerInstallSource();
  } else if (input.action.executable.operationId === "fill-secret") {
    const [selectorRef, secretRef] = input.action.executable.refs ?? [];
    const candidateName: unknown =
      secretRef !== null && typeof secretRef === "object" ? Reflect.get(secretRef, "name") : null;
    if (candidateName !== "ADMIN_EMAIL" && candidateName !== "ADMIN_PASSWORD") {
      throw new SmokeError("smoke_output_invalid", "TASK-540 secret ref is unsupported");
    }
    const name: keyof Task540BrowserSecrets = candidateName;
    const selector = resolveSelector(selectorRef, input.plan);
    const secret = requireSecret(input.secrets[name]);
    source = `async (page) => { const target = page.locator(${literal(selector)}); await target.waitFor({ state: "visible", timeout: 30000 }); if (await target.count() !== 1) throw new Error("wf540_secret_target_count"); await target.fill(${literal(secret)}); return { ok: true }; }`;
  } else if (input.action.executable.type === "browser-screenshot") {
    const screenshotId = input.action.executable.screenshotId;
    const screenshotPath =
      typeof screenshotId === "string" ? input.plan.registries.screenshotPaths[screenshotId] : null;
    if (
      typeof screenshotPath !== "string" ||
      !input.plan.requiredScreenshotPaths.includes(screenshotPath)
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 screenshot identity drifted");
    }
    const absolute = resolve(input.root, screenshotPath);
    source = `async (page) => { await page.screenshot({ path: ${literal(absolute)}, fullPage: ${input.action.executable.fullPage === true ? "true" : "false"} }); return true; }`;
    return wrapActionSource({
      action: input.action,
      source,
      startScenarioEpoch: input.firstBrowserActionInScenario,
      screenshotPath,
    });
  } else {
    throw new SmokeError("smoke_output_invalid", "TASK-540 action has no run-code source");
  }
  return wrapActionSource({
    action: input.action,
    source,
    startScenarioEpoch:
      input.firstBrowserActionInScenario &&
      input.action.executable.operationId !== "open-about-blank",
  });
}

export function materializeTask540Standalone(input: {
  readonly action: Task540NativeAction;
  readonly plan: Task540NativePlan;
  readonly memory: Task540ExecutionMemory;
  readonly root: string;
  readonly secrets: Task540BrowserSecrets;
  readonly firstBrowserActionInScenario: boolean;
}): Task540StandaloneMaterialization {
  const operationId = input.action.executable.operationId;
  if (
    operationId === "open-about-blank" ||
    operationId === "fill-secret" ||
    input.action.executable.type === "browser-screenshot"
  ) {
    return Object.freeze({ kind: "source", source: buildTask540BrowserActionSource(input) });
  }
  if (operationId === "tab-new") {
    return Object.freeze({
      kind: "native",
      command: Object.freeze({
        operation: "tab-new",
        url: resolvePathRef(input.action.executable.refs?.[0], input.plan, input.memory),
      }),
    });
  }
  if (operationId === "tab-select" || operationId === "tab-close") {
    const value = Reflect.get(input.action.executable.refs?.[0] ?? {}, "value");
    if (!Number.isSafeInteger(value) || value < 0 || value > 31) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 tab index is invalid");
    }
    return Object.freeze({
      kind: "native",
      command: Object.freeze({ operation: operationId, index: value }),
    });
  }
  if (operationId === "route-list") {
    return Object.freeze({ kind: "native", command: Object.freeze({ operation: "route-list" }) });
  }
  if (operationId === "close") return Object.freeze({ kind: "close" });
  if (input.action.executable.type === "browser-global-list") {
    return Object.freeze({ kind: "session-absence" });
  }
  throw new SmokeError("smoke_output_invalid", "TASK-540 standalone operation is unknown");
}
