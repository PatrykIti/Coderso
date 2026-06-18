import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";

type SettingsDirtyStore = {
  getSnapshot: () => boolean;
  subscribe: (listener: () => void) => () => void;
  setDirty: (id: string, dirty: boolean) => void;
  clear: () => void;
};

type SettingsDirtyNavigationContextValue = {
  store: SettingsDirtyStore;
  isDirty: boolean;
  requestNavigation: (href: string) => boolean;
};

const SettingsDirtyNavigationContext = createContext<SettingsDirtyNavigationContextValue | null>(
  null
);

const createSettingsDirtyStore = (): SettingsDirtyStore => {
  const dirtyIds = new Set<string>();
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => dirtyIds.size > 0,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setDirty: (id, dirty) => {
      const wasDirty = dirtyIds.has(id);
      if (dirty) {
        dirtyIds.add(id);
      } else {
        dirtyIds.delete(id);
      }
      if (wasDirty !== dirtyIds.has(id)) emit();
    },
    clear: () => {
      if (dirtyIds.size === 0) return;
      dirtyIds.clear();
      emit();
    },
  };
};

const settingsDirtyStore = createSettingsDirtyStore();

export function SettingsDirtyNavigationProvider({ children }: { children: ReactNode }) {
  const store = settingsDirtyStore;
  const isDirty = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { requestNavigation, dialog } = useAdminDirtyNavigationGuard({
    blocked: isDirty,
    title: "Discard unsaved settings?",
    description:
      "This settings screen has unsaved changes. Cancel to keep editing, or discard them and continue.",
    confirmLabel: "Discard changes",
    cancelLabel: "Keep editing",
    onConfirmDiscard: () => store.clear(),
  });

  useEffect(() => () => store.clear(), [store]);

  const value = useMemo(
    () => ({
      store,
      isDirty,
      requestNavigation,
    }),
    [isDirty, requestNavigation, store]
  );

  return (
    <SettingsDirtyNavigationContext.Provider value={value}>
      {children}
      {dialog}
    </SettingsDirtyNavigationContext.Provider>
  );
}

export function useSettingsDirtyNavigation() {
  const context = useContext(SettingsDirtyNavigationContext);
  return useMemo(
    () => ({
      isDirty: context?.isDirty ?? false,
      requestNavigation: context?.requestNavigation ?? (() => true),
    }),
    [context]
  );
}

export function useRegisterSettingsDirty(isDirty: boolean) {
  const context = useContext(SettingsDirtyNavigationContext);
  const store = context?.store ?? settingsDirtyStore;
  const id = useId();

  useEffect(() => {
    store.setDirty(id, isDirty);
    return () => store.setDirty(id, false);
  }, [id, isDirty, store]);
}
