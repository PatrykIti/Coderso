import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { acquireNativeCmsWriterFence } from "../../../core/db/nativeCmsWriterFence";
import { formActions, formFields, forms, menuItems, menus } from "../../../core/db/schema";
import { FORM_FIELD_SCHEMA_LIMITS } from "../../../core/services/forms/validation";
import type { PlannedPackageResource } from "../../../core/services/kits/fullSitePackage/referenceGraph";
import { PACKAGE_LIMITS, type JsonObject } from "../../../core/services/kits/fullSitePackage/types";
import { readFullSitePlanningResourcesBatch } from "../../../core/services/kits/fullSiteInstall/planningResourceBatchReader";
import type { FullSiteResourceIdentity } from "../../../core/services/kits/fullSiteInstallTypes";

const makeResource = (
  input: Readonly<{
    identity: FullSiteResourceIdentity;
    kind: "form" | "menu";
    collection: "forms" | "menus";
    key: string;
    desired: JsonObject;
    ordinal: number;
  }>
): PlannedPackageResource =>
  Object.freeze({
    ...input,
    collectionIndex: input.ordinal,
    seed: Object.freeze({ key: input.key, desired: Object.freeze(input.desired) }),
    dependencies: Object.freeze([]),
    references: Object.freeze([]),
  });

test("planning aggregate batch enforces all Form/Menu child caps before projection", async () => {
  const scope = randomUUID();
  const formId = randomUUID();
  const menuId = randomUUID();
  const formSlug = `aggregate-form-${scope}`;
  const menuName = `Aggregate menu ${scope}`;
  const fieldIds = new Set<string>();
  const actionIds = new Set<string>();
  const itemIds = new Set<string>();
  const resources = [
    makeResource({
      identity: "form:brief",
      kind: "form",
      collection: "forms",
      key: "brief",
      desired: { slug: formSlug, fields: [], actions: [] },
      ordinal: 0,
    }),
    makeResource({
      identity: "menu:primary",
      kind: "menu",
      collection: "menus",
      key: "primary",
      desired: { name: menuName, items: [] },
      ordinal: 1,
    }),
  ] as const;
  const evidence = resources.map((resource) => ({
    identity: resource.identity,
    evidence: {
      runId: randomUUID(),
      resourceId: resource.kind === "form" ? formId : menuId,
    },
  }));
  const fieldRows = Array.from({ length: FORM_FIELD_SCHEMA_LIMITS.fields }, (_, index) => {
    const id = randomUUID();
    fieldIds.add(id);
    return {
      id,
      formId,
      type: "text",
      label: `Field ${index}`,
      name: `field_${index}`,
      required: index % 2 === 0,
      settings: {},
      orderIndex: index % 4,
    };
  });
  const actionRows = Array.from({ length: PACKAGE_LIMITS.resourcesPerCollection }, (_, index) => {
    const id = randomUUID();
    actionIds.add(id);
    return {
      id,
      formId,
      type: "success_message",
      label: `Action ${index}`,
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: { message: `Completed ${index}` },
      orderIndex: index % 4,
    };
  });
  const menuRows = Array.from({ length: PACKAGE_LIMITS.resourcesPerCollection }, (_, index) => {
    const id = randomUUID();
    itemIds.add(id);
    return {
      id,
      menuId,
      label: `Item ${index}`,
      href: `/item-${index}`,
      pageId: null,
      parentId: null,
      orderIndex: index % 4,
      settings: {},
    };
  });
  const read = () =>
    db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        return readFullSitePlanningResourcesBatch(tx, { resources, evidence });
      },
      { isolationLevel: "read committed" }
    );

  try {
    await db.insert(forms).values({ id: formId, name: `Aggregate ${scope}`, slug: formSlug });
    await db.insert(menus).values({ id: menuId, name: menuName, settings: {} });
    await db.insert(formFields).values([...fieldRows].reverse());
    await db.insert(formActions).values([...actionRows].reverse());
    await db.insert(menuItems).values([...menuRows].reverse());

    const exact = await read();
    expect(exact[0]?.current?.desired.fields).toHaveLength(FORM_FIELD_SCHEMA_LIMITS.fields);
    expect(exact[0]?.current?.desired.actions).toHaveLength(PACKAGE_LIMITS.resourcesPerCollection);
    expect(exact[1]?.current?.desired.items).toHaveLength(PACKAGE_LIMITS.resourcesPerCollection);
    expect((exact[0]?.current?.desired.fields as Array<{ id: string }>)[0]?.id).toBe(
      [...fieldRows].sort(
        (left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id)
      )[0]?.id
    );

    const extraFieldId = randomUUID();
    fieldIds.add(extraFieldId);
    await db.insert(formFields).values({
      id: extraFieldId,
      formId,
      type: "text",
      label: "Overflow field",
      name: "overflow_field",
      settings: {},
      orderIndex: 999,
    });
    await expect(read()).rejects.toThrow("site_package_too_large");
    await db.delete(formFields).where(eq(formFields.id, extraFieldId));
    fieldIds.delete(extraFieldId);

    const extraActionId = randomUUID();
    actionIds.add(extraActionId);
    await db.insert(formActions).values({
      id: extraActionId,
      formId,
      type: "success_message",
      label: "Overflow action",
      condition: { operator: "always" },
      config: { message: "Overflow" },
      orderIndex: 999,
    });
    await expect(read()).rejects.toThrow("site_package_too_large");
    await db.delete(formActions).where(eq(formActions.id, extraActionId));
    actionIds.delete(extraActionId);

    const extraItemId = randomUUID();
    itemIds.add(extraItemId);
    await db.insert(menuItems).values({
      id: extraItemId,
      menuId,
      label: "Overflow item",
      href: "/overflow",
      orderIndex: 999,
      settings: {},
    });
    await expect(read()).rejects.toThrow("site_package_too_large");
  } finally {
    if (fieldIds.size > 0) {
      await db.delete(formFields).where(inArray(formFields.id, [...fieldIds]));
    }
    if (actionIds.size > 0) {
      await db.delete(formActions).where(inArray(formActions.id, [...actionIds]));
    }
    if (itemIds.size > 0) {
      await db.delete(menuItems).where(inArray(menuItems.id, [...itemIds]));
    }
    await db.delete(forms).where(eq(forms.id, formId));
    await db.delete(menus).where(eq(menus.id, menuId));
  }
}, 360_000);
