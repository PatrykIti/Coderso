type FullSiteLockContenderInput = Readonly<{
  actorId: string;
  fixture: string;
  packageKey: string;
  request: string;
}>;
type FullSiteLockContenderOutcome = Readonly<{
  callbackCalled: boolean;
  error: string | null;
  ok: boolean;
}>;
export type FullSiteLockContender = Readonly<{
  outcome: Promise<FullSiteLockContenderOutcome>;
  stop: () => Promise<void>;
}>;

const readOutcome = (value: string): FullSiteLockContenderOutcome => {
  if (value.length > 256) throw new Error("full_site_lock_contender_output_invalid");
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("full_site_lock_contender_output_invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("full_site_lock_contender_output_invalid");
  }
  const record = parsed as Record<string, unknown>;
  if (
    Object.keys(record).length !== 3 ||
    typeof record.ok !== "boolean" ||
    typeof record.callbackCalled !== "boolean" ||
    (record.error !== null &&
      record.error !== "site_package_recovery_conflict" &&
      record.error !== "native_cms_writer_fence_failed")
  ) {
    throw new Error("full_site_lock_contender_output_invalid");
  }
  return Object.freeze({
    ok: record.ok,
    callbackCalled: record.callbackCalled,
    error: record.error,
  });
};

export const startFullSiteLockContender = (
  input: FullSiteLockContenderInput
): FullSiteLockContender => {
  const childScript = `
    const deadline = setTimeout(() => process.exit(2), 40_000);
    let callbackCalled = false;
    const finish = (result) => {
      clearTimeout(deadline);
      process.stdout.write(JSON.stringify(result));
      process.exit(0);
    };
    try {
      const raw = process.env.FULL_SITE_LOCK_CONTENDER;
      if (!raw) throw new Error("full_site_lock_contender_input_missing");
      const input = JSON.parse(raw);
      const { withFullSiteInstallLocks } = await import("./core/services/kits/legacyInstallRunPersistence.ts");
      await withFullSiteInstallLocks(
        {
          intent: "apply",
          packageKey: input.packageKey,
          actorId: input.actorId,
          dryRun: false,
          options: { request: input.request, testFixture: input.fixture },
        },
        async () => {
          callbackCalled = true;
        }
      );
      finish({ ok: true, callbackCalled, error: null });
    } catch (error) {
      finish({
        ok: false,
        callbackCalled,
        error:
          error instanceof Error && error.message === "site_package_recovery_conflict"
            ? "site_package_recovery_conflict"
            : "native_cms_writer_fence_failed",
      });
    }
  `;
  const child = Bun.spawn({
    cmd: [process.execPath, "-e", childScript],
    cwd: process.cwd(),
    env: {
      ...process.env,
      DB_POOL_MAX: "1",
      FULL_SITE_LOCK_CONTENDER: JSON.stringify(input),
    },
    stdout: "pipe",
    stderr: "pipe",
  }) as Bun.Subprocess & { kill: () => void };
  const stdout = new Response(child.stdout).text();
  const stderr = new Response(child.stderr).text();
  let finished = false;
  void child.exited.then(() => {
    finished = true;
  });
  return Object.freeze({
    outcome: Promise.all([child.exited, stdout, stderr]).then(([exitCode, output]) => {
      if (exitCode !== 0) throw new Error("full_site_lock_contender_failed");
      return readOutcome(output);
    }),
    async stop() {
      if (!finished) child.kill();
      await child.exited;
    },
  });
};
