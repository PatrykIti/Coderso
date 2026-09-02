import { describe, expect, test } from "vitest";

import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";
import {
  buildNormalizedRelatedPlan,
  buildRelatedMachineInputKey,
  createRelatedAttemptMachine,
  decodeRelatedMachineInputKey,
  RELATED_LOAD_ERROR,
  relatedAttemptReducer,
  type NormalizedRelatedPlan,
  type UseScreenRelatedEntriesInput,
} from "../../../core/admin/ui/custom-screens/hooks/useScreenRelatedEntries";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";

const relatedBlock = (
  id: string,
  target = "tasks",
  data: Record<string, unknown> = {}
): ScreenBlockV1 => ({
  id,
  type: "related-list",
  data: {
    target,
    ...data,
  },
});

const otherBlock = (id: string): ScreenBlockV1 => ({
  id,
  type: "text",
  data: { text: "Static" },
});

const documentWith = (...blocks: ScreenBlockV1[]): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [
    {
      id: "section-1",
      type: "section",
      data: {},
      blocks,
    },
  ],
});

const binding = (blockId: string, field = "relations.tasks"): ScreenFieldBinding => ({
  id: `binding-${blockId}`,
  blockId,
  propPath: "items",
  source: "entry",
  field,
  mode: "read",
});

const relationField = (name = "relations.tasks", target = "tasks"): ContentField => ({
  id: `field-${name}`,
  name,
  type: "relation",
  label: "Related",
  relation: { target, multiple: true },
});

const makeInput = (
  overrides: Partial<UseScreenRelatedEntriesInput> = {}
): UseScreenRelatedEntriesInput => ({
  enabled: true,
  document: documentWith(relatedBlock("block-1", "stale", { displayField: "priority" })),
  bindings: [binding("block-1")],
  values: { relations: { tasks: ["id-2", "id-1"] } },
  fields: [relationField()],
  ...overrides,
});

