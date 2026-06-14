import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  normalizeTemplateSectionData,
  resolveTemplateSectionState,
  templateSectionDefaults,
  type TemplateSectionData,
  type TemplateSectionResolutionState,
} from "../../../../widgets/core/templateSection";
import type { WidgetBlock, WidgetEditorProps } from "../../../../widgets/types";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

// The widget-template authoring surface is retired (replaced by the Page
// Templates surface, which is Page v2-only). These editors keep already
// stored legacy template-section blocks readable and presentational metadata
// editable, but no longer offer new widget-template selection.

function updateValue(
  value: TemplateSectionData,
  onChange: (next: TemplateSectionData) => void,
  patch: Partial<TemplateSectionData>
) {
  const normalized = normalizeTemplateSectionData(value);
  const { resolved: patchResolved, ...rest } = patch;
  const hasResolvedPatch = Object.prototype.hasOwnProperty.call(patch, "resolved");
  const next: TemplateSectionData = {
    ...normalized,
    ...rest,
  };
  if (hasResolvedPatch) {
    if (patchResolved) {
      next.resolved = patchResolved;
    } else {
      delete next.resolved;
    }
  }
  onChange(next);
}

function humanizeTemplateResolutionState(state: TemplateSectionResolutionState): string {
  switch (state) {
    case "not_selected":
      return "No template selected.";
    case "preview_unresolved":
      return "admin_preview_unresolved: editor preview is placeholder-only until runtime resolves this template.";
    case "template_missing":
      return "template_missing: selected template could not be found.";
    case "template_unpublished":
      return "template_unpublished: selected template is still a draft for public runtime.";
    case "template_loop":
      return "template_loop: nested template section would create a loop.";
    case "template_empty":
      return "template_empty: selected template resolved with no content blocks.";
    case "ready":
      return "Resolved content is ready.";
  }
}

function humanizeWidgetType(type: string | undefined): string {
  if (!type) return "Unknown content";
  return type
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function summarizeResolvedBlocks(blocks: WidgetBlock[] | undefined): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "No content blocks resolved.";
  const typeCounts = new Map<string, number>();
  for (const block of blocks) {
    const label = humanizeWidgetType(block.type);
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
  }
  const typeSummary = Array.from(typeCounts.entries())
    .map(([label, count]) => (count === 1 ? label : `${label} (${count})`))
    .join(", ");
  return `${blocks.length} content block${blocks.length === 1 ? "" : "s"} resolved: ${typeSummary}.`;
}

function RetiredSelectionNotice() {
  return (
    <Alert>
      <AlertTitle>Widget-template selection retired</AlertTitle>
      <AlertDescription>
        The reusable widget-template surface was replaced by Page Templates. Existing
        template-section blocks keep rendering their stored template; selecting a different widget
        template is no longer supported.
      </AlertDescription>
    </Alert>
  );
}

function TemplatePresentationEditor({
  value,
  onChange,
}: {
  value: TemplateSectionData;
  onChange: (next: TemplateSectionData) => void;
}) {
  const normalized = normalizeTemplateSectionData(value);
  const metadata = normalized.metadata ?? templateSectionDefaults.metadata ?? {};

  return (
    <WidgetEditorSection
      id="template-section.visual.presentation-fields"
      mode="visual"
      role="visual"
      title="Template presentation"
      description="Public preview labels shown around the resolved template section."
    >
      <WidgetControlRow
        id="template-section.visual.preview-label"
        label="Preview label"
        path="metadata.previewLabel"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={metadata.previewLabel ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, {
                metadata: {
                  ...metadata,
                  previewLabel: event.target.value,
                },
              })
            }
            placeholder="Homepage Hero Cluster"
          />
        )}
      </WidgetControlRow>
      <div className="grid gap-3 sm:grid-cols-2">
        <WidgetControlRow
          id="template-section.visual.category"
          label="Category"
          path="metadata.category"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={metadata.category ?? ""}
              onChange={(event) =>
                updateValue(value, onChange, {
                  metadata: {
                    ...metadata,
                    category: event.target.value,
                  },
                })
              }
              placeholder="Marketing"
            />
          )}
        </WidgetControlRow>
        <ReadonlyWidgetSummaryRow
          id="template-section.visual.version"
          label="Version"
          path="metadata.version"
          value={metadata.version || "Not configured"}
        />
      </div>
    </WidgetEditorSection>
  );
}

