import { describe, expect, test } from "bun:test";

import { createTask105L05RecoveryDbTestSeam } from "../../../scripts/runtime-smoke/adapters/task-105-l05/recovery-db";
import {
  createTask105L05RecoveryAuthority,
  type Task105L05ReceiptPatch,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/recovery-receipt";

const AUTHORITY = createTask105L05RecoveryAuthority({
  profile: "fast",
  session: "task105-fast-r1",
  runMarker: "abcdef012345",
  recoveryKey: "B".repeat(43),
});

const OTHER_AUTHORITY = createTask105L05RecoveryAuthority({
  profile: "fast",
  session: "task105-fast-r2",
  runMarker: "fedcba987654",
  recoveryKey: "C".repeat(43),
});

const ROLE_CHECKPOINT: Task105L05ReceiptPatch = Object.freeze({
  fixture: Object.freeze({
    roleId: "role_1",
    roleDescription: "TASK-105 L05 synthetic role for task105-fast-r1",
    roleXmin: "1",
  }),
});

describe("TASK-105 L05 durable recovery CAS seam", () => {
  test("commits a checkpoint once and treats only its exact retry as idempotent", () => {
    const seam = createTask105L05RecoveryDbTestSeam();
    seam.initialize(AUTHORITY);

    const committed = seam.transition({
      authority: AUTHORITY,
      expectedPhase: "fixture-intent",
      expectedVersion: 0,
      nextPhase: "fixture-installing",
      patch: ROLE_CHECKPOINT,
    });
    const retry = seam.transition({
      authority: AUTHORITY,
      expectedPhase: "fixture-intent",
      expectedVersion: 0,
      nextPhase: "fixture-installing",
      patch: ROLE_CHECKPOINT,
    });

    expect(committed.version).toBe(1);
    expect(retry).toEqual(committed);
    expect(seam.committedWrites()).toBe(2); // intent + one exact checkpoint
    expect(() =>
      seam.transition({
        authority: AUTHORITY,
        expectedPhase: "fixture-intent",
        expectedVersion: 0,
        nextPhase: "fixture-installing",
        patch: Object.freeze({ fixture: Object.freeze({ roleId: "role_2" }) }),
      })
    ).toThrow(/conflicted/u);
    expect(seam.committedWrites()).toBe(2);
    expect(seam.inspect()?.phase).toBe("fixture-installing");
  });

  test("refuses response-unknown recovery when the parent authority is gone", () => {
    const seam = createTask105L05RecoveryDbTestSeam();
    seam.initialize(AUTHORITY);

    expect(() =>
      seam.recover({
        authority: AUTHORITY,
        parentAuthorityLive: false,
        namespacedFixtureAbsent: true,
      })
    ).toThrow(/live parent authority/u);
    expect(seam.inspect()?.phase).toBe("fixture-intent");
  });

  test("refuses recovery under a different authority and retains the receipt", () => {
    const seam = createTask105L05RecoveryDbTestSeam();
    seam.initialize(AUTHORITY);

    expect(() =>
      seam.recover({
        authority: OTHER_AUTHORITY,
        parentAuthorityLive: true,
        namespacedFixtureAbsent: true,
      })
    ).toThrow(/authority drifted/u);
    expect(seam.committedWrites()).toBe(1);
    expect(seam.inspect()?.phase).toBe("fixture-intent");
  });

  test("removes an empty pre-mutation intent only after an exact namespace proof", () => {
    const seam = createTask105L05RecoveryDbTestSeam();
    seam.initialize(AUTHORITY);

    expect(() =>
      seam.recover({
        authority: AUTHORITY,
        parentAuthorityLive: true,
        namespacedFixtureAbsent: false,
      })
    ).toThrow(/proven empty/u);
    const recovered = seam.recover({
      authority: AUTHORITY,
      parentAuthorityLive: true,
      namespacedFixtureAbsent: true,
    });
    expect(recovered).toEqual({ recovered: true });
    expect(JSON.stringify(recovered)).not.toContain("tokenHash");
    expect(seam.inspect()).toBeNull();
  });

  test("handles a lost install response through safe recovery refusal, never mutation replay", () => {
    const seam = createTask105L05RecoveryDbTestSeam();
    seam.initialize(AUTHORITY);
    seam.transition({
      authority: AUTHORITY,
      expectedPhase: "fixture-intent",
      expectedVersion: 0,
      nextPhase: "fixture-installing",
      patch: ROLE_CHECKPOINT,
    });

    const writesBeforeRecovery = seam.committedWrites();
    expect(() =>
      seam.recover({
        authority: AUTHORITY,
        parentAuthorityLive: true,
        namespacedFixtureAbsent: true,
      })
    ).toThrow(/manual cleanup/u);
    expect(seam.committedWrites()).toBe(writesBeforeRecovery);
    expect(seam.inspect()?.phase).toBe("fixture-installing");
  });
});
