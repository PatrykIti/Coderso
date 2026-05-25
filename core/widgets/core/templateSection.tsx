import type { ComponentType } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetLayoutDefaults,
} from "../types";

export const TEMPLATE_SECTION_TYPE = "template-section";

export type TemplateSectionData = {
  templateId?: string;
  templateName?: string;
  metadata?: {
    category?: string;
    previewLabel?: string;
    version?: string;
  };
  resolved?: {
    blocks?: WidgetBlock[];
    error?: string;
  };
};

export const templateSectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    templateId: { type: "string" },
    templateName: { type: "string" },
    metadata: {
      type: "object",
      additionalProperties: false,
      properties: {
        category: { type: "string" },
        previewLabel: { type: "string" },
        version: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        blocks: {
          type: "array",
          items: {
            type: "object",
          },
        },
        error: { type: "string" },
      },
    },
  },
};

export const templateSectionDefaults: TemplateSectionData = {
  templateId: "",
  templateName: "",
  metadata: {
    category: "",
    previewLabel: "",
    version: "",
  },
};

const templateSectionEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "template-section.wizard.template-setup",
      title: "Template setup",
      role: "setup",
      writablePaths: ["templateId", "templateName"],
    },
    {
      mode: "visual",
      id: "template-section.visual.active-template",
      title: "Active template",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["templateId", "templateName"],
    },
    {
      mode: "visual",
      id: "template-section.visual.presentation-fields",
      title: "Template presentation",
      role: "visual",
      writablePaths: ["metadata.previewLabel", "metadata.category"],
      readOnlyPaths: ["metadata.version"],
    },
    {
      mode: "advanced",
      id: "template-section.advanced.template-diagnostics",
      title: "Resolved template",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "templateId",
        "templateName",
        "metadata.previewLabel",
        "metadata.version",
        "resolved.blocks",
        "resolved.error",
      ],
    },
    {
      mode: "advanced",
      id: "template-section.advanced.runtime-payload",
      title: "Resolved content summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["resolved.blocks", "resolved.error"],
    },
    {
      mode: "advanced",
      id: "template-section.advanced.runtime-rules",
      title: "Runtime behavior",
      role: "summary",
      writablePaths: [],
    },
  ],
} satisfies WidgetEditorContract;

export function normalizeTemplateSectionData(data: TemplateSectionData): TemplateSectionData {
  const templateId = typeof data.templateId === "string" ? data.templateId : "";
  const templateName = typeof data.templateName === "string" ? data.templateName : "";
  const metadata = data.metadata
    ? {
        category: typeof data.metadata.category === "string" ? data.metadata.category : "",
        previewLabel:
          typeof data.metadata.previewLabel === "string" ? data.metadata.previewLabel : "",
        version: typeof data.metadata.version === "string" ? data.metadata.version : "",
      }
    : templateSectionDefaults.metadata;
  const resolvedBlocks =
    data.resolved && Array.isArray(data.resolved.blocks) ? data.resolved.blocks : undefined;
  const resolvedError =
    data.resolved && typeof data.resolved.error === "string" ? data.resolved.error : undefined;

  return {
    templateId,
    templateName,
    metadata,
    ...(data.resolved
      ? {
          resolved: {
            ...(resolvedBlocks ? { blocks: resolvedBlocks } : {}),
            ...(resolvedError ? { error: resolvedError } : {}),
          },
        }
      : {}),
  };
}

const resolveTemplateLabel = (data: TemplateSectionData) => {
  const previewLabel = data.metadata?.previewLabel?.trim();
  if (previewLabel) return previewLabel;
  const name = data.templateName?.trim();
  if (name) return name;
  return "Template section";
};

const resolvePlaceholderMessage = (data: TemplateSectionData) => {
  const templateId = data.templateId?.trim();
  if (!templateId) return "Select a widget template to render here.";

  switch (data.resolved?.error) {
    case "template_missing":
      return "Template not found. Pick another template.";
    case "template_unpublished":
      return "Template is not published yet.";
    case "template_loop":
      return "Template loop detected. Remove nested template sections.";
    default:
      return "This template has no blocks yet.";
  }
};

const TemplateSectionPlaceholder = ({
  label,
  message,
  templateId,
}: {
  label: string;
  message: string;
  templateId?: string;
}) => (
  <div
    className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm"
    data-template-section={templateId ?? ""}
    data-template-section-state="empty"
  >
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Template section
    </p>
    <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
    <p className="mt-1 text-xs text-muted-foreground">{message}</p>
  </div>
);

export function TemplateSectionBlock({
  data,
  previewDevice,
  pageDefaults,
}: {
  data: TemplateSectionData;
  variant: string;
  previewDevice?: DeviceTarget;
  pageDefaults?: WidgetLayoutDefaults;
}) {
  const normalized = normalizeTemplateSectionData(data);
  const blocks = Array.isArray(normalized.resolved?.blocks) ? normalized.resolved?.blocks : [];
  const templateId = normalized.templateId?.trim();
  const label = resolveTemplateLabel(normalized);
  const metadata = normalized.metadata ?? templateSectionDefaults.metadata ?? {};
  const category = metadata.category?.trim();
  const previewLabel = metadata.previewLabel?.trim();
  const version = metadata.version?.trim();

  if (normalized.resolved?.error || !blocks.length) {
    return (
      <TemplateSectionPlaceholder
        label={label}
        message={resolvePlaceholderMessage(normalized)}
        templateId={templateId}
      />
    );
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-template-section={templateId ?? ""}
      data-template-section-state="ready"
      data-template-section-category={category ?? ""}
      data-template-section-version={version ?? ""}
    >
      {previewLabel || category || version ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {previewLabel ? <span>{previewLabel}</span> : null}
          {category ? <span>{category}</span> : null}
          {version ? <span>{version}</span> : null}
        </div>
      ) : null}
      {blocks.map((child) => (
        <WidgetRenderer
          key={child.id}
          block={child}
          previewDevice={previewDevice}
          pageDefaults={pageDefaults}
        />
      ))}
    </div>
  );
}

export function createTemplateSectionWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<TemplateSectionData>>;
  visual: ComponentType<WidgetEditorProps<TemplateSectionData>>;
  advanced: ComponentType<WidgetEditorProps<TemplateSectionData>>;
}): WidgetDefinition<TemplateSectionData> {
  return {
    type: TEMPLATE_SECTION_TYPE,
    title: "Template section",
    description: "Render a reusable widget template as a page section.",
    category: "layout",
    variants: [{ id: "default", label: "Default" }],
    schema: templateSectionSchema,
    defaults: templateSectionDefaults,
    editor: editors,
    editorCapabilities: { visualOwnsVariantSelection: true },
    editorContract: templateSectionEditorContract,
    render: TemplateSectionBlock,
  };
}
