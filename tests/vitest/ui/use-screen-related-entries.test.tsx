// @vitest-environment happy-dom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const relatedMocks = vi.hoisted(() => {
  const listeners = new Set<(event: { key: string }) => void>();
  return {
    listEntriesCached: vi.fn(),
    listeners,
    subscribeCacheEvents: vi.fn((handler: (event: { key: string }) => void) => {
      listeners.add(handler);
      return () => listeners.delete(handler);
    }),
  };
});

vi.mock("@/services/entriesClient", () => ({
  listEntriesCached: (slug: string, options?: { force?: boolean }) =>
    relatedMocks.listEntriesCached(slug, options),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) =>
    relatedMocks.subscribeCacheEvents(handler),
}));

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";
import {
  buildNormalizedRelatedPlan,
  buildRelatedMachineInputKey,
  createRelatedAttemptMachine,
  decodeRelatedMachineInputKey,
  RELATED_LOAD_ERROR,
  relatedAttemptReducer,
  useScreenRelatedEntries,
  type NormalizedRelatedPlan,
  type RelatedEntriesState,
  type UseScreenRelatedEntriesInput,
} from "../../../core/admin/ui/custom-screens/hooks/useScreenRelatedEntries";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type EntryRow = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: "draft";
  visibility: "public";
  hasPassword: false;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const entryRow = (id: string, title: string, data: Record<string, unknown> = {}): EntryRow => ({
  id,
  typeId: "type-related",
  title,
  slug: id,
  status: "draft",
  visibility: "public",
  hasPassword: false,
  data,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
});

const rows = [
  entryRow("id-1", "One", { priority: "low" }),
  entryRow("id-2", "Two", { priority: "high" }),
  entryRow("id-3", "Three", { priority: "medium" }),
];

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

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const requireRelatedEntriesState = (state: RelatedEntriesState | null): RelatedEntriesState => {
  if (!state) throw new Error("Hook state unavailable");
  return state;
};

type HookView = {
  root: Root;
  container: HTMLDivElement;
  render: (input: UseScreenRelatedEntriesInput) => void;
  state: () => RelatedEntriesState;
  cleanup: () => void;
};

