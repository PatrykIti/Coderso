import { createHash } from "node:crypto";

import {
  createObservationRegistry,
  createVisibleAssertionRegistry,
  createVisibleAssertionTargetRegistry,
} from "./assertion-registries.mjs";
import {
  assertClosedDataTree,
  deepFreezeExact,
  exactKeys,
  invariant,
  sameSet,
} from "./core.mjs";
import { commandOutputSchemaId } from "./manifest.mjs";
import {
  BROWSER_BUILDER_KINDS,
  EXECUTABLE_REGISTRY_KEY_SHA256,
  FIXTURE_CAPTURE_BY_ACTION,
  REQUIRED_SCREENSHOT_PATHS,
  ROUTE_STATE_MACHINES,
  RUNTIME_BUILDER_KINDS,
  RUNTIME_CAPTURE_BY_ACTION,
  RUNTIME_CAPTURE_EXPRESSIONS,
  SCREENSHOT_DESCRIPTOR_BY_ACTION_ID,
} from "./metadata.mjs";
import { createBaseOutputSchemas } from "./output-contracts.mjs";
import {
  captureNamesRequiredByRef,
  collectRefDescriptors,
  compileArgumentRef,
  executableRefs,
  literalRef,
  parseBuilderAst,
  validateRefDescriptor,
} from "./references.mjs";
import {
  BROWSER_NATIVE_OPERATION_IDS,
  REQUIRED_BUILDER_KIND_COUNTS,
  REQUIRED_CAPTURE_NAMES,
  REQUIRED_FIXTURE_REF_PATHS,
  REQUIRED_RUNTIME_BLOCK_CAPTURES,
} from "./requirements.mjs";
import { createSelectorRegistry } from "./selectors.mjs";

export function createBuilderRegistry(manifest) {
  const executionClasses = new Set([...BROWSER_BUILDER_KINDS, ...RUNTIME_BUILDER_KINDS]);
  invariant(
    sameSet([...executionClasses], Object.keys(REQUIRED_BUILDER_KIND_COUNTS)),
    "builder execution-class registry set drift"
  );
  const registry = Object.create(null);
  for (const kind of Object.keys(REQUIRED_BUILDER_KIND_COUNTS)) {
    const allowedBuilders = [
      ...new Set(manifest.filter((action) => action.kind === kind).map(({ builder }) => builder)),
    ];
    invariant(allowedBuilders.length > 0, "builder kind has no exact invocations: " + kind);
    const arities = [
      ...new Set(allowedBuilders.map((builder) => parseBuilderAst(builder).args.length)),
    ];
    registry[kind] = deepFreezeExact({
      executionClass: BROWSER_BUILDER_KINDS.includes(kind) ? "browser" : "runtime",
      arities,
      allowedBuilders,
    });
  }
  return deepFreezeExact(registry);
}

export function createOutputRegistry(observations, assertions, fixtureBlueprint) {
  const registry = { ...createBaseOutputSchemas(fixtureBlueprint) };
  for (const [name, descriptor] of Object.entries(observations)) {
    registry["observation:" + name] = descriptor;
  }
  for (const [name, descriptor] of Object.entries(assertions)) {
    registry["assertion:" + name] = descriptor;
  }
  return deepFreezeExact(registry);
}

export function createRouteRegistry(fixtureBlueprint) {
  const registry = Object.create(null);
  for (const [key, machine] of Object.entries(ROUTE_STATE_MACHINES)) {
    invariant(Object.hasOwn(fixtureBlueprint.routes, key), "fixture route is missing: " + key);
    registry[key] = deepFreezeExact({
      mode: machine.mode,
      method: machine.method,
      operations: machine.operations,
      states: machine.states,
      fixture: fixtureBlueprint.routes[key],
    });
  }
  return deepFreezeExact(registry);
}

export function publicOutputContract(contract, label) {
  exactKeys(contract, ["grammar", "schema", "predicate", "rememberAs"], label);
  return deepFreezeExact({
    grammar: contract.grammar,
    schema: contract.schema,
    predicate: contract.predicate,
    rememberAs: contract.rememberAs,
  });
}

