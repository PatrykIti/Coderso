// TASK-481-02-L02 facade split (Part A): page settings + chrome overlay
// surfaces. PageSettingsSubpanel, HistorySheet, the shared text/select input
// primitives, the section variant/supplemental/date-range fields, the
// responsive badge/shell chrome, and the editor overlays/alerts (command
// palette, confirm dialogs, preview, recovery alerts).
// Extracted verbatim from the former PageEditor.tsx body. Single writer:
// TASK-481-02-L02. No behavior change.

import { useState } from "react";
import type { ReactNode } from "react";
import { RotateCcw, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import type { PageRevision } from "@/services/pagesClient";
import {
  PAGE_SPOTLIGHT_SIZE_CLAMP,
  type PageBreakpoint,
  type PageEffectsV2,
  type PageSectionV2,
  type PageSectionVariant,
} from "../../../../services/pages/pageDocumentV2";
import {
  isPageSectionVariantOption,
  type PageEditorControlDefinition,
} from "../../../../services/pages/pageEditorControlRegistry";
import {
  resolvePageEditorControlUiModel,
  type PageEditorColorSwatch,
} from "../../../../services/pages/pageEditorControlUiModel";
import { hasResponsiveOverride } from "../../../../services/pages/pageEditorState";
import { toolbarActionTooltips } from "./pageEditorOptions";
import {
  ColorSwatchControl,
  SegmentedControl,
  SliderControl,
  ToggleSwitch,
} from "../editorControls";
import {
  EditorControlToneContext,
  editorControlFocusClassFor,
  editorControlLabelClassFor,
  editorGhostButtonClassFor,
  editorPanelInputClass,
  editorPanelOptionActiveClass,
  editorPanelSelectClass,
  useEditorControlTone,
} from "../editorControls/controlChrome";
import { ToolbarIconButton } from "./FloatingEditorToolbar";
import { PageEditorCommandPalette } from "./PageEditorCommandPalette";
import type { PageEditorController } from "./usePageEditorController";
import type { PageEditorToolbarActions } from "./PageEditorToolbar";

const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <input
      className="rounded border px-2 py-2 text-sm font-normal normal-case text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const NumberField = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <input
      className="rounded border px-2 py-2 text-sm font-normal text-foreground"
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
    {label}
    <select
      className="rounded border px-2 py-2 text-sm font-normal text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

/**
 * TASK-521-05-L01/L02 — compact page-settings panel in the side-inspector rail
 * (replaces the full-height `SettingsSheet` drawer the owner found poor). Reuses
 * the rail chrome (rounded card + header/close, `EditorControlToneContext`
 * "light" so the shared controls match the section/block panels). Carries EVERY
 * relocated field verbatim — Title, Slug (TextFields), Show-in-nav, Revision-
 * retention, plus the explicit `Save settings` button (title/slug persistence via
 * `handleSettingsSave` → `updatePage`) — and hosts the L02 Effects section wired
 * to the live document draft (`settings.effects`, persisted on every save/publish).
 */
export const ToolbarTextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const tone = useEditorControlTone();
  return (
    <label
      className={`grid gap-1 ${editorControlLabelClassFor(tone)}`}
      data-page-editor-control="text"
    >
      {label}
      <input
        className={`rounded-md px-2 py-1.5 text-sm font-normal normal-case tracking-normal ${
          tone === "light"
            ? editorPanelInputClass
            : "border border-white/15 bg-white/10 text-slate-100 placeholder:text-slate-500"
        } ${editorControlFocusClassFor(tone)}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
};

export const ToolbarSelectField = ({
  label,
  value,
  options,
  optionLabels,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  optionLabels?: Readonly<Record<string, string>>;
  onChange: (value: string) => void;
}) => {
  const tone = useEditorControlTone();
  return (
    <label
      className={`grid gap-1 ${editorControlLabelClassFor(tone)}`}
      data-page-editor-control="select"
    >
      {label}
      <select
        className={`rounded-md px-2 py-1.5 text-sm font-normal normal-case tracking-normal ${
          tone === "light"
            ? editorPanelSelectClass
            : "border border-white/15 bg-white/10 text-slate-100"
        } ${editorControlFocusClassFor(tone)}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
};

export const SectionVariantControlField = ({
  section,
  control,
  onChange,
}: {
  section: PageSectionV2;
  control: PageEditorControlDefinition;
  onChange: (variant: PageSectionVariant) => void;
}) => {
  const options = control.options ?? [];
  const fallback = options[0] ?? "default";
  const value = options.includes(section.variant) ? section.variant : fallback;
  const model = resolvePageEditorControlUiModel(control);
  const handleChange = (nextValue: string) => {
    if (isPageSectionVariantOption(section.type, nextValue)) {
      onChange(nextValue);
    }
  };
  return (
    <div className="grid min-w-0 gap-1" data-page-editor-section-variant-control="base">
      {model.kind === "segmented" ? (
        <SegmentedControl
          label={control.label}
          value={value}
          options={model.options}
          optionLabels={model.labels}
          onChange={handleChange}
        />
      ) : (
        <ToolbarSelectField
          label={control.label}
          value={value}
          options={options}
          optionLabels={model.kind === "select" ? model.labels : undefined}
          onChange={handleChange}
        />
      )}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <ResponsiveStateBadge
          state="base"
          device="desktop"
          description="Base-only control. The section variant applies to every breakpoint."
        />
      </div>
    </div>
  );
};

export const SupplementalSectionField = ({
  label,
  value,
  device,
  override,
  onReset,
  onChange,
}: {
  label: string;
  value: string;
  device: PageBreakpoint;
  override: boolean;
  onReset: () => void;
  onChange: (value: string) => void;
}) => (
  <ResponsiveControlShell device={device} override={override} label={label} onReset={onReset}>
    <ToolbarTextField label={label} value={value} onChange={onChange} />
  </ResponsiveControlShell>
);

/**
 * Visibility date-range preset: a toggle gates the free-form date inputs so
 * the panel reads as "show in date range" instead of two raw text fields.
 * Dates are written through the existing visibility paths; turning the toggle
 * off clears both stored values.
 */
export const SectionDateRangeFields = ({
  section,
  device,
  sectionOverride,
  onClearOverride,
  onSectionVisibility,
}: {
  section: PageSectionV2;
  device: PageBreakpoint;
  sectionOverride: unknown;
  onClearOverride: (path: readonly string[]) => void;
  onSectionVisibility: (patch: Partial<PageSectionV2["visibility"]>) => void;
}) => {
  const hasStoredDates = Boolean(section.visibility.startsAt || section.visibility.endsAt);
  const [enabled, setEnabled] = useState(hasStoredDates);
  const open = enabled || hasStoredDates;
  return (
    <>
      <div className="flex items-end" data-page-editor-date-range-toggle={open ? "on" : "off"}>
        <ToggleSwitch
          label="Date range"
          value={open}
          onChange={(next) => {
            setEnabled(next);
            if (!next && hasStoredDates) {
              onSectionVisibility({ startsAt: null, endsAt: null });
            }
          }}
        />
      </div>
      {open ? (
        <>
          <SupplementalSectionField
            label="Starts at"
            value={section.visibility.startsAt ?? ""}
            device={device}
            override={hasResponsiveOverride(device, sectionOverride, ["visibility", "startsAt"])}
            onReset={() => onClearOverride(["visibility", "startsAt"])}
            onChange={(startsAt) => onSectionVisibility({ startsAt: startsAt.trim() || null })}
          />
          <SupplementalSectionField
            label="Ends at"
            value={section.visibility.endsAt ?? ""}
            device={device}
            override={hasResponsiveOverride(device, sectionOverride, ["visibility", "endsAt"])}
            onReset={() => onClearOverride(["visibility", "endsAt"])}
            onChange={(endsAt) => onSectionVisibility({ endsAt: endsAt.trim() || null })}
          />
        </>
      ) : null}
    </>
  );
};

export type ResponsiveBadgeState = "base" | "override" | "inherited";

const responsiveBadgeDescription = (state: ResponsiveBadgeState, device: PageBreakpoint) => {
  if (state === "base") {
    return "Base value. Desktop edits apply to every breakpoint without an override.";
  }
  if (state === "override") {
    return `Overridden on ${device}. This field no longer follows the desktop value.`;
  }
  return `Inherited from desktop. Editing on ${device} creates a ${device}-only override.`;
};

/**
 * Inline responsive-state badge with a hover/focus tooltip explaining the
 * Base / Override / Inherited cascade for the individual control.
 */
export const ResponsiveStateBadge = ({
  state,
  device,
  description,
}: {
  state: ResponsiveBadgeState;
  device: PageBreakpoint;
  description?: string;
}) => {
  const tone = useEditorControlTone();
  const isLight = tone === "light";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${editorControlFocusClassFor(
            tone
          )} ${
            state === "override"
              ? isLight
                ? editorPanelOptionActiveClass
                : "bg-sky-400/20 text-sky-200"
              : isLight
                ? "bg-muted text-muted-foreground"
                : "bg-white/10 text-slate-400"
          }`}
          data-page-editor-responsive-badge={state}
        >
          {state === "base" ? "Base" : state === "override" ? "Override" : "Inherited"}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
        {description ?? responsiveBadgeDescription(state, device)}
      </TooltipContent>
    </Tooltip>
  );
};

export const ResponsiveControlShell = ({
  device,
  override,
  label,
  onReset,
  children,
}: {
  device: PageBreakpoint;
  override: boolean;
  /** Control label used in the reset affordance accessible name. */
  label?: string;
  onReset: () => void;
  children: ReactNode;
}) => {
  const tone = useEditorControlTone();
  const state: ResponsiveBadgeState =
    device === "desktop" ? "base" : override ? "override" : "inherited";
  return (
    <div
      // `min-w-0` keeps wide controls (segmented strips) scrolling inside the
      // auto-fit panel grid cell instead of overlapping the neighbor column.
      className="grid min-w-0 gap-1"
      data-page-editor-responsive-field={override ? "override" : "inherited"}
    >
      {children}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <ResponsiveStateBadge state={state} device={device} />
        {device !== "desktop" && override ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label ? `Reset ${label} to inherited` : "Reset to inherited"}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${editorGhostButtonClassFor(
                  tone
                )} ${editorControlFocusClassFor(tone)}`}
                data-page-editor-responsive-reset={label ?? "field"}
                onClick={onReset}
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
              {`Remove the ${device} override and inherit the desktop value.`}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
};

export const PageSettingsSubpanel = ({
  onClose,
  title,
  slug,
  showInNav,
  revisionRetention,
  isSaving,
  onTitleChange,
  onSlugChange,
  onShowInNavChange,
  onRevisionRetentionChange,
  onSave,
  template,
  effects,
  onEffectsChange,
  background,
  onBackgroundChange,
  palette,
}: {
  onClose: () => void;
  title: string;
  slug: string;
  showInNav: boolean;
  revisionRetention: number;
  isSaving: boolean;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onShowInNavChange: (value: boolean) => void;
  onRevisionRetentionChange: (value: number) => void;
  onSave: () => void;
  template: string;
  effects: PageEffectsV2 | undefined;
  onEffectsChange: (patch: Partial<PageEffectsV2>) => void;
  background: string | undefined;
  onBackgroundChange: (value: string | null | undefined) => void;
  palette: readonly PageEditorColorSwatch[];
}) => (
  <EditorControlToneContext.Provider value="light">
    <div
      className="fixed right-4 top-24 z-40 w-80 max-w-[calc(100vw-2rem)]"
      data-page-editor-settings-panel="true"
      role="region"
      aria-label="Page settings"
    >
      <div className="flex max-h-[min(78vh,calc(100dvh-8rem))] flex-col overflow-hidden rounded-lg border border-border bg-popover text-foreground shadow-pop">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Page settings
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Metadata, publishing defaults & effects.
            </p>
          </div>
          <ToolbarIconButton tooltip={toolbarActionTooltips.closePanel} onClick={onClose}>
            <X className="h-4 w-4" />
          </ToolbarIconButton>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
          <TextField label="Title" value={title} onChange={onTitleChange} />
          <TextField label="Slug" value={slug} onChange={onSlugChange} />
          <SelectField
            label="Show in navigation"
            value={showInNav ? "yes" : "no"}
            options={["yes", "no"]}
            onChange={(value) => onShowInNavChange(value === "yes")}
          />
          <NumberField
            label="Revision retention"
            value={revisionRetention}
            min={1}
            max={100}
            onChange={onRevisionRetentionChange}
          />
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Template
            <span className="mt-1 block text-sm font-normal normal-case text-foreground">
              {template}
            </span>
          </p>
          <Button type="button" className="w-full" disabled={isSaving} onClick={onSave}>
            {isSaving ? "Saving..." : "Save settings"}
          </Button>
          {/* TASK-523-01-L03 — per-page canvas background (solid color; alpha-capable
              519 custom input). Writes settings.background on the live document draft;
              gradients stay model/import-only (ColorSwatchControl is color-only). */}
          <section
            aria-label="Design"
            className="space-y-3 border-t border-border pt-3"
            data-page-editor-design-section="true"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Design
            </p>
            <ColorSwatchControl
              label="Page background"
              value={background ?? ""}
              palette={palette}
              allowCustom
              allowTransparent
              onChange={(value) => onBackgroundChange(value ?? undefined)}
            />
          </section>
          <section
            aria-label="Effects"
            className="space-y-3 border-t border-border pt-3"
            data-page-editor-effects-section="true"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Effects
            </p>
            <ToggleSwitch
              label="Cursor spotlight"
              value={!!effects?.cursorSpotlight}
              onChange={(on) => onEffectsChange({ cursorSpotlight: on })}
            />
            {effects?.cursorSpotlight ? (
              <>
                <ColorSwatchControl
                  label="Spotlight color"
                  value={effects?.spotlightColor ?? "var(--primary)"}
                  palette={palette}
                  onChange={(color) => onEffectsChange({ spotlightColor: color ?? undefined })}
                />
                <SliderControl
                  label="Spotlight size"
                  min={PAGE_SPOTLIGHT_SIZE_CLAMP.min}
                  max={PAGE_SPOTLIGHT_SIZE_CLAMP.max}
                  step={20}
                  unit="px"
                  value={effects?.spotlightSize ?? 400}
                  onChange={(size) => onEffectsChange({ spotlightSize: size })}
                />
              </>
            ) : null}
            {/* ── TASK-534 ── page-root static grain overlay (present-only). */}
            <ToggleSwitch
              label="Grain overlay"
              value={!!effects?.noiseOverlay}
              onChange={(on) => onEffectsChange({ noiseOverlay: on })}
            />
          </section>
        </div>
      </div>
    </div>
  </EditorControlToneContext.Provider>
);

const HistorySheet = ({
  open,
  revisions,
  isLoading,
  error,
  restoringRevisionId,
  discardingRevisionId,
  onOpenChange,
  onRestore,
  onDiscard,
}: {
  open: boolean;
  revisions: PageRevision[];
  isLoading: boolean;
  error: string | null;
  restoringRevisionId: string | null;
  discardingRevisionId: string | null;
  onOpenChange: (open: boolean) => void;
  onRestore: (revisionId: string) => void;
  onDiscard: (revisionId: string) => void;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="space-y-4 p-6">
      <div>
        <SheetTitle>Page history</SheetTitle>
        <SheetDescription>Restore published versions or manage draft autosaves.</SheetDescription>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading revisions...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!isLoading && revisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No revisions yet.</p>
      ) : null}
      <div className="space-y-3">
        {revisions.map((revision) => (
          <div key={revision.id} className="rounded border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {revision.kind === "autosave" ? "Draft version" : `Version ${revision.version}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {revision.title ?? revision.slug ?? revision.id}
                </p>
              </div>
              <div className="flex gap-2">
                {revision.kind === "autosave" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={discardingRevisionId === revision.id}
                    onClick={() => onDiscard(revision.id)}
                  >
                    Discard
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={restoringRevisionId === revision.id}
                  onClick={() => onRestore(revision.id)}
                >
                  Restore
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

export const PageEditorOverlays = ({
  controller,
  toolbar,
}: {
  controller: PageEditorController;
  toolbar: PageEditorToolbarActions;
}) => {
  const {
    commandOpen,
    commandQuery,
    commandActiveIndex,
    canInsertSections,
    filteredSections,
    filteredBlocks,
    filteredTemplates,
    editorHost,
    handleCommandQueryChange,
    handleCommandKeyDown,
    addSection,
    addBlock,
    insertTemplate,
    setCommandOpen,
    setCommandActiveIndex,
    setPendingBlockInsert,
    setPendingSectionInsertIndex,
    setPendingBesideBlockPath,
    deleteSelectionTarget,
    setDeleteSelectionTarget,
    confirmDeleteSelection,
    settingsOpen,
    setSettingsOpen,
    page,
    pageSettingsPanelOpen,
    setPageSettingsPanelOpen,
    settingsTitle,
    settingsSlug,
    showInNav,
    revisionRetention,
    isSaving,
    setSettingsTitle,
    setSettingsSlug,
    setShowInNav,
    setRevisionRetention,
    pageDocument,
    sitePalette,
    revisionsHost,
    revisionsOpen,
    revisions,
    revisionsLoading,
    revisionsError,
    restoringRevisionId,
    discardingRevisionId,
    setRevisionsOpen,
    previewOpen,
    setPreviewOpen,
    previewUrl,
    previewLoading,
    previewError,
    device,
    setDevice,
    previewProbe,
  } = controller;
  const {
    handleSettingsSave,
    handleHostSettingsSaved,
    updateEffects,
    updateBackground,
    restoreRevision,
    discardRevision,
    handlePreview,
    dirtyNavigationDialog,
  } = toolbar;

  return (
    <>
      {commandOpen ? (
        <PageEditorCommandPalette
          commandQuery={commandQuery}
          commandActiveIndex={commandActiveIndex}
          canInsertSections={canInsertSections}
          sections={filteredSections}
          blocks={filteredBlocks}
          templates={filteredTemplates}
          showTemplates={Boolean(editorHost.templateLibrary)}
          onQueryChange={handleCommandQueryChange}
          onKeyDown={handleCommandKeyDown}
          onAddSection={addSection}
          onAddBlock={addBlock}
          onInsertTemplate={(id) => void insertTemplate(id)}
          onClose={() => {
            setCommandOpen(false);
            setCommandActiveIndex(0);
            setPendingBlockInsert(null);
            setPendingSectionInsertIndex(null);
            setPendingBesideBlockPath(null);
          }}
        />
      ) : null}

      <ConfirmActionDialog
        open={Boolean(deleteSelectionTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteSelectionTarget(null);
        }}
        title={
          deleteSelectionTarget?.kind === "block"
            ? "Delete selected block"
            : "Delete selected section"
        }
        description={
          deleteSelectionTarget?.kind === "block"
            ? "This removes the selected block from the page draft."
            : "This removes the selected section and its blocks from the page draft."
        }
        targetLabel={deleteSelectionTarget?.label}
        confirmLabel={deleteSelectionTarget?.kind === "block" ? "Delete block" : "Delete section"}
        tone="destructive"
        onConfirm={confirmDeleteSelection}
      />

      {editorHost.renderSettings ? (
        editorHost.renderSettings({
          open: settingsOpen,
          onOpenChange: setSettingsOpen,
          detail: page,
          onSaved: handleHostSettingsSaved,
        })
      ) : pageSettingsPanelOpen ? (
        // TASK-521-05-L01/L02: page settings relocated from the full-height
        // drawer into a COMPACT side-inspector panel (reused rail chrome), with
        // the Effects section (L02) wired to the live document draft.
        <PageSettingsSubpanel
          onClose={() => setPageSettingsPanelOpen(false)}
          title={settingsTitle}
          slug={settingsSlug}
          showInNav={showInNav}
          revisionRetention={revisionRetention}
          isSaving={isSaving}
          onTitleChange={setSettingsTitle}
          onSlugChange={setSettingsSlug}
          onShowInNavChange={setShowInNav}
          onRevisionRetentionChange={setRevisionRetention}
          onSave={handleSettingsSave}
          template={pageDocument.settings.template}
          effects={pageDocument.settings.effects}
          onEffectsChange={updateEffects}
          background={pageDocument.settings.background}
          onBackgroundChange={updateBackground}
          palette={sitePalette}
        />
      ) : null}

      {revisionsHost ? (
        <HistorySheet
          open={revisionsOpen}
          revisions={revisions}
          isLoading={revisionsLoading}
          error={revisionsError}
          restoringRevisionId={restoringRevisionId}
          discardingRevisionId={discardingRevisionId}
          onOpenChange={setRevisionsOpen}
          onRestore={restoreRevision}
          onDiscard={discardRevision}
        />
      ) : null}

      {editorHost.preview ? (
        <RuntimePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={editorHost.previewTitle}
          subtitle="Runtime preview of the saved draft (read-only, site theme)."
          canPreview={Boolean(previewUrl)}
          previewUrl={previewUrl}
          isLoading={previewLoading}
          error={previewError}
          device={device}
          onDeviceChange={setDevice}
          probeResult={previewProbe}
          iframeTitle="Page runtime preview"
          onFixPreviewTarget={() => void handlePreview()}
          fixPreviewTargetLabel="Retry preview"
        />
      ) : null}
      {dirtyNavigationDialog}
    </>
  );
};

export const PageEditorAlerts = ({
  controller,
  toolbar,
}: {
  controller: PageEditorController;
  toolbar: PageEditorToolbarActions;
}) => {
  const {
    error,
    previewError,
    autosaveError,
    revalidationError,
    recoveryCheckError,
    recoverableAutosave,
    restoringRevisionId,
    discardingRevisionId,
    recoveryActionError,
  } = controller;
  const { restoreRecoverableAutosave, discardRecoverableAutosave, dismissRecoverableAutosave } =
    toolbar;

  return (
    <>
      {error ? (
        <Alert variant="destructive" className="m-4">
          <AlertTitle>Page editor error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {previewError ? (
        <Alert variant="destructive" className="m-4">
          <AlertTitle>Preview unavailable</AlertTitle>
          <AlertDescription>{previewError}</AlertDescription>
        </Alert>
      ) : null}

      {autosaveError ? (
        <Alert variant="destructive" className="m-4">
          <AlertTitle>Autosave paused</AlertTitle>
          <AlertDescription>{autosaveError}</AlertDescription>
        </Alert>
      ) : null}

      {revalidationError ? (
        <Alert variant="warning" className="m-4">
          <AlertTitle>Cached draft shown</AlertTitle>
          <AlertDescription>{revalidationError}</AlertDescription>
        </Alert>
      ) : null}

      {recoveryCheckError ? (
        <Alert variant="warning" className="m-4">
          <AlertTitle>Draft recovery unavailable</AlertTitle>
          <AlertDescription>{recoveryCheckError}</AlertDescription>
        </Alert>
      ) : null}

      {recoverableAutosave ? (
        <Alert variant="warning" className="m-4">
          <AlertTitle>Recover draft version</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              A newer draft version from {new Date(recoverableAutosave.createdAt).toLocaleString()}{" "}
              is available in history.
            </span>
            <span className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={restoringRevisionId === recoverableAutosave.id}
                onClick={() => void restoreRecoverableAutosave()}
              >
                {restoringRevisionId === recoverableAutosave.id ? "Restoring..." : "Restore draft"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={discardingRevisionId === recoverableAutosave.id}
                onClick={() => void discardRecoverableAutosave()}
              >
                {discardingRevisionId === recoverableAutosave.id
                  ? "Discarding..."
                  : "Discard draft"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={dismissRecoverableAutosave}>
                Keep current
              </Button>
            </span>
          </AlertDescription>
          {recoveryActionError ? <AlertDescription>{recoveryActionError}</AlertDescription> : null}
        </Alert>
      ) : null}
    </>
  );
};
