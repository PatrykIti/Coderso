import { useSyncExternalStore } from "react";

import type { AssistantActiveSurfaceContext } from "../../../services/assistant/actionPlanTypes";

let activeSurfaceContext: AssistantActiveSurfaceContext | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export const getActiveAssistantSurfaceContext = () => activeSurfaceContext;

export const setActiveAssistantSurfaceContext = (
  next: AssistantActiveSurfaceContext | null
) => {
  activeSurfaceContext = next;
  emit();
};

export const clearActiveAssistantSurfaceContext = () => {
  if (!activeSurfaceContext) return;
  activeSurfaceContext = null;
  emit();
};

export const subscribeActiveAssistantSurfaceContext = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useActiveAssistantSurfaceContext = () =>
  useSyncExternalStore(
    subscribeActiveAssistantSurfaceContext,
    getActiveAssistantSurfaceContext,
    getActiveAssistantSurfaceContext
  );
