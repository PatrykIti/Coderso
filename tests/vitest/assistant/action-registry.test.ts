import { expect, test } from "vitest";

import {
  assistantActionTypes,
  createAssistantActionRegistry,
  getAssistantActionHandler,
  isAssistantActionType,
} from "../../../core/services/assistant/actionRegistry";

test("assistantActionTypes lists every supported action type once", () => {
  expect([...new Set(assistantActionTypes)]).toHaveLength(assistantActionTypes.length);
  expect(assistantActionTypes).toEqual([
    "setting.content-route.upsert",
    "content-type.upsert",
    "content-type.delete",
    "custom-screen.upsert",
    "custom-screen.delete",
    "listing-query.upsert",
    "listing-query.delete",
    "listing-template.upsert",
    "listing-template.delete",
    "form.upsert",
    "form.delete",
    "form.archive",
    "entry.upsert-draft",
    "entry.delete",
    "menu.item.upsert",
    "seo.document.upsert",
    "media.reference.attach",
    "listing-query.filters.patch",
    "listing-template.card.patch",
    "page.widget.patch",
    "form.automation.upsert",
    "page.upsert",
    "page.delete",
    "widget-template.delete",
    "site-kit.recommend",
    "site-kit.install",
    "site-kit.validate",
  ]);
});

test("createAssistantActionRegistry requires complete registered handlers", () => {
  expect(() =>
    createAssistantActionRegistry({
      "content-type.upsert": { label: "content" },
    })
  ).toThrow("assistant_action_registry_missing_type");
});

test("createAssistantActionRegistry rejects unknown registered handlers", () => {
  const handlers = Object.fromEntries(
    assistantActionTypes.map((type) => [type, { label: type }])
  );

  expect(() =>
    createAssistantActionRegistry({
      ...handlers,
      "database.drop": { label: "bad" },
    } as never)
  ).toThrow("assistant_action_registry_unknown_type");
});

test("getAssistantActionHandler returns whitelisted handlers", () => {
  const registry = createAssistantActionRegistry(
    Object.fromEntries(
      assistantActionTypes.map((type) => [type, { label: type }])
    ) as Record<(typeof assistantActionTypes)[number], { label: string }>
  );

  expect(isAssistantActionType("site-kit.install")).toBe(true);
  expect(isAssistantActionType("entry.upsert-draft")).toBe(true);
  expect(isAssistantActionType("entry.delete")).toBe(true);
  expect(isAssistantActionType("content-type.delete")).toBe(true);
  expect(isAssistantActionType("custom-screen.delete")).toBe(true);
  expect(isAssistantActionType("menu.item.upsert")).toBe(true);
  expect(isAssistantActionType("seo.document.upsert")).toBe(true);
  expect(isAssistantActionType("media.reference.attach")).toBe(true);
  expect(isAssistantActionType("listing-query.delete")).toBe(true);
  expect(isAssistantActionType("listing-query.filters.patch")).toBe(true);
  expect(isAssistantActionType("listing-template.delete")).toBe(true);
  expect(isAssistantActionType("listing-template.card.patch")).toBe(true);
  expect(isAssistantActionType("form.delete")).toBe(true);
  expect(isAssistantActionType("form.archive")).toBe(true);
  expect(isAssistantActionType("page.widget.patch")).toBe(true);
  expect(isAssistantActionType("form.automation.upsert")).toBe(true);
  expect(isAssistantActionType("page.delete")).toBe(true);
  expect(isAssistantActionType("entry.sample.create")).toBe(false);
  expect(isAssistantActionType("database.drop")).toBe(false);
  expect(getAssistantActionHandler(registry, "site-kit.install").label).toBe(
    "site-kit.install"
  );
});
