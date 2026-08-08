import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { formActions, formFields, forms, menuItems, menus } from "../../../core/db/schema";
import { FORM_FIELD_SCHEMA_LIMITS } from "../../../core/services/forms/validation";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import { PACKAGE_LIMITS, type JsonObject } from "../../../core/services/kits/fullSitePackage/types";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";

const FIELD_CAP: 100 = FORM_FIELD_SCHEMA_LIMITS.fields;
const RESOURCE_CAP: 256 = PACKAGE_LIMITS.resourcesPerCollection;
const TEST_TIMEOUT_MS = 360_000;

type OwnedIds = {
  formActions: Set<string>;
  formFields: Set<string>;
  forms: Set<string>;
  menuItems: Set<string>;
  menus: Set<string>;
};

const createOwnedIds = (): OwnedIds => ({
  formActions: new Set(),
  formFields: new Set(),
  forms: new Set(),
  menuItems: new Set(),
  menus: new Set(),
});

const ownId = (ids: Set<string>): string => {
  const id = randomUUID();
  ids.add(id);
  return id;
};

const cleanupOwnedIds = async (owned: OwnedIds): Promise<void> => {
  let failed = false;
  const remove = async (
    ids: ReadonlySet<string>,
    operation: (values: string[]) => Promise<unknown>
  ): Promise<void> => {
    if (ids.size === 0) return;
    try {
      await operation([...ids]);
    } catch {
      failed = true;
    }
  };
  await remove(owned.formFields, async (ids) =>
    db.delete(formFields).where(inArray(formFields.id, ids))
  );
  await remove(owned.formActions, async (ids) =>
    db.delete(formActions).where(inArray(formActions.id, ids))
  );
  await remove(owned.menuItems, async (ids) =>
    db.delete(menuItems).where(inArray(menuItems.id, ids))
  );
  await remove(owned.forms, async (ids) => db.delete(forms).where(inArray(forms.id, ids)));
  await remove(owned.menus, async (ids) => db.delete(menus).where(inArray(menus.id, ids)));
  if (failed) throw new Error("full_site_resolver_bounds_cleanup_failed");
};

const comparePersistedOrder = (
  left: { id: string; orderIndex: number },
  right: { id: string; orderIndex: number }
): number =>
  left.orderIndex - right.orderIndex || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

const expectTooLarge = async (operation: Promise<unknown>): Promise<void> => {
  const error = await operation.then(
    () => null,
    (failure: unknown) => failure
  );
  if (!(error instanceof Error)) throw new Error("resolver_bounds_error_missing");
  expect(Object.getPrototypeOf(error)).toBe(Error.prototype);
  expect(error.message).toBe("site_package_too_large");
};

const createFieldRows = (owned: OwnedIds, formId: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: ownId(owned.formFields),
    formId,
    type: "text",
    label: `Field ${index}`,
    name: `field_${index}`,
    required: index % 2 === 0,
    settings: {},
    orderIndex: index % 4,
  }));

const createActionRows = (owned: OwnedIds, formId: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: ownId(owned.formActions),
    formId,
    type: "success_message",
    label: `Action ${index}`,
    enabled: index % 2 === 0,
    continueOnError: index % 3 === 0,
    condition: { operator: "always" },
    config: { message: `Completed ${index}` },
    orderIndex: index % 4,
  }));

const createMenuItemRows = (owned: OwnedIds, menuId: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: ownId(owned.menuItems),
    menuId,
    label: `Item ${index}`,
    href: `/item-${index}`,
    pageId: null,
    parentId: null,
    orderIndex: index % 4,
    settings: {},
  }));

type FormChildKind = "fields" | "actions";

const runFormBoundary = async (
  owned: OwnedIds,
  childKind: FormChildKind,
  count: number,
  tooLarge: boolean
): Promise<void> => {
  const formId = ownId(owned.forms);
  const scope = randomUUID();
  const slug = `resolver-bounds-${scope}`;
  const fieldRows = childKind === "fields" ? createFieldRows(owned, formId, count) : [];
  const actionRows = childKind === "actions" ? createActionRows(owned, formId, count) : [];
  await db.insert(forms).values({ id: formId, name: `Bounds ${scope}`, slug, settings: {} });
  if (fieldRows.length) await db.insert(formFields).values([...fieldRows].reverse());
  if (actionRows.length) await db.insert(formActions).values([...actionRows].reverse());

  const desired: JsonObject = { slug, [childKind]: [] };
  const operation = createFullSiteCurrentResourceResolver(
    `resolver-bounds-${scope}`,
    createLegacyInstallLedger()
  )("form", { key: scope, desired }, formId, null);
  if (tooLarge) return expectTooLarge(operation);

  const expectedChildren =
    childKind === "fields"
      ? [...fieldRows].sort(comparePersistedOrder).map(({ formId: _formId, ...field }) => field)
      : [...actionRows]
          .sort(comparePersistedOrder)
          .map(({ formId: _formId, ...action }, orderIndex) => ({ ...action, orderIndex }));
  await expect(operation).resolves.toEqual({
    id: formId,
    desired: { slug, [childKind]: expectedChildren },
  });
};

const runMenuBoundary = async (
  owned: OwnedIds,
  count: number,
  tooLarge: boolean
): Promise<void> => {
  const menuId = ownId(owned.menus);
  const scope = randomUUID();
  const name = `Resolver bounds ${scope}`;
  const itemRows = createMenuItemRows(owned, menuId, count);
  await db.insert(menus).values({ id: menuId, name, settings: {} });
  await db.insert(menuItems).values([...itemRows].reverse());

  const operation = createFullSiteCurrentResourceResolver(
    `resolver-bounds-${scope}`,
    createLegacyInstallLedger()
  )("menu", { key: scope, desired: { name, items: [] } }, menuId, null);
  if (tooLarge) return expectTooLarge(operation);

  const expectedItems = [...itemRows]
    .sort(comparePersistedOrder)
    .map(({ menuId: _menuId, ...item }) => item);
  await expect(operation).resolves.toEqual({
    id: menuId,
    desired: { name, items: expectedItems },
  });
};

for (const [label, childKind, count, tooLarge] of [
  ["form fields accept the exact 100-row cap", "fields", FIELD_CAP, false],
  ["form fields reject the 101st row", "fields", FIELD_CAP + 1, true],
  ["form actions accept the exact 256-row cap", "actions", RESOURCE_CAP, false],
  ["form actions reject the 257th row", "actions", RESOURCE_CAP + 1, true],
] as const) {
  test(
    label,
    async () => {
      const owned = createOwnedIds();
      try {
        await runFormBoundary(owned, childKind, count, tooLarge);
      } finally {
        await cleanupOwnedIds(owned);
      }
    },
    TEST_TIMEOUT_MS
  );
}

for (const [label, count, tooLarge] of [
  ["menu items accept the exact 256-row cap", RESOURCE_CAP, false],
  ["menu items reject the 257th row", RESOURCE_CAP + 1, true],
] as const) {
  test(
    label,
    async () => {
      const owned = createOwnedIds();
      try {
        await runMenuBoundary(owned, count, tooLarge);
      } finally {
        await cleanupOwnedIds(owned);
      }
    },
    TEST_TIMEOUT_MS
  );
}
