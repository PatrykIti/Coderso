import { RotateCcw, Save } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { EntryDataValue } from "@/services/entriesClient";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { CanvasEditor } from "@/ui/shared/CanvasEditor";
import { PageHeader } from "@/ui/shared/PageHeader";
import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import type { ScreenEntryPresentationOverrideDraft } from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import type { RelatedEntrySummary } from "../../../services/customScreens/relatedEntryResolver";
import type { ScreenEntryPreferences } from "../../../services/settings/screenEntryPreferencesContract";
import type { ContentField } from "../content-types/SchemaBuilder";

import { CustomScreenEntryCanvas } from "./CustomScreenEntryCanvas";
import {
  CustomScreenEntryPresentationPanel,
  type CustomScreenEntryPresentationPanelProps,
} from "./CustomScreenEntryPresentationPanel";
import { CustomScreenPreview } from "./CustomScreenPreview";

type RelatedStatus = {
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  retry: () => void;
};
type MediaStatus = {
  urlsById: Readonly<Record<string, string>>;
  error: string | null;
  errorKind: "load" | "overflow" | null;
  loading: boolean;
  refreshing: boolean;
};

type ScreenBreadcrumbRecord = Readonly<{
  name: string;
}>;

type EntryBreadcrumbRecord = Readonly<{
  status: string;
  title: string;
}>;

