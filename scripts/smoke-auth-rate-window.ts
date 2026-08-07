/**
 * Auth rate-limit window control for the TASK-540 smoke's TEST database.
 *
 * WHY THIS EXISTS
 * ---------------
 * The smoke plan contains six `authRateWindowBarrier` actions. Each one waits
 * for the configured auth rate-limit window to expire so the next authenticated
 * burst starts against a fresh fixed-window counter. The wait is DERIVED, never
 * hard-coded:
 *
 *   scripts/runtime-smoke/adapters/task-540/suite/browser/materialization/
 *     generic-invocations.mjs
 *     const waitMs = policy.enabled ? policy.windowSeconds * 1000 + 1000 : 0;
 *
 * and `policy` is read live out of the database by a bridge subprocess that
 * calls `getSecuritySettings()`. With no `security.settings` row the deployment
 * runs on `SECURITY_SETTINGS_DEFAULTS` (`auth: { windowSeconds: 60,
 * maxRequests: 10 }`), so each barrier sleeps 61 s and the six barriers cost
 * 366 s of the run.
 *
 * Shortening that cost is therefore a CONFIGURATION change, not a code change.
 * This script writes the window through the supported service write path
 * (`setSecuritySettings`), which leaves both the product default and the
 * barrier builder untouched: the barrier keeps deriving its wait from whatever
 * this script persisted, so it can never wait less than the window it has to
 * outlast.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 *  - It does not edit `DEFAULT_SECURITY_SETTINGS`. That would change the shipped
 *    security posture of every deployment, and the defaults test compares
 *    `getSecuritySettings()` against the same constant, so the change would land
 *    silently green.
 *  - It does not hard-code a smaller sleep into `buildAuthRateWindowBarrierSource`.
 *    That would decouple the barrier from the real window.
 *  - It does not clear limiter state (`resetRateLimitBuckets`). The barrier's job
 *    is to prove the window EXPIRES; erasing the counter would defeat it.
 *
 * COST OF THE FAST WINDOW (read before using it)
 * ----------------------------------------------
 * The frozen contract declares any enabled window in [1, 60] s with
 * `maxRequests >= 10` equally in spec, so nothing becomes false. What a short
 * window stops exercising is one implicit proof: two epochs of the plan charge
 * exactly 10 of the 10 allowed auth requests for a single identity, so a run on
 * the shipped 60 s default demonstrates every time that those real-user flows
 * fit exactly inside the shipped auth budget. A 5 s window hands them ~12x
 * headroom and that edge proof goes unexercised.
 *
 * Treat the fast window as an iteration aid only. Run `--restore` and take at
 * least one confirmation run on the 60 s default before declaring the smoke
 * green.
 *
 * ORDERING IS LOAD-BEARING
 * ------------------------
 * `getSecuritySettings()` memoises into a module-level `cachedSettings` and
 * nothing in the application calls `resetSecuritySettingsCache()`, so a backend
 * process caches the window it read first for its entire lifetime. If the window
 * were shrunk under a RUNNING backend, the barrier would start waiting 6 s while
 * the server kept enforcing 60 s — the barrier would then wait LESS than the
 * window it must outlast, hits would accumulate across it, and an action would
 * 429 that does not 429 today. That is why every mutating mode below refuses
 * while the backend port is accepting connections. There is no override flag,
 * because there is no safe way to override it: stop the backend, run this, start
 * the backend again.
 *
 * USAGE
 * -----
 *   bun run smoke:auth-window:status    # read-only, safe at any time
 *   bun run smoke:auth-window:fast      # 5 s window  -> 6 s barriers
 *   bun run smoke:auth-window:restore   # delete the row -> back to the 60 s default
 *   bun scripts/smoke-auth-rate-window.ts --seconds=3
 */

import net from "node:net";
import { eq } from "drizzle-orm";
import { db } from "../core/db/client";
import { settings } from "../core/db/schema";
import {
  SECURITY_SETTINGS_DEFAULTS,
  getSecuritySettings,
  resetSecuritySettingsCache,
  setSecuritySettings,
  type SecuritySettings,
} from "../core/services/settings/securitySettings";

