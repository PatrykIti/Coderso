import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Two latent defects motivated this file, both of which cost a full 28-minute smoke run.
 *
 * 1. `ru-061a-a-durable-bypass-read` was routed with the exact negation of its own frozen
 *    contract row from the smoke's first commit. The row states `showFieldMetadata:false`, the
 *    surrounding metadata-state pins state false and the next action's predicate requires false,
 *    but the runtime router passed `true`. Because the application correctly refuses to let a
 *    released stale read clobber a newer local write, `true` could only have been satisfied by an
 *    application carrying the data-loss defect the action exists to catch — the inversion did not
 *    merely fail the run, it pointed the drift detector the wrong way. Nothing bound the routed
 *    boolean to the stated one, so four commits carried it unnoticed.
 *
 * 2. Every runtime-operation failure is an executor invariant, and no classifier pattern matched
 *    an executor invariant message, so all 76 runtime-kind actions collapsed to `unclassified`.
 *    That is why the run above ended naming an action id and nothing else.
 */

const root = path.resolve(import.meta.dir, "../../..");
const smokeRoot = "_docs/_workflows/task-540-smoke";

const workflowPaths = Object.freeze({
  executorConfig: `${smokeRoot}/executor/config.mjs`,
  operationRouter: `${smokeRoot}/runtime/operation-router.mjs`,
  plan: `${smokeRoot}/contract/plan.mjs`,
  requirements: `${smokeRoot}/contract/requirements.mjs`,
  retentionUserRows: `${smokeRoot}/contract/actions/retention-user.mjs`,
});

type RuntimeContext = Readonly<Record<string, never>>;
type RuntimeStubArgument = RuntimeContext | string | boolean;
type RuntimeStub = (...args: readonly RuntimeStubArgument[]) => void;
type RuntimeHandler = (context: RuntimeContext) => void;

interface SmokePlan {
  readonly actionManifest: readonly { readonly id: string }[];
  readonly registries: {
    readonly runtimeOperations: Readonly<Record<string, { readonly actionId: string }>>;
  };
}

interface RuntimeOperationRouter {
  readonly buildRuntimeOperationHandlers: (
    planAuthority: SmokePlan
  ) => Readonly<Record<string, RuntimeHandler>>;
}

interface RouterModule {
  readonly createRuntimeOperationRouter: (
    dependencies: Readonly<Record<string, RuntimeStub>>
  ) => RuntimeOperationRouter;
}

interface PlanModule {
  readonly buildTask540SmokePlan: (input: { readonly nonce: string }) => SmokePlan;
}

interface RequirementsModule {
  readonly REQUIRED_ISOLATED_API_READ_EXPECTATIONS: Readonly<Record<string, boolean>>;
}

interface ExecutorConfigModule {
  readonly FAILURE_REASON_HARNESS_PATTERN: RegExp;
  readonly MAX_RUNTIME_INVARIANT_TOKEN_SLUG_LENGTH: number;
  readonly RUNTIME_INVARIANT_PREFIX: string;
  readonly classifyFailureReasonNeverThrow: (cause: Error) => string | null;
  readonly projectRuntimeInvariantToken: (message: string) => string | null;
}

function absolute(relativePath: string): string {
  return path.join(root, relativePath);
}

function readSource(relativePath: string): string {
  return readFileSync(absolute(relativePath), "utf8");
}

function statedShowFieldMetadata(source: string, actionId: string): boolean {
  const rowStart = source.indexOf(`"${actionId}",`);
  expect(rowStart).toBeGreaterThanOrEqual(0);
  const rowEnd = source.indexOf("\n  ],", rowStart);
  expect(rowEnd).toBeGreaterThan(rowStart);
  const row = source.slice(rowStart, rowEnd);
  expect(row).toContain("isolatedApiSessionApiReadAs(");
  const stated = /showFieldMetadata:\s*(true|false)/u.exec(row);
  expect(stated).not.toBeNull();
  return stated !== null && stated[1] === "true";
}

