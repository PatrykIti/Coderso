import { Script } from "node:vm";

import { SingleAssignmentCaptureMap } from "../captures.mjs";
import { invariant } from "../foundation.mjs";
import {
  changedJsonPointersExact,
  collectRendererIdsExact,
  freezeJsonTreeExact,
  normalizeRelationEnumerationExact,
  validateCurrentDraftAuthorityExact,
  validateResetDraftAuthorityExact,
} from "../json-schema.mjs";
import { registeredSelector, resolveFixtureValue } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export async function runBrowserCaptureFrontierSelfTest({
  buildBrowserInvocation,
  compileActionExecutionSpec,
  expectAsyncFailure,
  fixtureCaptureValue,
  plan,
}) {
  const compileBrowserInvocationAtCaptureFrontier = (action, captures) => {
    const executionSpec = compileActionExecutionSpec(action);
    return buildBrowserInvocation(
      action,
      executionSpec,
      captures,
      "/task540-self-test-root",
      "/task540-self-test-root/private",
      plan,
      {
        plan,
        captures,
        priorOutputs: new Map(),
        variables: new Map(),
        currentOutput: null,
        root: "/task540-self-test-root",
        actionId: action.id,
      },
      {
        csrfHeaderName: "x-self-test-csrf",
        authRatePolicy: {
          enabled: true,
          maxRequests: 10,
          windowSeconds: 60,
        },
      }
    );
  };
  const bootstrapCaptureFrontierAction = plan.actionManifest.find(
    ({ id }) => id === "set-011a-bootstrap-auth-settled"
  );
  const entryBaselineCaptureFrontierAction = plan.actionManifest.find(
    ({ id }) => id === "rc-012c-picker-warm-proof"
  );
  invariant(
    bootstrapCaptureFrontierAction?.builder === "observe(bootstrap-auth-identity-settled)" &&
      entryBaselineCaptureFrontierAction?.builder === "observe(relation-pickers-a-b-warm)",
    "capture-frontier observation actions drift"
  );
  const emptyCaptureFrontier = new SingleAssignmentCaptureMap();
  const emptyFrontierInvocation = compileBrowserInvocationAtCaptureFrontier(
    bootstrapCaptureFrontierAction,
    emptyCaptureFrontier
  );
  const partialCaptureFrontier = new SingleAssignmentCaptureMap();
  partialCaptureFrontier.bind("media.id", fixtureCaptureValue("media.id", plan));
  const partialFrontierInvocation = compileBrowserInvocationAtCaptureFrontier(
    bootstrapCaptureFrontierAction,
    partialCaptureFrontier
  );
  invariant(
    deepEqualJson(emptyFrontierInvocation.args.slice(0, 3), [
      "-s=wf540smoke",
      "--raw",
      "run-code",
    ]) &&
      emptyFrontierInvocation.args.length === 4 &&
      emptyFrontierInvocation.args[3] === partialFrontierInvocation.args[3] &&
      emptyFrontierInvocation.args[3].includes('"entryBaseline":null') &&
      emptyFrontierInvocation.args[3].includes('"expectedResetDraft":null') &&
      emptyFrontierInvocation.args[3].includes('"expectedRc017Draft":null'),
    "bootstrap auth invocation depends on future capture state"
  );
  new Script("(" + emptyFrontierInvocation.args[3] + ")", {
    filename: bootstrapCaptureFrontierAction.id + ".capture-frontier.self-test.js",
  });
  await expectAsyncFailure(
    async () =>
      compileBrowserInvocationAtCaptureFrontier(
        entryBaselineCaptureFrontierAction,
        new SingleAssignmentCaptureMap()
      ),
    "entry-baseline observation missing capture frontier"
  );

  const nonEntryAssertionCaptureFrontierAction = plan.actionManifest.find(
    ({ id }) => id === "bi-018-reopen-proof"
  );
  const entryAssertionCaptureFrontierAction = plan.actionManifest.find(
    ({ id }) => id === "rc-032-diff-proof"
  );
  invariant(
    nonEntryAssertionCaptureFrontierAction?.builder === "assert(persisted-no-empty-binding)" &&
      entryAssertionCaptureFrontierAction?.builder === "assert(relation-diff-exact)",
    "capture-frontier assertion actions drift"
  );
  const entryBaselineCaptureNames = new Set([
    "media.id",
    "related-entry-a1.id",
    "related-entry-a2.id",
    "related-entry-failure1.id",
  ]);
  const buildAssertionCaptureFrontier = ({ partialEntryBaseline = false } = {}) => {
    const captures = new SingleAssignmentCaptureMap();
    for (const name of plan.requiredCaptureNames) {
      if (!entryBaselineCaptureNames.has(name) || (partialEntryBaseline && name === "media.id")) {
        captures.bind(name, fixtureCaptureValue(name, plan));
      }
    }
    for (const name of plan.requiredRuntimeBlockCaptures) {
      captures.bind(name, plan.prefix + "-" + name.replaceAll(".", "-"));
    }
    return captures;
  };
  const emptyEntryAssertionInvocation = compileBrowserInvocationAtCaptureFrontier(
    nonEntryAssertionCaptureFrontierAction,
    buildAssertionCaptureFrontier()
  );
  const partialEntryAssertionInvocation = compileBrowserInvocationAtCaptureFrontier(
    nonEntryAssertionCaptureFrontierAction,
    buildAssertionCaptureFrontier({ partialEntryBaseline: true })
  );
  invariant(
    emptyEntryAssertionInvocation.args.length === 4 &&
      partialEntryAssertionInvocation.args.length === 4 &&
      emptyEntryAssertionInvocation.args[3].includes('"entryBaseline":null') &&
      emptyEntryAssertionInvocation.args[3].includes('"expectedResetDraft":null') &&
      emptyEntryAssertionInvocation.args[3].includes('"expectedRc017Draft":null') &&
      partialEntryAssertionInvocation.args[3].includes('"entryBaseline":null') &&
      partialEntryAssertionInvocation.args[3].includes('"expectedResetDraft":null') &&
      partialEntryAssertionInvocation.args[3].includes('"expectedRc017Draft":null'),
    "non-entry assertion depends on the entry capture frontier"
  );
  new Script("(" + emptyEntryAssertionInvocation.args[3] + ")", {
    filename: nonEntryAssertionCaptureFrontierAction.id + ".capture-frontier.self-test.js",
  });
  await expectAsyncFailure(
    async () =>
      compileBrowserInvocationAtCaptureFrontier(
        entryAssertionCaptureFrontierAction,
        buildAssertionCaptureFrontier()
      ),
    "entry-baseline assertion missing capture frontier"
  );

  const sourceCaptures = new SingleAssignmentCaptureMap();
  for (const name of plan.requiredCaptureNames)
    sourceCaptures.bind(name, fixtureCaptureValue(name, plan));
  for (const name of plan.requiredRuntimeBlockCaptures) {
    sourceCaptures.bind(name, plan.prefix + "-" + name.replaceAll(".", "-"));
  }
  const hostileBlockId = 'outer"\\realm';
  const hostileTabLabel = 'Tab "quoted"\\tail';
  const hostilePreviewSelector = registeredSelector(plan, "previewRuntimeTab", [
    hostileBlockId,
    hostileTabLabel,
  ]);
  invariant(
    hostilePreviewSelector ===
      '[data-preview-shell="roomy"] [data-preview-device="desktop"] [data-screen-block-id="outer\\"\\\\realm"] [role="tab"]:text-is("Tab \\"quoted\\"\\\\tail")' &&
      !hostilePreviewSelector.includes('outer\\\\\\"') &&
      !hostilePreviewSelector.includes("realm\\\\\\\\tail"),
    "preview runtime selector exact escaping drift"
  );

  const relationExpected = [
    {
      field: "relationA",
      rootId: plan.fixtureBlueprint.screen.blockIds.relationAField,
      options: [
        {
          id: sourceCaptures.get("related-entry-a1.id"),
          title: plan.fixtureBlueprint.relatedEntries.a1.title,
        },
        {
          id: sourceCaptures.get("related-entry-a2.id"),
          title: plan.fixtureBlueprint.relatedEntries.a2.title,
        },
      ],
    },
    {
      field: "relationB",
      rootId: plan.fixtureBlueprint.screen.blockIds.relationBField,
      options: [
        {
          id: sourceCaptures.get("related-entry-b1.id"),
          title: plan.fixtureBlueprint.relatedEntries.b1.title,
        },
        {
          id: sourceCaptures.get("related-entry-b2.id"),
          title: plan.fixtureBlueprint.relatedEntries.b2.title,
        },
      ],
    },
  ];
  const relationOption = (option, selected) => ({
    id: option.id,
    title: option.title,
    tagName: "BUTTON",
    ariaPressed: selected ? "true" : "false",
    indicatorCount: 1,
    indicatorAriaHidden: "true",
    indicatorState: selected ? "checked" : "unchecked",
    nestedControlCount: 0,
    visible: true,
    enabled: true,
  });
  const relationFields = [
    {
      field: "relationA",
      rootId: relationExpected[0].rootId,
      options: [
        relationOption(relationExpected[0].options[1], true),
        relationOption(relationExpected[0].options[0], true),
      ],
    },
    {
      field: "relationB",
      rootId: relationExpected[1].rootId,
      options: [
        relationOption(relationExpected[1].options[1], false),
        relationOption(relationExpected[1].options[0], false),
      ],
    },
  ];
  const normalizedRelation = normalizeRelationEnumerationExact(relationFields, relationExpected);
  invariant(
    deepEqualJson(normalizedRelation, {
      relationA: relationExpected[0].options.map(({ id }) => id),
      relationB: [],
      observedIds: {
        relationA: relationExpected[0].options.map(({ id }) => id),
        relationB: relationExpected[1].options.map(({ id }) => id),
      },
      observedTitles: {
        relationA: relationExpected[0].options.map(({ title }) => title),
        relationB: relationExpected[1].options.map(({ title }) => title),
      },
    }),
    "relation enumeration order-independent normalization drift"
  );
  for (const [label, mutate] of [
    [
      "relation blank ID",
      (rows) => {
        rows[0].options[0].id = "";
      },
    ],
    [
      "relation non UUID",
      (rows) => {
        rows[0].options[0].id = "not-a-uuid";
      },
    ],
    [
      "relation unknown ID",
      (rows) => {
        rows[0].options[0].id = "54000000-0000-4000-8000-999999999991";
      },
    ],
    [
      "relation duplicate ID",
      (rows) => {
        rows[0].options[1].id = rows[0].options[0].id;
      },
    ],
    [
      "relation missing option",
      (rows) => {
        rows[0].options.pop();
      },
    ],
    [
      "relation ARIA indicator mismatch",
      (rows) => {
        rows[0].options[0].indicatorState = "unchecked";
      },
    ],
    [
      "relation indicator missing",
      (rows) => {
        rows[0].options[0].indicatorCount = 0;
      },
    ],
    [
      "relation duplicate root",
      (rows) => {
        rows[1].rootId = rows[0].rootId;
      },
    ],
  ]) {
    await expectAsyncFailure(async () => {
      const rows = structuredClone(relationFields);
      mutate(rows);
      normalizeRelationEnumerationExact(rows, relationExpected);
    }, label);
  }

  invariant(
    deepEqualJson(
      changedJsonPointersExact(
        { stable: true, nested: { removed: "old", kept: 1 }, list: ["a"] },
        { stable: true, nested: { added: "new", kept: 1 }, list: ["a", "b"] }
      ),
      ["/list/1", "/nested/added", "/nested/removed"]
    ),
    "union-leaf added/removed diff drift"
  );

  const resetDraftFixture = {
    controls: {
      headline: plan.fixtureBlueprint.entry.baseline.headline,
      mediaAssetIds: [sourceCaptures.get("media.id")],
      unrelatedNote: plan.fixtureBlueprint.entry.baseline.unrelatedNote,
    },
    presentation: { tone: "inherit" },
    relations: {
      relationA: relationExpected[0].options.map(({ id }) => id),
      relationB: [],
    },
  };
  const resetPersistedFixture = resolveFixtureValue(
    plan.fixtureBlueprint.entry.baseline,
    sourceCaptures
  );
  const resetAuthorityExpected = {
    sourceActionId: "rc-002-entry-proof",
    capturedAtActionId: "rc-012c-picker-warm-proof",
    persistedData: resetPersistedFixture,
    resetDraft: resetDraftFixture,
    observedRelationIds: normalizedRelation.observedIds,
  };
  const resetAuthorityFixture = freezeJsonTreeExact({
    authorityVersion: 1,
    sourceActionId: resetAuthorityExpected.sourceActionId,
    capturedAtActionId: resetAuthorityExpected.capturedAtActionId,
    persisted: { data: resetPersistedFixture, overrides: [] },
    draft: resetDraftFixture,
    observedRelationIds: normalizedRelation.observedIds,
    proof: {
      persistedFixtureMatches: true,
      persistedOverridesEmpty: true,
      draftMatchesPersisted: true,
      completeWritableControls: true,
      relationEnumerationComplete: true,
    },
  });
  invariant(
    validateResetDraftAuthorityExact(resetAuthorityFixture, resetAuthorityExpected) === true,
    "reset private draft authority success drift"
  );
  await expectAsyncFailure(
    async () =>
      validateResetDraftAuthorityExact(
        {
          ...structuredClone(resetAuthorityFixture),
          draft: structuredClone(resetAuthorityFixture.draft),
        },
        resetAuthorityExpected
      ),
    "reset authority mutable copy"
  );
  await expectAsyncFailure(async () => {
    const incomplete = structuredClone(resetAuthorityFixture);
    delete incomplete.draft.controls.mediaAssetIds;
    validateResetDraftAuthorityExact(freezeJsonTreeExact(incomplete), resetAuthorityExpected);
  }, "reset authority incomplete writable controls");

  const currentDraftFixture = structuredClone(resetDraftFixture);
  currentDraftFixture.controls.unrelatedNote = plan.fixtureBlueprint.entry.relatedUnrelatedDraft;
  currentDraftFixture.presentation.tone = plan.fixtureBlueprint.entry.presentationDraft.tone;
  const currentAuthorityExpected = {
    sourceActionId: "rc-017-unrelated-before",
    capturedAtActionId: "rc-017-unrelated-before",
    resetSourceActionId: "rc-002-entry-proof",
    currentDraft: currentDraftFixture,
    observedRelationIds: normalizedRelation.observedIds,
    diffFromReset: ["/controls/unrelatedNote", "/presentation/tone"],
  };
  const currentAuthorityFixture = freezeJsonTreeExact({
    authorityVersion: 1,
    sourceActionId: currentAuthorityExpected.sourceActionId,
    capturedAtActionId: currentAuthorityExpected.capturedAtActionId,
    resetAuthority: resetAuthorityFixture,
    draft: currentDraftFixture,
    observedRelationIds: normalizedRelation.observedIds,
    diffFromReset: changedJsonPointersExact(resetDraftFixture, currentDraftFixture),
    proof: {
      resetAuthorityValid: true,
      exactTwoLeafDiff: true,
      unrelatedNoteMatches: true,
      toneMatches: true,
      relationsUnchanged: true,
      completeWritableControls: true,
    },
  });
  invariant(
    validateCurrentDraftAuthorityExact(currentAuthorityFixture, currentAuthorityExpected) === true,
    "current private draft authority success drift"
  );
  await expectAsyncFailure(async () => {
    const thirdPath = structuredClone(currentAuthorityFixture);
    thirdPath.draft.controls.headline = "unexpected third-path mutation";
    validateCurrentDraftAuthorityExact(freezeJsonTreeExact(thirdPath), currentAuthorityExpected);
  }, "current authority third path");
  await expectAsyncFailure(async () => {
    const relationDrift = structuredClone(currentAuthorityFixture);
    relationDrift.draft.relations.relationA = [];
    validateCurrentDraftAuthorityExact(
      freezeJsonTreeExact(relationDrift),
      currentAuthorityExpected
    );
  }, "current authority relation drift");

  const rc032DraftFixture = structuredClone(currentDraftFixture);
  rc032DraftFixture.relations.relationA = [];
  rc032DraftFixture.relations.relationB = relationExpected[1].options.map(({ id }) => id);
  const rc032DiffPaths = changedJsonPointersExact(currentDraftFixture, rc032DraftFixture);
  const rc032RelationRoots = ["/relations/relationA", "/relations/relationB"];
  invariant(
    rc032DiffPaths.length > 0 &&
      rc032DiffPaths.every((pointer) =>
        rc032RelationRoots.some((root) => pointer === root || pointer.startsWith(root + "/"))
      ),
    "rc032 relation-only union-leaf diff drift"
  );

  const rendererRealm = (prefix) => ({
    outer: {
      tabs: [1, 2, 3].map((index) => ({ domTabId: prefix + "-ot" + index })),
      panels: [1, 2, 3].map((index) => ({ domPanelId: prefix + "-op" + index })),
    },
    inner: {
      tabs: [1, 2].map((index) => ({ domTabId: prefix + "-it" + index })),
      panels: [1, 2].map((index) => ({ domPanelId: prefix + "-ip" + index })),
    },
  });
  const rendererIds = collectRendererIdsExact([rendererRealm("builder"), rendererRealm("preview")]);
  invariant(
    rendererIds.length === 20 && new Set(rendererIds).size === 20,
    "renderer ID union drift"
  );
  await expectAsyncFailure(async () => {
    const missingInner = rendererRealm("preview");
    missingInner.inner.panels.pop();
    collectRendererIdsExact([rendererRealm("builder"), missingInner]);
  }, "renderer missing inner panel");
  await expectAsyncFailure(async () => {
    const duplicateRealm = rendererRealm("preview");
    duplicateRealm.inner.tabs[0].domTabId = "builder-ot1";
    collectRendererIdsExact([rendererRealm("builder"), duplicateRealm]);
  }, "renderer cross-realm duplicate ID");

  return sourceCaptures;
}