/**
 * Mirrors the (unexported) `SECURITY_SETTINGS_KEY` in
 * `core/services/settings/securitySettings.ts`. The literal is self-checking:
 * after writing through `setSecuritySettings` we assert that a row with exactly
 * this key exists, so a drifted literal fails loudly instead of quietly
 * inspecting or deleting nothing.
 */
const SECURITY_SETTINGS_ROW_KEY = "security.settings";

/**
 * The band the frozen smoke contract accepts, from
 * `scripts/runtime-smoke/adapters/task-540/suite/contract/requirements.mjs`
 * (`requiredEnabledWindowSecondsMin: 1`, `requiredEnabledWindowSecondsMax: 60`,
 * `requiredEnabledMaxRequests: 10`). Enforced here so a bad value is rejected
 * before it reaches the database; the smoke's own `set-004c` capacity preflight
 * re-checks it live and fails the run if these ever drift apart.
 */
const CONTRACT_WINDOW_SECONDS_MIN = 1;
const CONTRACT_WINDOW_SECONDS_MAX = 60;
const CONTRACT_MIN_MAX_REQUESTS = 10;

/**
 * 5 s, not the contract floor of 1 s. Two reasons. The barrier's `+1000 ms`
 * safety margin stays a proportionate 20 % of the window instead of a 100 %
 * fudge factor, and 5 s is the smallest window that still contains the largest
 * single-action auth burst in the plan (5 requests for one identity), so a whole
 * action's burst is still limiter-checked inside one real window. At 1 s even
 * that straddles a reset and nothing is checked.
 */
const RECOMMENDED_FAST_WINDOW_SECONDS = 5;

const BACKEND_PROBE_HOST = "127.0.0.1";
const BACKEND_PROBE_TIMEOUT_MS = 1_500;

type AuthBucketView = {
  enabled: boolean;
  windowSeconds: number;
  maxRequests: number;
  barrierWaitMs: number;
};

/**
 * Echo of the barrier's own formula in `browser/generic-invocations.mjs`, for
 * reporting only. The barrier computes its wait itself from the live read; this
 * is here so the operator can see what the persisted value will cost.
 */
const projectAuthBucket = (current: SecuritySettings): AuthBucketView => {
  const bucket = current.rateLimit.buckets.auth;
  return {
    enabled: current.rateLimit.enabled,
    windowSeconds: bucket.windowSeconds,
    maxRequests: bucket.maxRequests,
    barrierWaitMs: current.rateLimit.enabled ? bucket.windowSeconds * 1000 + 1000 : 0,
  };
};

const describeAuthBucket = (label: string, view: AuthBucketView) => {
  const perBarrier = (view.barrierWaitMs / 1000).toFixed(0);
  const sixBarriers = ((view.barrierWaitMs * 6) / 1000).toFixed(0);
  console.log(
    `${label}: enabled=${view.enabled} windowSeconds=${view.windowSeconds} ` +
      `maxRequests=${view.maxRequests} -> barrier wait ${perBarrier}s each, ` +
      `${sixBarriers}s across the plan's 6 barriers`
  );
};

const countSecuritySettingsRows = async (): Promise<number> => {
  const rows = await db
    .select({ key: settings.key })
    .from(settings)
    .where(eq(settings.key, SECURITY_SETTINGS_ROW_KEY))
    .limit(2);
  return rows.length;
};

/** Fresh read straight from the database, bypassing the process-local memo. */
const readPersistedSettings = async (): Promise<SecuritySettings> => {
  resetSecuritySettingsCache();
  return await getSecuritySettings();
};

const isPortAccepting = (host: string, port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (accepting: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(accepting);
    };
    socket.setTimeout(BACKEND_PROBE_TIMEOUT_MS);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });

const resolveBackendPort = (): number => {
  const raw = process.env.PORT?.trim();
  if (!raw) return 3000;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`PORT is not a usable port number: ${JSON.stringify(raw)}`);
  }
  return parsed;
};