export function TemplateSectionWizardEditor({ value }: WidgetEditorProps<TemplateSectionData>) {
  const normalized = normalizeTemplateSectionData(value);
  return (
    <WidgetEditorSection
      id="template-section.wizard.template-setup"
      mode="wizard"
      role="setup"
      title="Template setup"
      description="Stored legacy widget-template reference for this section."
    >
      <ReadonlyWidgetSummaryRow
        id="template-section.wizard.template-id"
        label="Stored template"
        path="templateId"
        value={
          normalized.templateName ||
          (normalized.templateId ? normalized.templateId : "Not selected")
        }
      />
      <RetiredSelectionNotice />
    </WidgetEditorSection>
  );
}

export function TemplateSectionVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<TemplateSectionData>) {
  const normalized = normalizeTemplateSectionData(value);
  const activeName = normalized.templateName?.trim();

  return (
    <>
      <WidgetEditorSection
        id="template-section.visual.active-template"
        mode="visual"
        role="summary"
        title="Active template"
        description="Daily editing starts from the already selected template."
      >
        {activeName ? (
          <div className="rounded-lg border bg-background/60 p-3 text-xs text-muted-foreground">
            Active template: <span className="font-semibold text-foreground">{activeName}</span>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            No legacy widget template is stored on this section.
          </div>
        )}
      </WidgetEditorSection>
      <TemplatePresentationEditor value={normalized} onChange={onChange} />
    </>
  );
}

export function TemplateSectionAdvancedEditor({ value }: WidgetEditorProps<TemplateSectionData>) {
  const normalized = normalizeTemplateSectionData(value);
  const metadata = normalized.metadata ?? templateSectionDefaults.metadata ?? {};
  const state = normalized.templateId?.trim()
    ? resolveTemplateSectionState(normalized)
    : ("not_selected" as const);
  const resolvedBlockCount = Array.isArray(normalized.resolved?.blocks)
    ? normalized.resolved.blocks.length
    : 0;

  return (
    <>
      <WidgetEditorSection
        id="template-section.advanced.template-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Resolved template"
        description="Read-only setup and resolution state for troubleshooting."
      >
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.template-selection"
          label="Template selection"
          path="templateId"
          value={
            normalized.templateName ||
            (normalized.templateId ? "Template selected" : "Not selected")
          }
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.template-name"
          label="Template name"
          path="templateName"
          value={normalized.templateName || "Not selected"}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.preview-label"
          label="Preview label"
          path="metadata.previewLabel"
          value={metadata.previewLabel || "Not configured"}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.category"
          label="Category"
          path="metadata.category"
          value={metadata.category || "Not configured"}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.version"
          label="Version"
          path="metadata.version"
          value={metadata.version || "Not configured"}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.resolved-blocks"
          label="Resolved blocks"
          path="resolved.blocks"
          value={`${resolvedBlockCount} editor-resolved block${
            resolvedBlockCount === 1 ? "" : "s"
          }.`}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.resolution-status"
          label="Resolution status"
          path="resolved.error"
          value={humanizeTemplateResolutionState(state)}
        />
      </WidgetEditorSection>
      <WidgetEditorSection
        id="template-section.advanced.runtime-payload"
        mode="advanced"
        role="diagnostics"
        title="Resolved content summary"
        description="Read-only summary of the template content used by the renderer."
      >
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.resolved-content"
          label="Resolved content"
          path="resolved.blocks"
          value={summarizeResolvedBlocks(normalized.resolved?.blocks)}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.preview-state"
          label="Preview state"
          path="resolved"
          value={humanizeTemplateResolutionState(state)}
        />
      </WidgetEditorSection>
      <WidgetEditorSection
        id="template-section.advanced.runtime-rules"
        mode="advanced"
        role="summary"
        title="Runtime behavior"
      >
        <Alert>
          <AlertTitle>Runtime behavior</AlertTitle>
          <AlertDescription>
            Admin preview is placeholder-only until runtime resolution supplies blocks. Public
            runtime renders published templates, reports draft templates as template_unpublished,
            and keeps placeholders for missing or looped templates.
          </AlertDescription>
        </Alert>
      </WidgetEditorSection>
    </>
  );
}