export function publicOutputRegistry(registry, label) {
  return deepFreezeExact(
    Object.fromEntries(
      Object.entries(registry).map(([id, contract]) => [
        id,
        publicOutputContract(contract, label + "." + id),
      ])
    )
  );
}

export function assertUniqueRegistryEntries(entries, label) {
  invariant(Array.isArray(entries), label + " entries must be an array");
  const keys = entries.map(([key]) => key);
  invariant(new Set(keys).size === keys.length, label + " contains a duplicate key");
}

export function validateExecutableRegistryProjection(registries, manifest) {
  exactKeys(
    registries,
    ["runtimeOperations", "browserRunCodeSources", "browserNativeOperations", "screenshotPaths"],
    "executable registries"
  );
  assertClosedDataTree(registries, "executable registries");
  invariant(
    Object.getPrototypeOf(registries) === Object.prototype,
    "executable registry container must be plain"
  );
  for (const registryName of [
    "runtimeOperations",
    "browserRunCodeSources",
    "browserNativeOperations",
    "screenshotPaths",
  ]) {
    invariant(
      [Object.prototype, null].includes(Object.getPrototypeOf(registries[registryName])),
      registryName + " registry prototype drift"
    );
  }
  const expectedKeys = {
    runtimeOperations: manifest
      .filter(({ executable }) => executable.type === "runtime-operation")
      .map(({ executable }) => executable.operationId),
    browserRunCodeSources: manifest
      .filter(({ executable }) => executable.type === "browser-run-code")
      .map(({ executable }) => executable.sourceId),
  };
  for (const registryName of ["runtimeOperations", "browserRunCodeSources"]) {
    const keys = Object.keys(registries[registryName]);
    invariant(sameSet(keys, expectedKeys[registryName]), registryName + " manifest set drift");
    const keySha256 = createHash("sha256").update(JSON.stringify(keys)).digest("hex");
    invariant(
      keySha256 === EXECUTABLE_REGISTRY_KEY_SHA256[registryName],
      registryName + " physical key drift: " + keySha256
    );
  }
  for (const action of manifest) {
    const executable = action.executable;
    if (executable.type === "runtime-operation") {
      const descriptor = registries.runtimeOperations[executable.operationId];
      invariant(
        Object.getPrototypeOf(descriptor) === Object.prototype,
        executable.operationId + " descriptor prototype drift"
      );
      exactKeys(descriptor, ["actionId", "refCount"], executable.operationId);
      invariant(
        descriptor.actionId === action.id && descriptor.refCount === executable.refs.length,
        executable.operationId + " descriptor/action Ref drift"
      );
    } else if (executable.type === "browser-run-code") {
      const descriptor = registries.browserRunCodeSources[executable.sourceId];
      invariant(
        Object.getPrototypeOf(descriptor) === Object.prototype,
        executable.sourceId + " descriptor prototype drift"
      );
      exactKeys(descriptor, ["actionId", "refCount"], executable.sourceId);
      invariant(
        descriptor.actionId === action.id && descriptor.refCount === executable.refs.length,
        executable.sourceId + " descriptor/action Ref drift"
      );
    }
  }
  invariant(
    sameSet(Object.keys(registries.browserNativeOperations), BROWSER_NATIVE_OPERATION_IDS),
    "native registry key drift"
  );
  for (const operationId of BROWSER_NATIVE_OPERATION_IDS) {
    const descriptor = registries.browserNativeOperations[operationId];
    invariant(
      Object.getPrototypeOf(descriptor) === Object.prototype,
      operationId + " native descriptor prototype drift"
    );
    exactKeys(descriptor, ["operationId", "actionIds"], operationId + " native descriptor");
    invariant(
      descriptor.operationId === operationId &&
        JSON.stringify(descriptor.actionIds) ===
          JSON.stringify(
            manifest
              .filter(
                ({ executable }) =>
                  executable.type === "browser-native" && executable.operationId === operationId
              )
              .map(({ id }) => id)
          ),
      operationId + " native action mapping drift"
    );
  }
  invariant(
    JSON.stringify(registries.screenshotPaths) ===
      JSON.stringify(
        Object.fromEntries(
          Object.values(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID).map(({ screenshotId, path }) => [
            screenshotId,
            path,
          ])
        )
      ),
    "screenshot registry literal mapping drift"
  );
}