describe("normalized related plan and key codec", () => {
  test("derives the exact resolver projection and preserves selected-id identity", () => {
    const input = makeInput({
      values: { relations: { tasks: ["id-2", " id-1 ", "id-2"] } },
      document: documentWith(
        relatedBlock("block-1", "stale-target", { displayField: "priority", limit: 99 })
      ),
    });
    const plan = buildNormalizedRelatedPlan(input);

    expect(plan.blocks).toEqual([
      {
        blockId: "block-1",
        bindingPath: "relations.tasks",
        target: "tasks",
        selectedIds: ["id-2", " id-1 ", "id-2"],
        displayField: "priority",
        limit: 3,
      },
    ]);
    expect(plan.targetSlugs).toEqual(["tasks"]);
    expect(plan.targetLoadKey).toBe('["tasks"]');
    expect(plan.requestKey).toBe(
      '[["block-1","relations.tasks","tasks",["id-2"," id-1 ","id-2"],"priority",3]]'
    );
  });

  test("round-trips pinned tuple bytes and rebuilds a deeply frozen plan", () => {
    const plan = buildNormalizedRelatedPlan(
      makeInput({
        values: { relations: { tasks: ["id-2", "id-1", "id-1"] } },
        document: documentWith(
          relatedBlock("block-1", "stale", { displayField: "priority", limit: 3 })
        ),
      })
    );
    const key = buildRelatedMachineInputKey(true, plan);
    expect(key).toBe(
      '[1,[["block-1","relations.tasks","tasks",["id-2","id-1","id-1"],"priority",3]]]'
    );

    const decoded = decodeRelatedMachineInputKey(key);
    expect(buildRelatedMachineInputKey(decoded.enabled, decoded.plan)).toBe(key);
    expect(Object.isFrozen(decoded.plan)).toBe(true);
    expect(Object.isFrozen(decoded.plan.blocks)).toBe(true);
    expect(Object.isFrozen(decoded.plan.blocks[0])).toBe(true);
    expect(Object.isFrozen(decoded.plan.blocks[0]?.selectedIds)).toBe(true);
    expect(Object.isFrozen(decoded.plan.targetSlugs)).toBe(true);
  });

  test("rejects unsafe, non-canonical, overlong, duplicate, and empty tuple identities", () => {
    const tuple = (
      blockId: unknown = "block-1",
      bindingPath: unknown = "relations.tasks",
      target: unknown = "tasks",
      selectedIds: unknown = ["id-1"],
      displayField: unknown = "priority",
      limit: unknown = 1
    ) => [blockId, bindingPath, target, selectedIds, displayField, limit];
    const key = (...tuples: unknown[][]) => JSON.stringify([1, tuples]);
    const unsafeSegments = ["__proto__", "prototype", "constructor"];
    const invalidKeys = [
      "not-json",
      JSON.stringify([2, []]),
      key(tuple(" block-1")),
      key(tuple("block-1 ")),
      key(tuple("block/1")),
      key(tuple(".block")),
      key(tuple("block..one")),
      key(tuple("block-1", " relations.tasks")),
      key(tuple("block-1", "relations.tasks ")),
      key(tuple("block-1", "relations/tasks")),
      key(tuple("block-1", ".relations")),
      key(tuple("block-1", "relations..tasks")),
      ...unsafeSegments.flatMap((segment) => [
        key(tuple(segment)),
        key(tuple(`safe.${segment}`)),
        key(tuple("block-1", segment)),
        key(tuple("block-1", `safe.${segment}`)),
      ]),
      key(tuple("a".repeat(161))),
      key(tuple("block-1", "a".repeat(161))),
      key(tuple("block-1", "relations.tasks", "a".repeat(161))),
      key(tuple("block-1", "relations.tasks", "tasks", ["id-1"], "a".repeat(161))),
      key(tuple("block-1", "relations.tasks", "tasks", [])),
      key(tuple("block-1", "relations.tasks", "tasks", [""])),
      key(tuple("block-2"), tuple("block-1")),
      key(tuple(), tuple()),
    ];

    for (const invalidKey of invalidKeys) {
      expect(() => decodeRelatedMachineInputKey(invalidKey)).toThrow("related_plan_invalid");
    }

    const boundary = "a".repeat(160);
    const validBoundaryKey = key(tuple(boundary, boundary, boundary, [" id "], boundary, 1));
    expect(
      buildRelatedMachineInputKey(true, decodeRelatedMachineInputKey(validBoundaryKey).plan)
    ).toBe(validBoundaryKey);
  });

  test("fails the whole document closed on duplicate or invalid block IDs before filtering", () => {
    const duplicateAcrossTypes = buildNormalizedRelatedPlan(
      makeInput({
        document: documentWith(otherBlock("duplicate"), relatedBlock("duplicate")),
        bindings: [binding("duplicate")],
      })
    );
    expect(duplicateAcrossTypes.blocks).toEqual([]);

    const duplicateRelatedWithDiscardedProjection = buildNormalizedRelatedPlan(
      makeInput({
        document: documentWith(
          relatedBlock("duplicate", "tasks"),
          relatedBlock("duplicate", "", { displayField: " invalid " })
        ),
        bindings: [],
      })
    );
    expect(duplicateRelatedWithDiscardedProjection.blocks).toEqual([]);

    const invalidId = buildNormalizedRelatedPlan(
      makeInput({
        document: documentWith(relatedBlock(" block-1")),
        bindings: [binding(" block-1")],
      })
    );
    expect(invalidId.blocks).toEqual([]);
  });

  test("drops non-canonical binding, target, and display paths without repairing them", () => {
    const inputs = [
      makeInput({ bindings: [binding("block-1", " relations.tasks")] }),
      makeInput({ fields: [relationField("relations.tasks", " tasks")] }),
      makeInput({
        document: documentWith(
          relatedBlock("block-1", "tasks", { displayField: "__proto__.name" })
        ),
      }),
    ];
    for (const input of inputs) {
      expect(buildNormalizedRelatedPlan(input).blocks).toEqual([]);
    }
  });
});

