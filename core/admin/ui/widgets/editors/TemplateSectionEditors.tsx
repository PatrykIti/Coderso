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
import { WidgetEditorSection } from "./WidgetEditorControls";

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

function TemplateSectionEditor({
  value,
  onChange,
  title,
  description,
  sectionId,
}: {
  value: TemplateSectionData;
  onChange: (next: TemplateSectionData) => void;
  title: string;
  description?: string;
  sectionId: string;
}) {
  const normalized = normalizeTemplateSectionData(value);
  const activeName = normalized.templateName?.trim();
  const metadata = normalized.metadata ?? templateSectionDefaults.metadata ?? {};

  return (
    <div className="space-y-4">
      <WidgetEditorSection id={`${sectionId}.selection`} title={title} description={description}>
        <div>
          <h3 className="text-lg font-semibold">Template section</h3>
        </div>
        <TemplateSelectField value={normalized} onChange={onChange} />
        {activeName ? (
          <div className="rounded-lg border bg-background/60 p-3 text-xs text-muted-foreground">
            Active template: <span className="font-semibold text-foreground">{activeName}</span>
          </div>
        ) : null}
      </WidgetEditorSection>
      <WidgetEditorSection
        id={`${sectionId}.metadata`}
        title="Preview and metadata"
        description="Store category, preview label, and version without changing runtime ownership."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Preview label</p>
          <Input
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
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Category</p>
            <Input
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
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Version</p>
            <Input
              value={metadata.version ?? ""}
              onChange={(event) =>
                updateValue(value, onChange, {
                  metadata: {
                    ...metadata,
                    version: event.target.value,
                  },
                })
              }
              placeholder="v1"
            />
          </div>
        </div>
      </WidgetEditorSection>
      <WidgetEditorSection id={`${sectionId}.runtime`} title="Runtime behavior">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Runtime behavior
        </p>
      </WidgetEditorSection>
      <Alert>
        <AlertTitle>Runtime behavior</AlertTitle>
        <AlertDescription>
          This widget renders the selected template blocks in order. Draft templates will only
          render in preview mode.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function TemplateSectionWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<TemplateSectionData>) {
  return (
    <TemplateSectionEditor
      value={value}
      onChange={onChange}
      title="Wizard"
      description="Choose which widget template should render as this section."
      sectionId="template-section.wizard"
    />
  );
}

export function TemplateSectionVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<TemplateSectionData>) {
  return (
    <TemplateSectionEditor
      value={value}
      onChange={onChange}
      title="Visual"
      description="Swap templates or verify the active selection."
      sectionId="template-section.visual"
    />
  );
}

export function TemplateSectionAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<TemplateSectionData>) {
  const normalized = normalizeTemplateSectionData(value);
  const resolvedPayload = normalized.resolved ?? { blocks: [] };

  return (
    <div className="space-y-4">
      <TemplateSectionEditor
        value={value}
        onChange={onChange}
        title="Advanced"
        description="Manage template resolution details."
        sectionId="template-section.advanced"
      />
      <WidgetEditorSection id="template-section.advanced.diagnostics" title="Resolved payload">
        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          Resolved payload (read-only)
          <pre className="mt-2 overflow-auto rounded-md bg-muted/40 p-3 text-[11px]">
            {JSON.stringify(resolvedPayload, null, 2)}
          </pre>
        </div>
      </WidgetEditorSection>
    </div>
  );
}
