import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const ROOT = "/home/coder/project/Coderso";
const IMPLEMENTER = ROOT + "/_docs/_workflows/task-540-implement.mjs";
const CLAUDE = "/usr/bin/claude";
const AGENT_LAUNCHER = process.execPath;
const AGENT_LAUNCHER_SOURCE =
  'process.kill(process.pid,"SIGSTOP");' +
  'const{spawn}=require("node:child_process");' +
  'const child=spawn(process.argv[1],process.argv.slice(2),{env:process.env,stdio:"inherit"});' +
  'child.once("error",()=>process.exit(127));' +
  'child.once("exit",(code,signal)=>{' +
  'if(signal){const number=require("node:os").constants.signals[signal];' +
  "process.exit(Number.isInteger(number)&&number>0?128+number:255);}" +
  "process.exit(code??128);" +
  "});";
const MAX_PROMPT_BYTES = 128 * 1024;
const MAX_RESULT_BYTES = 8 * 1024 * 1024;
const AGENT_TIMEOUT_MS = 60 * 60 * 1000;
const TERMINATION_GRACE_MS = 5_000;
const ABSENCE_PROOF_TIMEOUT_MS = 5_000;
const READ_ONLY_AGENT_TOOLS = "Read,Grep,Glob";
const MUTATING_AGENT_TOOLS = "Read,Grep,Glob,Edit,Write";
const PROJECT_PARENT = "/home/coder/project";
const PROJECT_DIRECTORY_NAME = "Coderso";
const AGENT_ENV_ALLOWLIST = Object.freeze([
  "HOME",
  "HOSTNAME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "NO_COLOR",
  "PATH",
  "TERM",
  "USER",
]);
const PROJECT_SIBLING_DENY_PATTERNS = Object.freeze(
  (await readdir(PROJECT_PARENT, { withFileTypes: true }))
    .filter(({ name }) => name !== PROJECT_DIRECTORY_NAME)
    .flatMap(({ name }) => {
      invariant(
        /^[A-Za-z0-9._-]+$/.test(name),
        "TASK-540 project sibling name is not permission-rule safe"
      );
      const path = "//home/coder/project/" + name;
      return [path, path + "/**"];
    })
    .sort()
);
const AGENT_DENIED_PATH_PATTERNS = Object.freeze([
  "//home/coder/.*",
  "//home/coder/.*/**",
  ...PROJECT_SIBLING_DENY_PATTERNS,
  "//home/coder/project/Coderso/.env*",
  "//home/coder/project/Coderso/.env*/**",
  "//home/coder/project/Coderso/**/.env*",
  "//home/coder/project/Coderso/**/.env*/**",
  "//home/coder/project/Coderso/.git",
  "//home/coder/project/Coderso/.git/**",
  "//home/coder/project/Coderso/**/.git",
  "//home/coder/project/Coderso/**/.git/**",
  "//bin/**",
  "//boot/**",
  "//dev/**",
  "//etc/**",
  "//lib/**",
  "//lib64/**",
  "//media/**",
  "//mnt/**",
  "//opt/**",
  "//proc/**",
  "//root/**",
  "//run/**",
  "//sbin/**",
  "//srv/**",
  "//sys/**",
  "//tmp/**",
  "//usr/**",
  "//var/**",
]);
const AGENT_EDIT_ONLY_DENIED_PATH_PATTERNS = Object.freeze([
  "//home/coder/project/Coderso/node_modules",
  "//home/coder/project/Coderso/node_modules/**",
]);
const AGENT_PATH_TAKING_TOOLS = Object.freeze(["Read", "Grep", "Glob", "Edit", "Write"]);
const AGENT_DENIED_TOOL_RULES = Object.freeze(
  [
    ...AGENT_DENIED_PATH_PATTERNS.flatMap((pattern) =>
      AGENT_PATH_TAKING_TOOLS.map((tool) => tool + "(" + pattern + ")")
    ),
    ...AGENT_EDIT_ONLY_DENIED_PATH_PATTERNS.flatMap((pattern) =>
      ["Edit", "Write"].map((tool) => tool + "(" + pattern + ")")
    ),
  ].sort()
);
const AGENT_SYSTEM_PROMPT =
  "You are a bounded TASK-540 repository subagent. Before acting, read and follow " +
  "/home/coder/project/Coderso/AGENTS.md plus the exact task contracts and ownership limits " +
  "named in the prompt. Never stage, unstage, commit, reset, checkout, " +
  "or clean files. Never read, print, return, or transmit environment values, credentials, " +
  "cookies, tokens, private logs, or user data. Never start the TASK-540 server, browser, " +
  "Playwright session, smoke helper, or smoke executor. Return only the requested structured " +
  "result; the local orchestrator independently verifies every repository claim.";