describe("related attempt reducer", () => {
  const planFor = (id: string, target = "tasks"): NormalizedRelatedPlan =>
    buildNormalizedRelatedPlan(
      makeInput({
        document: documentWith(relatedBlock("block-1", target)),
        values: { relations: { tasks: [id] } },
        fields: undefined,
      })
    );

  const machineFor = (plan: NormalizedRelatedPlan, enabled = true) =>
    createRelatedAttemptMachine({
      enabled,
      requestKey: plan.requestKey,
      targetLoadKey: plan.targetLoadKey,
      hasTargets: plan.targetSlugs.length > 0,
      plan,
    });

  test("allocates monotonic attempts, preserves settlement identity, and ignores stale actions", () => {
    const plan = planFor("id-1");
    const initial = machineFor(plan);
    expect(initial.attempt).toMatchObject({ token: 1, cause: "initial", force: false });
    expect(Object.isFrozen(initial.attempt)).toBe(true);

    const forced = relatedAttemptReducer(initial, {
      type: "force-attempt",
      requestKey: plan.requestKey,
      targetLoadKey: plan.targetLoadKey,
      cause: "manual-retry",
    });
    expect(forced.attempt).toMatchObject({ token: 2, cause: "manual-retry", force: true });
    const attempt = forced.attempt;
    const settled = relatedAttemptReducer(forced, {
      type: "settled-success",
      inputKey: forced.inputKey,
      requestKey: plan.requestKey,
      token: 2,
      items: { "block-1": [{ id: "id-1", title: "One" }] },
    });
    expect(settled.attempt).toBe(attempt);
    expect(settled.settledToken).toBe(2);

    const staleSuccess = relatedAttemptReducer(settled, {
      type: "settled-success",
      inputKey: settled.inputKey,
      requestKey: plan.requestKey,
      token: 1,
      items: {},
    });
    const staleFailure = relatedAttemptReducer(settled, {
      type: "settled-error",
      inputKey: "stale",
      requestKey: plan.requestKey,
      token: 2,
      error: "stale",
    });
    expect(staleSuccess).toBe(settled);
    expect(staleFailure).toBe(settled);
  });

  test("retains same-request rows on failure and rejects stale or disabled force actions", () => {
    const plan = planFor("id-1");
    const initial = machineFor(plan);
    const activeAttempt = initial.attempt;
    const ignoredWhileActive = relatedAttemptReducer(initial, {
      type: "force-attempt",
      requestKey: "stale-request",
      targetLoadKey: plan.targetLoadKey,
      cause: "manual-retry",
    });
    expect(ignoredWhileActive).toBe(initial);
    expect(ignoredWhileActive.attempt).toBe(activeAttempt);
    const success = relatedAttemptReducer(initial, {
      type: "settled-success",
      inputKey: initial.inputKey,
      requestKey: plan.requestKey,
      token: 1,
      items: { "block-1": [{ id: "id-1", title: "One" }] },
    });
    const retry = relatedAttemptReducer(success, {
      type: "force-attempt",
      requestKey: plan.requestKey,
      targetLoadKey: plan.targetLoadKey,
      cause: "cache-event",
    });
    const failed = relatedAttemptReducer(retry, {
      type: "settled-error",
      inputKey: retry.inputKey,
      requestKey: plan.requestKey,
      token: 2,
      error: RELATED_LOAD_ERROR,
    });
    expect(failed.commit.items).toEqual(success.commit.items);
    expect(failed.commit.error).toBe(RELATED_LOAD_ERROR);

    const staleForce = relatedAttemptReducer(failed, {
      type: "force-attempt",
      requestKey: "other",
      targetLoadKey: plan.targetLoadKey,
      cause: "manual-retry",
    });
    expect(staleForce).toBe(failed);

    const disabled = machineFor(plan, false);
    expect(
      relatedAttemptReducer(disabled, {
        type: "force-attempt",
        requestKey: plan.requestKey,
        targetLoadKey: plan.targetLoadKey,
        cause: "manual-retry",
      })
    ).toBe(disabled);
  });

  test("inherits a pending force for one target identity and never reuses tokens across A-B-A", () => {
    const planA = planFor("id-1");
    const planB = planFor("id-2");
    let state = machineFor(planA);
    state = relatedAttemptReducer(state, {
      type: "force-attempt",
      requestKey: planA.requestKey,
      targetLoadKey: planA.targetLoadKey,
      cause: "manual-retry",
    });
    expect(state.attempt?.token).toBe(2);

    const keyB = buildRelatedMachineInputKey(true, planB);
    state = relatedAttemptReducer(state, {
      type: "sync-input",
      inputKey: keyB,
      enabled: true,
      plan: planB,
    });
    expect(state.attempt).toMatchObject({ token: 3, force: true, cause: "manual-retry" });
    state = relatedAttemptReducer(state, {
      type: "force-attempt",
      requestKey: planB.requestKey,
      targetLoadKey: planB.targetLoadKey,
      cause: "cache-event",
    });
    expect(state.attempt?.token).toBe(4);

    const keyA = buildRelatedMachineInputKey(true, planA);
    state = relatedAttemptReducer(state, {
      type: "sync-input",
      inputKey: keyA,
      enabled: true,
      plan: planA,
    });
    expect(state.attempt).toMatchObject({ token: 5, force: true, cause: "cache-event" });

    const sameInput = relatedAttemptReducer(state, {
      type: "sync-input",
      inputKey: keyA,
      enabled: true,
      plan: planA,
    });
    expect(sameInput).toBe(state);
    expect(sameInput.attempt).toBe(state.attempt);
  });

  test("starts a changed target identity without inherited force", () => {
    const planA = planFor("id-1", "tasks");
    const planB = planFor("id-1", "notes");
    let state = machineFor(planA);
    state = relatedAttemptReducer(state, {
      type: "force-attempt",
      requestKey: planA.requestKey,
      targetLoadKey: planA.targetLoadKey,
      cause: "cache-event",
    });
    state = relatedAttemptReducer(state, {
      type: "sync-input",
      inputKey: buildRelatedMachineInputKey(true, planB),
      enabled: true,
      plan: planB,
    });
    expect(state.attempt).toMatchObject({ token: 3, force: false, cause: "input-change" });
  });

  test("never resets tokens across disabled and empty-plan intervals", () => {
    const planA = planFor("id-1");
    const planB = planFor("id-2");
    const emptyPlan = buildNormalizedRelatedPlan(
      makeInput({ document: documentWith(otherBlock("text-1")), bindings: [] })
    );
    let state = machineFor(planA);
    state = relatedAttemptReducer(state, {
      type: "sync-input",
      inputKey: buildRelatedMachineInputKey(false, planA),
      enabled: false,
      plan: planA,
    });
    expect(state.lastToken).toBe(1);
    expect(state.attempt).toBeNull();
    state = relatedAttemptReducer(state, {
      type: "sync-input",
      inputKey: buildRelatedMachineInputKey(true, emptyPlan),
      enabled: true,
      plan: emptyPlan,
    });
    expect(state.lastToken).toBe(1);
    expect(state.attempt).toBeNull();
    state = relatedAttemptReducer(state, {
      type: "sync-input",
      inputKey: buildRelatedMachineInputKey(true, planB),
      enabled: true,
      plan: planB,
    });
    expect(state.attempt?.token).toBe(2);
    state = relatedAttemptReducer(state, {
      type: "force-attempt",
      requestKey: planB.requestKey,
      targetLoadKey: planB.targetLoadKey,
      cause: "manual-retry",
    });
    expect(state.attempt?.token).toBe(3);
  });
});
