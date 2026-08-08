import { expect, test } from "bun:test";

import {
  TASK_547_DESCRIPTOR_SHA256,
  TASK_547_SCENARIOS,
  requireTask547Descriptor,
  task547ScenarioDescriptors,
} from "../../../scripts/runtime-smoke/adapters/task-547/descriptors";

const EXACT_IDS = [
  "home-desktop-effects",
  "all-routes-desktop-shell",
  "tablet-responsive",
  "mobile-navigation",
  "portfolio-facets",
  "aurora-detail",
  "contact-form",
  "publish-lifecycle-parity",
  "form-design-author-light",
  "form-design-author-dark",
  "form-design-reset-mobile",
  "form-design-save-reload",
  "form-design-publish-front",
  "page-editor-switcher-author-light",
  "page-editor-switcher-tablet-reset",
  "page-editor-collection-cta-dark",
  "page-editor-form-presentation-save-reload",
  "page-editor-publish-front-parity",
] as const;

test("TASK-547 owns one exact ordered 18-scenario descriptor contract", () => {
  expect(TASK_547_SCENARIOS.map(({ id }) => id)).toEqual(EXACT_IDS);
  expect(TASK_547_SCENARIOS.map(({ number }) => number)).toEqual(
    Array.from({ length: 18 }, (_value, index) => index + 1)
  );
  expect(
    new Set(TASK_547_SCENARIOS.flatMap(({ assertions }) => assertions.map(({ id }) => id))).size
  ).toBe(TASK_547_SCENARIOS.reduce((sum, { assertions }) => sum + assertions.length, 0));
  expect(TASK_547_DESCRIPTOR_SHA256).toBe(
    "2ae92558e635b7a9467119a049d2eda7735d10aede4195a513029d7197e495ec"
  );
  expect(requireTask547Descriptor("contact-form").number).toBe(7);
  expect(() => requireTask547Descriptor("unknown")).toThrow("unregistered");
});

test("TASK-547 fast and certification profiles reuse byte-identical descriptors", () => {
  expect(task547ScenarioDescriptors("fast")).toBe(TASK_547_SCENARIOS);
  expect(task547ScenarioDescriptors("certification")).toBe(TASK_547_SCENARIOS);
  expect(() => task547ScenarioDescriptors("other" as never)).toThrow("unsupported");
});

test("TASK-547 portfolio descriptor keeps canonical query ids out of stable evidence", () => {
  const assertions = requireTask547Descriptor("portfolio-facets").assertions;
  expect(assertions.find(({ id }) => id === "portfolio-filter-url-reset")).toMatchObject({
    expected: {
      selectedPath: { $equals: "/projekty" },
      selectedFilterValue: { $equals: "eco" },
      selectedUsesCanonicalName: { $equals: true },
      resetUrl: { $equals: "/projekty" },
    },
  });
  expect(assertions.find(({ id }) => id === "portfolio-no-js-get")?.target).toBe(
    "canonical portfolio filter GET"
  );
});

test("TASK-547 Aurora CTA descriptor records semantic DOM order", () => {
  const assertion = requireTask547Descriptor("aurora-detail").assertions.find(
    ({ id }) => id === "aurora-contact-cta"
  );
  expect(assertion?.expected).toEqual({
    $equals: {
      label: "Chcę podobny dom",
      href: "/kontakt",
      afterStatistics: true,
      beforeAssumptions: true,
    },
  });
});
