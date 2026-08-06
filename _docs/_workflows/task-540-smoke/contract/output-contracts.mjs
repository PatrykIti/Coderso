import { deepFreezeExact, invariant } from "./core.mjs";
import {
  andPredicate,
  comparePredicate,
  deepEqualPredicate,
  jsonTransport,
  lengthRef,
  literalPredicateRef,
  nativeExactTransport,
  nativeSessionAbsenceTransport,
  outputContract,
  outputEquals,
  outputLengthEquals,
  outputNonEmpty,
  outputRef,
  schemaArray,
  schemaBoolean,
  schemaInteger,
  schemaLiteral,
  schemaNull,
  schemaNumber,
  schemaObject,
  schemaString,
  schemaUnion,
} from "./contract-dsl.mjs";
import { FIXTURE_CAPTURE_BY_ACTION } from "./metadata.mjs";

export function createLogProjectionSchema() {
  const messageArray = schemaArray(schemaString({ minLength: 1, maxLength: 4096 }), {
    minItems: 0,
    maxItems: 256,
  });
  const aggregate = schemaObject({
    consoleErrors: messageArray,
    consoleWarnings: messageArray,
    pageErrors: messageArray,
    mediaGetCount: schemaInteger({ minimum: 0, maximum: 10_000 }),
  });
  const page = schemaObject({
    pageId: schemaString({ minLength: 12, maxLength: 32, format: "page-id" }),
    tabIndex: schemaInteger({ minimum: 0, maximum: 1024 }),
    consoleErrors: messageArray,
    consoleWarnings: messageArray,
    pageErrors: messageArray,
    mediaGetCount: schemaInteger({ minimum: 0, maximum: 10_000 }),
  });
  return schemaObject({
    aggregate,
    pages: schemaArray(page, { minItems: 1, maxItems: 8, unique: true }),
  });
}

export function createCleanLogPredicate() {
  const emptyAggregate = ["consoleErrors", "consoleWarnings", "pageErrors"].map((key) =>
    outputLengthEquals(["aggregate", key], 0)
  );
  return andPredicate([
    ...emptyAggregate,
    deepFreezeExact({
      op: "every",
      source: outputRef(["pages"]),
      as: "pageLog",
      predicate: andPredicate(
        ["consoleErrors", "consoleWarnings", "pageErrors"].map((key) =>
          deepEqualPredicate(
            lengthRef(deepFreezeExact({ op: "var", name: "pageLog", path: [key] })),
            literalPredicateRef(0)
          )
        )
      ),
    }),
  ]);
}

export function captureValueSchema(captureName) {
  if (captureName === "media.resolved-url") {
    return schemaString({ minLength: 8, maxLength: 2048, format: "http-url" });
  }
  if (captureName === "media.storage-key") {
    return schemaString({ minLength: 1, maxLength: 512, format: "repo-relative" });
  }
  return schemaString({ minLength: 36, maxLength: 36, format: "uuid" });
}

export function createRuntimeCaptureBindingsSchema() {
  const captureSets = [[], ...Object.values(FIXTURE_CAPTURE_BY_ACTION)];
  const uniqueSets = [];
  for (const captures of captureSets) {
    const identity = [...captures].sort().join("\0");
    if (uniqueSets.some(({ identity: candidate }) => candidate === identity)) continue;
    uniqueSets.push({ identity, captures });
  }
  return schemaUnion(
    uniqueSets.map(({ captures }) =>
      schemaObject(
        Object.fromEntries(
          captures.map((captureName) => [captureName, captureValueSchema(captureName)])
        )
      )
    )
  );
}

export function materializeEditableContentSchema(fieldBlueprints) {
  const properties = Object.create(null);
  fieldBlueprints.forEach((field, index) => {
    const definition = {
      type:
        (field.type === "relation" && field.relation?.multiple) ||
        (field.type === "media" && field.media?.multiple)
          ? "array"
          : "string",
      ...(field.type === "relation" && field.relation?.multiple
        ? { items: { type: "string" } }
        : {}),
      title: field.label,
      xFieldType: field.type,
      ...(field.type === "relation"
        ? {
            xRelationTarget: field.relation.target,
            xFieldConfig: {
              relation: {
                target: field.relation.target,
                ...(field.relation.multiple ? { multiple: true } : {}),
              },
              order: index,
            },
          }
        : field.type === "media"
          ? {
              xFieldConfig: {
                media: {
                  ...(field.media.multiple ? { multiple: true } : {}),
                  ...(field.media.accept?.length ? { accept: field.media.accept } : {}),
                },
                order: index,
              },
            }
          : { xFieldConfig: { order: index } }),
    };
    properties[field.name] = definition;
  });
  return deepFreezeExact({
    type: "object",
    additionalProperties: false,
    properties: { ...properties },
  });
}

