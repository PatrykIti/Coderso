import { Eye, Save, SlidersHorizontal } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { PageHeader } from "@/ui/shared/PageHeader";
import { CustomScreenShell } from "./CustomScreenShell";
import { CustomScreenWorkspacePreviewDialog } from "./CustomScreenWorkspacePreviewDialog";
import { ScreenAuthoringCanvas } from "./ScreenAuthoringCanvas";
import {
  CustomScreenBindingOrphanAlert,
  CustomScreenEditorSettingsPanel,
  type CustomScreenEditorSettingsPanelProps,
  type ScreenBindingOrphanPresentation,
} from "./CustomScreenEditorSettingsPanel";

type CanvasProps = ComponentProps<typeof ScreenAuthoringCanvas>;
type PreviewDialogProps = ComponentProps<typeof CustomScreenWorkspacePreviewDialog>;

type EditorCanvasProps = Omit<
  CanvasProps,
  | "values"
  | "header"
  | "panelToggle"
  | "reopenAffordance"
  | "previewNotice"
  | "settingsPanel"
  | "panelOpen"
  | "onPanelOpenChange"
>;

type EditorHeaderState = {
  name: string;
  status: "draft" | "active";
  hasUnsavedChanges: boolean;
  isCreateMode: boolean;
  routeReady: boolean;
  isLoading: boolean;
  isSaving: boolean;
  externalRevisionUnresolved: boolean;
};

type EditorHeaderActions = {
  onPreviewOpen: () => void;
  onSave: () => void;
};

type EditorAlertState = {
  error: string | null;
  saveNotice: string | null;
  externalUpdatePending: boolean;
  orphanBindings: ScreenBindingOrphanPresentation;
};

type EditorAlertActions = {
  onExternalRefresh: () => void;
};

type EditorPanelState = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditorPreviewState = {
  open: boolean;
  contentType: PreviewDialogProps["contentType"];
  listView: PreviewDialogProps["listView"];
  recordState: PreviewDialogProps["previewRecordState"];
  loading: boolean;
  notice: ReactNode;
  onOpenChange: (open: boolean) => void;
};

type ExternalRefreshDialogState = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export type CustomScreenEditorLayoutProps = {
  header: EditorHeaderState;
  headerActions: EditorHeaderActions;
  alerts: EditorAlertState;
  alertActions: EditorAlertActions;
  settings: CustomScreenEditorSettingsPanelProps;
  canvas: EditorCanvasProps;
  panel: EditorPanelState;
  preview: EditorPreviewState;
  externalRefreshDialog: ExternalRefreshDialogState;
  dirtyNavigationDialog: ReactNode;
};

export function CustomScreenEditorLayout({
  header,
  headerActions,
  alerts,
  alertActions,
  settings,
  canvas,
  panel,
  preview,
  externalRefreshDialog,
  dirtyNavigationDialog,
}: CustomScreenEditorLayoutProps) {
  const screenPageHeader = (
    <PageHeader
      className="mb-0 shrink-0 px-6 pb-3 pt-4"
      title={header.name || (header.isCreateMode ? "New screen" : "Untitled")}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={headerActions.onPreviewOpen}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={headerActions.onSave}
            disabled={
              !header.routeReady ||
              header.isLoading ||
              header.isSaving ||
              header.externalRevisionUnresolved
            }
          >
            <Save className="h-4 w-4" />
            {header.isSaving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    />
  );

  const screenPanelToggle = (
    <Button
      type="button"
      variant={panel.open ? "soft" : "ghost"}
      size="sm"
      onClick={() => panel.onOpenChange(!panel.open)}
      aria-label={panel.open ? "Hide panel" : "Show panel"}
      aria-pressed={panel.open}
    >
      <SlidersHorizontal className="h-4 w-4" />
      {panel.open ? "Hide panel" : "Show panel"}
    </Button>
  );

  const screenReopen = (
    <button
      type="button"
      onClick={() => panel.onOpenChange(true)}
      aria-label="Show panel"
      className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary"
    >
      <SlidersHorizontal className="size-3.5" /> Show panel
    </button>
  );

  const hasAlerts =
    Boolean(alerts.error) ||
    alerts.externalUpdatePending ||
    alerts.orphanBindings.count > 0 ||
    Boolean(alerts.saveNotice);

  return (
    <>
      <CustomScreenShell
        variant="canvas"
        name={header.name}
        status={header.status}
        hasUnsavedChanges={header.hasUnsavedChanges}
        isCreateMode={header.isCreateMode}
      >
        {hasAlerts ? (
          <div className="shrink-0 space-y-3 px-6 pt-4">
            {alerts.error ? (
              <Alert variant="destructive">
                <AlertTitle>Custom screen error</AlertTitle>
                <AlertDescription>{alerts.error}</AlertDescription>
              </Alert>
            ) : null}
            <CustomScreenBindingOrphanAlert {...alerts.orphanBindings} />
            {alerts.saveNotice ? (
              <Alert data-screen-save-notice="true">
                <AlertTitle>Binding cleanup</AlertTitle>
                <AlertDescription>{alerts.saveNotice}</AlertDescription>
              </Alert>
            ) : null}
            {alerts.externalUpdatePending ? (
              <Alert>
                <AlertTitle>Newer changes are available</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    This Screen changed outside this editor. Refresh to load the latest version.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={header.isSaving}
                    onClick={alertActions.onExternalRefresh}
                  >
                    Refresh
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {header.isLoading ? (
          <div className="mx-6 mb-6 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground shadow-card">
            Loading custom screen...
          </div>
        ) : header.routeReady ? (
          <ScreenAuthoringCanvas
            {...canvas}
            values={preview.recordState.data}
            header={screenPageHeader}
            panelToggle={screenPanelToggle}
            reopenAffordance={screenReopen}
            panelOpen={panel.open}
            onPanelOpenChange={panel.onOpenChange}
            previewNotice={preview.notice}
            settingsPanel={<CustomScreenEditorSettingsPanel {...settings} />}
          />
        ) : null}
      </CustomScreenShell>

      {header.routeReady ? (
        <CustomScreenWorkspacePreviewDialog
          open={preview.open}
          onOpenChange={preview.onOpenChange}
          mode="editor-view"
          contentType={preview.contentType}
          listView={preview.listView}
          document={canvas.document}
          bindings={canvas.bindings}
          fields={canvas.fields}
          previewRecordState={preview.recordState}
          previewLoading={preview.loading}
        />
      ) : null}

      <ConfirmActionDialog
        open={externalRefreshDialog.open}
        onOpenChange={externalRefreshDialog.onOpenChange}
        title="Discard local Screen changes and refresh?"
        description="Your unsaved Screen changes will be discarded before loading the newer version."
        confirmLabel="Discard and refresh"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={externalRefreshDialog.onConfirm}
      />
      {dirtyNavigationDialog}
    </>
  );
}
