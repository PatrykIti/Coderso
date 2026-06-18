import { useCallback, useEffect, useMemo, useState } from "react";

import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { useOptionalAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { resolveAdminHref } from "@/utils/adminPaths";

export const normalizeAdminHrefForComparison = (href: string) => {
  const withoutHash = href.split("#")[0] ?? href;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
};

export function useAdminDirtyNavigationGuard(options: {
  blocked: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirmDiscard?: () => void;
}) {
  const { blocked, cancelLabel, confirmLabel, description, onConfirmDiscard, title } = options;
  const adminBasePath = useAdminBasePath();
  const router = useOptionalAdminRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const isCurrentHref = useCallback(
    (href: string) => {
      if (!router) return false;
      const resolvedHref = resolveAdminHref(adminBasePath, href);
      return (
        normalizeAdminHrefForComparison(resolvedHref) ===
        normalizeAdminHrefForComparison(router.path)
      );
    },
    [adminBasePath, router]
  );

  const requestNavigation = useCallback(
    (href: string) => {
      if (!router) return true;
      if (!blocked || isCurrentHref(href)) return true;
      setPendingHref(href);
      return false;
    },
    [blocked, isCurrentHref, router]
  );

  useEffect(() => {
    if (!router) return undefined;
    return router.registerBlocker(requestNavigation);
  }, [requestNavigation, router]);

  useEffect(() => {
    if (!blocked || typeof window === "undefined") return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [blocked]);

  const handleConfirmNavigation = useCallback(() => {
    const href = pendingHref;
    onConfirmDiscard?.();
    setPendingHref(null);
    if (href && router) router.navigate(href, { skipBlockers: true });
  }, [onConfirmDiscard, pendingHref, router]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setPendingHref(null);
  }, []);

  const dialog = useMemo(
    () => (
      <ConfirmActionDialog
        open={Boolean(pendingHref)}
        onOpenChange={handleOpenChange}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel ?? "Cancel"}
        tone="warning"
        onConfirm={handleConfirmNavigation}
      />
    ),
    [
      handleConfirmNavigation,
      handleOpenChange,
      cancelLabel,
      confirmLabel,
      description,
      pendingHref,
      title,
    ]
  );

  return {
    requestNavigation,
    dialog,
  };
}
