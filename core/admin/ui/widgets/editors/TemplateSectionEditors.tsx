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
  templateSectionDefaults,
  type TemplateSectionData,
} from "../../../../widgets/core/templateSection";
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

function humanizeTemplateError(error: string | undefined): string {
  switch (error) {
    case "template_missing":
      return "The selected template could not be found.";
    case "template_unpublished":
      return "The selected template is still a draft.";
    case "template_loop":
      return "This template contains itself and cannot be rendered safely.";
    case undefined:
    case "":
      return "No resolution problem detected.";
    default:
      return "The template could not be resolved.";
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
          id="template-section.advanced.version"
          label="Version"
          path="metadata.version"
          value={metadata.version || "Not configured"}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.resolved-blocks"
          label="Resolved blocks"
          path="resolved.blocks"
          value={`${resolvedBlockCount} block${resolvedBlockCount === 1 ? "" : "s"}`}
        />
        <ReadonlyWidgetSummaryRow
          id="template-section.advanced.resolution-error"
          label="Resolution error"
          path="resolved.error"
          value={humanizeTemplateError(normalized.resolved?.error)}
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
            This widget renders the selected template blocks in order. Draft templates will only
            render in preview mode.
          </AlertDescription>
        </Alert>
      </WidgetEditorSection>
    </>
  );
}
