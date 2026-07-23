import { useMemo } from "react";

import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

import { CustomScreenEntryRouteSession } from "./CustomScreenEntryRouteSession";
import { buildEntryRouteKey } from "./customScreenEntryPresentationMedia";
import { resolveCustomScreenEntryParams } from "./routeParams";

export {
  filterRenderableScreenEntryPresentationOverrides,
  isDraftAuthorityClean,
  resolvePresentationDraftTransition,
} from "./customScreenEntryPresentation";
export {
  PRESENTATION_MEDIA_LOAD_ERROR,
  allocateMediaAttempt,
  buildEntryRouteKey,
  buildPresentationMediaRequestKey,
  collectWinningDirectImageAssetIds,
  decodeAndValidatePresentationMediaRequestKey,
  initializeMediaMachineState,
  mediaAttemptReducer,
  projectExactRequestedMediaUrls,
  readRequestedIdsFromMediaRequestKey,
} from "./customScreenEntryPresentationMedia";
export type {
  MediaAttempt,
  MediaAttemptAction,
  MediaAttemptCause,
  MediaAttemptInput,
  MediaMachineState,
} from "./customScreenEntryPresentationMedia";

export function CustomScreenEntryEditor() {
  const { path } = useAdminRouter();
  const { screenId, entryId } = useMemo(() => resolveCustomScreenEntryParams(path), [path]);
  const isCreateMode = entryId === "new";
  const routeKey = buildEntryRouteKey({ screenId, entryId, isCreateMode });

  return (
    <CustomScreenEntryRouteSession
      key={routeKey}
      screenId={screenId}
      entryId={entryId}
      isCreateMode={isCreateMode}
      routeKey={routeKey}
    />
  );
}
