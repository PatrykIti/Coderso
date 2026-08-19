// TASK-481-02-L02 facade split (Part A): page editor root. The PageEditor
// component, host state wiring (load/revalidation/cache/autosave), and the
// shared canvas shell. Extracted verbatim from the former PageEditor.tsx body.
// Single writer: TASK-481-02-L02. No behavior change.

import { Fragment } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clipboard,
  ClipboardPaste,
  Columns2,
  Copy,
  Eye,
  History,
  Layers,
  Maximize2,
  Minimize2,
  PanelRight,
  PanelTop,
  Plus,
  Redo2,
  Rocket,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CanvasEditor } from "@/ui/shared/CanvasEditor";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import {
  hasAnyResponsiveOverride,
  readSectionBreakpointOverride,
} from "../../../../services/pages/pageEditorState";
import {
  clearResponsiveOverride,
  resolvePageSectionForBreakpoint,
} from "../../../../services/pages/pageDocumentV2";
import {
  canvasDeviceFrameClassMap,
  deviceScopeReadout,
  toolbarActionTooltips,
} from "./pageEditorOptions";
import { usePageEditorHostWiring } from "./usePageEditorHostWiring";
import {
  EditorControlToneContext,
  editorCanvasCtaButtonClass,
} from "../editorControls/controlChrome";
import { ToolbarIconButton } from "./FloatingEditorToolbar";
import { SectionCanvas, SectionGapInsertZone } from "./PageAuthoringCanvas";
import { LayerBlockRows } from "./PageEditorLayers";
import { PageEditorColorPaletteContext } from "../../../../services/pages/pageEditorColorPaletteContext";
import { PageEditorAlerts, PageEditorOverlays } from "./PageEditorSettingsPanel";
import {
  ToolbarSubpanel,
  usePageEditorKeyboardShortcuts,
  usePageEditorToolbarActions,
} from "./PageEditorToolbar";
import { usePageEditorController, type PageEditorProps } from "./usePageEditorController";
import { DeviceSwitcher } from "../DeviceSwitcher";

