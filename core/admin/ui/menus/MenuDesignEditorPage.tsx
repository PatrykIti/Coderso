import { useState } from "react";

import { MenuDesignEditor } from "./MenuDesignEditor";
import { resolveMenuId } from "./routeParams";

/**
 * `/menus/:id/design` host (TASK-499-03). Retired the legacy PageEditor menu
 * host (dark bottom-panel chrome + the fixed appearance+extras adapter): the
 * Design tab now renders a THIN `MenuDesignEditor` over the shared
 * `CanvasEditor` builder shell, editing `menuDocumentV2` directly. The route
 * shares the `/menus/:id` id segment, so the structure editor's param resolver
 * applies unchanged.
 */

const resolveDesignMenuId = (pathname: string) => resolveMenuId(pathname);

function MissingMenuState() {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      This menu could not be resolved from the current route.
    </div>
  );
}

export function MenuDesignEditorPage({ menuId }: { menuId?: string }) {
  const [resolvedMenuId] = useState<string | null>(() => {
    if (menuId) return menuId;
    if (typeof window === "undefined") return null;
    return resolveDesignMenuId(window.location.pathname);
  });

  return resolvedMenuId ? (
    <MenuDesignEditor key={resolvedMenuId} menuId={resolvedMenuId} />
  ) : (
    <MissingMenuState />
  );
}
