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
import type { WidgetEditorProps } from "../../../../widgets/types";
import {
  ReadonlyWidgetSummaryRow,
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
  const nextResolved = patchResolved === undefined ? normalized.resolved : patchResolved;
  const next: TemplateSectionData = {
    ...normalized,
    ...rest,
  };
  if (nextResolved) {
    next.resolved = nextResolved;
  }
  onChange(next);
}

function TemplateSelectField({
  value,
  onChange,
}: {
  value: TemplateSectionData;
  onChange: (next: TemplateSectionData) => void;
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
          <SelectTrigger>
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
          {() => (
            <TemplateSelectField value={normalizeTemplateSectionData(value)} onChange={onChange} />
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
  const resolvedPayload = normalized.resolved ?? { blocks: [] };
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
          id="template-section.advanced.template-id"
          label="Template ID"
          path="templateId"
          value={normalized.templateId || "Not selected"}
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
          value={normalized.resolved?.error || "None"}
        />
      </WidgetEditorSection>
      <WidgetEditorSection
        id="template-section.advanced.runtime-payload"
        mode="advanced"
        role="diagnostics"
        title="Runtime payload"
        description="Read-only normalized template payload used by the renderer."
      >
        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          Resolved payload (read-only)
          <pre className="mt-2 overflow-auto rounded-md bg-muted/40 p-3 text-[11px]">
            {JSON.stringify(resolvedPayload, null, 2)}
          </pre>
        </div>
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