const BASE_AGENT_ENV = Object.freeze({ ...process.env });

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deterministicSignalExitCode(signal, signals) {
  const number = signals?.[signal];
  return Number.isInteger(number) && number > 0 ? 128 + number : 255;
}

function requireExactCli(argv) {
  if (argv.length !== 1 || !new Set(["--run", "--self-test"]).has(argv[0])) {
    throw new Error("TASK-540 local orchestrator accepts exactly --run or --self-test");
  }
  return argv[0];
}

function sanitizedAgentName(label) {
  invariant(typeof label === "string" && label.length > 0, "TASK-540 agent label is missing");
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  invariant(normalized.length > 0, "TASK-540 agent label is not name-safe");
  return "task540-" + normalized;
}

function buildAgentEnvironment(source = BASE_AGENT_ENV) {
  invariant(isPlainObject(source), "TASK-540 agent environment source is invalid");
  const environment = Object.create(null);
  for (const key of AGENT_ENV_ALLOWLIST) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) environment[key] = value;
  }
  environment.CI = "true";
  environment.GIT_OPTIONAL_LOCKS = "0";
  return Object.freeze(environment);
}

function isMutatingAgentSchema(schema) {
  return Array.isArray(schema?.required) && schema.required.includes("touchedFiles");
}

function buildClaudeArgs(options) {
  invariant(isPlainObject(options), "TASK-540 agent options are invalid");
  invariant(isPlainObject(options.schema), "TASK-540 agent schema is missing");
  const schema = JSON.stringify(options.schema);
  invariant(Buffer.byteLength(schema) <= 128 * 1024, "TASK-540 agent schema is too large");
  const mutating = isMutatingAgentSchema(options.schema);
  const tools = mutating ? MUTATING_AGENT_TOOLS : READ_ONLY_AGENT_TOOLS;
  return Object.freeze([
    "-p",
    "--output-format",
    "json",
    "--effort",
    "xhigh",
    "--permission-mode",
    mutating ? "acceptEdits" : "plan",
    "--no-session-persistence",
    "--disable-slash-commands",
    "--no-chrome",
    "--safe-mode",
    "--strict-mcp-config",
    "--tools",
    tools,
    "--disallowedTools",
    AGENT_DENIED_TOOL_RULES.join(","),
    "--name",
    sanitizedAgentName(options.label),
    "--append-system-prompt",
    AGENT_SYSTEM_PROMPT,
    "--json-schema",
    schema,
  ]);
}

function parseStructuredAgentOutput(stdout) {
  invariant(Buffer.isBuffer(stdout), "TASK-540 agent stdout must be bytes");
  let envelope;
  try {
    envelope = JSON.parse(stdout.toString("utf8"));
  } catch {
    throw new Error("TASK-540 agent returned invalid JSON; details discarded");
  }
  invariant(isPlainObject(envelope), "TASK-540 agent result envelope is invalid");
  invariant(
    envelope.type === "result" &&
      envelope.subtype === "success" &&
      envelope.is_error === false &&
      isPlainObject(envelope.structured_output),
    "TASK-540 agent did not return successful structured output"
  );
  return envelope.structured_output;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseProcStat(source, expectedPid) {
  invariant(typeof source === "string" && source.length > 0, "TASK-540 proc stat is invalid");
  const close = source.lastIndexOf(")");
  invariant(close > 0, "TASK-540 proc stat command boundary is invalid");
  const pid = Number(source.slice(0, source.indexOf(" ")));
  const fields = source
    .slice(close + 1)
    .trim()
    .split(/\s+/);
  invariant(
    Number.isSafeInteger(pid) && pid === expectedPid && fields.length >= 20,
    "TASK-540 proc stat identity is invalid"
  );
  const ppid = Number(fields[1]);
  const processGroupId = Number(fields[2]);
  const sessionId = Number(fields[3]);
  const startTime = fields[19];
  invariant(
    /^[A-Zt]$/.test(fields[0]) &&
      [ppid, processGroupId, sessionId].every(
        (value) => Number.isSafeInteger(value) && value >= 0
      ) &&
      /^\d+$/.test(startTime),
    "TASK-540 proc stat authority is invalid"
  );
  return Object.freeze({
    pid,
    ppid,
    processGroupId,
    sessionId,
    startTime,
    state: fields[0],
  });
}

async function readProcessIdentity(pid) {
  try {
    return parseProcStat(await readFile("/proc/" + pid + "/stat", "utf8"), pid);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ESRCH") return null;
    throw error;
  }
}

async function readProcessTable() {
  const names = await readdir("/proc");
  const pids = names.filter((name) => /^\d+$/.test(name)).map(Number);
  const rows = await Promise.all(pids.map((pid) => readProcessIdentity(pid)));
  return rows.filter((row) => row !== null);
}

function sameProcessIdentity(left, right) {
  return left.pid === right.pid && left.startTime === right.startTime;
}

function isOwnedProcess(row, authority, retainedIdentities = []) {
  return (
    sameProcessIdentity(row, authority) ||
    row.processGroupId === authority.processGroupId ||
    row.sessionId === authority.sessionId ||
    retainedIdentities.some((identity) => sameProcessIdentity(row, identity))
  );
}

async function captureProcessAuthority(pid) {
  invariant(Number.isSafeInteger(pid) && pid > 1, "TASK-540 agent PID is invalid");
  let observedAuthority = null;
  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const identity = await readProcessIdentity(pid);
      if (identity) {
        invariant(
          identity.processGroupId === pid && identity.sessionId === pid,
          "TASK-540 agent is not its owned process-group/session leader"
        );
        if (observedAuthority === null) observedAuthority = identity;
        invariant(
          sameProcessIdentity(identity, observedAuthority),
          "TASK-540 agent identity changed during acquisition"
        );
        if (identity.state === "T" || identity.state === "t") return identity;
      }
      await delay(25);
    }
  } catch (error) {
    error.observedAuthority = observedAuthority;
    throw error;
  }
  const error = new Error("TASK-540 agent process authority was not observable");
  error.observedAuthority = observedAuthority;
  throw error;
}

