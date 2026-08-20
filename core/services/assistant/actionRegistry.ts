import type { AssistantExecutableActionType, AssistantPlannedAction } from "./actionPlanTypes";

export const assistantActionTypes = [
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
] as const satisfies AssistantExecutableActionType[];

export type AssistantActionType = (typeof assistantActionTypes)[number];
export type AssistantActionHandlerMap<THandler> = Record<AssistantActionType, THandler>;

const actionTypeSet = new Set<string>(assistantActionTypes);

export const isAssistantActionType = (value: unknown): value is AssistantActionType =>
  typeof value === "string" && actionTypeSet.has(value);

export function createAssistantActionRegistry<THandler>(
  handlers: Partial<Record<AssistantActionType, THandler>>
): AssistantActionHandlerMap<THandler> {
  for (const key of Object.keys(handlers)) {
    if (!isAssistantActionType(key)) {
      throw new Error("assistant_action_registry_unknown_type");
    }
  }

  for (const type of assistantActionTypes) {
    if (!handlers[type]) {
      throw new Error("assistant_action_registry_missing_type");
    }
  }

  return handlers as AssistantActionHandlerMap<THandler>;
}

export function getAssistantActionHandler<THandler>(
  registry: AssistantActionHandlerMap<THandler>,
  type: AssistantPlannedAction["type"]
): THandler {
  const handler = registry[type];
  if (!handler) {
    throw new Error("assistant_action_unsupported");
  }
  return handler;
}
