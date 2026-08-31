import { expect, test } from "bun:test";
import type {
  Task540NativeAction,
  Task540NativePlan,
} from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/contracts";
import type {
  Task540AdminApiResponse,
  Task540AdminApiSessions,
  Task540AdminRequestOptions,
} from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/admin-session";
import type { Task540RuntimeState } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/contracts";
import { executeTask540OverrideAction } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/override-actions";
import type {
  PlainJsonObject,
  PlainJsonValue,
} from "../../../scripts/runtime-smoke/workers/contracts";
import type { WorkerPool } from "../../../scripts/runtime-smoke/workers/pool";

const SCREEN_ID = "00000000-0000-4000-8000-000000005401";
const ENTRY_ID = "00000000-0000-4000-8000-000000005402";
const BUTTON_ID = "00000000-0000-4000-8000-000000005403";
const MEDIA_ID = "00000000-0000-4000-8000-000000005404";
const RACE_IMAGE_ID = "00000000-0000-4000-8000-000000005405";
const USER_A_ID = "00000000-0000-4000-8000-000000005406";
const SCREEN_ROUTE = `/custom-screens/${SCREEN_ID}`;
const ENTRY_ROUTE = `/content/task-540-editable/entries/${ENTRY_ID}`;
const OVERRIDE_ROUTE = `/custom-screens/${SCREEN_ID}/entries/${ENTRY_ID}/overrides`;

type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";
type SessionKey = "bootstrap" | "user-a";

interface RecordedRequestOptions {
  readonly csrf?: boolean;
  readonly expectedUserId?: string;
  readonly json?: PlainJsonValue;
}

interface RecordedRequest {
  readonly session: SessionKey;
  readonly method: RequestMethod;
  readonly route: string;
  readonly options: RecordedRequestOptions;
}

type FakeStep =
  | { readonly kind: "response"; readonly value: PlainJsonValue }
  | { readonly kind: "failure"; readonly error: Error };

class FakeSession {
  readonly #key: SessionKey;
  readonly #calls: RecordedRequest[];
  readonly #steps: FakeStep[];

  constructor(key: SessionKey, calls: RecordedRequest[], steps: readonly FakeStep[]) {
    this.#key = key;
    this.#calls = calls;
    this.#steps = [...steps];
  }

  get remaining(): number {
    return this.#steps.length;
  }

  async request(
    method: RequestMethod,
    route: string,
    options: Task540AdminRequestOptions = {}
  ): Promise<Task540AdminApiResponse> {
    this.#calls.push(
      Object.freeze({
        session: this.#key,
        method,
        route,
        options: Object.freeze({
          ...(options.csrf === undefined ? {} : { csrf: options.csrf }),
          ...(options.expectedUserId === undefined
            ? {}
            : { expectedUserId: options.expectedUserId }),
          ...(options.json === undefined ? {} : { json: options.json }),
        }),
      })
    );
    const step = this.#steps.shift();
    if (step === undefined) throw new Error(`unexpected ${this.#key} ${method} ${route}`);
    if (step.kind === "failure") throw step.error;
    return Object.freeze({ status: 200, value: step.value, bytes: new Uint8Array() });
  }
}

class FakeAdminApi {
  readonly calls: RecordedRequest[] = [];
  readonly bootstrap: FakeSession;
  readonly userA: FakeSession;

  constructor(input: {
    readonly bootstrap?: readonly FakeStep[];
    readonly userA?: readonly FakeStep[];
  }) {
    this.bootstrap = new FakeSession("bootstrap", this.calls, input.bootstrap ?? []);
    this.userA = new FakeSession("user-a", this.calls, input.userA ?? []);
  }

  sessions(): Task540AdminApiSessions {
    return {
      require: (key: SessionKey) => (key === "bootstrap" ? this.bootstrap : this.userA),
    } as unknown as Task540AdminApiSessions;
  }

  expectConsumed(): void {
    expect({ bootstrap: this.bootstrap.remaining, userA: this.userA.remaining }).toEqual({
      bootstrap: 0,
      userA: 0,
    });
  }
}

function response(value: PlainJsonValue): FakeStep {
  return Object.freeze({ kind: "response", value });
}

function failure(error: Error): FakeStep {
  return Object.freeze({ kind: "failure", error });
}