async function captureOwnedProcesses(authority) {
  return (await readProcessTable()).filter((row) => isOwnedProcess(row, authority));
}

async function waitForOwnedProcessAbsence(authority, retainedIdentities, timeoutMs) {
  const deadline = performance.now() + timeoutMs;
  do {
    const active = (await readProcessTable()).filter((row) =>
      isOwnedProcess(row, authority, retainedIdentities)
    );
    if (active.length === 0) return true;
    await delay(100);
  } while (performance.now() < deadline);
  return false;
}

function ownedRowsForSignal(table, authority, retainedIdentities) {
  const currentLeader = table.find((row) => row.pid === authority.pid);
  invariant(
    !currentLeader || sameProcessIdentity(currentLeader, authority),
    "TASK-540 agent leader PID was recycled"
  );
  return table.filter((row) => isOwnedProcess(row, authority, retainedIdentities));
}

async function signalOwnedProcessGroup(authority, retainedIdentities, signal) {
  const active = ownedRowsForSignal(await readProcessTable(), authority, retainedIdentities);
  if (active.length === 0) return false;
  try {
    process.kill(-authority.processGroupId, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
  return true;
}

function releaseChildHandles(child) {
  child.stdin?.destroy();
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
}

async function disposeUnboundChild(child, closePromise, observedAuthority = null) {
  if (observedAuthority) {
    await terminateProcessGroup(child, closePromise, observedAuthority);
    return;
  }
  const earlyCompletion = await Promise.race([closePromise, delay(25).then(() => null)]);
  if (earlyCompletion === null) child.kill("SIGKILL");
  const completion =
    earlyCompletion ??
    (await Promise.race([closePromise, delay(ABSENCE_PROOF_TIMEOUT_MS).then(() => null)]));
  releaseChildHandles(child);
  invariant(completion !== null, "TASK-540 unbound agent child did not close safely");
}

async function terminateProcessGroup(child, closePromise, authority) {
  const retainedIdentities = await captureOwnedProcesses(authority);
  await signalOwnedProcessGroup(authority, retainedIdentities, "SIGTERM");
  if (await waitForOwnedProcessAbsence(authority, retainedIdentities, TERMINATION_GRACE_MS)) {
    await Promise.race([closePromise, delay(250)]);
    releaseChildHandles(child);
    return;
  }
  await signalOwnedProcessGroup(authority, retainedIdentities, "SIGKILL");
  const absent = await waitForOwnedProcessAbsence(
    authority,
    retainedIdentities,
    ABSENCE_PROOF_TIMEOUT_MS
  );
  await Promise.race([closePromise, delay(250)]);
  releaseChildHandles(child);
  invariant(absent, "TASK-540 agent process group/session did not terminate");
}

async function signalOwnedLeader(child, authority, signal) {
  const current = await readProcessIdentity(authority.pid);
  invariant(
    current !== null &&
      sameProcessIdentity(current, authority) &&
      current.processGroupId === authority.processGroupId &&
      current.sessionId === authority.sessionId,
    "TASK-540 agent leader changed before signal"
  );
  return child.kill(signal);
}

async function authorizeAndResumeStoppedAgentChild({ label, authorize, resume, cleanup }) {
  invariant(typeof label === "string" && label.length > 0, "TASK-540 agent label is missing");
  invariant(
    typeof authorize === "function" &&
      typeof resume === "function" &&
      typeof cleanup === "function",
    "TASK-540 agent pre-resume dependencies are invalid"
  );
  try {
    await authorize();
    invariant(await resume(), "TASK-540 agent process could not resume");
  } catch {
    const authorizationError = new Error(label + ": details discarded");
    try {
      await cleanup();
    } catch (cleanupError) {
      throw new AggregateError(
        [authorizationError, cleanupError],
        "TASK-540 agent pre-resume authorization and cleanup failed"
      );
    }
    throw authorizationError;
  }
}

async function runAgent(prompt, options) {
  requireBoundedPrompt(prompt);
  const child = spawn(
    AGENT_LAUNCHER,
    ["--eval", AGENT_LAUNCHER_SOURCE, CLAUDE, ...buildClaudeArgs(options)],
    {
      cwd: ROOT,
      env: buildAgentEnvironment(),
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let spawnError = null;
  let abortReason = null;
  let requestAbort;
  const abortPromise = new Promise((resolve) => {
    requestAbort = (reason) => {
      if (abortReason === null) {
        abortReason = reason;
        resolve(reason);
      }
    };
  });
  const closePromise = new Promise((resolve) => {
    child.once("close", (status, signal) => {
      resolve({ status, signal });
    });
  });
  child.once("error", (error) => {
    spawnError = error;
  });
  const capture = (chunks, currentBytes, chunk) => {
    const bytes = Buffer.from(chunk);
    const nextBytes = currentBytes + bytes.length;
    if (nextBytes > MAX_RESULT_BYTES) {
      requestAbort("output-limit");
      return currentBytes;
    }
    chunks.push(bytes);
    return nextBytes;
  };
  child.stdout.on("data", (chunk) => {
    stdoutBytes = capture(stdout, stdoutBytes, chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderrBytes = capture(stderr, stderrBytes, chunk);
  });
  child.stdin.on("error", (error) => {
    if (error?.code !== "EPIPE") spawnError = error;
  });
  if (!Number.isSafeInteger(child.pid)) {
    await disposeUnboundChild(child, closePromise);
    throw new Error("TASK-540 agent process failed; details discarded");
  }
  let authority;
  try {
    authority = await captureProcessAuthority(child.pid);
  } catch (error) {
    const authorityError = new Error("TASK-540 agent process failed; details discarded");
    try {
      await disposeUnboundChild(child, closePromise, error?.observedAuthority ?? null);
    } catch (cleanupError) {
      throw new AggregateError(
        [authorityError, cleanupError],
        "TASK-540 agent authority and cleanup failed"
      );
    }
    throw authorityError;
  }
  await authorizeAndResumeStoppedAgentChild({
    label: "TASK-540 agent process failed",
    authorize: async () => {},
    resume: () => signalOwnedLeader(child, authority, "SIGCONT"),
    cleanup: () => terminateProcessGroup(child, closePromise, authority),
  });
  child.stdin.end(prompt);
  const timeout = setTimeout(() => {
    requestAbort("timeout");
  }, AGENT_TIMEOUT_MS);
  const outcome = await Promise.race([
    closePromise.then((completion) => ({ kind: "closed", completion })),
    abortPromise.then((reason) => ({ kind: "aborted", reason })),
  ]);
  clearTimeout(timeout);
  if (outcome.kind === "aborted") {
    await terminateProcessGroup(child, closePromise, authority);
    throw new Error("TASK-540 agent process failed; details discarded");
  }
  const completion = outcome.completion;
  const absent = await waitForOwnedProcessAbsence(authority, [], ABSENCE_PROOF_TIMEOUT_MS);
  if (!absent) {
    await terminateProcessGroup(child, closePromise, authority);
    throw new Error("TASK-540 agent left an owned process behind");
  }
  releaseChildHandles(child);
  invariant(
    !spawnError && completion.status === 0 && completion.signal === null,
    "TASK-540 agent process failed; details discarded"
  );
  return parseStructuredAgentOutput(Buffer.concat(stdout, stdoutBytes));
}

function requireBoundedPrompt(prompt) {
  invariant(typeof prompt === "string" && prompt.length > 0, "TASK-540 agent prompt is missing");
  invariant(
    Buffer.byteLength(prompt, "utf8") <= MAX_PROMPT_BYTES,
    "TASK-540 agent prompt exceeds the bounded input"
  );
  return prompt;
}

function reportPhase(title) {
  invariant(typeof title === "string" && title.length > 0, "TASK-540 phase title is invalid");
  process.stderr.write("[task-540] phase: " + title.replace(/[\r\n]/g, " ") + "\n");
}

async function runAgentLauncherSelfTest() {
  const environment = buildAgentEnvironment({
    HOME: "/tmp/task540-home",
    HOSTNAME: "task540.invalid",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    LC_CTYPE: "C.UTF-8",
    NO_COLOR: "1",
    PATH: "/usr/bin:/bin",
    TERM: "dumb",
    USER: "task540",
    PWD: "discard-me",
    SHLVL: "discard-me",
    _: "discard-me",
    DATABASE_URL: "discard-me",
    ANTHROPIC_API_KEY: "discard-me",
  });
  const probeSource =
    "process.stdout.write(JSON.stringify({keys:Object.keys(process.env).sort()}));" +
    "setTimeout(()=>process.exit(0),25);";
  const child = spawn(
    AGENT_LAUNCHER,
    ["--eval", AGENT_LAUNCHER_SOURCE, process.execPath, "--eval", probeSource],
    {
      cwd: ROOT,
      env: environment,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let spawnError = null;
  const capture = (chunks, currentBytes, chunk) => {
    const bytes = Buffer.from(chunk);
    const nextBytes = currentBytes + bytes.length;
    invariant(nextBytes <= 64 * 1024, "TASK-540 launcher self-test output exceeded its bound");
    chunks.push(bytes);
    return nextBytes;
  };
  child.stdout.on("data", (chunk) => {
    stdoutBytes = capture(stdout, stdoutBytes, chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderrBytes = capture(stderr, stderrBytes, chunk);
  });
  child.once("error", (error) => {
    spawnError = error;
  });
  const closePromise = new Promise((resolve) => {
    child.once("close", (status, signal) => resolve({ status, signal }));
  });
  if (!Number.isSafeInteger(child.pid)) {
    await disposeUnboundChild(child, closePromise);
    throw new Error("TASK-540 launcher self-test could not establish a PID");
  }
  let authority;
  try {
    authority = await captureProcessAuthority(child.pid);
  } catch (error) {
    const authorityError = new Error("TASK-540 launcher self-test could not establish authority");
    try {
      await disposeUnboundChild(child, closePromise, error?.observedAuthority ?? null);
    } catch (cleanupError) {
      throw new AggregateError(
        [authorityError, cleanupError],
        "TASK-540 launcher self-test authority and cleanup failed"
      );
    }
    throw authorityError;
  }
  await authorizeAndResumeStoppedAgentChild({
    label: "TASK-540 launcher self-test could not resume its leader",
    authorize: async () => {},
    resume: () => signalOwnedLeader(child, authority, "SIGCONT"),
    cleanup: () => terminateProcessGroup(child, closePromise, authority),
  });
  const completion = await Promise.race([
    closePromise,
    delay(ABSENCE_PROOF_TIMEOUT_MS).then(() => null),
  ]);
  if (completion === null) {
    await terminateProcessGroup(child, closePromise, authority);
    throw new Error("TASK-540 launcher self-test timed out");
  }
  const absent = await waitForOwnedProcessAbsence(authority, [], ABSENCE_PROOF_TIMEOUT_MS);
  if (!absent) {
    await terminateProcessGroup(child, closePromise, authority);
    throw new Error("TASK-540 launcher self-test left an owned process behind");
  }
  releaseChildHandles(child);
  invariant(
    spawnError === null && completion.status === 0 && completion.signal === null,
    "TASK-540 launcher self-test child failed"
  );
  invariant(stderrBytes === 0, "TASK-540 launcher self-test emitted stderr");
  const observed = JSON.parse(Buffer.concat(stdout, stdoutBytes).toString("utf8"));
  invariant(isPlainObject(observed), "TASK-540 launcher self-test result is invalid");
  const expectedKeys = Object.keys(environment).sort();
  invariant(
    JSON.stringify(observed.keys) === JSON.stringify(expectedKeys),
    "TASK-540 launcher widened its child environment"
  );
  invariant(
    ["PWD", "SHLVL", "_", "DATABASE_URL", "ANTHROPIC_API_KEY"].every(
      (key) => !observed.keys.includes(key)
    ),
    "TASK-540 launcher leaked a forbidden child environment key"
  );
  return 7;
}

async function runAgentPreResumeSelfTest() {
  let cleanupCalls = 0;
  let authorizeRejected = false;
  try {
    await authorizeAndResumeStoppedAgentChild({
      label: "TASK-540 synthetic authorization failure",
      authorize: async () => {
        throw new Error("synthetic authorization failure");
      },
      resume: async () => true,
      cleanup: async () => {
        cleanupCalls += 1;
      },
    });
  } catch {
    authorizeRejected = true;
  }
  let falseResumeRejected = false;
  try {
    await authorizeAndResumeStoppedAgentChild({
      label: "TASK-540 synthetic resume failure",
      authorize: async () => {},
      resume: async () => false,
      cleanup: async () => {
        cleanupCalls += 1;
      },
    });
  } catch {
    falseResumeRejected = true;
  }
  let aggregateRejected = false;
  try {
    await authorizeAndResumeStoppedAgentChild({
      label: "TASK-540 synthetic cleanup failure",
      authorize: async () => {
        throw new Error("synthetic authorization failure");
      },
      resume: async () => true,
      cleanup: async () => {
        cleanupCalls += 1;
        throw new Error("synthetic cleanup failure");
      },
    });
  } catch (error) {
    aggregateRejected = error instanceof AggregateError && error.errors.length === 2;
  }
  let successCleanupCalls = 0;
  await authorizeAndResumeStoppedAgentChild({
    label: "TASK-540 synthetic success",
    authorize: async () => {},
    resume: async () => true,
    cleanup: async () => {
      successCleanupCalls += 1;
    },
  });
  invariant(
    authorizeRejected &&
      falseResumeRejected &&
      aggregateRejected &&
      cleanupCalls === 3 &&
      successCleanupCalls === 0,
    "TASK-540 agent pre-resume cleanup contract failed"
  );
  return 4;
}

async function runSelfTest() {
  const readOnlySchema = {
    type: "object",
    additionalProperties: false,
    required: ["pass"],
    properties: { pass: { type: "boolean" } },
  };
  const mutationSchema = {
    type: "object",
    additionalProperties: false,
    required: ["pass", "touchedFiles"],
    properties: {
      pass: { type: "boolean" },
      touchedFiles: { type: "array", items: { type: "string" } },
    },
  };
  const readOnlyCli = buildClaudeArgs({ label: "start-gate:540", schema: readOnlySchema });
  const mutationCli = buildClaudeArgs({ label: "closure-fix:540", schema: mutationSchema });
  const expectedDeniedToolRules = [
    ...AGENT_DENIED_PATH_PATTERNS.flatMap((pattern) =>
      AGENT_PATH_TAKING_TOOLS.map((tool) => tool + "(" + pattern + ")")
    ),
    ...AGENT_EDIT_ONLY_DENIED_PATH_PATTERNS.flatMap((pattern) =>
      ["Edit", "Write"].map((tool) => tool + "(" + pattern + ")")
    ),
  ].sort();
  invariant(
    JSON.stringify(AGENT_DENIED_TOOL_RULES) === JSON.stringify(expectedDeniedToolRules) &&
      new Set(AGENT_DENIED_TOOL_RULES).size === AGENT_DENIED_TOOL_RULES.length,
    "TASK-540 host deny-tool projection is incomplete or duplicated"
  );
  for (const cli of [readOnlyCli, mutationCli]) {
    invariant(cli[0] === "-p", "TASK-540 host self-test lost print mode");
    invariant(cli.includes("--json-schema"), "TASK-540 host self-test lost schema mode");
    invariant(cli.includes("--disable-slash-commands"), "TASK-540 host exposed slash commands");
    invariant(cli.includes("--no-chrome"), "TASK-540 host exposed Chrome integration");
    invariant(cli.includes("--safe-mode"), "TASK-540 host lost safe mode");
    invariant(cli.includes("--strict-mcp-config"), "TASK-540 host exposed ambient MCP tools");
    invariant(cli.includes("--disallowedTools"), "TASK-540 host lost path-deny rules");
    const deniedRules = cli[cli.indexOf("--disallowedTools") + 1];
    invariant(
      AGENT_DENIED_TOOL_RULES.every((rule) => deniedRules.split(",").includes(rule)),
      "TASK-540 host lost an external-path tool denial"
    );
    invariant(
      !deniedRules.includes("Read(//home/coder/project/Coderso/**)"),
      "TASK-540 host denied its own repository"
    );
    invariant(
      !cli.includes("--dangerously-skip-permissions"),
      "TASK-540 host bypassed permissions"
    );
    invariant(!cli.includes("Workflow"), "TASK-540 host self-test exposed Workflow");
    invariant(!cli.includes("playwright-cli"), "TASK-540 host self-test exposed Playwright");
    invariant(!cli.some((value) => value.includes("agent prompt")), "TASK-540 prompt entered argv");
  }
  invariant(
    readOnlyCli.includes(READ_ONLY_AGENT_TOOLS) && readOnlyCli.includes("plan"),
    "TASK-540 host lost the read-only tool/permission boundary"
  );
  invariant(
    mutationCli.includes(MUTATING_AGENT_TOOLS) && mutationCli.includes("acceptEdits"),
    "TASK-540 host lost the mutation tool/permission boundary"
  );
  invariant(
    !READ_ONLY_AGENT_TOOLS.includes("Bash") && !MUTATING_AGENT_TOOLS.includes("Bash"),
    "TASK-540 host exposed shell execution"
  );
  invariant(
    AGENT_DENIED_PATH_PATTERNS.every((pattern) =>
      AGENT_PATH_TAKING_TOOLS.every((tool) =>
        AGENT_DENIED_TOOL_RULES.includes(tool + "(" + pattern + ")")
      )
    ) &&
      AGENT_EDIT_ONLY_DENIED_PATH_PATTERNS.every((pattern) =>
        ["Edit", "Write"].every((tool) =>
          AGENT_DENIED_TOOL_RULES.includes(tool + "(" + pattern + ")")
        )
      ),
    "TASK-540 host lost exact enabled path-tool denial coverage"
  );
  invariant(
    [
      "//home/coder/project/Coderso/.env*",
      "//home/coder/project/Coderso/.env*/**",
      "//home/coder/project/Coderso/.git",
      "//home/coder/project/Coderso/.git/**",
    ].every((pattern) => AGENT_DENIED_PATH_PATTERNS.includes(pattern)),
    "TASK-540 host lost repository secret-path denials"
  );
  const environment = buildAgentEnvironment({
    PATH: "/usr/bin",
    HOME: "/tmp/task540-home",
    LANG: "C.UTF-8",
    DATABASE_URL: "discard-me",
    ADMIN_PASSWORD: "discard-me",
    ANTHROPIC_API_KEY: "discard-me",
    PGHOST: "discard-me",
    PGUSER: "discard-me",
    POSTGRES_URL: "discard-me",
    DB_HOST: "discard-me",
    SSH_AUTH_SOCK: "discard-me",
    GIT_ASKPASS: "discard-me",
    AWS_PROFILE: "discard-me",
    KUBECONFIG: "discard-me",
    GOOGLE_APPLICATION_CREDENTIALS: "discard-me",
    PLAYWRIGHT_MCP_CONFIG: "discard-me",
    BROWSER: "discard-me",
  });
  invariant(environment.PATH === "/usr/bin", "TASK-540 host self-test lost safe environment");
  invariant(environment.HOME === "/tmp/task540-home", "TASK-540 host self-test lost HOME");
  invariant(environment.LANG === "C.UTF-8", "TASK-540 host self-test lost locale");
  invariant(environment.CI === "true", "TASK-540 host self-test lost CI isolation");
  invariant(
    environment.GIT_OPTIONAL_LOCKS === "0",
    "TASK-540 host self-test lost observational Git mode"
  );
  const forbiddenEnvironmentKeys = [
    "DATABASE_URL",
    "ADMIN_PASSWORD",
    "ANTHROPIC_API_KEY",
    "PGHOST",
    "PGUSER",
    "POSTGRES_URL",
    "DB_HOST",
    "SSH_AUTH_SOCK",
    "GIT_ASKPASS",
    "AWS_PROFILE",
    "KUBECONFIG",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "PLAYWRIGHT_MCP_CONFIG",
    "BROWSER",
  ];
  invariant(
    forbiddenEnvironmentKeys.every((key) => !Object.hasOwn(environment, key)),
    "TASK-540 host leaked a non-allowlisted environment handle"
  );
  invariant(
    Object.keys(environment).every(
      (key) => AGENT_ENV_ALLOWLIST.includes(key) || key === "CI" || key === "GIT_OPTIONAL_LOCKS"
    ),
    "TASK-540 host admitted an unexpected environment key"
  );
  const procIdentity = parseProcStat(
    "4321 (claude worker (bounded)) " +
      ["S", "123", "4321", "4321", ...Array(15).fill("0"), "998877"].join(" "),
    4321
  );
  invariant(
    procIdentity.ppid === 123 &&
      procIdentity.processGroupId === 4321 &&
      procIdentity.sessionId === 4321 &&
      procIdentity.startTime === "998877",
    "TASK-540 host lost proc identity parsing"
  );
  invariant(
    isOwnedProcess(procIdentity, procIdentity) &&
      isOwnedProcess(
        Object.freeze({
          ...procIdentity,
          pid: 4322,
          ppid: 4321,
          startTime: "998878",
        }),
        procIdentity
      ) &&
      !isOwnedProcess(
        Object.freeze({
          ...procIdentity,
          pid: 5000,
          processGroupId: 5000,
          sessionId: 5000,
          startTime: "998879",
        }),
        procIdentity
      ),
    "TASK-540 host lost process ownership classification"
  );
  invariant(
    ownedRowsForSignal([procIdentity], procIdentity, []).length === 1,
    "TASK-540 host lost just-in-time signal ownership"
  );
  let recycledLeaderRejected = false;
  try {
    ownedRowsForSignal([Object.freeze({ ...procIdentity, startTime: "998999" })], procIdentity, []);
  } catch {
    recycledLeaderRejected = true;
  }
  invariant(recycledLeaderRejected, "TASK-540 host accepted a recycled signal leader");
  const structured = parseStructuredAgentOutput(
    Buffer.from(
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: false,
        structured_output: { pass: true },
      })
    )
  );
  invariant(structured.pass === true, "TASK-540 host self-test lost structured output");
  let rejected = 0;
  for (const invalid of [[], ["--run", "extra"], ["--unknown"]]) {
    try {
      requireExactCli(invalid);
    } catch {
      rejected += 1;
    }
  }
  invariant(rejected === 3, "TASK-540 host self-test accepted an invalid CLI");
  requireBoundedPrompt("a".repeat(MAX_PROMPT_BYTES));
  requireBoundedPrompt("ą".repeat(MAX_PROMPT_BYTES / 2));
  let promptBoundRejections = 0;
  for (const prompt of ["a".repeat(MAX_PROMPT_BYTES + 1), "a".repeat(MAX_PROMPT_BYTES - 1) + "ą"]) {
    try {
      requireBoundedPrompt(prompt);
    } catch {
      promptBoundRejections += 1;
    }
  }
  invariant(promptBoundRejections === 2, "TASK-540 host prompt byte cap is not exact");
  invariant(
    AGENT_LAUNCHER === process.execPath &&
      AGENT_LAUNCHER_SOURCE.startsWith('process.kill(process.pid,"SIGSTOP");') &&
      AGENT_LAUNCHER_SOURCE.includes('require("node:os").constants.signals[signal]') &&
      !AGENT_LAUNCHER_SOURCE.includes("/bin/bash") &&
      !AGENT_LAUNCHER_SOURCE.includes("/bin/sh"),
    "TASK-540 host self-test lost its fixed self-stopping Node launcher"
  );
  invariant(
    deterministicSignalExitCode("SIGPIPE", { SIGPIPE: 13, SIGUSR1: 10 }) === 141 &&
      deterministicSignalExitCode("SIGUSR1", { SIGPIPE: 13, SIGUSR1: 10 }) === 138 &&
      deterministicSignalExitCode("UNKNOWN", { SIGPIPE: 13, SIGUSR1: 10 }) === 255,
    "TASK-540 host self-test lost deterministic signal exit mapping"
  );
  const preResumeCases = await runAgentPreResumeSelfTest();
  const launcherCases = await runAgentLauncherSelfTest();
  return Object.freeze({
    pass: true,
    cliCases: 4,
    environmentCases: 19,
    deniedPathPatterns: AGENT_DENIED_PATH_PATTERNS.length,
    editOnlyDeniedPathPatterns: AGENT_EDIT_ONLY_DENIED_PATH_PATTERNS.length,
    deniedToolRules: AGENT_DENIED_TOOL_RULES.length,
    processAuthorityCases: 6,
    promptBoundaryCases: 4,
    preResumeCases,
    launcherCases,
    structuredOutputCases: 1,
    promptInArgv: false,
    readOnlyTools: READ_ONLY_AGENT_TOOLS.split(",").length,
    mutationTools: MUTATING_AGENT_TOOLS.split(",").length,
  });
}

const mode = requireExactCli(process.argv.slice(2));
if (mode === "--self-test") {
  process.stdout.write(JSON.stringify(await runSelfTest()));
} else {
  invariant(!Object.hasOwn(globalThis, "agent"), "TASK-540 global agent binding already exists");
  invariant(!Object.hasOwn(globalThis, "phase"), "TASK-540 global phase binding already exists");
  Object.defineProperties(globalThis, {
    agent: { configurable: false, enumerable: false, value: runAgent, writable: false },
    phase: { configurable: false, enumerable: false, value: reportPhase, writable: false },
  });
  await import(pathToFileURL(IMPLEMENTER).href);
  process.stdout.write(JSON.stringify({ pass: true, implementation: "TASK-540" }));
}