export type CustomScreenEntryEditorLayoutProps = {
  dirtyNavigationDialog: ReactNode;
  screenRecordsHref: string;
  screen: ScreenBreadcrumbRecord | null;
  entry: EntryBreadcrumbRecord | null;
  isCreateMode: boolean;
  canEditInScreen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;
  presentationError: string | null;
  presentationErrorKind: "load" | "save" | null;
  remoteUpdatePending: boolean;
  remotePresentationUpdatePending: boolean;
  currentSaveNotice: string | null;
  currentPresentationSaveNotice: string | null;
  relatedStatus: RelatedStatus;
  mediaStatus: MediaStatus;
  presentationLoading: boolean;
  onSave: () => void;
  onRefresh: () => void;
  onReloadPresentation: () => void;
  onRetryMedia: () => void;
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  canvasFieldValues: Record<string, unknown>;
  previewData: Record<string, unknown>;
  fieldErrors: Record<string, string>;
  fields: ContentField[];
  relationTargets: Array<{ slug: string; name: string }>;
  relatedEntries: Record<string, RelatedEntrySummary[]>;
  presentationOverrides: ScreenEntryPresentationOverrideDraft[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onFieldChange: (name: string, value: EntryDataValue) => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  preferences: ScreenEntryPreferences;
  onPreferencesChange: (preferences: ScreenEntryPreferences) => void;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  presentationPanel: CustomScreenEntryPresentationPanelProps | null;
};

export function CustomScreenEntryEditorLayout(props: CustomScreenEntryEditorLayoutProps) {
  const {
    dirtyNavigationDialog,
    screenRecordsHref,
    screen,
    entry,
    isCreateMode,
    canEditInScreen,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    error,
    presentationError,
    presentationErrorKind,
    remoteUpdatePending,
    remotePresentationUpdatePending,
    currentSaveNotice,
    currentPresentationSaveNotice,
    relatedStatus,
    mediaStatus,
    presentationLoading,
    onSave,
    onRefresh,
    onReloadPresentation,
    onRetryMedia,
    document,
    bindings,
    canvasFieldValues,
    previewData,
    fieldErrors,
    fields,
    relationTargets,
    relatedEntries,
    presentationOverrides,
    selectedBlockId,
    onSelectBlock,
    onFieldChange,
    onTitleChange,
    onSlugChange,
    preferences,
    onPreferencesChange,
    panelOpen,
    onPanelOpenChange,
    presentationPanel,
  } = props;

  const panel = presentationPanel ? (
    <CustomScreenEntryPresentationPanel {...presentationPanel} />
  ) : null;

  return (
    <>
      {dirtyNavigationDialog}
      <EditorShell
        activeHref={screenRecordsHref}
        breadcrumbs={
          screen?.name
            ? [
                "Coderso",
                "Screens",
                screen.name,
                isCreateMode ? "New record" : entry?.title?.trim() ? entry.title : "Record",
              ]
            : [
                "Coderso",
                "Screens",
                isCreateMode ? "New record" : entry?.title?.trim() ? entry.title : "Record",
              ]
        }
        topbarActions={
          <div className="flex items-center gap-2">
            {entry ? (
              <Badge
                variant={entry.status === "published" ? "default" : "outline"}
                className="ml-1 text-[10px] uppercase"
              >
                {entry.status}
              </Badge>
            ) : null}
            {hasUnsavedChanges ? (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">
                Unsaved changes
              </span>
            ) : null}
            {screen && canEditInScreen && !isLoading ? (
              <Button size="sm" className="gap-2" onClick={onSave} disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            ) : null}
          </div>
        }
        variant="canvas"
      >
        {error ||
        presentationError ||
        remoteUpdatePending ||
        remotePresentationUpdatePending ||
        currentSaveNotice ||
        currentPresentationSaveNotice ||
        relatedStatus.error ||
        mediaStatus.error ||
        (screen !== null && !canEditInScreen) ? (
          <div className="shrink-0 space-y-3 px-6 pt-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Custom screen record error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {presentationError ? (
              <Alert
                variant="destructive"
                data-custom-screen-presentation-error={presentationErrorKind ?? "unknown"}
              >
                <AlertTitle>Presentation error</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{presentationError}</span>
                  {presentationErrorKind === "load" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onReloadPresentation}
                      disabled={presentationLoading}
                    >
                      Retry presentation load
                    </Button>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
            {remoteUpdatePending ? (
              <Alert>
                <AlertTitle>Updated in another tab</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>New changes are available. Refresh to load the latest version.</span>
                  <Button variant="outline" size="sm" onClick={onRefresh}>
                    Refresh
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {remotePresentationUpdatePending ? (
              <Alert>
                <AlertTitle>Presentation updated elsewhere</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>New presentation changes are available for this record.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={onReloadPresentation}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reload presentation
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {currentSaveNotice ? (
              <Alert>
                <AlertTitle>Record saved</AlertTitle>
                <AlertDescription>{currentSaveNotice}</AlertDescription>
              </Alert>
            ) : null}
            {currentPresentationSaveNotice ? (
              <Alert>
                <AlertTitle>Presentation saved</AlertTitle>
                <AlertDescription>{currentPresentationSaveNotice}</AlertDescription>
              </Alert>
            ) : null}
            {relatedStatus.error && !relatedStatus.loading && !relatedStatus.refreshing ? (
              <Alert variant="destructive">
                <AlertTitle>Related records unavailable</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{relatedStatus.error}</span>
                  <Button type="button" variant="outline" size="sm" onClick={relatedStatus.retry}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {mediaStatus.error && !mediaStatus.loading && !mediaStatus.refreshing ? (
              <Alert
                variant="destructive"
                data-custom-screen-media-error={mediaStatus.errorKind ?? "unknown"}
              >
                <AlertTitle>Presentation image unavailable</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{mediaStatus.error}</span>
                  {mediaStatus.errorKind === "load" ? (
                    <Button type="button" variant="outline" size="sm" onClick={onRetryMedia}>
                      Retry
                    </Button>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
            {screen !== null && !canEditInScreen ? (
              <Alert>
                <AlertTitle>Workspace upgrade required</AlertTitle>
                <AlertDescription>
                  This screen is not yet ready for the dedicated editor workflow. Add writable
                  bindings in the builder before using this route as the active screen-owned editor.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mx-6 mb-6 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground shadow-card">
            Loading custom screen record...
          </div>
        ) : screen && canEditInScreen ? (
          <div className="flex min-h-0 flex-1 flex-col" data-custom-screen-entry-document="true">
            <CanvasEditor
              header={
                <PageHeader
                  className="mb-0 shrink-0 px-6 pb-3 pt-4"
                  title={entry?.title?.trim() || (isCreateMode ? "New record" : "Record")}
                  description="The canvas is the active editing surface for this record."
                />
              }
              title="Entry content"
              badge={
                hasUnsavedChanges ? (
                  <Badge variant="warning" className="text-[10px] font-semibold uppercase">
                    Unsaved
                  </Badge>
                ) : null
              }
              toolbar={
                <label
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
                  data-screen-entry-metadata-toggle="true"
                >
                  <span>Field metadata</span>
                  <Switch
                    size="sm"
                    checked={preferences.showFieldMetadata}
                    onCheckedChange={(checked) =>
                      onPreferencesChange({ ...preferences, showFieldMetadata: checked })
                    }
                    aria-label="Show field metadata"
                  />
                </label>
              }
              panelPosition="bottom"
              panel={panel}
              panelOpen={panelOpen}
              onPanelOpenChange={onPanelOpenChange}
              panelAriaLabel="Record presentation"
              panelDataProps={{ "data-screen-editor-panel": "true" }}
              canvas={
                <div
                  className="min-h-0 flex-1 overflow-auto overscroll-contain p-6 lg:p-8"
                  data-screen-editor-canvas-scroller="true"
                  style={panelOpen && panel ? { paddingBottom: 260 } : undefined}
                  onClick={() => onSelectBlock(null)}
                >
                  <div className="mx-auto w-full max-w-3xl">
                    <CustomScreenEntryCanvas
                      document={document}
                      bindings={bindings}
                      fieldValues={canvasFieldValues}
                      fieldErrors={fieldErrors}
                      fields={fields}
                      relationTargets={relationTargets}
                      relatedEntries={relatedEntries}
                      onFieldChange={onFieldChange}
                      onTitleChange={onTitleChange}
                      onSlugChange={onSlugChange}
                      presentationOverrides={presentationOverrides}
                      presentationMediaUrlsById={mediaStatus.urlsById}
                      selectedBlockId={selectedBlockId}
                      onSelectBlock={onSelectBlock}
                      showFieldMetadata={preferences.showFieldMetadata}
                    />
                  </div>
                </div>
              }
            />
          </div>
        ) : screen ? (
          <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
            <div className="mx-auto max-w-5xl">
              <CustomScreenPreview
                document={document}
                bindings={bindings}
                data={previewData}
                fields={fields}
                relatedEntries={relatedEntries}
                presentationOverrides={presentationOverrides}
                presentationMediaUrlsById={mediaStatus.urlsById}
                emptyTitle="Editor upgrade required"
                emptyMessage="Add writable screen blocks and bindings in the builder before using this route as the dedicated record editor."
              />
            </div>
          </div>
        ) : (
          <div className="mx-6 mb-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
            Screen record unavailable.
          </div>
        )}
      </EditorShell>
    </>
  );
}