export function createBaseOutputSchemas(fixtureBlueprint) {
  const booleanTrue = schemaLiteral(true);
  const booleanFalse = schemaLiteral(false);
  const jsonTrue = outputContract({
    grammar: jsonTransport(),
    schema: booleanTrue,
    predicate: outputEquals([], true),
  });
  const unitValue = deepFreezeExact({ ok: true });
  const jsonUnit = outputContract({
    grammar: jsonTransport(),
    schema: schemaObject({ ok: booleanTrue }),
    predicate: outputEquals([], unitValue),
  });
  const logSchema = createLogProjectionSchema();
  const cleanLogPredicate = createCleanLogPredicate();
  const strictMethod = schemaString({
    minLength: 3,
    maxLength: 6,
    enumValues: ["GET", "PATCH"],
  });
  return deepFreezeExact({
    unit: jsonUnit,
    "editable-content-type-detail": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        id: schemaString({ minLength: 36, maxLength: 36, format: "uuid" }),
        slug: schemaLiteral(fixtureBlueprint.contentTypes.editable.slug),
        name: schemaLiteral(fixtureBlueprint.contentTypes.editable.name),
        schema: schemaLiteral(
          materializeEditableContentSchema(fixtureBlueprint.contentTypes.editable.fields)
        ),
      }),
      predicate: andPredicate([
        outputNonEmpty(["id"]),
        outputEquals(["slug"], fixtureBlueprint.contentTypes.editable.slug),
        outputEquals(["name"], fixtureBlueprint.contentTypes.editable.name),
      ]),
    }),
    "runtime-safe-projection": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        captureBindings: createRuntimeCaptureBindingsSchema(),
        observationSha256: schemaString({ minLength: 64, maxLength: 64, format: "sha256" }),
      }),
      predicate: outputNonEmpty(["observationSha256"]),
    }),
    "block-id-set": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        blockIds: schemaArray(schemaString({ minLength: 1, maxLength: 256 }), {
          minItems: 0,
          maxItems: 1024,
          unique: true,
        }),
      }),
      predicate: null,
    }),
    "new-block": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        id: schemaString({ minLength: 1, maxLength: 256 }),
        type: schemaString({
          minLength: 4,
          maxLength: 6,
          enumValues: ["button", "image", "field", "tabs", "text"],
        }),
      }),
      predicate: andPredicate([outputNonEmpty(["id"]), outputNonEmpty(["type"])]),
    }),
    "route-setup": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        key: schemaString({ minLength: 1, maxLength: 128 }),
        method: strictMethod,
        pattern: schemaString({ minLength: 1, maxLength: 2048 }),
        mode: schemaString({ minLength: 1, maxLength: 64 }),
      }),
      predicate: andPredicate([
        outputNonEmpty(["key"]),
        outputNonEmpty(["method"]),
        outputNonEmpty(["pattern"]),
        outputNonEmpty(["mode"]),
      ]),
    }),
    "route-malformed-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({ hits: schemaLiteral(1) }),
      predicate: outputEquals(["hits"], 1),
    }),
    "route-delayed-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({ hits: schemaLiteral(1), captured: booleanTrue }),
      predicate: andPredicate([outputEquals(["hits"], 1), outputEquals(["captured"], true)]),
    }),
    "route-preference-read-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        hits: schemaLiteral(1),
        captured: booleanTrue,
        method: schemaLiteral("GET"),
        bodyAbsent: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["hits"], 1),
        outputEquals(["captured"], true),
        outputEquals(["method"], "GET"),
        outputEquals(["bodyAbsent"], true),
      ]),
    }),
    "route-related-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        hits: schemaLiteral(1),
        captured: booleanTrue,
        rowCount: schemaLiteral(2),
        rowIdsMatch: booleanTrue,
        uniqueIds: booleanTrue,
        updatedA1Matches: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["hits"], 1),
        outputEquals(["captured"], true),
        outputEquals(["rowCount"], 2),
        outputEquals(["rowIdsMatch"], true),
        outputEquals(["uniqueIds"], true),
        outputEquals(["updatedA1Matches"], true),
      ]),
    }),
    "route-preference-write-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        hits: schemaLiteral(1),
        captured: booleanTrue,
        backingSettled: booleanTrue,
        method: schemaLiteral("PATCH"),
        bodyMatches: booleanTrue,
        contentTypeJson: booleanTrue,
        expectedUserIdMatches: booleanTrue,
        csrfPresent: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["hits"], 1),
        outputEquals(["captured"], true),
        outputEquals(["expectedUserIdMatches"], true),
        outputEquals(["csrfPresent"], true),
      ]),
    }),
    "route-release": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        released: booleanTrue,
        fulfilled: booleanTrue,
        uiSettled: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["released"], true),
        outputEquals(["fulfilled"], true),
        outputEquals(["uiSettled"], true),
      ]),
    }),
    // `clientDiscarded` replaces the former `clientAborted`, which demanded a
    // `requestfailed`/net::ERR_ABORTED event that Chromium provably never emits for a request
    // cancelled by document teardown. The load-bearing addition is `responseDelivered`: the
    // guarantee this scenario exists to prove - no response for the old-client write ever reaches
    // a realm - is now a directly falsifiable term instead of one inferred from an absent event.
    "route-abort-release": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        released: booleanTrue,
        backingSettled: booleanTrue,
        clientDiscarded: booleanTrue,
        responseDelivered: booleanFalse,
      }),
      predicate: andPredicate([
        outputEquals(["released"], true),
        outputEquals(["backingSettled"], true),
        outputEquals(["clientDiscarded"], true),
        outputEquals(["responseDelivered"], false),
      ]),
    }),
    "route-unroute": jsonTrue,
    "log-channel": outputContract({
      grammar: jsonTransport(),
      schema: logSchema,
      predicate: cleanLogPredicate,
    }),
    "media-count": outputContract({
      grammar: jsonTransport(),
      schema: schemaLiteral(1),
      predicate: outputEquals([], 1),
    }),
    "auth-rate-barrier": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({ barrierSatisfied: booleanTrue }),
      predicate: outputEquals(["barrierSatisfied"], true),
    }),
    screenshot: jsonTrue,
    "selection-handle": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        handleFocused: booleanTrue,
        ariaPressed: booleanTrue,
        selectedBlockId: schemaString({ minLength: 1, maxLength: 256 }),
        defaultPrevented: schemaLiteral(false),
      }),
      predicate: andPredicate([
        outputEquals(["handleFocused"], true),
        outputEquals(["ariaPressed"], true),
        outputNonEmpty(["selectedBlockId"]),
        outputEquals(["defaultPrevented"], false),
      ]),
    }),
    "cleanup-routes": jsonTrue,
    "cleanup-route-list": outputContract({
      grammar: nativeExactTransport("No active routes\n", []),
      schema: schemaLiteral([]),
      predicate: outputLengthEquals([], 0),
    }),
    "cleanup-log-channel": outputContract({
      grammar: jsonTransport(),
      schema: logSchema,
      predicate: cleanLogPredicate,
    }),
    "cleanup-close": outputContract({
      grammar: nativeExactTransport("Browser 'wf540smoke' closed\n\n", "closed"),
      schema: schemaLiteral("closed"),
      predicate: outputEquals([], "closed"),
    }),
    "cleanup-session": outputContract({
      grammar: nativeSessionAbsenceTransport("wf540smoke"),
      schema: booleanTrue,
      predicate: outputEquals([], true),
    }),
  });
}