export function PageEditor({ pageId, initialPage, host }: PageEditorProps) {
  const controller = usePageEditorController({ pageId, initialPage, host });
  usePageEditorKeyboardShortcuts(controller);
  usePageEditorHostWiring(controller);
  const toolbar = usePageEditorToolbarActions(controller);
  const {
    page,
    settingsTitle,
    pageDocument,
    selectedSectionId,
    selectedBlockPath,
    selectedBlockId,
    inlineEditTarget,
    device,
    panelOpen,
    markToolbarDock,
    canvasSiteTokenVariables,
    canvasBrandTokenVariables,
    sitePalette,
    hasUnsavedChanges,
    isLoading,
    isSaving,
    isPublishing,
    layersOpen,
    toolbarCollapsed,
    pageSettingsPanelOpen,
    editorHost,
    panelTokens,
    selectedSection,
    resolvedSelectedSection,
    selectedBlock,
    toolbarBlockTarget,
    toolbarTargetLabel,
    toolbarSelectionMeta,
    canAddBlockBeside,
    canInsertSections,
    hasFloatingPanelSelection,
    horizontalBlockMoveAvailable,
    verticalBlockMoveAvailable,
    verticalBlockMoveStep,
    sectionColumnMoveActive,
    horizontalMoveSetsColumn,
    hostAppearancePanel,
    visibleToolbarPanelOptions,
    activeToolbarPanel,
    canUndoEditorChange,
    canRedoEditorChange,
    canvasDataByBlockId,
    setDevice,
    setPanelOpen,
    setMarkToolbarDock,
    setLayersOpen,
    setActivePanel,
    setToolbarCollapsed,
    setSettingsOpen,
    setPageSettingsPanelOpen,
    selectSection,
    selectBlock,
    openCommandPalette,
    openCommandPaletteForTarget,
    openCommandPaletteAtGap,
    openCommandPaletteBesideSelected,
    startInlineEdit,
    commitInlineEdit,
    applyInlineTextMark,
    moveSelectedBlockToTarget,
    duplicateSelectedSection,
    undoEditorChange,
    redoEditorChange,
    copySelectedFragment,
    pasteClipboardFragment,
    setResponsiveTargetVisible,
    clearResponsiveTargetOverride,
    clearSelectedBlockOverride,
    updateSelectedSectionControl,
    updateSelectedSectionVariant,
    updateSectionGroup,
    updateSelectedBlockControl,
    moveSelectedBlockBy,
    moveSelectedBlockHorizontally,
    moveSelectedBlockWithinColumnStack,
    duplicateSelectedBlock,
    requestDeleteSelection,
    updateSelectedSection,
    setDocumentDraft,
    previewLoading,
    toolbarElementRef,
    moveSelectedSection,
  } = controller;
  const { handleSaveDraft, handlePublish, openRevisions, handlePreview, revisionsHost } = toolbar;

  return (
    <EditorShell
      breadcrumbs={
        // Builder chrome: top-bar breadcrumb is resourceLabel · title only.
        // The StatusBadge + Unsaved pill live in the page-builder sub-toolbar.
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{editorHost.resourceLabel}</span>
          <span className="text-sm font-semibold">{page?.title ?? settingsTitle}</span>
        </div>
      }
      centerScroll={false}
      contentClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-background">
        {" "}
        {/* TASK-481-03-L01: widen the site-palette context to wrap the WHOLE
            editor body (canvas + floating rail), not just ToolbarSubpanel, so
            the inline toolbar (rendered inside the canvas) reads the LIVE site
            palette. The provider only supplies palette data; wrapping the
            canvas is behavior-neutral for chrome. */}
        <PageEditorColorPaletteContext.Provider value={sitePalette}>
          <PageEditorAlerts controller={controller} toolbar={toolbar} />
          {/* TASK-496-01: the canvas-region body (device-context bar for the MENU,
            dotted scroller, page frame, layers overlay) is held in ONE shared
            `canvasBody` value; the floating-rail BODY is held in `railBody` (its
            outer positioning div differs per chrome). The BUILDER routes both
            through the shared `CanvasEditor` shell (PageHeader + sub-toolbar +
            card + right rail); the MENU keeps the flat pass-through with its
            legacy inline rail + reopen chip. Both paths render the SAME canvas
            body so it renders exactly once and the menu DOM stays byte-identical.
            Defined in an inline IIFE (no hooks added, react-hooks-safe) so the
            large child tree below stays in place. */}
          {(() => {
            const canvasBody = (
              <>
                {/* TASK-495-03 P4b: the builder relocates the device-context strip
              into the card chrome (above the region — the shared CanvasEditor
              shell's `deviceContext` slot) so the floating rail's `top-4`
              measures from the dotted scroller top and lands ~16px inside the
              dots (proto parity). */}
                <div
                  className="min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8"
                  data-page-editor-canvas-scroller="true"
                  // The right rail no longer covers the bottom; reserve RIGHT
                  // padding instead so the centered frame is not occluded by the overlay.
                  style={
                    panelOpen && hasFloatingPanelSelection
                      ? ({ paddingRight: 300 } as CSSProperties) // 280 rail + ~20 inset
                      : undefined
                  }
                  onClick={() => selectSection(null)}
                >
                  <div
                    className={`mx-auto min-h-full w-full rounded-2xl bg-card p-4 shadow-soft transition-all ${canvasDeviceFrameClassMap[device]}`}
                    // Site typography token variables (not the admin-theme ones) so
                    // canvas `var(--text-*)`/`var(--font-*)` paints match the front.
                    style={canvasSiteTokenVariables}
                    data-page-editor-canvas-frame="true"
                    data-page-editor-canvas-device={device}
                  >
                    {!isLoading && editorHost.canvasChrome ? (
                      <div className="mb-4" data-page-editor-canvas-chrome="true">
                        {editorHost.canvasChrome({ document: pageDocument, device })}
                      </div>
                    ) : null}
                    {isLoading ? (
                      <div className="p-16 text-center text-sm text-muted-foreground">
                        Loading page...
                      </div>
                    ) : pageDocument.sections.length === 0 ? (
                      <div className="p-16 text-center">
                        <p className="text-sm text-muted-foreground">
                          This page has no sections yet.
                        </p>
                        {canInsertSections ? (
                          <Button type="button" className="mt-4" onClick={openCommandPalette}>
                            <Plus className="h-4 w-4" />
                            Add section
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {canInsertSections ? (
                          <div className="flex justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={editorCanvasCtaButtonClass}
                              onClick={openCommandPalette}
                            >
                              <Plus className="h-4 w-4" />
                              Add section
                            </Button>
                          </div>
                        ) : null}
                        {pageDocument.sections.map((section, sectionIndex) => (
                          <Fragment key={section.id}>
                            {canInsertSections ? (
                              <SectionGapInsertZone
                                index={sectionIndex}
                                onInsert={openCommandPaletteAtGap}
                              />
                            ) : null}
                            <SectionCanvas
                              contentBrandTokenVariables={canvasBrandTokenVariables}
                              section={resolvePageSectionForBreakpoint(section, device)}
                              baseSection={section}
                              selected={section.id === selectedSectionId}
                              selectedBlockPath={
                                section.id === selectedSectionId ? selectedBlockPath : null
                              }
                              selectedBlockId={
                                section.id === selectedSectionId ? selectedBlockId : null
                              }
                              inlineEditTarget={inlineEditTarget}
                              device={device}
                              canAddBlockBeside={canAddBlockBeside}
                              canvasDataByBlockId={canvasDataByBlockId}
                              markToolbarDock={markToolbarDock}
                              onMarkToolbarDockChange={setMarkToolbarDock}
                              onSelect={() => selectSection(section.id)}
                              onSelectBlock={(blockPath) => selectBlock(section.id, blockPath)}
                              onAddBlock={openCommandPalette}
                              onAddBlockToTarget={openCommandPaletteForTarget}
                              onAddBlockBeside={openCommandPaletteBesideSelected}
                              onStartInlineEdit={startInlineEdit}
                              onCommitInlineEdit={commitInlineEdit}
                              onApplyTextMark={applyInlineTextMark}
                            />
                          </Fragment>
                        ))}
                        {canInsertSections ? (
                          <SectionGapInsertZone
                            index={pageDocument.sections.length}
                            onInsert={openCommandPaletteAtGap}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {layersOpen ? (
                  <div
                    className="absolute left-4 top-16 z-20 flex max-h-[min(72vh,calc(100dvh-8rem))] w-72 flex-col overflow-hidden rounded-2xl border border-border bg-popover p-3 shadow-pop"
                    data-page-editor-layers-panel="true"
                  >
                    <div className="mb-2 flex shrink-0 items-center justify-between">
                      <p className="text-sm font-semibold">Layers</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setLayersOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div
                      className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain"
                      data-page-editor-layers-scroll="true"
                    >
                      {pageDocument.sections.map((section) => (
                        <div key={section.id} className="space-y-1">
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm ${
                              section.id === selectedSectionId && !selectedBlockId
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted"
                            }`}
                            data-page-editor-layer-section-id={section.id}
                            data-page-editor-responsive-target={
                              hasAnyResponsiveOverride(
                                device,
                                readSectionBreakpointOverride(section, device)
                              )
                                ? "override"
                                : "inherited"
                            }
                            onClick={() => selectSection(section.id)}
                          >
                            <span>{section.name}</span>
                            <span className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                              {hasAnyResponsiveOverride(
                                device,
                                readSectionBreakpointOverride(section, device)
                              )
                                ? `${device} override`
                                : null}
                              {section.type}
                            </span>
                          </button>
                          <div className="space-y-1 pl-4">
                            <LayerBlockRows
                              section={section}
                              blocks={section.blocks}
                              ownerPath={null}
                              selectedBlockPath={
                                section.id === selectedSectionId ? selectedBlockPath : null
                              }
                              canAddBeside={canAddBlockBeside}
                              device={device}
                              onSelectBlock={(blockPath) => selectBlock(section.id, blockPath)}
                              onAddToTarget={openCommandPaletteForTarget}
                              onMoveToTarget={moveSelectedBlockToTarget}
                              onAddBeside={openCommandPaletteBesideSelected}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            );

            // TASK-496-01: the floating-panel BODY rendered into the shared
            // CanvasEditor shell's `panel` slot (the builder right rail). The
            // shell owns the OUTER positioning div; this is body-only chrome.
            const railBody =
              selectedSection && resolvedSelectedSection ? (
                <>
                  {/*
                Head row owns identity (name + variant chip + editing-scope
                pill) on the left and the right-aligned action cluster; the
                panel category icons live on their own second row so they can
                never collide with the scope pill (owner finding #3). The
                builder rail re-stacks the head vertically to fit 280px.
              */}
                  <div className="flex flex-col gap-2" data-page-editor-toolbar-row="head">
                    {/* TASK-500-03: the redundant in-panel PanelRight "Hide options
                      panel" closer was removed — the sub-toolbar Hide/Show toggle
                      and the "Show panel" reopen chip are the SOLE panel controls
                      (single hide surface, Screens parity). */}
                    <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                      <PanelTop className={`h-4 w-4 ${panelTokens.label}`} />
                      <span className="truncate text-sm font-semibold">{toolbarTargetLabel}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${panelTokens.chip}`}
                      >
                        {toolbarSelectionMeta}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${panelTokens.scopePill}`}
                        data-page-editor-editing-scope={device}
                      >
                        {device === "desktop"
                          ? `Editing: ${deviceScopeReadout("desktop")} (base)`
                          : `Editing: ${deviceScopeReadout(device)} (overrides)`}
                      </span>
                    </div>
                    <div
                      className="ml-auto flex shrink-0 items-center gap-1"
                      data-page-editor-toolbar-actions="true"
                    >
                      <ToolbarIconButton
                        tooltip={
                          toolbarCollapsed
                            ? toolbarActionTooltips.expand
                            : toolbarActionTooltips.collapse
                        }
                        onClick={() => setToolbarCollapsed((collapsed) => !collapsed)}
                      >
                        {toolbarCollapsed ? (
                          <Maximize2 className="h-4 w-4" />
                        ) : (
                          <Minimize2 className="h-4 w-4" />
                        )}
                      </ToolbarIconButton>
                      {!toolbarCollapsed ? (
                        <>
                          {/* Undo/Redo live in the sub-toolbar (builder chrome), not
                        in the floating panel. */}
                          <ToolbarIconButton
                            tooltip={toolbarActionTooltips.copySelection}
                            onClick={() => void copySelectedFragment()}
                          >
                            <Clipboard className="h-4 w-4" />
                          </ToolbarIconButton>
                          <ToolbarIconButton
                            tooltip={toolbarActionTooltips.pasteSelection}
                            onClick={() => void pasteClipboardFragment()}
                          >
                            <ClipboardPaste className="h-4 w-4" />
                          </ToolbarIconButton>
                          {verticalBlockMoveAvailable ? (
                            <>
                              <ToolbarIconButton
                                tooltip={
                                  selectedBlock
                                    ? sectionColumnMoveActive
                                      ? toolbarActionTooltips.moveBlockUpColumn
                                      : verticalBlockMoveStep > 1
                                        ? toolbarActionTooltips.moveBlockUpRow
                                        : toolbarActionTooltips.moveBlockUp
                                    : toolbarActionTooltips.moveSectionUp
                                }
                                onClick={() =>
                                  selectedBlock
                                    ? sectionColumnMoveActive
                                      ? moveSelectedBlockWithinColumnStack(-1)
                                      : moveSelectedBlockBy(-verticalBlockMoveStep)
                                    : moveSelectedSection(-1)
                                }
                              >
                                <ArrowUp className="h-4 w-4" />
                              </ToolbarIconButton>
                              <ToolbarIconButton
                                tooltip={
                                  selectedBlock
                                    ? sectionColumnMoveActive
                                      ? toolbarActionTooltips.moveBlockDownColumn
                                      : verticalBlockMoveStep > 1
                                        ? toolbarActionTooltips.moveBlockDownRow
                                        : toolbarActionTooltips.moveBlockDown
                                    : toolbarActionTooltips.moveSectionDown
                                }
                                onClick={() =>
                                  selectedBlock
                                    ? sectionColumnMoveActive
                                      ? moveSelectedBlockWithinColumnStack(1)
                                      : moveSelectedBlockBy(verticalBlockMoveStep)
                                    : moveSelectedSection(1)
                                }
                              >
                                <ArrowDown className="h-4 w-4" />
                              </ToolbarIconButton>
                            </>
                          ) : null}
                          {selectedBlock && horizontalBlockMoveAvailable ? (
                            <>
                              <ToolbarIconButton
                                tooltip={
                                  horizontalMoveSetsColumn
                                    ? toolbarActionTooltips.moveBlockLeftColumn
                                    : toolbarActionTooltips.moveBlockLeft
                                }
                                onClick={() => moveSelectedBlockHorizontally(-1)}
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </ToolbarIconButton>
                              <ToolbarIconButton
                                tooltip={
                                  horizontalMoveSetsColumn
                                    ? toolbarActionTooltips.moveBlockRightColumn
                                    : toolbarActionTooltips.moveBlockRight
                                }
                                onClick={() => moveSelectedBlockHorizontally(1)}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </ToolbarIconButton>
                            </>
                          ) : null}
                          {selectedBlock ? (
                            // Owner finding #7 (round 3): a bare Columns2 glyph read
                            // as a layout toggle, not an insert action — the icon
                            // now carries an explicit "+" badge so the action is
                            // discoverable without hovering for the tooltip.
                            <ToolbarIconButton
                              tooltip={toolbarActionTooltips.addBlockBeside}
                              disabled={!canAddBlockBeside}
                              onClick={openCommandPaletteBesideSelected}
                            >
                              <span className="relative inline-flex" aria-hidden="true">
                                <Columns2 className="h-4 w-4" />
                                <Plus
                                  className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-slate-950"
                                  strokeWidth={3}
                                />
                              </span>
                            </ToolbarIconButton>
                          ) : null}
                          <ToolbarIconButton
                            tooltip={
                              selectedBlock
                                ? toolbarActionTooltips.duplicateBlock
                                : toolbarActionTooltips.duplicateSection
                            }
                            onClick={
                              selectedBlock ? duplicateSelectedBlock : duplicateSelectedSection
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </ToolbarIconButton>
                          <ToolbarIconButton
                            tooltip={
                              selectedBlock
                                ? toolbarActionTooltips.deleteBlock
                                : toolbarActionTooltips.deleteSection
                            }
                            onClick={requestDeleteSelection}
                          >
                            <Trash2 className="h-4 w-4" />
                          </ToolbarIconButton>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {!toolbarCollapsed ? (
                    <div
                      className={`mt-1 flex flex-wrap items-center gap-1 border-t pt-1 ${panelTokens.headerBorder}`}
                      data-page-editor-toolbar-row="panels"
                    >
                      {visibleToolbarPanelOptions.map(({ panel, label, description, Icon }) => (
                        <ToolbarIconButton
                          key={panel}
                          tooltip={{ label: `${label} panel`, description }}
                          active={activeToolbarPanel === panel}
                          expanded={activeToolbarPanel === panel}
                          panelId={panel}
                          onClick={() =>
                            setActivePanel((current) => (current === panel ? null : panel))
                          }
                        >
                          <Icon className="h-4 w-4" />
                        </ToolbarIconButton>
                      ))}
                    </div>
                  ) : null}
                  {!toolbarCollapsed && activeToolbarPanel === "host-appearance" ? (
                    // Host-owned appearance panel (TASK-458-03): same subpanel
                    // chrome as the registry panels, content rendered by the host
                    // through the shared control primitives.
                    <div
                      className={`mt-2 flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden rounded-lg ${panelTokens.subPanelBg}`}
                      data-page-editor-toolbar-panel="host-appearance"
                      data-page-editor-subpanel="viewport-safe"
                      role="region"
                      aria-label={`${hostAppearancePanel?.label ?? "Appearance"} toolbar panel`}
                    >
                      <div
                        className={`flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2 ${panelTokens.subHeaderBorder}`}
                        data-page-editor-subpanel-header="true"
                      >
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold uppercase tracking-wide ${panelTokens.subTitle}`}
                          >
                            {hostAppearancePanel?.label ?? "Appearance"}
                          </p>
                          {hostAppearancePanel ? (
                            <p className={`truncate text-[11px] ${panelTokens.subDesc}`}>
                              {hostAppearancePanel.description}
                            </p>
                          ) : null}
                        </div>
                        <ToolbarIconButton
                          tooltip={toolbarActionTooltips.closePanel}
                          onClick={() => setActivePanel(null)}
                        >
                          <X className="h-4 w-4" />
                        </ToolbarIconButton>
                      </div>
                      <div
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
                        data-page-editor-subpanel-scroll="true"
                      >
                        {hostAppearancePanel?.render({
                          document: pageDocument,
                          device,
                          updateDocument: setDocumentDraft,
                        })}
                      </div>
                    </div>
                  ) : null}
                  {!toolbarCollapsed &&
                  activeToolbarPanel &&
                  activeToolbarPanel !== "host-appearance" ? (
                    <ToolbarSubpanel
                      panel={activeToolbarPanel}
                      device={device}
                      section={resolvedSelectedSection}
                      baseSection={selectedSection}
                      block={toolbarBlockTarget}
                      baseBlock={
                        selectedBlockId ? selectedBlock : (selectedSection.blocks[0] ?? null)
                      }
                      hasBlockSelection={Boolean(selectedBlockId)}
                      onSectionControlChange={updateSelectedSectionControl}
                      onSectionVariantChange={updateSelectedSectionVariant}
                      onSectionStyle={(patch) => updateSectionGroup("style", patch)}
                      onSectionVisibility={(patch) => updateSectionGroup("visibility", patch)}
                      onBlockControlChange={updateSelectedBlockControl}
                      onClearOverride={(path) => {
                        if (device === "desktop") return;
                        updateSelectedSection((section) =>
                          clearResponsiveOverride(section, device, path)
                        );
                      }}
                      onClearBlockOverride={clearSelectedBlockOverride}
                      onResponsiveVisibleChange={setResponsiveTargetVisible}
                      onResponsiveOverrideReset={clearResponsiveTargetOverride}
                      onAddBlock={openCommandPalette}
                      onClose={() => setActivePanel(null)}
                    />
                  ) : null}
                </>
              ) : null;

            // BUILDER slots: the shell supplies the positioning div (panelRef +
            // aria-label + data-* via panelDataProps) and renders the reopen chip,
            // so the `panel` slot is just the tone-wrapped body and the
            // `reopenAffordance` slot is the bare builder chip. Byte-equivalent to
            // the previously inlined builder rail + reopen.
            const builderRail =
              selectedSection && resolvedSelectedSection ? (
                <EditorControlToneContext.Provider value="light">
                  {railBody}
                </EditorControlToneContext.Provider>
              ) : null;
            const builderReopen = hasFloatingPanelSelection ? (
              // Byte-equivalent to the prior inlined builder reopen chip — the
              // `right-4 top-4` placement classes stay appended at the end exactly
              // as the original template literal produced for the builder arm.
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className="absolute z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary right-4 top-4"
                aria-label="Show panel"
              >
                <SlidersHorizontal className="size-3.5" /> Show panel
              </button>
            ) : null;

            return (
              // BUILDER (page + page-template): route the proven chrome through the
              // shared `CanvasEditor` shell. The PageHeader, sub-toolbar control
              // cluster, device-context strip, canvas body, floating rail + reopen
              // chip are all host-supplied slots — byte-equivalent to the prior
              // inlined card, with the shell owning the card + right-rail layout.
              <CanvasEditor
                header={
                  /* Step 2 — in-content PageHeader. P2b: drop the header's own
                   border/fill so it reads as a title region floating ABOVE the
                   card (the card below is now the divider — proto parity). */
                  <PageHeader
                    className="mb-0 shrink-0 px-6 pb-3 pt-4"
                    title={page?.title ?? settingsTitle}
                    actions={
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            editorHost.renderSettings
                              ? setSettingsOpen(true)
                              : setPageSettingsPanelOpen((open) => !open)
                          }
                        >
                          <Settings2 className="h-4 w-4" />
                          {editorHost.settingsLabel}
                        </Button>
                        {revisionsHost ? (
                          <Button type="button" variant="ghost" size="sm" onClick={openRevisions}>
                            <History className="h-4 w-4" />
                            History
                          </Button>
                        ) : null}
                        {editorHost.preview ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={previewLoading || !page}
                            onClick={handlePreview}
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isSaving || !page}
                          onClick={handleSaveDraft}
                        >
                          <Save className="h-4 w-4" />
                          {isSaving ? "Saving..." : "Save draft"}
                        </Button>
                        {editorHost.publish ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isPublishing || !page}
                            onClick={handlePublish}
                          >
                            <Rocket className="h-4 w-4" />
                            {isPublishing ? "Publishing..." : "Publish"}
                          </Button>
                        ) : null}
                      </>
                    }
                  />
                }
                title="Page builder"
                badge={
                  !editorHost.publish ? (
                    // Capability badge: this host can Save draft but omits publish
                    // (the page-template host). "Save only" — NOT "Preview only"
                    // (that would mislabel a savable resource).
                    <Badge variant="soft">Save only</Badge>
                  ) : null
                }
                toolbar={
                  <>
                    {/* Relocated doc status (was the breadcrumb slot) + Unsaved pill. */}
                    <StatusBadge status={page?.status ?? "draft"} />
                    {hasUnsavedChanges ? (
                      <Badge variant="warning" className="text-[10px] font-semibold uppercase">
                        Unsaved
                      </Badge>
                    ) : null}
                    <div className="mx-1 h-5 w-px bg-border" />
                    {/* Relocated Undo/Redo (were inside the floating toolbar). The
                      aria-label MUST stay "Undo"/"Redo" — the undo/redo flow test
                      clicks them by label. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Undo"
                      disabled={!canUndoEditorChange}
                      onClick={undoEditorChange}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Redo"
                      disabled={!canRedoEditorChange}
                      onClick={redoEditorChange}
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                    <div className="mx-1 h-5 w-px bg-border" />
                    {/* Relocated DeviceSwitcher — keeps data-page-editor-device-option. */}
                    <DeviceSwitcher value={device} onChange={setDevice} />
                    {/* Relocated Layers. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLayersOpen((open) => !open)}
                    >
                      <Layers className="h-4 w-4" />
                      Layers
                    </Button>
                    {/* Relocated Panel toggle — keeps soft/ghost + aria-pressed. */}
                    <Button
                      type="button"
                      variant={panelOpen ? "soft" : "ghost"}
                      size="sm"
                      onClick={() => setPanelOpen((open) => !open)}
                      aria-label={panelOpen ? "Hide panel" : "Show panel"}
                      aria-pressed={panelOpen}
                    >
                      <PanelRight className="h-4 w-4" />
                      {panelOpen ? "Hide panel" : "Show panel"}
                    </Button>
                    {/* TASK-521-05-L01: compact page-settings panel trigger, next
                      to the section-panel toggle, reusing Settings2. Hosts with
                      their own renderSettings Sheet keep the header button. */}
                    {!editorHost.renderSettings ? (
                      <Button
                        type="button"
                        variant={pageSettingsPanelOpen ? "soft" : "ghost"}
                        size="sm"
                        onClick={() => setPageSettingsPanelOpen((open) => !open)}
                        aria-label="Page settings"
                        aria-pressed={pageSettingsPanelOpen}
                      >
                        <Settings2 className="h-4 w-4" />
                        Page settings
                      </Button>
                    ) : null}
                  </>
                }
                deviceContext={{
                  value: device,
                  label:
                    device === "desktop"
                      ? `${deviceScopeReadout("desktop")} · base view`
                      : `${deviceScopeReadout(device)} · override context`,
                }}
                canvas={canvasBody}
                panel={builderRail}
                panelOpen={panelOpen}
                onPanelOpenChange={setPanelOpen}
                panelPosition="right"
                panelRef={toolbarElementRef}
                panelAriaLabel={`${toolbarTargetLabel} tools`}
                panelDataProps={{
                  "data-page-editor-floating-toolbar": "true",
                  "data-page-editor-toolbar-collapsed": toolbarCollapsed ? "true" : "false",
                }}
                reopenAffordance={builderReopen}
              />
            );
          })()}
          <PageEditorOverlays controller={controller} toolbar={toolbar} />
        </PageEditorColorPaletteContext.Provider>
      </div>
    </EditorShell>
  );
}

export { PageSettingsSubpanel } from "./PageEditorSettingsPanel";