/**
 * Refuse to mutate the window while a backend is listening. See "ORDERING IS
 * LOAD-BEARING" above: a stale cache would make the barrier wait less than the
 * window actually being enforced.
 */
const assertBackendStopped = async (): Promise<void> => {
  const port = resolveBackendPort();
  if (!(await isPortAccepting(BACKEND_PROBE_HOST, port))) return;
  throw new Error(
    `A backend is still accepting connections on ${BACKEND_PROBE_HOST}:${port}. ` +
      `getSecuritySettings() memoises for the whole process lifetime and nothing calls ` +
      `resetSecuritySettingsCache(), so that process would keep enforcing the window it ` +
      `read at boot while the smoke's barriers shortened their wait to match the new one — ` +
      `the barriers would then wait less than the window they must outlast. Stop the ` +
      `backend, re-run this script, then start it again.`
  );
};

const assertWindowInContractBand = (windowSeconds: number): void => {
  if (
    !Number.isInteger(windowSeconds) ||
    windowSeconds < CONTRACT_WINDOW_SECONDS_MIN ||
    windowSeconds > CONTRACT_WINDOW_SECONDS_MAX
  ) {
    throw new Error(
      `windowSeconds must be an integer in [${CONTRACT_WINDOW_SECONDS_MIN}, ` +
        `${CONTRACT_WINDOW_SECONDS_MAX}] — the band the frozen smoke contract accepts ` +
        `(got ${JSON.stringify(windowSeconds)}).`
    );
  }
};

const assertPolicyStillInSpec = (current: SecuritySettings): void => {
  const view = projectAuthBucket(current);
  if (!view.enabled) {
    throw new Error(
      "rateLimit.enabled is false, so the smoke's barriers would skip their wait entirely. " +
        "This script only adjusts the window; re-enable the limiter before running the smoke."
    );
  }
  assertWindowInContractBand(view.windowSeconds);
  if (view.maxRequests < CONTRACT_MIN_MAX_REQUESTS) {
    throw new Error(
      `auth maxRequests is ${view.maxRequests}, below the contract floor of ` +
        `${CONTRACT_MIN_MAX_REQUESTS}; the smoke's capacity preflight would fail.`
    );
  }
};

/**
 * True when the persisted settings differ from the shipped defaults in nothing
 * but the auth window — i.e. when the row carries only what this script writes,
 * so deleting it restores exactly the state that existed before.
 */
const isDefaultApartFromAuthWindow = (current: SecuritySettings): boolean => {
  const rebased: SecuritySettings = {
    ...current,
    rateLimit: {
      ...current.rateLimit,
      buckets: {
        ...current.rateLimit.buckets,
        auth: {
          ...current.rateLimit.buckets.auth,
          windowSeconds: SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets.auth.windowSeconds,
        },
      },
    },
  };
  return JSON.stringify(rebased) === JSON.stringify(SECURITY_SETTINGS_DEFAULTS);
};

const runStatus = async (): Promise<void> => {
  const current = await readPersistedSettings();
  const rowCount = await countSecuritySettingsRows();
  console.log(
    rowCount === 0
      ? `No "${SECURITY_SETTINGS_ROW_KEY}" row: the deployment is on the shipped defaults.`
      : `Row "${SECURITY_SETTINGS_ROW_KEY}" is present (${rowCount} row(s)).`
  );
  describeAuthBucket("auth bucket", projectAuthBucket(current));
  if (rowCount > 0 && !isDefaultApartFromAuthWindow(current)) {
    console.log(
      "Note: the stored settings differ from the defaults in more than the auth window, " +
        "so --restore will refuse to delete the row."
    );
  }
};

