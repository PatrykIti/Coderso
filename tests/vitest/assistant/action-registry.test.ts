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
    "content-type.field.add",
    "content-type.delete",
    "custom-screen.upsert",
    "custom-screen.delete",
    "custom-screen.update",
    "custom-screen.section.add",
    "custom-screen.block.add",
    "custom-screen.block.patch",
    "custom-screen.block.move",
    "custom-screen.block.remove",
    "custom-screen.binding.set",
    "custom-screen.list-view.patch",
    "listing-query.upsert",
    "listing-query.delete",
    "listing-query.update",
    "listing-template.upsert",
    "listing-template.delete",
    "listing-template.update",
    "form.upsert",
    "form.delete",
    "form.archive",
    "form.update",
    "entry.upsert-draft",
    "entry.sample.create",
    "entry.delete",
    "entry.update",
    "menu.upsert",
    "menu.item.upsert",
    "menu.item.delete",
    "menu.item.update",
    "seo.document.upsert",
    "seo.document.delete",
    "seo.document.update",
    "media.reference.attach",
    "listing-query.filters.patch",
    "listing-template.card.patch",
    "form.automation.upsert",
    "page.upsert",
    "detail-page.upsert",
    "page.update",
    "page.delete",
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
  const handlers = Object.fromEntries(assistantActionTypes.map((type) => [type, { label: type }]));

  expect(() =>
    createAssistantActionRegistry({
      ...handlers,
      "database.drop": { label: "bad" },
    } as never)
  ).toThrow("assistant_action_registry_unknown_type");
});

test("getAssistantActionHandler returns whitelisted handlers", () => {
  const registry = createAssistantActionRegistry(
    Object.fromEntries(assistantActionTypes.map((type) => [type, { label: type }])) as Record<
      (typeof assistantActionTypes)[number],
      { label: string }
    >
  );

  expect(isAssistantActionType("site-kit.install")).toBe(true);
  expect(isAssistantActionType("entry.upsert-draft")).toBe(true);
  expect(isAssistantActionType("entry.sample.create")).toBe(true);
  expect(isAssistantActionType("entry.delete")).toBe(true);
  expect(isAssistantActionType("content-type.field.add")).toBe(true);
  expect(isAssistantActionType("content-type.delete")).toBe(true);
  expect(isAssistantActionType("custom-screen.delete")).toBe(true);
  expect(isAssistantActionType("custom-screen.update")).toBe(true);
  expect(isAssistantActionType("custom-screen.section.add")).toBe(true);
  expect(isAssistantActionType("custom-screen.block.add")).toBe(true);
  expect(isAssistantActionType("custom-screen.block.patch")).toBe(true);
  expect(isAssistantActionType("custom-screen.block.move")).toBe(true);
  expect(isAssistantActionType("custom-screen.block.remove")).toBe(true);
  expect(isAssistantActionType("custom-screen.binding.set")).toBe(true);
  expect(isAssistantActionType("custom-screen.list-view.patch")).toBe(true);
  expect(isAssistantActionType("custom-screen.widget.patch")).toBe(false);
  expect(isAssistantActionType("menu.item.upsert")).toBe(true);
  expect(isAssistantActionType("menu.item.delete")).toBe(true);
  expect(isAssistantActionType("seo.document.upsert")).toBe(true);
  expect(isAssistantActionType("seo.document.delete")).toBe(true);
  expect(isAssistantActionType("seo.document.update")).toBe(true);
  expect(isAssistantActionType("media.reference.attach")).toBe(true);
  expect(isAssistantActionType("listing-query.delete")).toBe(true);
  expect(isAssistantActionType("listing-query.update")).toBe(true);
  expect(isAssistantActionType("listing-query.filters.patch")).toBe(true);
  expect(isAssistantActionType("listing-template.delete")).toBe(true);
  expect(isAssistantActionType("listing-template.update")).toBe(true);
  expect(isAssistantActionType("listing-template.card.patch")).toBe(true);
  expect(isAssistantActionType("form.delete")).toBe(true);
  expect(isAssistantActionType("form.archive")).toBe(true);
  expect(isAssistantActionType("form.update")).toBe(true);
  expect(isAssistantActionType("entry.update")).toBe(true);
  expect(isAssistantActionType("menu.upsert")).toBe(true);
  expect(isAssistantActionType("menu.item.update")).toBe(true);
  expect(isAssistantActionType("page.widget.patch")).toBe(false);
  expect(isAssistantActionType("form.automation.upsert")).toBe(true);
  expect(isAssistantActionType("page.update")).toBe(true);
  expect(isAssistantActionType("page.delete")).toBe(true);
  expect(isAssistantActionType("detail-page.upsert")).toBe(true);
  expect(isAssistantActionType("database.drop")).toBe(false);
  expect(getAssistantActionHandler(registry, "site-kit.install").label).toBe("site-kit.install");
});