const mountHook = (initialInput: UseScreenRelatedEntriesInput): HookView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let currentState: RelatedEntriesState | null = null;

  const Harness = ({ input }: { input: UseScreenRelatedEntriesInput }) => {
    currentState = useScreenRelatedEntries(input);
    return <div data-loading={String(currentState.loading)}>{currentState.error}</div>;
  };

  const render = (input: UseScreenRelatedEntriesInput) => {
    React.act(() => {
      root.render(<Harness input={input} />);
    });
  };

  render(initialInput);
  return {
    root,
    container,
    render,
    state: () => {
      if (!currentState) throw new Error("Hook state unavailable");
      return currentState;
    },
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const emitEntriesEvent = (slug: string) => {
  React.act(() => {
    for (const listener of relatedMocks.listeners) {
      listener({ key: cacheKeys.entriesList(slug) });
    }
  });
};

beforeEach(() => {
  relatedMocks.listeners.clear();
  relatedMocks.subscribeCacheEvents.mockClear();
  relatedMocks.listEntriesCached.mockReset();
  relatedMocks.listEntriesCached.mockResolvedValue(rows);
});

afterEach(() => {
  document.body.innerHTML = "";
  relatedMocks.listeners.clear();
  vi.restoreAllMocks();
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

describe("useScreenRelatedEntries", () => {
  test("reads each unique target once and distributes rows through resolver semantics", async () => {
    const input = makeInput({
      document: documentWith(
        relatedBlock("block-b", "tasks", { displayField: "priority", limit: 1 }),
        relatedBlock("block-a", "tasks"),
        relatedBlock("block-c", "notes")
      ),
      bindings: [
        binding("block-a", "relations.tasks"),
        binding("block-b", "relations.tasks"),
        binding("block-c", "relations.notes"),
      ],
      values: {
        relations: {
          tasks: ["id-2", "id-1"],
          notes: ["id-3"],
        },
      },
      fields: [
        relationField("relations.tasks", "tasks"),
        relationField("relations.notes", "notes"),
      ],
    });
    const view = mountHook(input);
    try {
      await flush();
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(2);
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledWith("tasks", { force: false });
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledWith("notes", { force: false });
      expect(view.state().items["block-a"]?.map((item) => item.id)).toEqual(["id-2", "id-1"]);
      expect(view.state().items["block-b"]).toEqual([
        expect.objectContaining({ id: "id-2", displayValue: "high" }),
      ]);
      expect(view.state().items["block-c"]?.map((item) => item.id)).toEqual(["id-3"]);
      expect(view.state()).toMatchObject({ loading: false, refreshing: false, error: null });
    } finally {
      view.cleanup();
    }
  });

  test.each([
    ["disabled", makeInput({ enabled: false })],
    ["no related block", makeInput({ document: documentWith(otherBlock("text-1")), bindings: [] })],
    ["missing binding", makeInput({ bindings: [] })],
    ["undefined selected value", makeInput({ values: {} })],
    ["null selected value", makeInput({ values: { relations: { tasks: null } } })],
    ["empty selected string", makeInput({ values: { relations: { tasks: "" } } })],
    ["empty selected array", makeInput({ values: { relations: { tasks: [] } } })],
  ])("performs zero reads and subscriptions for %s", async (_name, input) => {
    const view = mountHook(input);
    try {
      await flush();
      expect(relatedMocks.listEntriesCached).not.toHaveBeenCalled();
      expect(relatedMocks.subscribeCacheEvents).not.toHaveBeenCalled();
      expect(view.state()).toMatchObject({
        items: {},
        loading: false,
        refreshing: false,
        error: null,
      });
    } finally {
      view.cleanup();
    }
  });

  test.each([
    ["non-canonical binding", makeInput({ bindings: [binding("block-1", " relations.tasks")] })],
    ["unsafe target", makeInput({ fields: [relationField("relations.tasks", "safe.__proto__")] })],
    [
      "invalid display path",
      makeInput({
        document: documentWith(
          relatedBlock("block-1", "tasks", { displayField: "priority/value" })
        ),
      }),
    ],
    [
      "duplicate document IDs",
      makeInput({
        document: documentWith(otherBlock("duplicate"), relatedBlock("duplicate")),
        bindings: [binding("duplicate")],
      }),
    ],
  ])("fails %s closed before reads or subscriptions", async (_name, input) => {
    const view = mountHook(input);
    try {
      await flush();
      expect(relatedMocks.listEntriesCached).not.toHaveBeenCalled();
      expect(relatedMocks.subscribeCacheEvents).not.toHaveBeenCalled();
      expect(view.state().targetSlugs).toEqual([]);
    } finally {
      view.cleanup();
    }
  });

  test("semantic rerenders neither replace the settled attempt nor cancel a forced request", async () => {
    const forced = deferred<EntryRow[]>();
    relatedMocks.listEntriesCached
      .mockResolvedValueOnce(rows)
      .mockImplementationOnce(() => forced.promise);
    const view = mountHook(makeInput());
    try {
      await flush();
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(1);
      view.render(makeInput());
      await flush();
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(1);
      expect(relatedMocks.subscribeCacheEvents).toHaveBeenCalledTimes(1);

      React.act(() => view.state().retry());
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(2);
      expect(view.state().refreshing).toBe(true);
      const subscriptionsAfterRetry = relatedMocks.subscribeCacheEvents.mock.calls.length;
      view.render(makeInput());
      await flush();
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(2);
      expect(relatedMocks.subscribeCacheEvents).toHaveBeenCalledTimes(subscriptionsAfterRetry);

      forced.resolve([entryRow("id-2", "Authoritative Two")]);
      await flush();
      expect(view.state().items["block-1"]?.[0]?.title).toBe("Authoritative Two");
    } finally {
      view.cleanup();
    }
  });

  test("shows a bounded failure and forces a same-request manual retry while retaining rows", async () => {
    const retry = deferred<EntryRow[]>();
    relatedMocks.listEntriesCached
      .mockRejectedValueOnce(new Error("sensitive provider detail"))
      .mockImplementationOnce(() => retry.promise);
    const view = mountHook(makeInput());
    try {
      await flush();
      expect(view.state()).toMatchObject({
        items: {},
        loading: false,
        refreshing: false,
        error: RELATED_LOAD_ERROR,
      });

      React.act(() => view.state().retry());
      expect(relatedMocks.listEntriesCached).toHaveBeenLastCalledWith("tasks", { force: true });
      expect(view.state()).toMatchObject({ refreshing: true, error: null });
      retry.resolve(rows);
      await flush();
      expect(view.state()).toMatchObject({ loading: false, refreshing: false, error: null });
      expect(view.state().items["block-1"]?.map((item) => item.id)).toEqual(["id-2", "id-1"]);
    } finally {
      view.cleanup();
    }
  });

  test("cache events force authoritative refresh and ignore unrelated targets", async () => {
    const refresh = deferred<EntryRow[]>();
    relatedMocks.listEntriesCached
      .mockResolvedValueOnce(rows)
      .mockImplementationOnce(() => refresh.promise);
    const view = mountHook(makeInput());
    try {
      await flush();
      emitEntriesEvent("notes");
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(1);
      emitEntriesEvent("tasks");
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(2);
      expect(relatedMocks.listEntriesCached).toHaveBeenLastCalledWith("tasks", { force: true });
      expect(view.state().refreshing).toBe(true);
      expect(view.state().items["block-1"]?.[0]?.title).toBe("Two");
      refresh.resolve([entryRow("id-2", "Updated Two"), entryRow("id-1", "Updated One")]);
      await flush();
      expect(view.state().items["block-1"]?.map((item) => item.title)).toEqual([
        "Updated Two",
        "Updated One",
      ]);
    } finally {
      view.cleanup();
    }
  });

  test("a failed same-request background refresh retains rows and then exposes bounded Retry", async () => {
    const refresh = deferred<EntryRow[]>();
    relatedMocks.listEntriesCached
      .mockResolvedValueOnce(rows)
      .mockImplementationOnce(() => refresh.promise);
    const view = mountHook(makeInput());
    try {
      await flush();
      emitEntriesEvent("tasks");
      expect(view.state()).toMatchObject({ refreshing: true, error: null });
      expect(view.state().items["block-1"]?.map((item) => item.id)).toEqual(["id-2", "id-1"]);
      refresh.reject(new Error("private refresh detail"));
      await flush();
      expect(view.state()).toMatchObject({
        loading: false,
        refreshing: false,
        error: RELATED_LOAD_ERROR,
      });
      expect(view.state().items["block-1"]?.map((item) => item.id)).toEqual(["id-2", "id-1"]);
    } finally {
      view.cleanup();
    }
  });

  test("request A to B immediately hides A and stale A settlement cannot publish", async () => {
    const requestA = deferred<EntryRow[]>();
    const requestB = deferred<EntryRow[]>();
    relatedMocks.listEntriesCached
      .mockImplementationOnce(() => requestA.promise)
      .mockImplementationOnce(() => requestB.promise);
    const view = mountHook(makeInput({ values: { relations: { tasks: ["id-1"] } } }));
    try {
      expect(view.state().loading).toBe(true);
      view.render(makeInput({ values: { relations: { tasks: ["id-2"] } } }));
      expect(view.state()).toMatchObject({ items: {}, loading: true, refreshing: false });
      await flush();
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(2);

      requestA.resolve([entryRow("id-1", "Stale One")]);
      await flush();
      expect(view.state()).toMatchObject({ items: {}, loading: true });
      requestB.resolve([entryRow("id-2", "Current Two")]);
      await flush();
      expect(view.state().items["block-1"]).toEqual([
        expect.objectContaining({ id: "id-2", title: "Current Two" }),
      ]);
    } finally {
      view.cleanup();
    }
  });

  test.each(["success", "failure"] as const)(
    "rejects stale %s resolved from the new-input layout-to-passive-cleanup window",
    async (outcome) => {
      const requestA = deferred<EntryRow[]>();
      const requestB = deferred<EntryRow[]>();
      relatedMocks.listEntriesCached
        .mockImplementationOnce(() => requestA.promise)
        .mockImplementationOnce(() => requestB.promise);
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      let currentState: RelatedEntriesState | null = null;
      let settledBeforePassiveCleanup = false;

      const Child = ({ input }: { input: UseScreenRelatedEntriesInput }) => {
        currentState = useScreenRelatedEntries(input);
        return null;
      };
      const Parent = ({
        input,
        settleInLayout,
      }: {
        input: UseScreenRelatedEntriesInput;
        settleInLayout?: () => void;
      }) => {
        React.useLayoutEffect(() => {
          if (!settleInLayout) return;
          settledBeforePassiveCleanup = relatedMocks.listeners.size > 0;
          settleInLayout();
        }, [settleInLayout]);
        return <Child input={input} />;
      };

      React.act(() => {
        root.render(<Parent input={makeInput({ values: { relations: { tasks: ["id-1"] } } })} />);
      });
      const settle = () => {
        if (outcome === "success") requestA.resolve([entryRow("id-1", "Stale One")]);
        else requestA.reject(new Error("stale failure"));
      };
      React.act(() => {
        root.render(
          <Parent
            input={makeInput({ values: { relations: { tasks: ["id-2"] } } })}
            settleInLayout={settle}
          />
        );
      });
      await flush();
      expect(settledBeforePassiveCleanup).toBe(true);
      expect(currentState).toMatchObject({ items: {}, loading: true, error: null });
      expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(2);

      requestB.resolve([entryRow("id-2", "Current Two")]);
      await flush();
      const settledState = requireRelatedEntriesState(currentState);
      expect(settledState.items["block-1"]?.[0]?.id).toBe("id-2");
      React.act(() => root.unmount());
      container.remove();
    }
  );

  test.each([
    ["manual-retry", "old-first"],
    ["manual-retry", "new-first"],
    ["cache-event", "old-first"],
    ["cache-event", "new-first"],
  ] as const)(
    "inherits force for same-target projection changes after %s with %s settlement",
    async (cause, order) => {
      const oldForced = deferred<EntryRow[]>();
      const newForced = deferred<EntryRow[]>();
      relatedMocks.listEntriesCached
        .mockResolvedValueOnce(rows)
        .mockImplementationOnce(() => oldForced.promise)
        .mockImplementationOnce(() => newForced.promise);
      const view = mountHook(makeInput({ values: { relations: { tasks: ["id-1"] } } }));
      try {
        await flush();
        if (cause === "manual-retry") {
          React.act(() => view.state().retry());
        } else {
          emitEntriesEvent("tasks");
        }
        expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(2);
        view.render(makeInput({ values: { relations: { tasks: ["id-2"] } } }));
        expect(view.state()).toMatchObject({ items: {}, loading: true });
        await flush();
        expect(relatedMocks.listEntriesCached).toHaveBeenCalledTimes(3);
        expect(relatedMocks.listEntriesCached.mock.calls[2]).toEqual(["tasks", { force: true }]);

        if (order === "old-first") {
          oldForced.resolve([entryRow("id-1", "Stale One")]);
          await flush();
          expect(view.state()).toMatchObject({ items: {}, loading: true });
          newForced.resolve([entryRow("id-2", "Current Two")]);
        } else {
          newForced.resolve([entryRow("id-2", "Current Two")]);
          await flush();
          expect(view.state().items["block-1"]?.[0]?.id).toBe("id-2");
          oldForced.resolve([entryRow("id-1", "Stale One")]);
        }
        await flush();
        expect(view.state().items["block-1"]).toEqual([
          expect.objectContaining({ id: "id-2", title: "Current Two" }),
        ]);
      } finally {
        view.cleanup();
      }
    }
  );

  test("a changed target-load key starts a normal non-force request", async () => {
    const pendingTasks = deferred<EntryRow[]>();
    relatedMocks.listEntriesCached
      .mockResolvedValueOnce(rows)
      .mockImplementationOnce(() => pendingTasks.promise)
      .mockResolvedValueOnce([entryRow("id-1", "Note One")]);
    const tasksInput = makeInput({
      document: documentWith(relatedBlock("block-1", "tasks")),
      fields: undefined,
      values: { relations: { tasks: ["id-1"] } },
    });
    const notesInput = makeInput({
      document: documentWith(relatedBlock("block-1", "notes")),
      fields: undefined,
      values: { relations: { tasks: ["id-1"] } },
    });
    const view = mountHook(tasksInput);
    try {
      await flush();
      React.act(() => view.state().retry());
      view.render(notesInput);
      await flush();
      expect(relatedMocks.listEntriesCached.mock.calls[2]).toEqual(["notes", { force: false }]);
      expect(view.state().items["block-1"]?.[0]?.title).toBe("Note One");
    } finally {
      view.cleanup();
    }
  });

  test("settled empty success is not loading or failure", async () => {
    relatedMocks.listEntriesCached.mockResolvedValueOnce([]);
    const view = mountHook(makeInput());
    try {
      await flush();
      expect(view.state()).toMatchObject({
        items: { "block-1": [] },
        loading: false,
        refreshing: false,
        error: null,
      });
    } finally {
      view.cleanup();
    }
  });

  test("unmount cancellation prevents late success and failure commits", async () => {
    const pending = deferred<EntryRow[]>();
    relatedMocks.listEntriesCached.mockImplementationOnce(() => pending.promise);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const view = mountHook(makeInput());
    view.cleanup();
    pending.resolve(rows);
    await flush();
    expect(consoleError).not.toHaveBeenCalled();

    const rejected = deferred<EntryRow[]>();
    relatedMocks.listEntriesCached.mockImplementationOnce(() => rejected.promise);
    const second = mountHook(makeInput());
    second.cleanup();
    rejected.reject(new Error("late"));
    await flush();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
