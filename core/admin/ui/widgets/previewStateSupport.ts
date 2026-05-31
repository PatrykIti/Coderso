import type { WidgetDefinition, WidgetPreviewState } from "../../../widgets/types";

type PreviewCapableWidget = Pick<WidgetDefinition, "editorCapabilities"> | null | undefined;

export function widgetSupportsPreviewState(widget: PreviewCapableWidget) {
  return widget?.editorCapabilities?.supportsPreviewState === true;
}

export function buildActiveWidgetPreviewStates(
  selectedBlockId: string | null | undefined,
  widget: PreviewCapableWidget,
  widgetPreviewStates: Record<string, WidgetPreviewState | undefined>
) {
  if (!selectedBlockId || !widgetSupportsPreviewState(widget)) {
    return {} as Record<string, WidgetPreviewState | undefined>;
  }
  const previewState = widgetPreviewStates[selectedBlockId];
  return previewState
    ? { [selectedBlockId]: previewState }
    : ({} as Record<string, WidgetPreviewState | undefined>);
}
