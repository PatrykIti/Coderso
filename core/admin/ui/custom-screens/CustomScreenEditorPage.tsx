import { useMemo } from "react";

import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { CustomScreenEditorRouteSession } from "./CustomScreenEditorRouteSession";
import { buildCustomScreenEditorRouteKey } from "./customScreenEditorModel";
import { resolveCustomScreenId } from "./routeParams";

export {
  advanceBuilderDraftGeneration,
  detectScreenBindingOrphans,
  getBuilderExternalRevisionSaveError,
  runBuilderManualRefresh,
  uniqueFieldNames,
} from "./customScreenEditorModel";

export function CustomScreenEditorPage() {
  const { path } = useAdminRouter();
  const screenId = useMemo(() => resolveCustomScreenId(path), [path]);
  const isCreateMode = !screenId || screenId === "new";
  const routeKey = buildCustomScreenEditorRouteKey({ screenId, isCreateMode });

  return (
    <CustomScreenEditorRouteSession
      key={routeKey}
      routeKey={routeKey}
      screenId={screenId}
      isCreateMode={isCreateMode}
    />
  );
}