function runtimeAction(id: string): Task540NativeAction {
  return Object.freeze({
    ordinal: 1,
    id,
    scenario: "task540-override-actions-test",
    pageId: null,
    tabIndex: null,
    kind: "runtime",
    builder: "test",
    executable: Object.freeze({ type: "runtime-operation", operationId: `runtime/${id}` }),
    outputSchemaId: "task540-override-actions-test",
  });
}

function unsafeDefinition(field = "primaryUrl"): PlainJsonObject {
  return Object.freeze({
    editorView: Object.freeze({
      bindings: Object.freeze([Object.freeze({ blockId: BUTTON_ID, propPath: "href", field })]),
    }),
  });
}

function baselineDefinition(): PlainJsonObject {
  return Object.freeze({ sections: Object.freeze([]) });
}

function screenResponse(
  definition: PlainJsonObject,
  revision: PlainJsonValue | undefined
): PlainJsonObject {
  return Object.freeze({ definition, ...(revision === undefined ? {} : { revision }) });
}

function createState(input: {
  readonly api: FakeAdminApi;
  readonly definition?: PlainJsonObject;
  readonly entryBody?: PlainJsonObject;
}): Task540RuntimeState {
  const definition = input.definition ?? baselineDefinition();
  const entryBody = input.entryBody ?? Object.freeze({ title: "baseline entry" });
  return {
    root: "/tmp/task540-override-actions-test",
    plan: {
      fixtureBlueprint: Object.freeze({
        contentTypes: Object.freeze({ editable: Object.freeze({ slug: "task-540-editable" }) }),
        screen: Object.freeze({ blockIds: Object.freeze({ raceImage: RACE_IMAGE_ID }) }),
      }),
      requiredIsolatedApiReadExpectations: Object.freeze({
        "ru-047a-a-durable-proof": true,
        "ru-051-a-server-false-proof": false,
        "ru-061a-a-durable-bypass-read": false,
      }),
    } as unknown as Task540NativePlan,
    pool: {} as WorkerPool,
    sessions: input.api.sessions(),
    environment: {},
    memory: {
      captures: new Map([
        ["screen.id", SCREEN_ID],
        ["entry.id", ENTRY_ID],
        ["palette.button", BUTTON_ID],
        ["media.id", MEDIA_ID],
        ["user-a.id", USER_A_ID],
      ]),
      privateProjection: () => Object.freeze({}),
    },
    baselineCaptured: false,
    hostReady: true,
    csrfHeaderName: null,
    authRatePolicy: null,
    bootstrapUserId: null,
    bootstrapBaseline: null,
    bootstrapNewestOwnedPair: null,
    bootstrapLoginAttempted: false,
    bootstrapRestored: false,
    editableContentType: null,
    editableEntryBody: entryBody,
    mediaRecord: null,
    expectedOverrides: Object.freeze([]),
    contentTypeBodies: new Map(),
    entryBodies: new Map(),
    screenBodies: new Map([["main", Object.freeze({ definition })]]),
  };
}

function screenRequests(
  expectedRevision: number,
  definition: PlainJsonObject
): readonly RecordedRequest[] {
  return Object.freeze([
    Object.freeze({
      session: "bootstrap",
      method: "GET",
      route: SCREEN_ROUTE,
      options: Object.freeze({ csrf: false }),
    }),
    Object.freeze({
      session: "bootstrap",
      method: "PATCH",
      route: SCREEN_ROUTE,
      options: Object.freeze({ json: { schemaVersion: 4, definition, expectedRevision } }),
    }),
  ]);
}

test("TASK-540 bi-060 uses its GET revision in one exact definition PATCH", async () => {
  const before = unsafeDefinition();
  const after = unsafeDefinition("secondaryUrl");
  const api = new FakeAdminApi({
    bootstrap: [response(screenResponse(before, 7)), response(screenResponse(after, 8))],
  });

  await executeTask540OverrideAction(createState({ api }), runtimeAction("bi-060-unsafe-patch"));

  expect(api.calls).toEqual(screenRequests(7, after));
  api.expectConsumed();
});

test("TASK-540 screen reset aliases re-read the current revision before one baseline PATCH", async () => {
  const aliases = ["bi-064-baseline-restore", "ss-001-screen-reset", "ru-001-screen-reset"];
  const baseline = baselineDefinition();

  for (const [index, id] of aliases.entries()) {
    const revision = 40 + index;
    const api = new FakeAdminApi({
      bootstrap: [
        response(screenResponse(unsafeDefinition("secondaryUrl"), revision)),
        response(screenResponse(baseline, revision + 1)),
      ],
    });

    await executeTask540OverrideAction(
      createState({ api, definition: baseline }),
      runtimeAction(id)
    );

    expect(api.calls).toEqual(screenRequests(revision, baseline));
    api.expectConsumed();
  }
});

