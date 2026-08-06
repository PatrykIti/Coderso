import { deepFreezeExact, invariant, sameSet } from "./core.mjs";
import {
  andPredicate,
  deepEqualPredicate,
  jsonTransport,
  outputContract,
  outputEquals,
  outputRef,
  pathPredicateRef,
  schemaBoolean,
  schemaInteger,
  schemaLiteral,
  schemaObject,
} from "./contract-dsl.mjs";
import {
  OBSERVATION_OUTPUT_FIELDS,
  RAW_VISIBLE_ASSERTION_ROWS,
} from "./metadata.mjs";
import {
  createObservationFieldSchema,
  createObservationPredicate,
} from "./output-contracts.mjs";
import { parseBuilderAst } from "./references.mjs";
import { REQUIRED_SCENARIOS, REQUIRED_SMOKE_ASSERTIONS } from "./requirements.mjs";
import {
  createVisibleAssertionPredicate,
  visibleAssertionTargetRef,
} from "./visible-assertion-predicates.mjs";
import {
  createVisibleAssertionSchemas,
  visibleStringSchema,
  visibleUrlSchema,
} from "./visible-assertion-schemas.mjs";

export function createSpecialVisibleAssertionContracts() {
  const boolean = schemaBoolean();
  const mediaCount = schemaInteger({ minimum: 0, maximum: 10_000 });
  return deepFreezeExact({
    "media-cache-cold-before-route": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        builderUrl: visibleUrlSchema(),
        builderMarkerVisible: boolean,
        localStorageAbsent: boolean,
        mediaGetCount: mediaCount,
      }),
      predicate: andPredicate([
        deepEqualPredicate(outputRef(["builderUrl"]), pathPredicateRef("builder")),
        outputEquals(["builderMarkerVisible"], true),
        outputEquals(["localStorageAbsent"], true),
        outputEquals(["mediaGetCount"], 0),
      ]),
    }),
    "prior-media-resolution-pending": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        overridePresent: boolean,
        imagePresent: boolean,
        placeholderVisible: boolean,
        mediaGetCount: mediaCount,
      }),
      predicate: andPredicate([
        outputEquals(["overridePresent"], true),
        outputEquals(["imagePresent"], false),
        outputEquals(["placeholderVisible"], true),
        outputEquals(["mediaGetCount"], 1),
      ]),
    }),
    "newer-media-winner-selected-pending": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        overridePresent: boolean,
        imagePresent: boolean,
        placeholderVisible: boolean,
        presentationDirtyVisible: boolean,
        mediaGetCount: mediaCount,
      }),
      predicate: andPredicate([
        outputEquals(["overridePresent"], false),
        outputEquals(["imagePresent"], false),
        outputEquals(["placeholderVisible"], true),
        outputEquals(["presentationDirtyVisible"], true),
        outputEquals(["mediaGetCount"], 1),
      ]),
    }),
    "stale-media-result-ignored": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        overridePresent: boolean,
        imagePresent: boolean,
        placeholderVisible: boolean,
        acquiredUrlPresent: boolean,
        mediaGetCount: mediaCount,
      }),
      predicate: andPredicate([
        outputEquals(["overridePresent"], false),
        outputEquals(["imagePresent"], false),
        outputEquals(["placeholderVisible"], true),
        outputEquals(["acquiredUrlPresent"], false),
        outputEquals(["mediaGetCount"], 1),
      ]),
    }),
    "preference-a-write-hit-before-release": outputContract({
      grammar: jsonTransport(),
      schema: schemaLiteral(1),
      predicate: outputEquals([], 1),
    }),
    "preference-a-write-hit-after-release": outputContract({
      grammar: jsonTransport(),
      schema: schemaLiteral(1),
      predicate: outputEquals([], 1),
    }),
    "queued-a-write-zero-dispatch": outputContract({
      grammar: jsonTransport(),
      schema: schemaLiteral(0),
      predicate: outputEquals([], 0),
    }),
  });
}

