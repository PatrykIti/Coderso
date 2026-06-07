import { expect, test } from "vitest";

import {
  normalizeBlueprintCapabilities,
  normalizeBlueprintCapability,
} from "../../../core/services/assistant/blueprints/blueprintCapabilitySchema";

test("normalizeBlueprintCapability accepts latent detail-page and bounded media metadata", () => {
  const capability = normalizeBlueprintCapability({
    id: "house-projects-catalog",
    version: 1,
    label: "House Projects Catalog",
    family: "catalog_showcase",
    provides: [
      {
        kind: "catalog",
        key: "house-projects-catalog",
        label: "House projects catalog",
      },
      {
        kind: "public-detail-page",
        key: "house-projects-detail-page",
        label: "House projects detail template",
      },
    ],
    requires: [],
    resources: [
      {
        key: "content-type:house-projects",
        kind: "content-type",
        label: "House Projects",
        executable: true,
        actionTypes: ["content-type.upsert"],
        stableTarget: "house-projects",
        owner: "content-type.upsert",
      },
      {
        key: "media:hero-reference",
        kind: "media",
        label: "Hero media reference",
        executable: false,
        actionTypes: [],
        stableTarget: "hero-image",
        owner: "media.reference.attach",
        metadata: {
          mode: "existing-asset-reference",
          targetKinds: ["entry", "page"],
          field: "heroImage",
        },
      },
      {
        key: "detail-page:house-projects",
        kind: "detail-page",
        label: "House projects detail template",
        executable: false,
        actionTypes: [],
        stableTarget: "/projekty-domow/:slug",
        owner: "core/services/content/*",
      },
    ],
    pageSections: [],
    adminSurfaces: [],
    gated: [
      {
        key: "gated:detail-page",
        kind: "detail-page",
        label: "Detail template",
        reason: "Deferred until later TASK-190 slices.",
      },
    ],
    merge: {
      role: "primary",
      resourceStrategy: "dedupe-by-key",
      pageStrategy: "merge-page-upsert",
      gatedStrategy: "metadata-only",
      priority: 80,
    },
  });

  expect(capability.resources.map((entry) => entry.kind)).toEqual([
    "content-type",
    "media",
    "detail-page",
  ]);
});

test("normalizeBlueprintCapability accepts full-service site provide kind", () => {
  const capability = normalizeBlueprintCapability({
    id: "service-business-full-site",
    version: 1,
    label: "Full-Service Site",
    family: "service_business_full_site",
    provides: [
      {
        kind: "full-service-site",
        key: "service-business-full-site",
        label: "Full-service website",
      },
    ],
    requires: [],
    resources: [
      {
        key: "page:/",
        kind: "page",
        label: "Home",
        executable: true,
        actionTypes: ["page.upsert"],
        stableTarget: "/",
        owner: "page.upsert",
      },
    ],
    pageSections: [],
    adminSurfaces: [],
    gated: [],
    merge: {
      role: "primary",
      resourceStrategy: "dedupe-by-key",
      pageStrategy: "merge-page-upsert",
      gatedStrategy: "metadata-only",
      priority: 95,
    },
  });

  expect(capability.provides[0]?.kind).toBe("full-service-site");
});

test("normalizeBlueprintCapability rejects unknown keys and raw media payload metadata", () => {
  expect(() =>
    normalizeBlueprintCapability({
      id: "lead-capture-site",
      version: 1,
      label: "Lead Capture Site",
      family: "lead_capture_site",
      unexpected: true,
      provides: [{ kind: "lead-capture", key: "lead-capture", label: "Lead capture" }],
      requires: [],
      resources: [],
      pageSections: [],
      adminSurfaces: [],
      gated: [],
      merge: {
        role: "adjunct",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "keep-separate",
        gatedStrategy: "metadata-only",
        priority: 50,
      },
    })
  ).toThrow("assistant_blueprint_capability_invalid");

  expect(() =>
    normalizeBlueprintCapability({
      id: "media-invalid",
      version: 1,
      label: "Media Invalid",
      family: "catalog_showcase",
      provides: [{ kind: "catalog", key: "media-invalid", label: "Media invalid" }],
      requires: [],
      resources: [
        {
          key: "media:broken",
          kind: "media",
          label: "Broken media",
          executable: false,
          actionTypes: [],
          stableTarget: "broken",
          owner: "media.reference.attach",
          metadata: {
            mode: "existing-asset-reference",
            targetKinds: ["entry"],
            uploadBytes: "abc123",
          },
        },
      ],
      pageSections: [],
      adminSurfaces: [],
      gated: [],
      merge: {
        role: "adjunct",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "keep-separate",
        gatedStrategy: "metadata-only",
        priority: 10,
      },
    })
  ).toThrow("assistant_blueprint_capability_invalid");
});