export function nullableSchema(schema) {
  return schemaUnion([schemaNull(), schema]);
}

export function createRectSchema() {
  return schemaObject({
    left: schemaNumber({ minimum: -100_000, maximum: 100_000 }),
    right: schemaNumber({ minimum: -100_000, maximum: 100_000 }),
    width: schemaNumber({ minimum: 0, maximum: 100_000 }),
    height: schemaNumber({ minimum: 0, maximum: 100_000 }),
  });
}

export function createPreferenceValueSchema() {
  return schemaObject({
    version: schemaLiteral(1),
    showFieldMetadata: schemaBoolean(),
  });
}

export function createPreferenceResponseSchema() {
  return schemaObject({
    key: schemaLiteral("customScreens.entry.preferences"),
    value: createPreferenceValueSchema(),
  });
}

export function createThemeSampleSchema({ metadata = false } = {}) {
  return schemaObject({
    theme: schemaString({ minLength: 4, maxLength: 5, enumValues: ["light", "dark"] }),
    rootColor: schemaString({ minLength: 1, maxLength: 256, format: "css-color" }),
    bodyColor: schemaString({ minLength: 1, maxLength: 256, format: "css-color" }),
    toggleAriaPressed: schemaString({ minLength: 4, maxLength: 5, enumValues: ["true", "false"] }),
    ...(metadata ? { metadataEffect: schemaBoolean() } : {}),
  });
}