test("TASK-540 definition PATCHes reject invalid current revisions before PATCH", async () => {
  const invalidRevisions: readonly (PlainJsonValue | undefined)[] = [
    undefined,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ];
  const definitions = [
    { id: "bi-060-unsafe-patch", current: unsafeDefinition(), baseline: baselineDefinition() },
    { id: "ss-001-screen-reset", current: baselineDefinition(), baseline: baselineDefinition() },
  ];

  for (const { id, current, baseline } of definitions) {
    for (const revision of invalidRevisions) {
      const api = new FakeAdminApi({
        bootstrap: [response(screenResponse(current, revision))],
      });

      await expect(
        executeTask540OverrideAction(createState({ api, definition: baseline }), runtimeAction(id))
      ).rejects.toThrow("revision is invalid");

      expect(api.calls).toEqual([
        {
          session: "bootstrap",
          method: "GET",
          route: SCREEN_ROUTE,
          options: { csrf: false },
        },
      ]);
      api.expectConsumed();
    }
  }
});

test("TASK-540 definition PATCHes reject response revision and definition drift without retry", async () => {
  const before = unsafeDefinition();
  const after = unsafeDefinition("secondaryUrl");
  const failures = [
    { saved: screenResponse(after, undefined), message: "revision drifted" },
    { saved: screenResponse(after, 9), message: "revision drifted" },
    { saved: screenResponse(before, 8), message: "definition drifted" },
  ];

  for (const { saved, message } of failures) {
    const api = new FakeAdminApi({
      bootstrap: [response(screenResponse(before, 7)), response(saved)],
    });

    await expect(
      executeTask540OverrideAction(createState({ api }), runtimeAction("bi-060-unsafe-patch"))
    ).rejects.toThrow(message);

    expect(api.calls).toEqual(screenRequests(7, after));
    api.expectConsumed();
  }
});

test("TASK-540 definition PATCH conflicts do not retry or rebase", async () => {
  const before = unsafeDefinition();
  const after = unsafeDefinition("secondaryUrl");
  const api = new FakeAdminApi({
    bootstrap: [
      response(screenResponse(before, 7)),
      failure(new Error("TASK-540 API PATCH /custom-screens/:id failed with status 409")),
    ],
  });

  await expect(
    executeTask540OverrideAction(createState({ api }), runtimeAction("bi-060-unsafe-patch"))
  ).rejects.toThrow("status 409");

  expect(api.calls).toEqual(screenRequests(7, after));
  api.expectConsumed();
});

test("TASK-540 override, entry, and preference PATCHes remain revision-free", async () => {
  const entryBody = Object.freeze({ title: "baseline entry" });
  const overrides = Object.freeze([
    Object.freeze({ blockId: RACE_IMAGE_ID, propPath: "mediaAssetId", value: MEDIA_ID }),
  ]);
  const api = new FakeAdminApi({
    bootstrap: [
      response(Object.freeze({ overrides })),
      response(Object.freeze({ id: ENTRY_ID, ...entryBody })),
    ],
    userA: [response(Object.freeze({ value: Object.freeze({ showFieldMetadata: false }) }))],
  });
  const state = createState({ api, entryBody });

  await executeTask540OverrideAction(state, runtimeAction("set-039-override-create"));
  await executeTask540OverrideAction(state, runtimeAction("ss-003-entry-reset"));
  await executeTask540OverrideAction(state, runtimeAction("ru-050-a-server-false"));

  expect(api.calls).toEqual([
    {
      session: "bootstrap",
      method: "PATCH",
      route: OVERRIDE_ROUTE,
      options: { json: { overrides } },
    },
    {
      session: "bootstrap",
      method: "PATCH",
      route: ENTRY_ROUTE,
      options: { json: entryBody },
    },
    {
      session: "user-a",
      method: "PATCH",
      route: "/user-settings/customScreens.entry.preferences",
      options: {
        expectedUserId: USER_A_ID,
        json: { value: { version: 1, showFieldMetadata: false } },
      },
    },
  ]);
  expect(
    api.calls.every(
      ({ options }) => !Object.hasOwn(options.json ?? Object.freeze({}), "expectedRevision")
    )
  ).toBe(true);
  api.expectConsumed();
});
