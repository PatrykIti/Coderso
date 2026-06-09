import { expect, test } from "bun:test";

import {
  buildSolutionKitManifest,
  normalizeSolutionKitManifest,
} from "../../../core/services/kits/kitManifest";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

const source = {
  id: "custom-kit",
  title: "Custom Kit",
  businessTypes: ["services_directory"],
  recommendedModules: ["forms", "widgets", "forms"],
  resourceBlueprint: {
    pages: [
      {
        slug: "",
        title: "Home",
        status: "published" as const,
        template: "service-home",
        data: {
          schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
          sections: [
            createPageSectionV2("hero", {
              id: "sec-a",
              blocks: [
                createPageBlockV2("heading", {
                  id: "a",
                  props: { text: "Hero", level: "h1", align: "left" },
                }),
              ],
            }),
            createPageSectionV2("lead-form", {
              id: "sec-c",
              blocks: [
                createPageBlockV2("form", {
                  id: "c",
                  props: { formId: "lead-form", title: "Lead form" },
                }),
              ],
            }),
          ],
          settings: {
            template: "service-home",
          },
        },
      },
    ],
    forms: [{ slug: "lead-form", name: "Lead form", status: "published" as const }],
    contentTypes: [{ slug: "service", name: "Service" }],
    menus: [{ location: "primary" as const, name: "Primary" }],
    templates: [],
  },
  manifest: {
    includes: {
      entries: ["manual-entry", "manual-entry"],
    },
    optionalModules: ["booking", "booking"],
  },
};

test("buildSolutionKitManifest creates deterministic includes and checklist", () => {
  const manifest = buildSolutionKitManifest(
    source as unknown as Parameters<typeof buildSolutionKitManifest>[0]
  );

  expect(manifest.id).toBe("custom-kit");
  expect(manifest.vertical).toBe("services-directory");
  expect(manifest.requiredModules).toEqual(["forms", "widgets"]);
  expect(manifest.optionalModules).toEqual(["booking"]);
  expect(manifest.includes.templates).toEqual(["service-home"]);
  expect(manifest.includes.widgets).toEqual(["form", "heading", "hero", "lead-form"]);
  expect(manifest.includes.entries).toEqual(["manual-entry"]);
  expect(manifest.postInstallTasks?.length).toBeGreaterThan(0);
});

test("normalizeSolutionKitManifest validates required fields", () => {
  expect(() =>
    normalizeSolutionKitManifest({
      id: "",
      title: "Invalid",
      vertical: "custom",
      includes: {
        contentTypes: [],
        entries: [],
        widgets: [],
        templates: [],
        forms: [],
        menus: [],
      },
      requiredModules: [],
    })
  ).toThrow("solution_kit_manifest_invalid");
});