export function createScreenBindingSchema() {
  return schemaObject({
    id: schemaString({ minLength: 1, maxLength: 256 }),
    blockId: schemaString({ minLength: 1, maxLength: 256 }),
    propPath: schemaString({ minLength: 1, maxLength: 128 }),
    source: schemaString({ minLength: 1, maxLength: 64 }),
    field: schemaString({ minLength: 1, maxLength: 128 }),
    mode: schemaString({ minLength: 4, maxLength: 9, enumValues: ["read", "readwrite"] }),
  });
}

export function createObservationFieldSchema(name, field) {
  const booleans = new Set([
    "activeUserMenuVisible",
    "clientDiscarded",
    "emptyVisible",
    "errorVisible",
    "focused",
    "loginEmailVisible",
    "loginPasswordVisible",
    "loginSubmitVisible",
    "metadataEffect",
    "innerTabsVisible",
    "outerTabsVisible",
    "saveEnabled",
    "savingAbsent",
    "shellVisible",
    "switchChecked",
    "userIdMatches",
    "userMenuVisible",
  ]);
  if (booleans.has(field)) return schemaBoolean();
  const integers = new Set([
    "bListGetCount",
    "navigationCount",
    "sequence",
    "skeletonCount",
    "status",
    "tabIndex",
    "viewportWidth",
    "width",
  ]);
  if (integers.has(field)) {
    return schemaInteger({
      minimum: field === "tabIndex" ? -1 : 0,
      maximum: field === "status" ? 599 : 100_000,
    });
  }
  if (field === "screenId" || field === "entryId") {
    return schemaString({ minLength: 36, maxLength: 36, format: "uuid" });
  }
  if (field === "url") return schemaString({ minLength: 8, maxLength: 2048, format: "http-url" });
  if (field === "theme") {
    return schemaString({ minLength: 4, maxLength: 5, enumValues: ["light", "dark"] });
  }
  if (field === "rootColor" || field === "bodyColor") {
    return schemaString({ minLength: 1, maxLength: 256, format: "css-color" });
  }
  if (field === "toggleAriaPressed") {
    return schemaString({ minLength: 4, maxLength: 5, enumValues: ["true", "false"] });
  }
  if (field === "device") return schemaLiteral("desktop");
  if (field === "state") {
    return schemaString({ minLength: 4, maxLength: 6, enumValues: ["open", "closed"] });
  }
  if (field === "method") {
    return schemaString({ minLength: 3, maxLength: 5, enumValues: ["GET", "PATCH"] });
  }
  if (field === "key") {
    return schemaString({
      minLength: 3,
      maxLength: 10,
      enumValues: ["ArrowLeft", "ArrowRight", "Home", "End"],
    });
  }
  if (field === "value") return createPreferenceValueSchema();
  if (field === "bindings") {
    return schemaArray(createScreenBindingSchema(), { minItems: 1, maxItems: 256, unique: true });
  }
  if (
    [
      "aButtons",
      "aRows",
      "bButtons",
      "hiddenPanelIds",
      "rowIds",
      "rowText",
      "visiblePanelIds",
    ].includes(field)
  ) {
    return schemaArray(schemaString({ minLength: 1, maxLength: 512 }), {
      minItems: 0,
      maxItems: 128,
      unique: field !== "rowText",
    });
  }
  if (field === "rects") {
    return schemaArray(nullableSchema(createRectSchema()), { minItems: 0, maxItems: 128 });
  }
  if (["metadataRect", "panel", "switchRect"].includes(field)) {
    return nullableSchema(createRectSchema());
  }
  if (["rect", "scrollerBorder", "scrollerContent"].includes(field)) return createRectSchema();
  const strings = new Set([
    "activeTabId",
    "armedSlotId",
    "contentBytes",
    "draftBytes",
    "focusedTabId",
    "focusedTabText",
    "href",
    "paddingRight",
    "pathname",
    "presentationBytes",
    "rootId",
    "saveLabel",
    "selectedBlockId",
    "selectedTabId",
    "tagName",
    "title",
    "userName",
  ]);
  invariant(strings.has(field), "observation field schema is missing: " + name + "." + field);
  return schemaString({ minLength: 1, maxLength: field.endsWith("Bytes") ? 1_000_000 : 4096 });
}