export function createExecutableRegistries(manifest) {
  const runtimeOperations = Object.create(null);
  const browserRunCodeSources = Object.create(null);
  const browserNativeOperations = Object.create(null);
  const screenshotPaths = Object.create(null);
  invariant(
    sameSet(
      manifest
        .filter(({ executable }) => executable.type === "browser-screenshot")
        .map(({ id }) => id),
      Object.keys(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID)
    ),
    "screenshot action/descriptor key drift"
  );
  for (const operationId of BROWSER_NATIVE_OPERATION_IDS) {
    browserNativeOperations[operationId] = deepFreezeExact({
      operationId,
      actionIds: manifest
        .filter(
          ({ executable }) =>
            executable.type === "browser-native" && executable.operationId === operationId
        )
        .map(({ id }) => id),
    });
  }
  for (const action of manifest) {
    const { executable } = action;
    if (executable.type === "runtime-operation") {
      invariant(
        !Object.hasOwn(runtimeOperations, executable.operationId),
        "duplicate runtime operation"
      );
      runtimeOperations[executable.operationId] = deepFreezeExact({
        actionId: action.id,
        refCount: executable.refs.length,
      });
    } else if (executable.type === "browser-run-code") {
      invariant(
        !Object.hasOwn(browserRunCodeSources, executable.sourceId),
        "duplicate run-code source"
      );
      browserRunCodeSources[executable.sourceId] = deepFreezeExact({
        actionId: action.id,
        refCount: executable.refs.length,
      });
    }
  }
  for (const descriptor of Object.values(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID)) {
    invariant(!Object.hasOwn(screenshotPaths, descriptor.screenshotId), "duplicate screenshot ID");
    screenshotPaths[descriptor.screenshotId] = descriptor.path;
  }
  for (const action of manifest.filter(
    ({ executable }) => executable.type === "browser-screenshot"
  )) {
    const descriptor = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
    invariant(
      action.executable.screenshotId === descriptor.screenshotId &&
        action.repositoryMutationPolicy.paths.length === 1 &&
        action.repositoryMutationPolicy.paths[0] === descriptor.path &&
        screenshotPaths[descriptor.screenshotId] === descriptor.path,
      action.id + " screenshot descriptor mapping drift"
    );
  }
  invariant(Object.keys(runtimeOperations).length === 76, "runtime registry cardinality drift");
  invariant(
    Object.keys(browserRunCodeSources).length === 392,
    "run-code registry cardinality drift"
  );
  invariant(Object.keys(browserNativeOperations).length === 7, "native registry cardinality drift");
  invariant(Object.keys(screenshotPaths).length === 13, "screenshot registry cardinality drift");
  invariant(
    sameSet(Object.values(screenshotPaths), REQUIRED_SCREENSHOT_PATHS),
    "screenshot registry path-set drift"
  );
  const registries = deepFreezeExact({
    runtimeOperations,
    browserRunCodeSources,
    browserNativeOperations,
    screenshotPaths,
  });
  validateExecutableRegistryProjection(registries, manifest);
  return registries;
}

