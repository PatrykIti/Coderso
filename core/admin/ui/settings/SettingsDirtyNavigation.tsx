import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { resolveAdminHref } from "@/utils/adminPaths";

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

const normalizeComparableHref = (href: string) => {
  const withoutHash = href.split("#")[0] ?? href;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
};

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
  const adminBasePath = useAdminBasePath();
  const { path, navigate, registerBlocker } = useAdminRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isDirty || typeof window === "undefined") return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => () => store.clear(), [store]);

  const isCurrentHref = useCallback(
    (href: string) => {
      const resolvedHref = resolveAdminHref(adminBasePath, href);
      return normalizeComparableHref(resolvedHref) === normalizeComparableHref(path);
    },
    [adminBasePath, path]
  );

  const requestNavigation = useCallback(
    (href: string) => {
      if (!isDirty || isCurrentHref(href)) return true;
      setPendingHref(href);
      setConfirmOpen(true);
      return false;
    },
    [isCurrentHref, isDirty]
  );

  const handleConfirmNavigation = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    setConfirmOpen(false);
    store.clear();
    if (href) navigate(href, { skipBlockers: true });
  }, [navigate, pendingHref, store]);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    setConfirmOpen(open);
    if (!open) setPendingHref(null);
  }, []);

  useEffect(() => registerBlocker(requestNavigation), [registerBlocker, requestNavigation]);

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
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        title="Discard unsaved settings?"
        description="This settings screen has unsaved changes. Cancel to keep editing, or discard them and continue."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={handleConfirmNavigation}
      />
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