test("every isolated durable read routes the boolean its frozen contract row states", async () => {
  const requirements: RequirementsModule = await import(absolute(workflowPaths.requirements));
  const planModule: PlanModule = await import(absolute(workflowPaths.plan));
  const routerModule: RouterModule = await import(absolute(workflowPaths.operationRouter));
  const expectations = requirements.REQUIRED_ISOLATED_API_READ_EXPECTATIONS;
  const rowSource = readSource(workflowPaths.retentionUserRows);

  expect(Object.keys(expectations).sort()).toEqual([
    "ru-047a-a-durable-proof",
    "ru-051-a-server-false-proof",
    "ru-061a-a-durable-bypass-read",
  ]);

  // The contract prose is the authority. The table must restate it exactly.
  for (const [actionId, expected] of Object.entries(expectations)) {
    expect([actionId, statedShowFieldMetadata(rowSource, actionId)]).toEqual([actionId, expected]);
  }

  // And the executable must assert what the table says. This drives the REAL router, so a
  // hardcoded literal that disagrees with the contract fails here rather than 424 actions into a
  // 28-minute run.
  const routedExpectations: Record<string, RuntimeStubArgument> = {};
  let routedActionId = "";
  const noop: RuntimeStub = () => {};
  const dependencies = new Proxy(
    {
      runtimeUserAPreferenceRead: (...args: readonly RuntimeStubArgument[]) => {
        routedExpectations[routedActionId] = args[1] ?? "absent";
      },
    },
    {
      get(target: Record<string, RuntimeStub>, property: string): RuntimeStub {
        return property in target ? target[property]! : noop;
      },
      has(): boolean {
        return true;
      },
    }
  );
  const plan = planModule.buildTask540SmokePlan({ nonce: "0123456789ab" });
  const handlers = routerModule
    .createRuntimeOperationRouter(dependencies)
    .buildRuntimeOperationHandlers(plan);
  // Deriving the three handlers from a table must not change the registry they satisfy. The
  // executor asserts this at run time; asserting it here means a broken derivation costs a second,
  // not a 28-minute run.
  expect(Object.keys(handlers).sort()).toEqual(
    Object.keys(plan.registries.runtimeOperations).sort()
  );

  const context: RuntimeContext = Object.freeze({});
  for (const actionId of Object.keys(expectations)) {
    routedActionId = actionId;
    const handler = handlers[`runtime/${actionId}`];
    expect(typeof handler).toBe("function");
    handler?.(context);
  }
  expect(routedExpectations).toEqual({ ...expectations });

  // Guard the class of defect, not just the instance: a restated literal is exactly what let the
  // router and the contract disagree in the first place.
  const routerSource = readSource(workflowPaths.operationRouter);
  expect(routerSource).toContain("REQUIRED_ISOLATED_API_READ_EXPECTATIONS");
  expect(routerSource).not.toContain("runtimeUserAPreferenceRead(context, true)");
  expect(routerSource).not.toContain("runtimeUserAPreferenceRead(context, false)");
});

test("runtime invariant messages classify to a bounded token instead of unclassified", async () => {
  const config: ExecutorConfigModule = await import(absolute(workflowPaths.executorConfig));
  const { RUNTIME_INVARIANT_PREFIX: prefix } = config;

  // The exact message ru-061a raised. It reported "unclassified" for the whole programme.
  expect(
    config.classifyFailureReasonNeverThrow(new Error(`${prefix}isolated preference read drift`))
  ).toBe("wf540_rt_isolated_preference_read_drift");
  expect(
    config.classifyFailureReasonNeverThrow(new Error(`${prefix}user-A API session is unavailable`))
  ).toBe("wf540_rt_user_a_api_session_is_unavailable");

  // Unbounded prose is truncated into the frozen vocabulary rather than emitted whole or dropped.
  const longToken = config.projectRuntimeInvariantToken(`${prefix}${"phrase ".repeat(200)}`);
  expect(longToken).not.toBeNull();
  expect(longToken ?? "").toMatch(config.FAILURE_REASON_HARNESS_PATTERN);
  expect((longToken ?? "").length).toBeLessThanOrEqual(
    "wf540_rt_".length + config.MAX_RUNTIME_INVARIANT_TOKEN_SLUG_LENGTH
  );

  // Only source-literal prose is projected. An interpolated invariant — an id, a path, a count, a
  // connection string — abstains, so naming the runtime lane cannot leak data into the diagnostic.
  for (const interpolated of [
    "capture owner action is missing: ru-061a-a-durable-bypass-read",
    "postgres://wf540:p@ssword@localhost/example",
    "expected 496 actions",
  ]) {
    expect(config.projectRuntimeInvariantToken(`${prefix}${interpolated}`)).toBeNull();
    expect(config.classifyFailureReasonNeverThrow(new Error(`${prefix}${interpolated}`))).toBe(
      "unclassified"
    );
  }
  expect(config.projectRuntimeInvariantToken("isolated preference read drift")).toBeNull();
});
