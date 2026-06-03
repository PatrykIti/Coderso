import { useLayoutEffect, useRef, type ReactNode } from "react";

import { bindFaqAccordionDisclosureRoots } from "../../../../widgets/core/faqAccordion";

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
    return bindFaqAccordionDisclosureRoots(root);
  });

  return (
    <div ref={rootRef} className="contents" data-admin-widget-preview-runtime-bridge="true">
      {children}
    </div>
  );
}