const runSetWindow = async (windowSeconds: number): Promise<void> => {
  assertWindowInContractBand(windowSeconds);
  await assertBackendStopped();

  const before = await readPersistedSettings();
  describeAuthBucket("before", projectAuthBucket(before));

  await setSecuritySettings({ rateLimit: { buckets: { auth: { windowSeconds } } } });

  if ((await countSecuritySettingsRows()) !== 1) {
    throw new Error(
      `Wrote the settings but found no single "${SECURITY_SETTINGS_ROW_KEY}" row afterwards. ` +
        "The key literal in this script has drifted from SECURITY_SETTINGS_KEY."
    );
  }

  const after = await readPersistedSettings();
  assertPolicyStillInSpec(after);
  if (after.rateLimit.buckets.auth.windowSeconds !== windowSeconds) {
    throw new Error(
      `Persisted window is ${after.rateLimit.buckets.auth.windowSeconds}s, expected ${windowSeconds}s.`
    );
  }
  describeAuthBucket("after", projectAuthBucket(after));

  const savedMs =
    (projectAuthBucket(before).barrierWaitMs - projectAuthBucket(after).barrierWaitMs) * 6;
  console.log(`Saves ${(savedMs / 1000).toFixed(0)}s of deliberate waiting per smoke run.`);
  console.log(
    "FAST MODE is active. Run `bun run smoke:auth-window:restore` and take one confirmation " +
      "run on the 60s default before declaring the smoke green."
  );
};

const runRestore = async (): Promise<void> => {
  await assertBackendStopped();

  const rowCount = await countSecuritySettingsRows();
  if (rowCount === 0) {
    console.log(
      `No "${SECURITY_SETTINGS_ROW_KEY}" row to remove; already on the shipped defaults.`
    );
    describeAuthBucket("auth bucket", projectAuthBucket(await readPersistedSettings()));
    return;
  }

  const current = await readPersistedSettings();
  if (!isDefaultApartFromAuthWindow(current)) {
    throw new Error(
      `Refusing to delete "${SECURITY_SETTINGS_ROW_KEY}": the stored settings differ from the ` +
        "shipped defaults in more than the auth window, so the row was not written solely by " +
        "this script and deleting it would discard someone else's configuration. Reset the auth " +
        `window explicitly instead: --seconds=${SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets.auth.windowSeconds}`
    );
  }

  await db.delete(settings).where(eq(settings.key, SECURITY_SETTINGS_ROW_KEY));
  if ((await countSecuritySettingsRows()) !== 0) {
    throw new Error(`Failed to delete the "${SECURITY_SETTINGS_ROW_KEY}" row.`);
  }

  const after = await readPersistedSettings();
  assertPolicyStillInSpec(after);
  describeAuthBucket("restored", projectAuthBucket(after));
  console.log("Back on the shipped defaults; the full auth-budget proof is exercised again.");
};

const USAGE = [
  "Usage: bun scripts/smoke-auth-rate-window.ts <mode>",
  "",
  "  --status            print the persisted auth bucket and the barrier wait it implies",
  `  --fast              set windowSeconds=${RECOMMENDED_FAST_WINDOW_SECONDS} (iteration aid)`,
  `  --seconds=<n>       set windowSeconds to n, ${CONTRACT_WINDOW_SECONDS_MIN}..${CONTRACT_WINDOW_SECONDS_MAX}`,
  "  --restore           delete the row and return to the shipped defaults",
].join("\n");

const parseWindowSeconds = (argument: string): number => {
  const raw = argument.slice("--seconds=".length);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error(`--seconds needs an integer (got ${JSON.stringify(raw)}).`);
  }
  return parsed;
};

const run = async (argv: readonly string[]): Promise<void> => {
  if (argv.length !== 1) throw new Error(`Expected exactly one mode.\n\n${USAGE}`);
  const mode = argv[0];
  if (mode === "--status") return await runStatus();
  if (mode === "--fast") return await runSetWindow(RECOMMENDED_FAST_WINDOW_SECONDS);
  if (mode === "--restore") return await runRestore();
  if (mode.startsWith("--seconds=")) return await runSetWindow(parseWindowSeconds(mode));
  throw new Error(`Unknown mode ${JSON.stringify(mode)}.\n\n${USAGE}`);
};

if (import.meta.main) {
  try {
    await run(process.argv.slice(2));
    process.exit(0);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
