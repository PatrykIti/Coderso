import { useLayoutEffect, useRef, type ReactNode } from "react";

import { bindFaqAccordionDisclosureRoots } from "../../../../widgets/core/faqAccordion";
import { bindNavigationRuntimeRoots } from "../../../../widgets/core/navigation";

const resolvePreviewScrollTarget = (root: HTMLElement): HTMLElement | null => {
  const scroller = root.closest("[data-page-editor-canvas-scroller='true']");
  return scroller instanceof HTMLElement ? scroller : null;
};

export function AdminWidgetPreviewRuntimeBridge({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") {
    return <>{children}</>;
  }

  return <AdminWidgetPreviewRuntimeBridgeClient>{children}</AdminWidgetPreviewRuntimeBridgeClient>;
}

function AdminWidgetPreviewRuntimeBridgeClient({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const cleanups = [
      bindFaqAccordionDisclosureRoots(root),
      bindNavigationRuntimeRoots(root, { scrollTarget: resolvePreviewScrollTarget(root) }),
    ];
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  });

  return (
    <div ref={rootRef} className="contents" data-admin-widget-preview-runtime-bridge="true">
      {children}
    </div>
  );
}