test("normalizeBlueprintCapability rejects executable detail pages with the wrong action owner", () => {
  expect(() =>
    normalizeBlueprintCapability({
      id: "detail-page-invalid",
      version: 1,
      label: "Detail Page Invalid",
      family: "catalog_showcase",
      provides: [{ kind: "catalog", key: "detail-page-invalid", label: "Detail page invalid" }],
      requires: [],
      resources: [
        {
          key: "detail-page:invalid",
          kind: "detail-page",
          label: "Invalid detail page",
          executable: true,
          actionTypes: ["page.upsert"],
          stableTarget: "/invalid/:slug",
          owner: "detail-page.upsert",
        },
      ],
      pageSections: [],
      adminSurfaces: [],
      gated: [
        {
          key: "gated:detail-page",
          kind: "detail-page",
          label: "Detail template",
          reason: "Still latent.",
        },
      ],
      merge: {
        role: "primary",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "merge-page-upsert",
        gatedStrategy: "metadata-only",
        priority: 70,
      },
    })
  ).toThrow("assistant_blueprint_capability_invalid");
});

test("normalizeBlueprintCapability accepts non-executable detail-page metadata without a gate", () => {
  expect(
    normalizeBlueprintCapability({
      id: "detail-page-missing-gate",
      version: 1,
      label: "Detail Page Missing Gate",
      family: "catalog_showcase",
      provides: [
        { kind: "catalog", key: "detail-page-missing-gate", label: "Detail page missing gate" },
      ],
      requires: [],
      resources: [
        {
          key: "detail-page:missing-gate",
          kind: "detail-page",
          label: "Missing gated detail page",
          executable: false,
          actionTypes: [],
          stableTarget: "/missing-gate/:slug",
          owner: "core/services/content/*",
        },
      ],
      pageSections: [],
      adminSurfaces: [],
      gated: [],
      merge: {
        role: "primary",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "merge-page-upsert",
        gatedStrategy: "metadata-only",
        priority: 70,
      },
    })
  ).toMatchObject({
    resources: [
      {
        kind: "detail-page",
        executable: false,
        actionTypes: [],
      },
    ],
    gated: [],
  });

  expect(() =>
    normalizeBlueprintCapability({
      id: "defaults-invalid",
      version: 1,
      label: "Defaults Invalid",
      family: "catalog_showcase",
      provides: [{ kind: "catalog", key: "defaults-invalid", label: "Defaults invalid" }],
      requires: [],
      resources: [],
      pageSections: [],
      adminSurfaces: [],
      gated: [],
      defaults: {
        apiKey: "should-not-be-here",
      },
      merge: {
        role: "primary",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "merge-page-upsert",
        gatedStrategy: "metadata-only",
        priority: 70,
      },
    })
  ).toThrow("assistant_blueprint_capability_invalid");
});

test("normalizeBlueprintCapabilities rejects duplicate capability ids", () => {
  expect(() =>
    normalizeBlueprintCapabilities([
      {
        id: "lead-capture-site",
        version: 1,
        label: "Lead Capture Site",
        family: "lead_capture_site",
        provides: [{ kind: "lead-capture", key: "lead-capture", label: "Lead capture" }],
        requires: [],
        resources: [],
        pageSections: [],
        adminSurfaces: [],
        gated: [],
        merge: {
          role: "adjunct",
          resourceStrategy: "dedupe-by-key",
          pageStrategy: "keep-separate",
          gatedStrategy: "metadata-only",
          priority: 50,
        },
      },
      {
        id: "lead-capture-site",
        version: 1,
        label: "Lead Capture Site Duplicate",
        family: "lead_capture_site",
        provides: [{ kind: "lead-capture", key: "lead-capture-dup", label: "Lead capture" }],
        requires: [],
        resources: [],
        pageSections: [],
        adminSurfaces: [],
        gated: [],
        merge: {
          role: "adjunct",
          resourceStrategy: "dedupe-by-key",
          pageStrategy: "keep-separate",
          gatedStrategy: "metadata-only",
          priority: 50,
        },
      },
    ])
  ).toThrow("assistant_blueprint_capability_invalid");
});
