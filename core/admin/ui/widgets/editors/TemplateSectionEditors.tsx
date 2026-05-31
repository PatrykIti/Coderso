import { useMemo } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  normalizeTemplateSectionData,
  resolveTemplateSectionState,
  templateSectionDefaults,
  type TemplateSectionData,
  type TemplateSectionResolutionState,
} from "../../../../widgets/core/templateSection";
import type { WidgetTemplate } from "@/services/widgetTemplatesClient";
import { useWidgetTemplates } from "../hooks/useWidgetTemplates";
import type { WidgetBlock, WidgetEditorProps } from "../../../../widgets/types";
import {
  ReadonlyWidgetSummaryRow,
  type WidgetControlFieldProps,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const NO_TEMPLATE_VALUE = "__no-template__";

const statusLabelMap: Record<string, string> = {
  draft: "Draft",
  published: "Published",
};

const resolveTemplateStatusLabel = (status?: string | null) =>
  status ? (statusLabelMap[status] ?? status) : "Unknown";

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

function TemplateSelectField({
  value,
  onChange,
  fieldProps,
}: {
  value: TemplateSectionData;
  onChange: (next: TemplateSectionData) => void;
  fieldProps: WidgetControlFieldProps;
}) {
  const { items: templates, isLoading, error } = useWidgetTemplates();

  const options = useMemo(() => templates, [templates]);
  const selectedId = value.templateId?.trim();
  const selectValue = selectedId && selectedId.length > 0 ? selectedId : NO_TEMPLATE_VALUE;
  const selectedTemplate = options.find((item) => item.id === selectedId) ?? null;

  const handleSelect = (nextValue: string) => {
    if (nextValue === NO_TEMPLATE_VALUE) {
      updateValue(value, onChange, {
        templateId: templateSectionDefaults.templateId ?? "",
        templateName: templateSectionDefaults.templateName ?? "",
        resolved: undefined,
      });
      return;
    }

    const template = options.find((item) => item.id === nextValue);
    updateValue(value, onChange, {
      templateId: nextValue,
      templateName: template?.name ?? templateSectionDefaults.templateName ?? "",
      resolved: undefined,
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-medium">Template selection</p>
        <Select value={selectValue} onValueChange={handleSelect}>
          <SelectTrigger {...fieldProps}>
            <SelectValue
              placeholder={isLoading ? "Loading templates..." : "Choose a widget template"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TEMPLATE_VALUE}>No template</SelectItem>
            {options.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      {selectedTemplate ? (
        <div className="rounded-lg border bg-muted/20 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-foreground">{selectedTemplate.name}</p>
            <Badge variant={selectedTemplate.status === "published" ? "default" : "outline"}>
              {resolveTemplateStatusLabel(selectedTemplate.status)}
            </Badge>
          </div>
          {selectedTemplate.description ? (
            <p className="mt-1 text-muted-foreground">{selectedTemplate.description}</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          Select a widget template to render in this section.
        </div>
      )}
    </div>
  );
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

function resolveTemplateEditorDiagnostics({
  normalized,
  selectedTemplate,
  templateListLoading,
  templateListError,
}: {
  normalized: TemplateSectionData;
  selectedTemplate: WidgetTemplate | null;
  templateListLoading: boolean;
  templateListError: string | null;
}) {
  const baseState = resolveTemplateSectionState(normalized);
  if (!normalized.templateId?.trim()) {
    return {
      state: "not_selected" as const,
      summary: humanizeTemplateResolutionState("not_selected"),
      sourceBlocks: "No template selected.",
    };
  }
  if (normalized.resolved?.error) {
    return {
      state: baseState,
      summary: humanizeTemplateResolutionState(baseState),
      sourceBlocks: "Runtime reported a resolver error.",
    };
  }
  if (baseState === "ready" || baseState === "template_empty") {
    return {
      state: baseState,
      summary: humanizeTemplateResolutionState(baseState),
      sourceBlocks: selectedTemplate
        ? `${selectedTemplate.blocks.length} source block${
            selectedTemplate.blocks.length === 1 ? "" : "s"
          } in the selected template.`
        : "Source block count unavailable.",
    };
  }
  if (selectedTemplate?.status && selectedTemplate.status !== "published") {
    return {
      state: "template_unpublished" as const,
      summary: humanizeTemplateResolutionState("template_unpublished"),
      sourceBlocks: `${selectedTemplate.blocks.length} source block${
        selectedTemplate.blocks.length === 1 ? "" : "s"
      } in the draft template.`,
    };
  }
  if (!selectedTemplate && !templateListLoading && !templateListError) {
    return {
      state: "template_missing" as const,
      summary: humanizeTemplateResolutionState("template_missing"),
      sourceBlocks: "Template is absent from the admin template list.",
    };
  }
  if (templateListError) {
    return {
      state: baseState,
      summary: "template_list_unavailable: template status could not be confirmed.",
      sourceBlocks: templateListError,
    };
  }
  if (templateListLoading) {
    return {
      state: baseState,
      summary: "template_list_loading: template status is still loading.",
      sourceBlocks: "Template list is loading.",
    };
  }

  return {
    state: "preview_unresolved" as const,
    summary: humanizeTemplateResolutionState("preview_unresolved"),
    sourceBlocks: selectedTemplate
      ? `${selectedTemplate.blocks.length} source block${
          selectedTemplate.blocks.length === 1 ? "" : "s"
        } in the selected template; editor preview has not resolved them.`
      : "Source block count unavailable.",
  };
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

export function TemplateSectionWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<TemplateSectionData>) {
  return (
    <>
      <WidgetEditorSection
        id="template-section.wizard.template-setup"
        mode="wizard"
        role="setup"
        title="Template setup"
        description="Choose which widget template should render as this section."
      >
        <WidgetControlRow
          id="template-section.wizard.template-id"
          label="Template selection"
          path="templateId"
        >
          {(fieldProps) => (
            <TemplateSelectField
              value={normalizeTemplateSectionData(value)}
              onChange={onChange}
              fieldProps={fieldProps}
            />
          )}
        </WidgetControlRow>
      </WidgetEditorSection>
    </>
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
            No template selected yet. Run setup to choose one before editing presentation labels.
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
  const {
    items: templates,
    isLoading: templateListLoading,
    error: templateListError,
  } = useWidgetTemplates();
  const selectedTemplate =
    templates.find((template) => template.id === normalized.templateId?.trim()) ?? null;
  const diagnostics = resolveTemplateEditorDiagnostics({
    normalized,
    selectedTemplate,
    templateListLoading,
    templateListError,
  });
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
          }; ${diagnostics.sourceBlocks}`}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.resolution-status"
          label="Resolution status"
          path="resolved.error"
          value={diagnostics.summary}
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
          value={humanizeTemplateResolutionState(diagnostics.state)}
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
