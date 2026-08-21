// TASK-481-02-L02 facade split (Part A): responsive device toggle panel and
// per-device visibility. Extracted verbatim from the former PageEditor.tsx
// body. Single writer: TASK-481-02-L02. No behavior change.

import { RotateCcw } from "lucide-react";
import {
  getPageResponsiveEffectiveVisible,
  pageResponsiveHideToggles,
  pageSectionStackVerticalControl,
  projectPageResponsiveOverrideEntries,
  type PageEditorControlDefinition,
} from "../../../../services/pages/pageEditorControlRegistry";
import {
  hasAnyResponsiveOverride,
  hasPathValue,
  readBlockBreakpointOverride,
  readSectionBreakpointOverride,
} from "../../../../services/pages/pageEditorState";
import {
  type PageBlockV2,
  type PageBreakpoint,
  type PageSectionV2,
} from "../../../../services/pages/pageDocumentV2";
import { deviceScopeReadout } from "./pageEditorOptions";
import { ToggleSwitch } from "../editorControls";
import {
  editorControlFocusClassFor,
  editorGhostButtonClassFor,
  editorPanelOptionActiveClass,
  useEditorControlTone,
} from "../editorControls/controlChrome";
import { SectionRegistryControlField } from "./PageEditorRegistryFields";
import { ResponsiveStateBadge, type ResponsiveBadgeState } from "./PageEditorSettingsPanel";
import type { PageOverrideBreakpoint } from "./pageEditorDocumentCommands";

export const ResponsivePanelContent = ({
  device,
  section,
  baseSection,
  baseBlock,
  onSectionControlChange,
  onClearOverride,
  onResponsiveVisibleChange,
  onResponsiveOverrideReset,
}: {
  device: PageBreakpoint;
  section: PageSectionV2;
  baseSection: PageSectionV2;
  /** Selected base block, or null when the section is the target. */
  baseBlock: PageBlockV2 | null;
  onSectionControlChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onClearOverride: (path: readonly string[]) => void;
  onResponsiveVisibleChange: (breakpoint: PageBreakpoint, visible: boolean) => void;
  onResponsiveOverrideReset: (breakpoint: PageOverrideBreakpoint, path: readonly string[]) => void;
}) => {
  const tone = useEditorControlTone();
  const isLight = tone === "light";
  const mutedText = isLight ? "text-muted-foreground" : "text-slate-400";
  const target = baseBlock ?? baseSection;
  const overrideSource = baseBlock
    ? readBlockBreakpointOverride(baseBlock, device)
    : readSectionBreakpointOverride(baseSection, device);
  const hasTargetOverride = hasAnyResponsiveOverride(device, overrideSource);
  const overrideDevice = device === "desktop" ? null : device;
  const entries = projectPageResponsiveOverrideEntries(
    baseBlock
      ? { kind: "block", type: baseBlock.type }
      : { kind: "section", type: baseSection.type },
    device,
    overrideSource
  );
  const overrideCount = entries.filter((entry) => entry.state === "override").length;
  return (
    <div className="space-y-4" data-page-editor-responsive-panel={baseBlock ? "block" : "section"}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm ${mutedText}`}>
          {device === "desktop"
            ? `Editing ${deviceScopeReadout("desktop")} — the base every breakpoint inherits.`
            : `Editing ${deviceScopeReadout(device)} — edits create ${device} overrides.`}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            hasTargetOverride
              ? isLight
                ? editorPanelOptionActiveClass
                : "bg-sky-400/20 text-sky-200"
              : isLight
                ? "bg-muted text-muted-foreground"
                : "bg-white/10 text-slate-400"
          }`}
          data-page-editor-responsive-target-state={hasTargetOverride ? "override" : "inherited"}
        >
          {device === "desktop" ? "base" : hasTargetOverride ? "override" : "inherited"}
        </span>
      </div>
      <div className="grid gap-2" data-page-editor-responsive-hide-group="true">
        {pageResponsiveHideToggles.map((toggle) => {
          const toggleBreakpoint = toggle.breakpoint === "desktop" ? null : toggle.breakpoint;
          const visible = getPageResponsiveEffectiveVisible(target, toggle.breakpoint);
          const overrideExists =
            toggleBreakpoint !== null &&
            hasPathValue(target.responsive?.[toggleBreakpoint], toggle.path);
          const state: ResponsiveBadgeState =
            toggleBreakpoint === null ? "base" : overrideExists ? "override" : "inherited";
          return (
            <div
              key={toggle.id}
              className="grid min-w-0 gap-1"
              data-page-editor-responsive-hide={toggle.breakpoint}
              data-page-editor-responsive-hide-state={state}
            >
              <ToggleSwitch
                label={toggle.label}
                value={!visible}
                onChange={(hidden) => onResponsiveVisibleChange(toggle.breakpoint, !hidden)}
              />
              <div className="flex min-h-6 items-center justify-between gap-2">
                <ResponsiveStateBadge
                  state={state}
                  device={toggle.breakpoint}
                  description={
                    toggleBreakpoint === null
                      ? "Base visibility. Hiding on desktop hides every breakpoint that does not override visibility."
                      : undefined
                  }
                />
                {toggleBreakpoint !== null && overrideExists ? (
                  <ResponsivePanelResetButton
                    label={toggle.label}
                    onClick={() => onResponsiveOverrideReset(toggleBreakpoint, toggle.path)}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {baseBlock ? null : (
        <SectionRegistryControlField
          section={section}
          baseSection={baseSection}
          device={device}
          control={pageSectionStackVerticalControl}
          onChange={onSectionControlChange}
          onReset={onClearOverride}
        />
      )}
      <div className="space-y-2" data-page-editor-responsive-override-list={device}>
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            isLight ? "text-foreground" : "text-slate-200"
          }`}
        >
          Per-field overrides
          {overrideDevice ? ` (${overrideCount})` : ""}
        </p>
        {overrideDevice === null ? (
          <p className={`text-xs ${mutedText}`}>
            Desktop is the base. Switch to tablet or mobile to review or reset per-field overrides.
          </p>
        ) : entries.length === 0 ? (
          <p className={`text-xs ${mutedText}`}>This selection exposes no responsive fields.</p>
        ) : (
          <ul className="space-y-1">
            {entries.map(({ control, state }) => (
              <li
                key={control.id}
                className="flex items-center justify-between gap-2"
                data-page-editor-override-entry={control.id}
                data-page-editor-override-state={state}
              >
                <span
                  className={`min-w-0 truncate text-xs ${isLight ? "text-muted-foreground" : "text-slate-300"}`}
                >
                  {control.label}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <ResponsiveStateBadge state={state} device={device} />
                  {state === "override" ? (
                    <ResponsivePanelResetButton
                      label={control.label}
                      entryId={control.id}
                      onClick={() =>
                        onResponsiveOverrideReset(overrideDevice, control.overridePath)
                      }
                    />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/** Reset-inheritance action used by the Responsive panel rows. */
const ResponsivePanelResetButton = ({
  label,
  entryId,
  onClick,
}: {
  label: string;
  entryId?: string;
  onClick: () => void;
}) => {
  const tone = useEditorControlTone();
  return (
    <button
      type="button"
      aria-label={`Reset ${label} to inherited`}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${editorGhostButtonClassFor(
        tone
      )} ${editorControlFocusClassFor(tone)}`}
      data-page-editor-responsive-reset={label}
      data-page-editor-override-reset={entryId}
      onClick={onClick}
    >
      <RotateCcw className="h-3 w-3" />
      Reset
    </button>
  );
};
