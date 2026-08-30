import { describe, expect, test } from "bun:test";

import {
  createTask105L05RecoveryAuthority,
  createTask105L05RecoveryReceipt,
  task105L05ReceiptPatchDigest,
  transitionReceipt,
  validateTask105L05RecoveryReceipt,
  type Task105L05ReceiptPatch,
  type Task105L05ReceiptPhase,
  type Task105L05RecoveryReceipt,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/recovery-receipt";

const AUTHORITY = createTask105L05RecoveryAuthority({
  profile: "fast",
  session: "task105-fast-r1",
  runMarker: "0123456789ab",
  recoveryKey: "A".repeat(43),
});

const FIXTURE_PATCH: Task105L05ReceiptPatch = Object.freeze({
  fixture: Object.freeze({
    roleId: "role_1",
    roleDescription: "TASK-105 L05 synthetic role for task105-fast-r1",
    roleXmin: "1",
  }),
});

function advance(
  current: Task105L05RecoveryReceipt,
  expectedPhase: Task105L05ReceiptPhase,
  nextPhase: Task105L05ReceiptPhase,
  patch: Task105L05ReceiptPatch
): Task105L05RecoveryReceipt {
  return transitionReceipt({
    authority: AUTHORITY,
    current,
    expectedPhase,
    expectedVersion: current.version,
    nextPhase,
    patch,
  });
}

function installedReceipt(): Task105L05RecoveryReceipt {
  let receipt = createTask105L05RecoveryReceipt({ authority: AUTHORITY });
  receipt = advance(receipt, "fixture-intent", "fixture-installing", FIXTURE_PATCH);
  receipt = advance(
    receipt,
    "fixture-installing",
    "fixture-installing",
    Object.freeze({
      fixture: Object.freeze({ userId: "user_1" }),
    })
  );
  receipt = advance(
    receipt,
    "fixture-installing",
    "fixture-installing",
    Object.freeze({
      fixture: Object.freeze({ sessionId: "session_1", tokenHash: "a".repeat(64) }),
    })
  );
  return advance(
    receipt,
    "fixture-installing",
    "fixture-installed",
    Object.freeze({
      fixture: Object.freeze({ fixturePageId: "page_1" }),
    })
  );
}

function settingsPatch(): Task105L05ReceiptPatch {
  return Object.freeze({
    settings: Object.freeze({
      // All baseline keys are absent. An owned post-write assistant setting
      // must remain valid so recovery can delete it back to its absent state.
      baseline: Object.freeze([null, null, null, null, null, null, null]),
      owned: Object.freeze([
        Object.freeze({
          key: "assistant.enabled" as const,
          valueJson: "true",
          updatedAt: "2026-08-30T00:00:00.000Z",
          xmin: "2",
        }),
      ]),
    }),
  });
}

function siteShellClaimPatch(): Task105L05ReceiptPatch {
  return Object.freeze({
    settings: Object.freeze({
      baseline: Object.freeze([null, null, null, null, null, null, null]),
      owned: Object.freeze([
        Object.freeze({
          key: "assistant.enabled" as const,
          valueJson: "true",
          updatedAt: "2026-08-30T00:00:00.000Z",
          xmin: "2",
        }),
        Object.freeze({
          key: "site.navigationMenuId" as const,
          valueJson: JSON.stringify("menu_1"),
          updatedAt: "2026-08-30T00:00:01.000Z",
          xmin: "3",
        }),
        Object.freeze({
          key: "site.footerTemplateId" as const,
          valueJson: "null",
          updatedAt: "2026-08-30T00:00:01.000Z",
          xmin: "4",
        }),
      ]),
    }),
    siteShell: Object.freeze({ navigationMenuId: "menu_1" }),
  });
}

function phaseReceipts(): Readonly<Record<Task105L05ReceiptPhase, Task105L05RecoveryReceipt>> {
  const fixtureIntent = createTask105L05RecoveryReceipt({ authority: AUTHORITY });
  const fixtureInstalling = advance(
    fixtureIntent,
    "fixture-intent",
    "fixture-installing",
    FIXTURE_PATCH
  );
  const fixtureInstalled = advance(
    fixtureInstalling,
    "fixture-installing",
    "fixture-installed",
    Object.freeze({
      fixture: Object.freeze({
        userId: "user_1",
        sessionId: "session_1",
        tokenHash: "a".repeat(64),
        fixturePageId: "page_1",
      }),
    })
  );
  const settingsApplied = advance(
    fixtureInstalled,
    "fixture-installed",
    "settings-applied",
    settingsPatch()
  );
  const siteShellIntent = advance(
    settingsApplied,
    "settings-applied",
    "site-shell-intent",
    Object.freeze({})
  );
  const siteShellClaimed = advance(
    siteShellIntent,
    "site-shell-intent",
    "site-shell-claimed",
    siteShellClaimPatch()
  );
  const recovering = advance(
    siteShellClaimed,
    "site-shell-claimed",
    "recovering",
    Object.freeze({})
  );
  const settingsRestored = advance(
    recovering,
    "recovering",
    "settings-restored",
    Object.freeze({})
  );
  const fixturesRemoved = advance(
    settingsRestored,
    "settings-restored",
    "fixtures-removed",
    Object.freeze({})
  );
  return Object.freeze({
    "fixture-intent": fixtureIntent,
    "fixture-installing": fixtureInstalling,
    "fixture-installed": fixtureInstalled,
    "settings-applied": settingsApplied,
    "site-shell-intent": siteShellIntent,
    "site-shell-claimed": siteShellClaimed,
    recovering,
    "settings-restored": settingsRestored,
    "fixtures-removed": fixturesRemoved,
  });
}

describe("TASK-105 L05 recovery receipt", () => {
  test("creates only a signed pre-mutation fixture intent", () => {
    const receipt = createTask105L05RecoveryReceipt({ authority: AUTHORITY });

    expect(receipt.phase).toBe("fixture-intent");
    expect(receipt.version).toBe(0);
    expect(receipt.settings).toBeNull();
    expect(receipt.fixture.sessionId).toBeNull();
    expect(validateTask105L05RecoveryReceipt(receipt, AUTHORITY)).toEqual(receipt);
  });

  test("rejects tampered HMACs and unknown receipt fields before recovery can use it", () => {
    const receipt = createTask105L05RecoveryReceipt({ authority: AUTHORITY });

    expect(() =>
      validateTask105L05RecoveryReceipt({ ...receipt, receiptHmac: "0".repeat(64) }, AUTHORITY)
    ).toThrow(/HMAC/u);
    expect(() =>
      validateTask105L05RecoveryReceipt({ ...receipt, phase: "recovering" }, AUTHORITY)
    ).toThrow(/HMAC/u);
    expect(() =>
      validateTask105L05RecoveryReceipt({ ...receipt, unexpected: true }, AUTHORITY)
    ).toThrow();
  });

  test("permits ownership of a setting whose canonical baseline was absent", () => {
    const applied = advance(
      installedReceipt(),
      "fixture-installed",
      "settings-applied",
      settingsPatch()
    );

    expect(applied.settings?.baseline).toEqual([null, null, null, null, null, null, null]);
    expect(applied.settings?.owned.map(({ key }) => key)).toEqual(["assistant.enabled"]);
  });

  test("recognizes only an exact expected-phase/version/patch retry", () => {
    const initial = createTask105L05RecoveryReceipt({ authority: AUTHORITY });
    const committed = advance(initial, "fixture-intent", "fixture-installing", FIXTURE_PATCH);
    const retry = transitionReceipt({
      authority: AUTHORITY,
      current: committed,
      expectedPhase: "fixture-intent",
      expectedVersion: 0,
      nextPhase: "fixture-installing",
      patch: FIXTURE_PATCH,
    });

    expect(retry).toEqual(committed);
    expect(retry.version).toBe(1);
    expect(() =>
      transitionReceipt({
        authority: AUTHORITY,
        current: committed,
        expectedPhase: "fixture-intent",
        expectedVersion: 0,
        nextPhase: "fixture-installing",
        patch: Object.freeze({ fixture: Object.freeze({ roleId: "different-role" }) }),
      })
    ).toThrow(/conflicted/u);
    expect(() =>
      advance(
        initial,
        "fixture-intent",
        "fixture-installed",
        Object.freeze({
          fixture: Object.freeze({ fixturePageId: "page_1" }),
        })
      )
    ).toThrow();
  });

  test("allows exactly the contract transition graph", () => {
    const receipts = phaseReceipts();
    const empty = Object.freeze({}) as Task105L05ReceiptPatch;
    const cases: readonly Readonly<{
      readonly from: Task105L05ReceiptPhase;
      readonly to: Task105L05ReceiptPhase;
      readonly patch: Task105L05ReceiptPatch;
    }>[] = [
      { from: "fixture-intent", to: "fixture-installing", patch: FIXTURE_PATCH },
      { from: "fixture-intent", to: "recovering", patch: empty },
      {
        from: "fixture-installing",
        to: "fixture-installing",
        patch: Object.freeze({ fixture: Object.freeze({ userId: "user_1" }) }),
      },
      {
        from: "fixture-installing",
        to: "fixture-installed",
        patch: Object.freeze({
          fixture: Object.freeze({
            userId: "user_1",
            sessionId: "session_1",
            tokenHash: "a".repeat(64),
            fixturePageId: "page_1",
          }),
        }),
      },
      { from: "fixture-installing", to: "recovering", patch: empty },
      { from: "fixture-installed", to: "settings-applied", patch: settingsPatch() },
      { from: "fixture-installed", to: "recovering", patch: empty },
      { from: "settings-applied", to: "site-shell-intent", patch: empty },
      { from: "settings-applied", to: "recovering", patch: empty },
      { from: "site-shell-intent", to: "site-shell-claimed", patch: siteShellClaimPatch() },
      { from: "site-shell-intent", to: "recovering", patch: empty },
      { from: "site-shell-claimed", to: "recovering", patch: empty },
      { from: "recovering", to: "settings-restored", patch: empty },
      { from: "recovering", to: "fixtures-removed", patch: empty },
      { from: "settings-restored", to: "fixtures-removed", patch: empty },
    ];

    for (const transition of cases) {
      const current = receipts[transition.from];
      expect(() =>
        transitionReceipt({
          authority: AUTHORITY,
          current,
          expectedPhase: transition.from,
          expectedVersion: current.version,
          nextPhase: transition.to,
          patch: transition.patch,
        })
      ).not.toThrow();
    }
  });

  test("rejects every prohibited graph edge and incomplete phase checkpoint", () => {
    const receipts = phaseReceipts();
    const prohibited: readonly Readonly<{
      readonly from: Task105L05ReceiptPhase;
      readonly to: Task105L05ReceiptPhase;
    }>[] = [
      { from: "fixture-intent", to: "fixture-installed" },
      { from: "fixture-installing", to: "settings-applied" },
      { from: "fixture-installed", to: "site-shell-intent" },
      { from: "settings-applied", to: "site-shell-claimed" },
      { from: "site-shell-intent", to: "settings-restored" },
      { from: "site-shell-claimed", to: "fixtures-removed" },
      { from: "recovering", to: "fixture-installed" },
      { from: "settings-restored", to: "recovering" },
      { from: "fixtures-removed", to: "recovering" },
    ];
    for (const transition of prohibited) {
      const current = receipts[transition.from];
      expect(() =>
        transitionReceipt({
          authority: AUTHORITY,
          current,
          expectedPhase: transition.from,
          expectedVersion: current.version,
          nextPhase: transition.to,
          patch: Object.freeze({}),
        })
      ).toThrow();
    }
    const incomplete = advance(
      createTask105L05RecoveryReceipt({ authority: AUTHORITY }),
      "fixture-intent",
      "fixture-installing",
      FIXTURE_PATCH
    );
    expect(() =>
      advance(
        incomplete,
        "fixture-installing",
        "fixture-installed",
        Object.freeze({ fixture: Object.freeze({ userId: "user_1" }) })
      )
    ).toThrow();
    expect(() =>
      advance(installedReceipt(), "fixture-installed", "settings-applied", Object.freeze({}))
    ).toThrow();
    const siteShellIntent = advance(
      advance(installedReceipt(), "fixture-installed", "settings-applied", settingsPatch()),
      "settings-applied",
      "site-shell-intent",
      Object.freeze({})
    );
    const incompleteSettingsPatch = settingsPatch();
    if (incompleteSettingsPatch.settings === undefined)
      throw new Error("test settings patch is missing");
    expect(() =>
      advance(
        siteShellIntent,
        "site-shell-intent",
        "site-shell-claimed",
        Object.freeze({
          settings: incompleteSettingsPatch.settings,
          siteShell: Object.freeze({ navigationMenuId: "menu_1" }),
        })
      )
    ).toThrow();
  });

  test("keeps canonical patch digests stable and rejects oversized private values", () => {
    expect(task105L05ReceiptPatchDigest(FIXTURE_PATCH)).toBe(
      task105L05ReceiptPatchDigest(FIXTURE_PATCH)
    );
    expect(task105L05ReceiptPatchDigest(FIXTURE_PATCH)).not.toBe(
      task105L05ReceiptPatchDigest(Object.freeze({ fixture: Object.freeze({ roleId: "role_2" }) }))
    );
    const receipt = createTask105L05RecoveryReceipt({ authority: AUTHORITY });
    expect(() =>
      advance(
        receipt,
        "fixture-intent",
        "fixture-installing",
        Object.freeze({
          fixture: Object.freeze({ roleDescription: "x".repeat(4097) }),
        })
      )
    ).toThrow();
  });
});