export function positiveRectPredicate(ref) {
  return andPredicate([
    comparePredicate(
      "gt",
      deepFreezeExact({ op: "output", path: [...ref, "width"] }),
      literalPredicateRef(0)
    ),
    comparePredicate(
      "gt",
      deepFreezeExact({ op: "output", path: [...ref, "height"] }),
      literalPredicateRef(0)
    ),
  ]);
}

export function successfulStatusPredicate(path = ["status"]) {
  return andPredicate([
    comparePredicate("gte", outputRef(path), literalPredicateRef(200)),
    comparePredicate("lte", outputRef(path), literalPredicateRef(299)),
  ]);
}

export function createObservationPredicate(name, canonicalAdminRootUrl) {
  if (name === "bootstrap-auth-identity-settled" || name.startsWith("auth-identity-settled-")) {
    return andPredicate([
      outputEquals(["url"], canonicalAdminRootUrl),
      outputEquals(["userMenuVisible"], true),
      outputNonEmpty(["userName"]),
    ]);
  }
  if (
    ["signout-settled-bootstrap", "signout-settled-user-a", "signout-settled-user-b"].includes(name)
  ) {
    return andPredicate([
      outputEquals(["loginEmailVisible"], true),
      outputEquals(["loginPasswordVisible"], true),
      outputEquals(["loginSubmitVisible"], true),
    ]);
  }
  if (name === "signout-settled-user-a-with-abort") {
    return andPredicate([
      outputEquals(["loginEmailVisible"], true),
      outputEquals(["loginPasswordVisible"], true),
      outputEquals(["loginSubmitVisible"], true),
      outputEquals(["clientDiscarded"], true),
    ]);
  }
  if (
    [
      "theme-light",
      "theme-dark",
      "theme-light-user-a-candidate",
      "user-a-light-computed",
      "user-b-dark-computed",
    ].includes(name)
  ) {
    const dark = name === "theme-dark" || name === "user-b-dark-computed";
    return andPredicate([
      outputEquals(["theme"], dark ? "dark" : "light"),
      outputEquals(["toggleAriaPressed"], dark ? "true" : "false"),
      outputNonEmpty(["rootColor"]),
      outputNonEmpty(["bodyColor"]),
      ...(name === "user-b-dark-computed" ? [outputEquals(["metadataEffect"], false)] : []),
    ]);
  }
  if (name.startsWith("geometry-")) {
    const match = /^geometry-(320|390|480|1024|1280)-(open|closed)$/.exec(name);
    invariant(match !== null, "geometry observation name drift");
    return andPredicate([
      outputEquals(["width"], Number(match[1])),
      outputEquals(["viewportWidth"], Number(match[1])),
      outputEquals(["state"], match[2]),
      outputNonEmpty(["paddingRight"]),
      positiveRectPredicate(["scrollerBorder"]),
      positiveRectPredicate(["scrollerContent"]),
    ]);
  }
  if (name === "binding-after-save") {
    return andPredicate([
      outputNonEmpty(["screenId"]),
      comparePredicate("gt", lengthRef(outputRef(["bindings"])), literalPredicateRef(0)),
    ]);
  }
  if (name === "safe-link-anchor-before-activation") {
    return andPredicate([
      outputEquals(["tagName"], "A"),
      outputNonEmpty(["href"]),
      positiveRectPredicate(["rect"]),
    ]);
  }
  if (name === "outer-tabs-details-state" || name === "outer-tabs-history-state") {
    return andPredicate([
      outputNonEmpty(["activeTabId"]),
      outputNonEmpty(["armedSlotId"]),
      outputLengthEquals(["visiblePanelIds"], 1),
      outputLengthEquals(["hiddenPanelIds"], 2),
      outputLengthEquals(["rects"], 3),
    ]);
  }
  if (name === "preview-shell-desktop") {
    return andPredicate([
      outputEquals(["shellVisible"], true),
      outputEquals(["device"], "desktop"),
      outputEquals(["outerTabsVisible"], true),
      outputEquals(["innerTabsVisible"], true),
    ]);
  }
  if (name.startsWith("key-step-")) {
    const keys = {
      "key-step-arrow-left": "ArrowLeft",
      "key-step-arrow-right": "ArrowRight",
      "key-step-home": "Home",
      "key-step-end": "End",
    };
    return andPredicate([
      outputEquals(["key"], keys[name]),
      outputNonEmpty(["focusedTabText"]),
      outputNonEmpty(["focusedTabId"]),
      outputNonEmpty(["selectedTabId"]),
      comparePredicate("gte", outputRef(["tabIndex"]), literalPredicateRef(0)),
    ]);
  }
  if (name.startsWith("selected-block-")) {
    return andPredicate([
      outputNonEmpty(["selectedBlockId"]),
      outputNonEmpty(["url"]),
      ...(name === "selected-block-before-nested-controls"
        ? []
        : [outputEquals(["focused"], true)]),
    ]);
  }
  if (name === "builder-draft-url-before-cancel") {
    return andPredicate([
      outputNonEmpty(["draftBytes"]),
      outputNonEmpty(["url"]),
      comparePredicate("gte", outputRef(["navigationCount"]), literalPredicateRef(0)),
    ]);
  }
  if (name === "entry-drafts-url-before-cancel") {
    return andPredicate([
      outputNonEmpty(["contentBytes"]),
      outputNonEmpty(["presentationBytes"]),
      outputNonEmpty(["url"]),
      comparePredicate("gte", outputRef(["navigationCount"]), literalPredicateRef(0)),
    ]);
  }
  if (name === "entry-save-failure-ui-settled") {
    return andPredicate([
      outputEquals(["errorVisible"], true),
      outputEquals(["saveEnabled"], true),
      outputNonEmpty(["saveLabel"]),
    ]);
  }
  if (name === "relation-pickers-a-b-warm") {
    return andPredicate([
      outputLengthEquals(["aButtons"], 2),
      outputLengthEquals(["bButtons"], 2),
      comparePredicate("gt", lengthRef(outputRef(["aRows"])), literalPredicateRef(0)),
      comparePredicate("gt", outputRef(["bListGetCount"]), literalPredicateRef(0)),
    ]);
  }
  if (name === "related-unrelated-drafts-before") {
    return andPredicate([outputNonEmpty(["contentBytes"]), outputNonEmpty(["presentationBytes"])]);
  }
  if (name === "related-a-visible-baseline") {
    return andPredicate([
      outputNonEmpty(["rootId"]),
      comparePredicate("gt", lengthRef(outputRef(["rowIds"])), literalPredicateRef(0)),
      outputEquals(["skeletonCount"], 0),
      outputEquals(["emptyVisible"], false),
      comparePredicate("gte", outputRef(["navigationCount"]), literalPredicateRef(0)),
    ]);
  }
  if (name === "related-tab-save-settled") {
    return andPredicate([
      outputEquals(["method"], "PATCH"),
      successfulStatusPredicate(),
      outputNonEmpty(["pathname"]),
      outputNonEmpty(["entryId"]),
      outputNonEmpty(["title"]),
      outputEquals(["saveEnabled"], true),
      outputEquals(["savingAbsent"], true),
    ]);
  }
  if (
    [
      "preference-a-write-settled",
      "nondefault-browser-patch-settled",
      "new-local-browser-patch-settled",
    ].includes(name)
  ) {
    const expected = name !== "new-local-browser-patch-settled";
    return andPredicate([
      outputEquals(["method"], "PATCH"),
      successfulStatusPredicate(),
      outputEquals(["userIdMatches"], true),
      outputEquals(["value", "version"], 1),
      outputEquals(["value", "showFieldMetadata"], expected),
      ...(name === "preference-a-write-settled"
        ? [
            outputEquals(["switchChecked"], true),
            positiveRectPredicate(["switchRect"]),
            positiveRectPredicate(["metadataRect"]),
          ]
        : []),
    ]);
  }
  if (name === "post-redirect-a-fresh-read-settled") {
    return andPredicate([
      comparePredicate("gt", outputRef(["sequence"]), literalPredicateRef(0)),
      outputEquals(["method"], "GET"),
      successfulStatusPredicate(),
      outputEquals(["activeUserMenuVisible"], true),
      outputEquals(["value", "showFieldMetadata"], true),
      outputEquals(["switchChecked"], true),
      positiveRectPredicate(["metadataRect"]),
    ]);
  }
  invariant(false, "observation predicate is missing: " + name);
}
