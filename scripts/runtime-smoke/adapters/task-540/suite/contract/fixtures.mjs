import { createHash } from "node:crypto";

import {
  assertClosedDataTree,
  deepFreezeExact,
  exactKeys,
  invariant,
  sameSet,
} from "./core.mjs";
import { REQUIRED_SCREENSHOT_PATHS } from "./metadata.mjs";
import { collectTaggedReferences } from "./references.mjs";
import {
  REQUIRED_CAPTURE_NAMES,
  REQUIRED_ROUTE_KEYS,
  REQUIRED_RUNTIME_BLOCK_CAPTURES,
} from "./requirements.mjs";

export function buildFixtureBlueprint(nonce) {
  const NONCE = nonce;
  const PREFIX = `wf540-${NONCE}`;
  const capture = (name) => Object.freeze({ capture: name });
  const runtimeBlock = (name, expectedType) =>
    Object.freeze({ captureNewBlock: name, expectedType });
  return deepFreezeExact({
    schemaVersion: 1,
    fixturePrefix: PREFIX,
    origins: {
      admin: "http://coderso-a.localhost:5173",
      front: "http://coderso-a.localhost:3000",
      routeBacking: "http://127.0.0.1:5173",
    },
    userAgents: {
      browser: `${PREFIX}-browser`,
      publicPreflight: `${PREFIX}-public-preflight`,
      apiBootstrap: `${PREFIX}-api-bootstrap`,
      apiUserA: `${PREFIX}-api-user-a`,
    },
    paths: {
      login: "/admin/login",
      screens: "/admin/advanced/custom-screens",
      builder: { template: "/admin/advanced/custom-screens/{screen.id}", captures: ["screen.id"] },
      records: {
        template: "/admin/advanced/custom-screens/{screen.id}/entries",
        captures: ["screen.id"],
      },
      entry: {
        template: "/admin/advanced/custom-screens/{screen.id}/entries/{entry.id}",
        captures: ["screen.id", "entry.id"],
      },
      retryEntry: {
        template: "/admin/advanced/custom-screens/{retry-screen.id}/entries/{entry.id}",
        captures: ["retry-screen.id", "entry.id"],
      },
      relatedEntryA1Editor: {
        template: `/admin/advanced/entries/${PREFIX}-related-a/{related-entry-a1.id}`,
        captures: ["related-entry-a1.id"],
      },
      safeFront: `http://coderso-a.localhost:3000/#${PREFIX}-safe`,
      nestedHash: `#${PREFIX}-nested`,
    },
    users: {
      bootstrap: { emailEnv: "ADMIN_EMAIL", passwordEnv: "ADMIN_PASSWORD" },
      a: {
        id: capture("user-a.id"),
        email: `wf540-a-${NONCE}@example.test`,
        displayName: `WF540 User A ${NONCE}`,
        passwordEnv: "ADMIN_PASSWORD",
        role: "Admin",
        preferenceBaseline: false,
        theme: "light",
      },
      b: {
        id: capture("user-b.id"),
        email: `wf540-b-${NONCE}@example.test`,
        displayName: `WF540 User B ${NONCE}`,
        passwordEnv: "ADMIN_PASSWORD",
        role: "Admin",
        preferenceBaseline: false,
        theme: "dark",
      },
    },
    contentTypes: {
      editable: {
        id: capture("content-type-editable.id"),
        name: `${PREFIX} Records`,
        slug: `${PREFIX}-records`,
        fields: [
          { id: "field-primaryUrl", name: "primaryUrl", label: "Primary URL", type: "text" },
          { id: "field-secondaryUrl", name: "secondaryUrl", label: "Secondary URL", type: "text" },
          { id: "field-headline", name: "headline", label: "Headline", type: "text" },
          { id: "field-raceImageId", name: "raceImageId", label: "Race image ID", type: "text" },
          {
            id: "field-mediaAsset",
            name: "mediaAsset",
            label: "Media asset",
            type: "media",
            media: { multiple: false, accept: ["image/*"] },
          },
          {
            id: "field-relationA",
            name: "relationA",
            label: "Related A",
            type: "relation",
            relation: { target: `${PREFIX}-related-a`, multiple: true },
          },
          {
            id: "field-relationB",
            name: "relationB",
            label: "Related B",
            type: "relation",
            relation: { target: `${PREFIX}-related-b`, multiple: true },
          },
          {
            id: "field-relationFailure",
            name: "relationFailure",
            label: "Related failure fixture",
            type: "relation",
            relation: { target: `${PREFIX}-related-failure`, multiple: true },
          },
          {
            id: "field-unrelatedNote",
            name: "unrelatedNote",
            label: "Unrelated note",
            type: "text",
          },
        ],
      },
      relatedA: {
        id: capture("content-type-related-a.id"),
        name: `${PREFIX} Related A`,
        slug: `${PREFIX}-related-a`,
        fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
      },
      relatedB: {
        id: capture("content-type-related-b.id"),
        name: `${PREFIX} Related B`,
        slug: `${PREFIX}-related-b`,
        fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
      },
      relatedFailure: {
        id: capture("content-type-related-failure.id"),
        name: `${PREFIX} Related failure`,
        slug: `${PREFIX}-related-failure`,
        fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
      },
    },
    relatedEntries: {
      a1: {
        id: capture("related-entry-a1.id"),
        title: `${PREFIX} Related A One`,
        slug: `${PREFIX}-related-a-one`,
        updatedTitle: `${PREFIX}-related-a-updated`,
        data: { label: "A-one" },
      },
      a2: {
        id: capture("related-entry-a2.id"),
        title: `${PREFIX} Related A Two`,
        slug: `${PREFIX}-related-a-two`,
        data: { label: "A-two" },
      },
      b1: {
        id: capture("related-entry-b1.id"),
        title: `${PREFIX} Related B One`,
        slug: `${PREFIX}-related-b-one`,
        data: { label: "B-one" },
      },
      b2: {
        id: capture("related-entry-b2.id"),
        title: `${PREFIX} Related B Two`,
        slug: `${PREFIX}-related-b-two`,
        data: { label: "B-two" },
      },
      failure1: {
        id: capture("related-entry-failure1.id"),
        title: `${PREFIX} Related failure One`,
        slug: `${PREFIX}-related-failure-one`,
        data: { label: "failure-one" },
      },
    },
    media: {
      id: capture("media.id"),
      title: `${PREFIX} Safe image`,
      originalName: `${PREFIX}-safe.png`,
      mimeType: "image/png",
      uploadFixture: {
        encoding: "base64",
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        decodedSizeBytes: 68,
        sha256: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
      },
      resolvedUrl: capture("media.resolved-url"),
      storageKey: capture("media.storage-key"),
      missingBoundMediaId: "54000000-0000-4000-8000-000000000001",
    },
    entry: {
      id: capture("entry.id"),
      title: `${PREFIX} Editable entry`,
      slug: `${PREFIX}-editable-entry`,
      baseline: {
        primaryUrl: `http://coderso-a.localhost:3000/#${PREFIX}-safe`,
        secondaryUrl: "javascript:alert(1)",
        headline: `${PREFIX} headline baseline`,
        raceImageId: "54000000-0000-4000-8000-000000000001",
        mediaAsset: capture("media.id"),
        relationA: [capture("related-entry-a1.id"), capture("related-entry-a2.id")],
        relationB: [],
        relationFailure: [capture("related-entry-failure1.id")],
        unrelatedNote: `${PREFIX} unrelated baseline`,
      },
      contentDraft: `${PREFIX} headline dirty draft`,
      presentationDraft: { tone: "muted" },
      relatedUnrelatedDraft: `${PREFIX} unrelated relation-race draft`,
      spacePhrase: "Alpha beta gamma delta",
    },
    screen: {
      id: capture("screen.id"),
      name: `${PREFIX} Entry screen`,
      status: "active",
      showInSidebar: true,
      sidebarLabel: `${PREFIX} Records`,
      mode: "editor-view",
      contentTypeId: capture("content-type-editable.id"),
      blockIds: {
        raceImage: `${PREFIX}-race-image`,
        mediaField: `${PREFIX}-media-field`,
        headlineField: `${PREFIX}-headline-field`,
        relationAField: `${PREFIX}-relation-a-field`,
        relationBField: `${PREFIX}-relation-b-field`,
        readOnlyField: `${PREFIX}-read-only-field`,
        relatedListA: `${PREFIX}-related-list-a`,
        relatedListB: `${PREFIX}-related-list-b`,
        spaceGroup: `${PREFIX}-space-group`,
        spaceNoteField: `${PREFIX}-space-note-field`,
        spaceLink: `${PREFIX}-space-link`,
      },
      definitionTemplate: {
        schemaVersion: 4,
        listView: {
          materializerId: "buildDefaultListViewDefinition",
          privateProjectionAuthorityId: "editable-content-type-detail",
        },
        editorView: {
          saveMode: "entry",
          interactionMode: "inline",
          document: {
            schemaVersion: 1,
            sections: [
              {
                id: `${PREFIX}-section-main`,
                type: "section",
                data: {},
                blocks: [
                  {
                    id: `${PREFIX}-race-image`,
                    type: "image",
                    data: { label: `${PREFIX} race image` },
                  },
                  {
                    id: `${PREFIX}-media-field`,
                    type: "field",
                    data: { field: "mediaAsset", label: "Media asset" },
                  },
                  {
                    id: `${PREFIX}-headline-field`,
                    type: "field",
                    data: { field: "headline", label: "Headline" },
                  },
                  {
                    id: `${PREFIX}-relation-a-field`,
                    type: "field",
                    data: { field: "relationA", label: "Related A" },
                  },
                  {
                    id: `${PREFIX}-relation-b-field`,
                    type: "field",
                    data: { field: "relationB", label: "Related B" },
                  },
                  {
                    id: `${PREFIX}-related-list-a`,
                    type: "related-list",
                    data: {
                      label: "Related A",
                      target: `${PREFIX}-related-a`,
                      displayField: "title",
                      variant: "cards",
                      limit: 10,
                      field: "relationA",
                    },
                  },
                  {
                    id: `${PREFIX}-related-list-b`,
                    type: "related-list",
                    data: {
                      label: "Related B",
                      target: `${PREFIX}-related-b`,
                      displayField: "title",
                      variant: "cards",
                      limit: 10,
                      field: "relationB",
                    },
                  },
                  {
                    id: `${PREFIX}-read-only-field`,
                    type: "field",
                    data: { field: "primaryUrl", label: "Read-only URL" },
                  },
                  {
                    id: `${PREFIX}-space-group`,
                    type: "field-group",
                    data: { title: "Nested controls", description: "" },
                    slots: {
                      content: [
                        {
                          id: `${PREFIX}-space-note-field`,
                          type: "field",
                          data: { field: "unrelatedNote", label: "Unrelated note" },
                        },
                        {
                          id: `${PREFIX}-space-link`,
                          type: "button",
                          data: {
                            label: "Nested destination",
                            action: "link",
                            href: `#${PREFIX}-nested`,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          bindings: [
            {
              id: `${PREFIX}-bind-race-image`,
              blockId: `${PREFIX}-race-image`,
              propPath: "src",
              source: "entry",
              field: "raceImageId",
              mode: "read",
            },
            {
              id: `${PREFIX}-bind-media-field`,
              blockId: `${PREFIX}-media-field`,
              propPath: "value",
              source: "entry",
              field: "mediaAsset",
              mode: "readwrite",
            },
            {
              id: `${PREFIX}-bind-headline`,
              blockId: `${PREFIX}-headline-field`,
              propPath: "value",
              source: "entry",
              field: "headline",
              mode: "readwrite",
            },
            {
              id: `${PREFIX}-bind-relation-a-field`,
              blockId: `${PREFIX}-relation-a-field`,
              propPath: "value",
              source: "entry",
              field: "relationA",
              mode: "readwrite",
            },
            {
              id: `${PREFIX}-bind-relation-b-field`,
              blockId: `${PREFIX}-relation-b-field`,
              propPath: "value",
              source: "entry",
              field: "relationB",
              mode: "readwrite",
            },
            {
              id: `${PREFIX}-bind-related-a`,
              blockId: `${PREFIX}-related-list-a`,
              propPath: "items",
              source: "entry",
              field: "relationA",
              mode: "read",
            },
            {
              id: `${PREFIX}-bind-related-b`,
              blockId: `${PREFIX}-related-list-b`,
              propPath: "items",
              source: "entry",
              field: "relationB",
              mode: "read",
            },
            {
              id: `${PREFIX}-bind-read-only`,
              blockId: `${PREFIX}-read-only-field`,
              propPath: "value",
              source: "entry",
              field: "primaryUrl",
              mode: "read",
            },
            {
              id: `${PREFIX}-bind-space-note`,
              blockId: `${PREFIX}-space-note-field`,
              propPath: "value",
              source: "entry",
              field: "unrelatedNote",
              mode: "readwrite",
            },
          ],
        },
      },
    },
    retryScreen: {
      id: capture("retry-screen.id"),
      name: `${PREFIX} Retry screen`,
      status: "active",
      showInSidebar: true,
      sidebarLabel: `${PREFIX} Retry records`,
      contentTypeId: capture("content-type-editable.id"),
      relatedListBlockId: `${PREFIX}-retry-related-list-failure`,
      definitionTemplate: {
        schemaVersion: 4,
        listView: {
          materializerId: "buildDefaultListViewDefinition",
          privateProjectionAuthorityId: "editable-content-type-detail",
        },
        editorView: {
          saveMode: "entry",
          interactionMode: "inline",
          document: {
            schemaVersion: 1,
            sections: [
              {
                id: `${PREFIX}-retry-section`,
                type: "section",
                data: {},
                blocks: [
                  {
                    id: `${PREFIX}-retry-related-list-failure`,
                    type: "related-list",
                    data: {
                      label: "Related failure retry",
                      target: `${PREFIX}-related-failure`,
                      displayField: "title",
                      variant: "cards",
                      limit: 10,
                      field: "relationFailure",
                    },
                  },
                ],
              },
            ],
          },
          bindings: [
            {
              id: `${PREFIX}-retry-bind-related-failure`,
              blockId: `${PREFIX}-retry-related-list-failure`,
              propPath: "items",
              source: "entry",
              field: "relationFailure",
              mode: "read",
            },
          ],
        },
      },
    },
    paletteBlocks: {
      button: runtimeBlock("palette.button", "button"),
      image: runtimeBlock("palette.image", "image"),
      mediaField: runtimeBlock("palette.media-field", "field"),
      outerTabs: runtimeBlock("palette.outer-tabs", "tabs"),
      tabOneText: runtimeBlock("palette.tab-one-text", "text"),
      tabTwoText: runtimeBlock("palette.tab-two-text", "text"),
      tabThreeText: runtimeBlock("palette.tab-three-text", "text"),
      innerTabs: runtimeBlock("palette.inner-tabs", "tabs"),
      dirtyText: runtimeBlock("palette.dirty-text", "text"),
    },
    tabs: {
      defaults: [
        { id: "tab-1", label: "Tab 1" },
        { id: "tab-2", label: "Tab 2" },
      ],
      added: { id: "tab-3", label: "Tab 3" },
      authoredLabels: { "tab-1": "Overview", "tab-2": "Details", "tab-3": "History" },
      text: {
        "tab-1": `${PREFIX} overview text`,
        "tab-2": `${PREFIX} details text`,
        "tab-3": `${PREFIX} history text`,
      },
    },
    overrides: {
      directImageSafe: [{ blockId: `${PREFIX}-race-image`, mediaAssetId: capture("media.id") }],
      directImageCleared: [],
    },
    routes: {
      "media-prior-resolution": { method: "GET", pattern: "/admin/api/media", kind: "delayed" },
      "entry-save-failure": {
        method: "PATCH",
        pattern: {
          template: `/admin/api/content/${PREFIX}-records/entries/{entry.id}`,
          captures: ["entry.id"],
        },
        kind: "malformed",
      },
      "related-first-failure": {
        method: "GET",
        pattern: `/admin/api/content/${PREFIX}-related-failure/entries`,
        kind: "malformed",
      },
      "related-a-refresh": {
        method: "GET",
        pattern: `/admin/api/content/${PREFIX}-related-a/entries`,
        kind: "delayed",
      },
      "preference-a-read-refresh": {
        method: "GET",
        pattern: "/admin/api/user-settings/customScreens.entry.preferences",
        kind: "delayed",
      },
      "preference-a-write-exit": {
        method: "PATCH",
        pattern: "/admin/api/user-settings/customScreens.entry.preferences",
        kind: "delayed",
      },
    },
    screenshotPaths: REQUIRED_SCREENSHOT_PATHS,
  });
}

export function validateFixtureBlueprint(blueprint) {
  exactKeys(
    blueprint,
    [
      "schemaVersion",
      "fixturePrefix",
      "origins",
      "userAgents",
      "paths",
      "users",
      "contentTypes",
      "relatedEntries",
      "media",
      "entry",
      "screen",
      "retryScreen",
      "paletteBlocks",
      "tabs",
      "overrides",
      "routes",
      "screenshotPaths",
    ],
    "fixture blueprint"
  );
  assertClosedDataTree(blueprint, "fixture blueprint");
  const prefixMatch = /^wf540-([a-f0-9]{12})$/u.exec(blueprint.fixturePrefix);
  invariant(prefixMatch !== null, "fixture prefix drift");
  const canonicalBlueprint = buildFixtureBlueprint(prefixMatch[1]);
  invariant(
    JSON.stringify(blueprint) === JSON.stringify(canonicalBlueprint),
    "fixture blueprint recursively rejects unknown or altered values"
  );
  invariant(blueprint.schemaVersion === 1, "fixture schema version drift");
  invariant(
    sameSet(Object.keys(blueprint.contentTypes), [
      "editable",
      "relatedA",
      "relatedB",
      "relatedFailure",
    ]),
    "content-type blueprint drift"
  );
  invariant(
    sameSet(
      blueprint.contentTypes.editable.fields.map(({ name }) => name),
      [
        "primaryUrl",
        "secondaryUrl",
        "headline",
        "raceImageId",
        "mediaAsset",
        "relationA",
        "relationB",
        "relationFailure",
        "unrelatedNote",
      ]
    ),
    "editable field blueprint drift"
  );
  invariant(
    sameSet(Object.keys(blueprint.relatedEntries), ["a1", "a2", "b1", "b2", "failure1"]),
    "related-entry blueprint drift"
  );
  invariant(
    sameSet(Object.keys(blueprint.routes), REQUIRED_ROUTE_KEYS),
    "route-key blueprint drift"
  );
  invariant(
    sameSet(blueprint.screenshotPaths, REQUIRED_SCREENSHOT_PATHS),
    "screenshot blueprint drift"
  );
  invariant(
    sameSet([...new Set(collectTaggedReferences(blueprint, "capture"))], REQUIRED_CAPTURE_NAMES),
    "fixture capture-reference drift"
  );
  invariant(
    sameSet(
      [...new Set(collectTaggedReferences(blueprint, "captureNewBlock"))],
      REQUIRED_RUNTIME_BLOCK_CAPTURES
    ),
    "runtime block-reference drift"
  );
  invariant(
    new Set(Object.values(blueprint.userAgents)).size === 4,
    "smoke User-Agent values must be unique"
  );
  for (const descriptor of [
    blueprint.screen.definitionTemplate.listView,
    blueprint.retryScreen.definitionTemplate.listView,
  ]) {
    exactKeys(
      descriptor,
      ["materializerId", "privateProjectionAuthorityId"],
      "private list-view materializer"
    );
    invariant(
      descriptor.materializerId === "buildDefaultListViewDefinition" &&
        descriptor.privateProjectionAuthorityId === "editable-content-type-detail",
      "private list-view materializer drift"
    );
  }
  const uploadFixture = blueprint.media.uploadFixture;
  exactKeys(
    uploadFixture,
    ["encoding", "data", "decodedSizeBytes", "sha256"],
    "media upload fixture"
  );
  const decodedPng = Buffer.from(uploadFixture.data, "base64");
  invariant(
    uploadFixture.encoding === "base64" &&
      decodedPng.toString("base64") === uploadFixture.data &&
      uploadFixture.decodedSizeBytes === 68 &&
      decodedPng.length === 68 &&
      decodedPng.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" &&
      createHash("sha256").update(decodedPng).digest("hex") === uploadFixture.sha256 &&
      uploadFixture.sha256 === "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
    "canonical PNG upload fixture drift"
  );
  invariant(
    blueprint.screenshotPaths.every((relativePath) =>
      /^_docs\/_workflows\/_smoke\/task-540-[a-z0-9-]+\.png$/u.test(relativePath)
    ),
    "canonical screenshot path drift"
  );
}
