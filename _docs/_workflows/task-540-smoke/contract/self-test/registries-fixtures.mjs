import { invariant } from "../core.mjs";
import { validateFixtureBlueprint } from "../fixtures.mjs";
import { createObservationFieldSchema } from "../output-contracts.mjs";
import {
  assertUniqueRegistryEntries,
  validateExecutableRegistryProjection,
} from "../registries.mjs";
import { assertSelectorTextEngineShape } from "../selectors.mjs";
import { createPrivateProjectionSelfTestHarness } from "./helpers.mjs";

const DISCARD_OBSERVATION_NAME = "signout-settled-user-a-with-abort";

export function runRegistriesFixturesSelfTestSuite(plan, negative) {
  // The sign-out discard postcondition. `clientAborted` demanded a `requestfailed` /
  // net::ERR_ABORTED event that Chromium provably never emits for a request cancelled by document
  // teardown, so it was unsatisfiable by construction; `clientDiscarded` is settled by the
  // observable navigation commit and guarded by a no-delivery negative. The built plan is the
  // authority here, so a half-finished rename cannot hide behind this expectation.
  const discardContract = plan.registries.observations[DISCARD_OBSERVATION_NAME];
  invariant(
    discardContract !== undefined &&
      Object.keys(discardContract.schema.properties).join(",") ===
        "url,loginEmailVisible,loginPasswordVisible,loginSubmitVisible,clientDiscarded" &&
      discardContract.schema.properties.clientDiscarded.type === "boolean" &&
      discardContract.predicate.op === "and" &&
      discardContract.predicate.items.length === 4 &&
      JSON.stringify(discardContract.predicate.items[3]).includes('"clientDiscarded"'),
    "sign-out discard observation contract drift"
  );
  negative(
    () => createObservationFieldSchema(DISCARD_OBSERVATION_NAME, "clientAborted"),
    "retired clientAborted observation field"
  );
  // The built plan is the authority here: these read plan.registries.selectors, not the
  // source literal, so a regression in createSelectorRegistry cannot hide behind a stale
  // expectation. A Radix SelectItem delegates its label to a child span, so the option
  // host has no direct text node and cannot be addressed by its own text.
  invariant(
    plan.registries.selectors.muted.parts.length === 1 &&
      plan.registries.selectors.muted.parts[0] === '[role="option"]:has(span:text-is("Muted"))' &&
      plan.registries.selectors.muted.minArity === 0 &&
      plan.registries.selectors.muted.maxArity === 0,
    "muted selector literal drift"
  );
  const selectorShapeMutant = (parts) =>
    assertSelectorTextEngineShape({
      ...plan.registries.selectors,
      muted: { kind: "selector-template", parts },
    });
  negative(
    () => selectorShapeMutant(['[role="option"]:text-is("Muted")']),
    "option host addressed by its own text"
  );
  negative(
    () => selectorShapeMutant(['[data-slot="select-item"]:text-is("Muted")']),
    "select-item host addressed by its own text"
  );
  negative(
    () => selectorShapeMutant(['[role="option"] span:text-is("Muted")']),
    "delegated label matched outside the :has(span:text-is(...)) form"
  );
  negative(
    () => assertSelectorTextEngineShape({ muted: { kind: "not-a-selector" } }),
    "selector template shape rejected"
  );
  for (const registryName of ["runtimeOperations", "browserRunCodeSources"]) {
    const missing = {
      runtimeOperations: { ...plan.registries.runtimeOperations },
      browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
      browserNativeOperations: { ...plan.registries.browserNativeOperations },
      screenshotPaths: { ...plan.registries.screenshotPaths },
    };
    delete missing[registryName][Object.keys(missing[registryName])[0]];
    negative(
      () => validateExecutableRegistryProjection(missing, plan.actionManifest),
      registryName + " missing registry entry"
    );
    const extra = {
      ...missing,
      [registryName]: {
        ...plan.registries[registryName],
        extra: { actionId: "extra", refCount: 0 },
      },
    };
    negative(
      () => validateExecutableRegistryProjection(extra, plan.actionManifest),
      registryName + " extra registry entry"
    );
    const corrupt = {
      runtimeOperations: { ...plan.registries.runtimeOperations },
      browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
      browserNativeOperations: { ...plan.registries.browserNativeOperations },
      screenshotPaths: { ...plan.registries.screenshotPaths },
    };
    const corruptKey = Object.keys(corrupt[registryName])[0];
    corrupt[registryName][corruptKey] = { actionId: "wrong-action", refCount: 999 };
    negative(
      () => validateExecutableRegistryProjection(corrupt, plan.actionManifest),
      registryName + " corrupt descriptor"
    );
  }
  negative(
    () =>
      assertUniqueRegistryEntries(
        [
          ["one", 1],
          ["one", 2],
        ],
        "self-test registry"
      ),
    "duplicate registry key"
  );
  const nativeRegistryDrift = {
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: {
      ...plan.registries.browserNativeOperations,
      "open-about-blank": {
        ...plan.registries.browserNativeOperations["open-about-blank"],
        actionIds: ["wrong-action"],
      },
    },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  };
  negative(
    () => validateExecutableRegistryProjection(nativeRegistryDrift, plan.actionManifest),
    "native descriptor action mapping"
  );
  const cloneExecutableRegistries = () => ({
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: { ...plan.registries.browserNativeOperations },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  });
  const inheritedRegistry = cloneExecutableRegistries();
  inheritedRegistry.runtimeOperations = Object.assign(
    Object.create({ inheritedUnknown: true }),
    inheritedRegistry.runtimeOperations
  );
  negative(
    () => validateExecutableRegistryProjection(inheritedRegistry, plan.actionManifest),
    "inherited runtime registry member"
  );
  const inheritedDescriptorRegistry = cloneExecutableRegistries();
  const inheritedDescriptorKey = Object.keys(inheritedDescriptorRegistry.runtimeOperations)[0];
  inheritedDescriptorRegistry.runtimeOperations[inheritedDescriptorKey] = Object.assign(
    Object.create({ inheritedUnknown: true }),
    inheritedDescriptorRegistry.runtimeOperations[inheritedDescriptorKey]
  );
  negative(
    () => validateExecutableRegistryProjection(inheritedDescriptorRegistry, plan.actionManifest),
    "inherited runtime descriptor member"
  );
  for (const [label, install] of [
    [
      "undefined",
      (registry) => {
        registry.runtimeOperations.unknown = undefined;
      },
    ],
    [
      "symbol",
      (registry) => {
        registry.runtimeOperations[Symbol("unknown")] = true;
      },
    ],
    [
      "non-enumerable",
      (registry) => {
        Object.defineProperty(registry.runtimeOperations, "unknown", { value: true });
      },
    ],
  ]) {
    const registry = cloneExecutableRegistries();
    install(registry);
    negative(
      () => validateExecutableRegistryProjection(registry, plan.actionManifest),
      "registry non-data member: " + label
    );
  }
  let registryAccessorReads = 0;
  const accessorRegistry = cloneExecutableRegistries();
  Object.defineProperty(accessorRegistry.runtimeOperations, "unknown", {
    enumerable: true,
    get() {
      registryAccessorReads += 1;
      return true;
    },
  });
  negative(
    () => validateExecutableRegistryProjection(accessorRegistry, plan.actionManifest),
    "registry accessor member"
  );
  invariant(registryAccessorReads === 0, "registry accessor was invoked");
  const screenshotRegistryDrift = {
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: { ...plan.registries.browserNativeOperations },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  };
  const screenshotIds = Object.keys(screenshotRegistryDrift.screenshotPaths);
  [
    screenshotRegistryDrift.screenshotPaths[screenshotIds[0]],
    screenshotRegistryDrift.screenshotPaths[screenshotIds[1]],
  ] = [
    screenshotRegistryDrift.screenshotPaths[screenshotIds[1]],
    screenshotRegistryDrift.screenshotPaths[screenshotIds[0]],
  ];
  negative(
    () => validateExecutableRegistryProjection(screenshotRegistryDrift, plan.actionManifest),
    "screenshot ID/path swap"
  );

  const mutateBlueprint = (mutator) => {
    const blueprint = structuredClone(plan.fixtureBlueprint);
    mutator(blueprint);
    return blueprint;
  };
  for (const [label, mutator] of [
    [
      "origin",
      (blueprint) => {
        blueprint.origins.unknown = true;
      },
    ],
    [
      "user",
      (blueprint) => {
        blueprint.users.a.unknown = true;
      },
    ],
    [
      "content-type field",
      (blueprint) => {
        blueprint.contentTypes.editable.fields[0].unknown = true;
      },
    ],
  ]) {
    negative(
      () => validateFixtureBlueprint(mutateBlueprint(mutator)),
      "nested blueprint unknown key: " + label
    );
  }
  for (const [label, mutator] of [
    [
      "undefined",
      (blueprint) => {
        blueprint.users.a.unknown = undefined;
      },
    ],
    [
      "symbol",
      (blueprint) => {
        blueprint.users.a[Symbol("unknown")] = true;
      },
    ],
    [
      "non-enumerable",
      (blueprint) => {
        Object.defineProperty(blueprint.users.a, "unknown", { value: true });
      },
    ],
    [
      "custom prototype",
      (blueprint) => {
        Object.setPrototypeOf(blueprint.users.a, { inheritedUnknown: true });
      },
    ],
  ]) {
    negative(
      () => validateFixtureBlueprint(mutateBlueprint(mutator)),
      "nested blueprint non-data key: " + label
    );
  }
  let blueprintAccessorReads = 0;
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          Object.defineProperty(blueprint.users.a, "unknown", {
            enumerable: true,
            get() {
              blueprintAccessorReads += 1;
              return true;
            },
          });
        })
      ),
    "nested blueprint accessor"
  );
  invariant(blueprintAccessorReads === 0, "nested blueprint accessor was invoked");
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.data =
            "jVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        })
      ),
    "altered PNG bytes"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.data = blueprint.media.uploadFixture.data.slice(0, -1);
        })
      ),
    "non-canonical PNG base64 spelling"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.encoding = "hex";
        })
      ),
    "altered PNG encoding"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.sha256 = "0".repeat(64);
        })
      ),
    "altered PNG digest"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.decodedSizeBytes = 67;
        })
      ),
    "altered PNG size"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.unknown = true;
        })
      ),
    "extra PNG fixture key"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.path = "fixture.png";
        })
      ),
    "PNG fixture path authority"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.bytes = [137, 80, 78, 71];
        })
      ),
    "second PNG byte authority"
  );

  const projectionHarness = createPrivateProjectionSelfTestHarness(plan);
  const projectionAuthority = {};
  const projectionValue = {
    id: "00000000-0000-4000-8000-000000000017",
    slug: plan.fixtureBlueprint.contentTypes.editable.slug,
    name: plan.fixtureBlueprint.contentTypes.editable.name,
    schema: projectionHarness.expectedSchema,
  };
  projectionHarness.bind(projectionAuthority, "set-017-editable-type-proof", projectionValue);
  const firstProjectionRead = projectionHarness.read(
    projectionAuthority,
    "set-035-screen-create",
    "editable-content-type-detail"
  );
  invariant(
    firstProjectionRead ===
      projectionHarness.read(
        projectionAuthority,
        "set-037-retry-screen-create",
        "editable-content-type-detail"
      ) && Object.isFrozen(firstProjectionRead),
    "private projection single-bind/read identity drift"
  );
  negative(
    () =>
      projectionHarness.bind(projectionAuthority, "set-017-editable-type-proof", projectionValue),
    "private projection second bind"
  );
  negative(
    () => projectionHarness.bind({}, "set-016-editable-type-create", projectionValue),
    "private projection wrong binder"
  );
  negative(
    () => projectionHarness.read({}, "set-035-screen-create", "editable-content-type-detail"),
    "private projection read before bind"
  );
  negative(
    () =>
      projectionHarness.read(
        projectionAuthority,
        "set-036-screen-proof",
        "editable-content-type-detail"
      ),
    "private projection wrong reader"
  );
  negative(
    () => projectionHarness.read(projectionAuthority, "set-035-screen-create", "wrong-authority"),
    "private projection wrong authority ID"
  );
  negative(
    () =>
      projectionHarness.bind({}, "set-017-editable-type-proof", {
        ...projectionValue,
        schema: { ...projectionValue.schema, additionalProperties: true },
      }),
    "private projection altered schema"
  );
  return undefined;
}
