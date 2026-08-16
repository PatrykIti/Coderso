import { createHash } from "node:crypto";

import { SmokeError } from "../../contracts";
import type { SmokeVisibleAssertionKind } from "../types";

/**
 * TASK-488 scenario descriptors (source contract: changelog 1278 smoke list —
 * login; commerce list -> Manage collections route; create collection (POST 200,
 * visible + assignable); variant editor (Add variant -> Default variant 1 card
 * with remove/inventory/attributes); dark parity; 0 console errors).
 *
 * Every scenario runs an admin `light` and `dark` variant so the smoke-evidence
 * manifest's Admin light+dark coverage rule holds and dark parity is proven on
 * every surface, not just the explicit parity scenario. Assertions are
 * fixture-independent: expected values are static strings; run-scoped strings
 * (marker slugs, variant titles) are recorded as booleans ("true"/"false") so
 * the descriptor digest stays stable across runs.
 */

export const TASK_488_SCENARIO_COUNT = 5;
export const TASK_488_VARIANT_COUNT = 10;

export const TASK_488_VIEWPORT = Object.freeze({ width: 1440, height: 1000 });

export interface Task488AssertionDescriptor {
  readonly id: string;
  readonly kind: SmokeVisibleAssertionKind;
  readonly target: string;
  readonly property: string;
  readonly expected: string;
}

export interface Task488VariantDescriptor {
  readonly id: "light" | "dark";
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: number; readonly height: number }>;
  readonly assertions: readonly Task488AssertionDescriptor[];
}

export interface Task488ScenarioDescriptor {
  readonly number: 1 | 2 | 3 | 4 | 5;
  readonly id: string;
  readonly title: string;
  readonly variants: readonly Task488VariantDescriptor[];
}

function assertion(
  id: string,
  kind: SmokeVisibleAssertionKind,
  target: string,
  property: string,
  expected: string
): Task488AssertionDescriptor {
  return Object.freeze({ id, kind, target, property, expected });
}

function variant(
  id: "light" | "dark",
  assertions: readonly Task488AssertionDescriptor[]
): Task488VariantDescriptor {
  return Object.freeze({
    id,
    theme: id,
    viewport: TASK_488_VIEWPORT,
    assertions: Object.freeze([...assertions]),
  });
}

const LOGIN_ASSERTIONS = Object.freeze([
  assertion("auth-session-valid", "dom-state", "/auth/me", "status", "200"),
  assertion("admin-shell-visible", "dom-state", "admin shell main", "visible", "true"),
  assertion("commerce-nav-accessible", "aria", "Commerce navigation link", "visible", "true"),
  assertion(
    "admin-surface-painted",
    "computed-style",
    "document root",
    "background-color",
    "painted"
  ),
]);

const ROUTE_ASSERTIONS = Object.freeze([
  assertion("commerce-list-heading", "dom-state", "Commerce page heading", "visible", "true"),
  assertion("manage-collections-control", "aria", "Manage collections button", "visible", "true"),
  assertion("collections-route-resolved", "dom-state", "collections route", "resolved", "true"),
  assertion(
    "collections-header-geometry",
    "geometry",
    "Collections page header",
    "within-viewport",
    "true"
  ),
]);

const COLLECTION_LIGHT_ASSERTIONS = Object.freeze([
  assertion("product-post-200", "dom-state", "POST /commerce/products", "status", "200"),
  assertion("collection-post-200", "dom-state", "POST /commerce/collections", "status", "200"),
  assertion("collection-visible", "dom-state", "created collection", "visible", "true"),
  assertion(
    "collection-assignable",
    "dom-state",
    "product editor collection checkbox",
    "visible",
    "true"
  ),
  assertion(
    "collection-assignment-persisted",
    "dom-state",
    "GET /commerce/products/:id",
    "assigned",
    "true"
  ),
]);

const COLLECTION_DARK_ASSERTIONS = Object.freeze([
  assertion("collection-visible", "dom-state", "created collection", "visible", "true"),
  assertion(
    "collection-assignable",
    "dom-state",
    "product editor collection checkbox",
    "visible",
    "true"
  ),
  assertion(
    "collection-assignment-persisted",
    "dom-state",
    "GET /commerce/products/:id",
    "assigned",
    "true"
  ),
  assertion(
    "collection-dark-painted",
    "computed-style",
    "admin shell",
    "background-color",
    "painted"
  ),
  assertion("collection-no-overflow", "geometry", "document", "overflow-x", "0"),
]);

const VARIANT_LIGHT_ASSERTIONS = Object.freeze([
  assertion("variant-card-rendered", "dom-state", "Default variant 1 checkbox", "visible", "true"),
  assertion("variant-remove-control", "aria", "Remove variant 1 button", "visible", "true"),
  assertion("variant-inventory-controls", "dom-state", "variant quantity input", "visible", "true"),
  assertion("variant-attributes-editor", "dom-state", "Attributes editor", "visible", "true"),
  assertion("variant-persisted", "dom-state", "GET /commerce/products/:id", "title-match", "true"),
  assertion(
    "variant-attribute-persisted",
    "dom-state",
    "GET /commerce/products/:id",
    "attribute-match",
    "true"
  ),
]);

