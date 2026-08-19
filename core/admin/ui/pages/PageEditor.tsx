// TASK-481-02-L02 facade (Part A): the former PageEditor.tsx single-module
// surface, re-exported from the split editor/ modules without any behavior
// change. Consumers (PageTemplateEditorPage, tests) keep their exact imports.
// Single writer: TASK-481-02-L02.

export { PageEditor, PageSettingsSubpanel } from "./editor/PageEditorRoot";
export { findRecoverableAutosaveRevision } from "./editor/PageEditorToolbar";
export { resolveToolbarTargetLabel } from "./editor/PageEditorToolbar";
export type { PageEditorProps } from "./editor/usePageEditorController";
export type {
  PageEditorHost,
  PageEditorHostAppearancePanelProps,
  PageEditorHostCanvasChromeProps,
  PageEditorHostFreshnessMode,
  PageEditorHostLoadOptions,
  PageEditorHostPalette,
  PageEditorHostPreviewResponse,
  PageEditorHostPublishResult,
  PageEditorHostRevisions,
  PageEditorHostSettingsRenderProps,
} from "./editor/pageEditorHostContract";
