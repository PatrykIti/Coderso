import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { forms } from "../../../core/db/schema";
import {
  captureFormAggregateNativeSnapshot,
  mutateFormAggregateAtomic,
  normalizeFormAggregateNativeDesired,
} from "../../../core/services/forms/formAggregateService";

const ACTOR_ID = "00000000-0000-4000-8000-000000000547";
const ownedIds = new Set<string>();
const dbTestTimeoutMs = 360_000;
const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  for (const id of ownedIds) await db.delete(forms).where(eq(forms.id, id));
  ownedIds.clear();
});

const desired = (slug: string, actionId = crypto.randomUUID()) =>
  normalizeFormAggregateNativeDesired({
    name: "Package form",
    slug,
    status: "draft",
    description: null,
    successMessage: "Thank you",
    successRedirectUrl: null,
    submissionAccess: "public",
    settings: {},
    fields: [
      {
        id: crypto.randomUUID(),
        type: "email",
        label: "Email",
        name: "email",
        required: true,
        settings: {},
        orderIndex: 0,
      },
    ],
    actions: [
      {
        id: actionId,
        type: "success_message",
        label: "Success",
        enabled: true,
        continueOnError: true,
        condition: { operator: "always" },
        config: { message: "Saved" },
        orderIndex: 7,
      },
    ],
  });

testIfDb(
  "creates, conditionally replaces, and conditionally deletes one complete Form aggregate",
  async () => {
    const id = crypto.randomUUID();
    const actionId = crypto.randomUUID();
    ownedIds.add(id);
    const initial = desired(`package-form-${id}`, actionId);
    const created = await mutateFormAggregateAtomic({
      operation: "create",
      id,
      desired: initial,
      actorId: ACTOR_ID,
    });
    expect(created.id).toBe(id);
    expect(created.snapshot?.desired.actions[0]?.id).toBe(actionId);
    expect(created.snapshot?.desired.actions[0]?.orderIndex).toBe(0);
    expect(await captureFormAggregateNativeSnapshot(id)).toEqual(created.snapshot);

    const next = normalizeFormAggregateNativeDesired({
      ...created.snapshot!.desired,
      description: "Changed atomically",
      actions: created.snapshot!.desired.actions.map((action) => ({
        ...action,
        config: { message: "Changed" },
      })),
    });
    const replaced = await mutateFormAggregateAtomic({
      operation: "replace",
      id,
      desired: next,
      expectedCurrent: created.snapshot!,
      actorId: ACTOR_ID,
    });
    expect(replaced.snapshot?.desired.description).toBe("Changed atomically");
    expect(replaced.snapshot?.desired.actions[0]?.id).toBe(actionId);

    await expect(
      mutateFormAggregateAtomic({
        operation: "replace",
        id,
        desired: initial,
        expectedCurrent: created.snapshot!,
        actorId: ACTOR_ID,
      })
    ).rejects.toThrow("site_package_state_changed");
    expect(await captureFormAggregateNativeSnapshot(id)).toEqual(replaced.snapshot);

    const deleted = await mutateFormAggregateAtomic({
      operation: "delete",
      id,
      expectedCurrent: replaced.snapshot!,
      actorId: ACTOR_ID,
    });
    expect(deleted).toEqual({ id, snapshot: null });
    ownedIds.delete(id);
  },
  dbTestTimeoutMs
);

test("requires stable action ids and rejects secret-bearing action strings", () => {
  const base = desired("pure-form");
  expect(() =>
    normalizeFormAggregateNativeDesired({
      ...base,
      actions: [{ ...base.actions[0], id: undefined }],
    })
  ).toThrow("form_action_invalid_payload");
  expect(() =>
    normalizeFormAggregateNativeDesired({
      ...base,
      actions: [
        {
          ...base.actions[0],
          type: "webhook",
          config: {
            url: "https://example.invalid/hook",
            method: "POST",
            headers: { Authorization: "safe-looking-value" },
            timeoutMs: 8000,
            includeSubmission: true,
          },
        },
      ],
    })
  ).toThrow("site_package_invalid");
});
