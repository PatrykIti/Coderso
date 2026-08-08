import { describe, expect, test } from "bun:test";

import {
  FULL_SITE_RESOURCE_ADAPTERS,
  assertFullSiteSagaAdapterApplyInput,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import type { JsonObject } from "../../../core/services/kits/fullSitePackage/types";

const ACTOR_ID = "00000000-0000-4000-8000-000000000547";
const INTENDED_ID = "00000000-0000-4000-8000-000000000548";

const prepareCreate = (kind: keyof typeof FULL_SITE_RESOURCE_ADAPTERS, desired: JsonObject) =>
  FULL_SITE_RESOURCE_ADAPTERS[kind].prepareNativeTargets!({
    operation: "create",
    currentId: null,
    intendedId: kind === "setting" ? "site.name" : INTENDED_ID,
    expectedSnapshot: null,
    key: kind === "setting" ? "site.name" : "seed",
    desired,
    actorId: ACTOR_ID,
  });

describe("full-site aggregate adapters", () => {
  test("exposes the complete atomic contract for every aggregate kind", () => {
    for (const kind of [
      "content_type",
      "form",
      "page_template",
      "listing_template",
      "listing_query",
      "setting",
    ] as const) {
      const adapter = FULL_SITE_RESOURCE_ADAPTERS[kind];
      expect(typeof adapter.prepareNativeTargets).toBe("function");
      expect(typeof adapter.captureSnapshotById).toBe("function");
      expect(typeof adapter.deleteSnapshotAtomic).toBe("function");
      expect(typeof adapter.restoreSnapshotAtomic).toBe("function");
    }
    expect(typeof FULL_SITE_RESOURCE_ADAPTERS.setting.applySettingsBatchAtomic).toBe("function");
    expect(typeof FULL_SITE_RESOURCE_ADAPTERS.setting.reverseSettingsBatch).toBe("function");
  });

  test("prepares exact complete owner snapshots without native writes", async () => {
    const contentType = await prepareCreate("content_type", {
      name: "  Project  ",
      slug: "PROJECT",
      schema: { type: "object", additionalProperties: false, properties: {} },
      status: "published",
    });
    expect(contentType).toEqual({
      staged: null,
      complete: {
        id: INTENDED_ID,
        desired: {
          name: "Project",
          slug: "project",
          schema: { type: "object", additionalProperties: false, properties: {} },
          status: "published",
          config: {},
        },
      },
    });

    const pageTemplate = await prepareCreate("page_template", {
      name: "Footer",
      slug: "footer",
      status: "published",
      document: { schemaVersion: 2, sections: [] },
    });
    expect(pageTemplate.complete.id).toBe(INTENDED_ID);
    expect(pageTemplate.complete.desired.document).toBeDefined();

    const setting = await prepareCreate("setting", { value: "  Brand  " });
    expect(setting).toEqual({
      staged: null,
      complete: {
        id: "site.name",
        desired: { present: true, value: "  Brand  " },
      },
    });
  });

  test("keeps Page Template document ownership strict", async () => {
    await expect(
      prepareCreate("page_template", {
        name: "Wrong root",
        slug: "wrong-root",
        status: "draft",
        data: { sections: [] },
      })
    ).rejects.toThrow("page_template_invalid");
  });

  test("strict apply guard enforces own keys and the operation/id/target matrix", () => {
    const valid = {
      operation: "create" as const,
      currentId: null,
      intendedId: INTENDED_ID,
      expectedSnapshot: null,
      targetSnapshot: { id: INTENDED_ID, desired: { name: "Target" } },
      key: "seed",
      desired: { name: "Target" },
      actorId: ACTOR_ID,
    };
    expect(() => assertFullSiteSagaAdapterApplyInput(valid)).not.toThrow();
    expect(() =>
      assertFullSiteSagaAdapterApplyInput({ ...valid, extra: true } as typeof valid)
    ).toThrow("site_package_invalid");
    expect(() =>
      assertFullSiteSagaAdapterApplyInput({
        ...valid,
        targetSnapshot: { id: crypto.randomUUID(), desired: { name: "Target" } },
      } as typeof valid)
    ).toThrow("site_package_invalid");
  });
});