export function createRegistries(manifest, fixtureBlueprint) {
  const privateObservations = createObservationRegistry(manifest, fixtureBlueprint);
  const visibleAssertionTargets = createVisibleAssertionTargetRegistry();
  const privateVisibleAssertions = createVisibleAssertionRegistry(visibleAssertionTargets);
  const privateOutputs = createOutputRegistry(
    privateObservations,
    privateVisibleAssertions,
    fixtureBlueprint
  );
  const privateBuilders = createBuilderRegistry(manifest);
  const selectors = createSelectorRegistry();
  const executableRegistries = createExecutableRegistries(manifest);
  const builders = deepFreezeExact(
    Object.fromEntries(
      Object.entries(privateBuilders).map(([kind, descriptor]) => [
        kind,
        deepFreezeExact({
          executionClass: descriptor.executionClass,
          arities: descriptor.arities,
          allowedBuilders: descriptor.allowedBuilders,
        }),
      ])
    )
  );
  const observations = publicOutputRegistry(privateObservations, "observations");
  const visibleAssertions = publicOutputRegistry(privateVisibleAssertions, "visible assertions");
  const outputs = publicOutputRegistry(privateOutputs, "outputs");
  const registries = deepFreezeExact({
    selectors,
    paths: fixtureBlueprint.paths,
    builders,
    runtimeOperations: executableRegistries.runtimeOperations,
    browserRunCodeSources: executableRegistries.browserRunCodeSources,
    browserNativeOperations: executableRegistries.browserNativeOperations,
    screenshotPaths: executableRegistries.screenshotPaths,
    observations,
    visibleAssertionTargets,
    visibleAssertions,
    routes: createRouteRegistry(fixtureBlueprint),
    outputs,
    privateProjectionBindings: deepFreezeExact({
      authorityId: "editable-content-type-detail",
      outputSchemaId: "editable-content-type-detail",
      materializerId: "buildDefaultListViewDefinition",
      producerActionIds: ["set-017-editable-type-proof"],
      consumerActionIds: ["set-035-screen-create", "set-037-retry-screen-create"],
    }),
  });
  exactKeys(
    registries,
    [
      "selectors",
      "paths",
      "builders",
      "runtimeOperations",
      "browserRunCodeSources",
      "browserNativeOperations",
      "screenshotPaths",
      "observations",
      "visibleAssertionTargets",
      "visibleAssertions",
      "routes",
      "outputs",
      "privateProjectionBindings",
    ],
    "smoke registries"
  );
  const privateBinding = registries.privateProjectionBindings;
  exactKeys(
    privateBinding,
    ["authorityId", "outputSchemaId", "materializerId", "producerActionIds", "consumerActionIds"],
    "private projection binding"
  );
  invariant(
    privateBinding.authorityId === "editable-content-type-detail" &&
      privateBinding.outputSchemaId === "editable-content-type-detail" &&
      privateBinding.materializerId === "buildDefaultListViewDefinition" &&
      JSON.stringify(privateBinding.producerActionIds) ===
        JSON.stringify(["set-017-editable-type-proof"]) &&
      JSON.stringify(privateBinding.consumerActionIds) ===
        JSON.stringify(["set-035-screen-create", "set-037-retry-screen-create"]),
    "private projection authority drift"
  );
  const privateProducer = manifest.find(({ id }) => id === privateBinding.producerActionIds[0]);
  invariant(
    privateProducer?.outputSchemaId === privateBinding.outputSchemaId,
    "private projection producer schema drift"
  );
  for (const consumerId of privateBinding.consumerActionIds) {
    const consumer = manifest.find(({ id }) => id === consumerId);
    invariant(
      consumer?.executable.type === "runtime-operation" &&
        consumer.ordinal > privateProducer.ordinal,
      consumerId + " private projection consumer drift"
    );
  }
  const refContext = {
    fixtureBlueprint,
    selectors,
    fixtureRefPaths: REQUIRED_FIXTURE_REF_PATHS,
    captureNames: [...REQUIRED_CAPTURE_NAMES, ...REQUIRED_RUNTIME_BLOCK_CAPTURES],
    actionIds: manifest.map(({ id }) => id),
  };
  const captureProducerByName = Object.fromEntries(
    Object.entries({
      ...FIXTURE_CAPTURE_BY_ACTION,
      ...RUNTIME_CAPTURE_BY_ACTION,
    }).flatMap(([actionId, names]) => names.map((name) => [name, actionId]))
  );
  const usedFixturePaths = [];
  const usedRefOperations = [];
  for (const action of manifest) {
    const ast = parseBuilderAst(action.builder);
    const builder = privateBuilders[action.kind];
    invariant(
      builder.allowedBuilders.includes(action.builder),
      action.id + " builder is not allowlisted"
    );
    invariant(
      builder.arities.includes(ast.args.length),
      action.id + " builder arity is not allowlisted"
    );
    invariant(
      commandOutputSchemaId(action, ast) === action.outputSchemaId,
      action.id + " output schema/parser identity drift"
    );
    invariant(registries.outputs[action.outputSchemaId] !== undefined, action.id + " output drift");
    const refs = executableRefs(action.executable);
    const expectedRefs =
      action.kind === "blocksBefore" || action.kind === "captureNew"
        ? ast.args.map((expression, index) =>
            index === 0
              ? literalRef(RUNTIME_CAPTURE_EXPRESSIONS[expression])
              : compileArgumentRef(expression)
          )
        : ast.args.map(compileArgumentRef);
    invariant(
      JSON.stringify(refs) === JSON.stringify(expectedRefs) ||
        action.executable.type === "browser-screenshot" ||
        action.executable.type === "browser-global-list",
      action.id + " executable Ref identity drift"
    );
    refs.forEach((ref, index) => {
      const allowSecret =
        action.executable.type === "browser-native" &&
        action.executable.operationId === "fill-secret" &&
        index === 1;
      validateRefDescriptor(
        ref,
        refContext,
        action.id + ".executable.refs[" + index + "]",
        0,
        allowSecret
      );
      for (const descriptor of collectRefDescriptors(ref)) {
        usedRefOperations.push(descriptor.op);
        if (descriptor.op === "fixture") usedFixturePaths.push(descriptor.path.join("."));
      }
      for (const captureName of captureNamesRequiredByRef(ref, refContext)) {
        const producerId = captureProducerByName[captureName];
        const producerIndex = manifest.findIndex(({ id }) => id === producerId);
        invariant(
          producerId !== undefined,
          action.id + " capture producer is missing: " + captureName
        );
        invariant(
          producerIndex >= 0 && producerIndex < action.ordinal - 1,
          action.id + " capture producer is not earlier: " + captureName
        );
      }
    });
    if (action.kind === "assert") {
      const assertionName = ast.args[0];
      const targetRef = registries.visibleAssertionTargets[assertionName];
      if (targetRef !== undefined) {
        validateRefDescriptor(targetRef, refContext, action.id + ".visibleAssertionTarget");
        for (const captureName of captureNamesRequiredByRef(targetRef, refContext)) {
          const producerId = captureProducerByName[captureName];
          const producerIndex = manifest.findIndex(({ id }) => id === producerId);
          invariant(
            producerId !== undefined && producerIndex >= 0 && producerIndex < action.ordinal - 1,
            action.id + " target capture producer is not earlier: " + captureName
          );
        }
        for (const ref of collectRefDescriptors(targetRef)) {
          usedRefOperations.push(ref.op);
          if (ref.op === "fixture") usedFixturePaths.push(ref.path.join("."));
          if (ref.op !== "capture") continue;
          const producerId = Object.entries({
            ...FIXTURE_CAPTURE_BY_ACTION,
            ...RUNTIME_CAPTURE_BY_ACTION,
          }).find(([, names]) => names.includes(ref.name))?.[0];
          invariant(
            producerId !== undefined,
            action.id + " target capture producer is missing: " + ref.name
          );
          const producerOrdinal = manifest.findIndex(({ id }) => id === producerId);
          invariant(
            producerOrdinal >= 0 && producerOrdinal < action.ordinal - 1,
            action.id + " target capture is not available yet: " + ref.name
          );
        }
      }
    }
  }
  invariant(
    sameSet(
      [...new Set(usedRefOperations)],
      ["literal", "path", "selector", "secret", "capture", "fixture"]
    ),
    "exact Ref operation universe drift"
  );
  invariant(
    sameSet([...new Set(usedFixturePaths)], REQUIRED_FIXTURE_REF_PATHS),
    "fixture leaf registry usage drift"
  );
  return registries;
}