const VARIANT_DARK_ASSERTIONS = Object.freeze([
  assertion("variant-card-rendered", "dom-state", "Default variant 1 checkbox", "visible", "true"),
  assertion("variant-remove-control", "aria", "Remove variant 1 button", "visible", "true"),
  assertion("variant-inventory-controls", "dom-state", "variant quantity input", "visible", "true"),
  assertion("variant-attributes-editor", "dom-state", "Attributes editor", "visible", "true"),
  assertion("variant-dark-painted", "computed-style", "admin shell", "background-color", "painted"),
]);

function collectionVariants(): readonly Task488VariantDescriptor[] {
  return Object.freeze([
    variant("light", COLLECTION_LIGHT_ASSERTIONS),
    variant("dark", COLLECTION_DARK_ASSERTIONS),
  ]);
}

function variantEditorVariants(): readonly Task488VariantDescriptor[] {
  return Object.freeze([
    variant("light", VARIANT_LIGHT_ASSERTIONS),
    variant("dark", VARIANT_DARK_ASSERTIONS),
  ]);
}

const PARITY_LIGHT_ASSERTIONS = Object.freeze([
  assertion("parity-theme-applied", "dom-state", "html element", "class-dark", "false"),
  assertion(
    "parity-surface-painted",
    "computed-style",
    "admin shell",
    "background-color",
    "painted"
  ),
  assertion("parity-text-contrast", "computed-style", "Commerce heading", "contrast", "distinct"),
  assertion("parity-no-overflow", "geometry", "document", "overflow-x", "0"),
  assertion(
    "parity-controls-visible",
    "dom-state",
    "variant card and collections",
    "visible",
    "true"
  ),
]);

const PARITY_DARK_ASSERTIONS = Object.freeze([
  assertion("parity-theme-applied", "dom-state", "html element", "class-dark", "true"),
  assertion(
    "parity-surface-painted",
    "computed-style",
    "admin shell",
    "background-color",
    "painted"
  ),
  assertion("parity-text-contrast", "computed-style", "Commerce heading", "contrast", "distinct"),
  assertion("parity-no-overflow", "geometry", "document", "overflow-x", "0"),
  assertion(
    "parity-controls-visible",
    "dom-state",
    "variant card and collections",
    "visible",
    "true"
  ),
]);

function parityVariants(): readonly Task488VariantDescriptor[] {
  return Object.freeze([
    variant("light", PARITY_LIGHT_ASSERTIONS),
    variant("dark", PARITY_DARK_ASSERTIONS),
  ]);
}

export const TASK_488_SCENARIOS: readonly Task488ScenarioDescriptor[] = Object.freeze([
  Object.freeze({
    number: 1,
    id: "commerce-login",
    title: "Admin login and authenticated shell",
    variants: Object.freeze([
      variant("light", LOGIN_ASSERTIONS),
      variant("dark", LOGIN_ASSERTIONS),
    ]),
  }),
  Object.freeze({
    number: 2,
    id: "commerce-collections-route",
    title: "Commerce list to collections route",
    variants: Object.freeze([
      variant("light", ROUTE_ASSERTIONS),
      variant("dark", ROUTE_ASSERTIONS),
    ]),
  }),
  Object.freeze({
    number: 3,
    id: "collection-create",
    title: "Create collection visible and assignable",
    variants: collectionVariants(),
  }),
  Object.freeze({
    number: 4,
    id: "variant-editor",
    title: "Variant editor card authoring",
    variants: variantEditorVariants(),
  }),
  Object.freeze({
    number: 5,
    id: "commerce-dark-parity",
    title: "Dark theme parity across commerce surfaces",
    variants: parityVariants(),
  }),
]);

export const TASK_488_DESCRIPTOR_SHA256 = createHash("sha256")
  .update(JSON.stringify(TASK_488_SCENARIOS))
  .digest("hex");

export function task488ScenarioDescriptors(): readonly Task488ScenarioDescriptor[] {
  return TASK_488_SCENARIOS;
}

export function task488ScenarioDescriptor(scenarioId: string): Task488ScenarioDescriptor {
  const descriptor = TASK_488_SCENARIOS.find(({ id }) => id === scenarioId);
  if (descriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 scenario descriptor is absent");
  }
  return descriptor;
}

export function task488VariantDescriptors(
  descriptor: Task488ScenarioDescriptor
): readonly Task488VariantDescriptor[] {
  if (descriptor.variants.length !== 2) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 variant descriptor set drifted");
  }
  return descriptor.variants;
}

export function task488AssertionDescriptors(
  descriptor: Task488ScenarioDescriptor,
  variantId: string
): readonly Task488AssertionDescriptor[] {
  const variantDescriptor = descriptor.variants.find(({ id }) => id === variantId);
  if (variantDescriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-488 variant descriptor is absent");
  }
  return variantDescriptor.assertions;
}

export function task488AssertionIds(
  descriptor: Task488ScenarioDescriptor,
  variantId: string
): readonly string[] {
  return Object.freeze(task488AssertionDescriptors(descriptor, variantId).map(({ id }) => id));
}
