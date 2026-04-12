import type {
  AssistantExecutableActionType,
  AssistantPlannedAction,
} from "./actionPlanTypes";

export const assistantActionTypes = [
  "setting.content-route.upsert",
  "content-type.upsert",
  "custom-screen.upsert",
  "listing-query.upsert",
  "listing-template.upsert",
  "form.upsert",
  "page.upsert",
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