export function createVisibleAssertionTargetRegistry() {
  const registry = Object.create(null);
  for (const [, name] of RAW_VISIBLE_ASSERTION_ROWS) {
    invariant(!Object.hasOwn(registry, name), "duplicate visible assertion target: " + name);
    registry[name] = visibleAssertionTargetRef(name);
  }
  invariant(
    sameSet(
      Object.keys(registry),
      RAW_VISIBLE_ASSERTION_ROWS.map(([, name]) => name)
    ),
    "visible assertion target registry set drift"
  );
  return deepFreezeExact(registry);
}

export function createVisibleAssertionRegistry(targets) {
  const registry = Object.create(null);
  const schemas = createVisibleAssertionSchemas();
  for (const [scenario, name, fields] of RAW_VISIBLE_ASSERTION_ROWS) {
    invariant(REQUIRED_SCENARIOS.includes(scenario), "assertion has an unknown scenario: " + name);
    invariant(
      REQUIRED_SMOKE_ASSERTIONS[scenario].includes(name),
      "assertion scenario ownership drift: " + name
    );
    invariant(
      typeof name === "string" &&
        Array.isArray(fields) &&
        fields.length > 0 &&
        new Set(fields).size === fields.length &&
        fields.every((field) => typeof field === "string" && field.length > 0),
      "ordinary visible assertion contract is invalid: " + name
    );
    invariant(!Object.hasOwn(registry, name), "duplicate visible assertion contract: " + name);
    invariant(
      Object.hasOwn(schemas, name),
      "ordinary visible assertion schema is missing: " + name
    );
    invariant(
      Object.hasOwn(targets, name),
      "ordinary visible assertion target is missing: " + name
    );
    invariant(
      sameSet(Object.keys(schemas[name].properties), fields),
      "ordinary visible assertion schema fields drift: " + name
    );
    registry[name] = outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        assertion: schemaLiteral(name),
        target: visibleStringSchema({ maxLength: 2048 }),
        observations: schemas[name],
      }),
      predicate: createVisibleAssertionPredicate(name, targets[name]),
    });
  }
  invariant(
    sameSet(
      Object.keys(schemas),
      RAW_VISIBLE_ASSERTION_ROWS.map(([, name]) => name)
    ),
    "ordinary visible assertion schema set drift"
  );
  for (const [name, contract] of Object.entries(createSpecialVisibleAssertionContracts())) {
    invariant(!Object.hasOwn(registry, name), "duplicate special assertion contract: " + name);
    registry[name] = contract;
  }
  const required = Object.values(REQUIRED_SMOKE_ASSERTIONS).flat();
  invariant(sameSet(Object.keys(registry), required), "visible assertion registry set drift");
  return deepFreezeExact(registry);
}

export function createObservationRegistry(manifest, fixtureBlueprint) {
  const names = [
    ...new Set(
      manifest
        .filter(({ kind }) => kind === "observe")
        .map(({ builder }) => parseBuilderAst(builder).args[0])
    ),
  ];
  invariant(
    sameSet(names, Object.keys(OBSERVATION_OUTPUT_FIELDS)),
    "observation registry set drift"
  );
  const canonicalAdminRootUrl = fixtureBlueprint.origins.admin + "/admin/";
  invariant(
    canonicalAdminRootUrl === "http://coderso-a.localhost:5173/admin/",
    "canonical Admin root URL drift"
  );
  return deepFreezeExact(
    Object.fromEntries(
      names.map((name) => [
        name,
        outputContract({
          grammar: jsonTransport(),
          schema: schemaObject(
            Object.fromEntries(
              OBSERVATION_OUTPUT_FIELDS[name].map((field) => [
                field,
                createObservationFieldSchema(name, field),
              ])
            )
          ),
          predicate: createObservationPredicate(name, canonicalAdminRootUrl),
        }),
      ])
    )
  );
}
