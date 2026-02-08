import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  normalizeRichTextBlocks,
  normalizeRichTextSectionData,
  resolveRichTextSectionVariant,
  richTextBlockMax,
  richTextSectionDefaults,
  type RichTextSectionBlock,
  type RichTextSectionData,
  type RichTextSectionFontScale,
  type RichTextSectionLineHeight,
  type RichTextSectionMaxWidth,
  type RichTextSectionOutputMode,
  type RichTextSectionSpacing,
  type RichTextSectionVariantId,
} from "../../../../widgets/core/richTextSection";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: RichTextSectionVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "single-column",
    label: "Single Column",
    description: "Default long-form body in one readable column.",
  },
  {
    id: "two-column",
    label: "Two Column",
    description: "Split layout with optional table of contents.",
  },
  {
    id: "article",
    label: "Article",
    description: "Editorial layout focused on article reading.",
  },
];

const maxWidthOptions: Array<{ id: RichTextSectionMaxWidth; label: string }> = [
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
  { id: "full", label: "Full width" },
];

const fontScaleOptions: Array<{ id: RichTextSectionFontScale; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
];

const lineHeightOptions: Array<{ id: RichTextSectionLineHeight; label: string }> = [
  { id: "tight", label: "Tight" },
  { id: "normal", label: "Normal" },
  { id: "relaxed", label: "Relaxed" },
];

const spacingOptions: Array<{ id: RichTextSectionSpacing; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const outputModeOptions: Array<{ id: RichTextSectionOutputMode; label: string }> = [
  { id: "html", label: "HTML only" },
  { id: "blocks-fallback", label: "HTML with blocks fallback" },
  { id: "blocks", label: "Blocks only" },
];

const blockCountOptions = Array.from({ length: richTextBlockMax + 1 }, (_, index) =>
  String(index)
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type TitleBlockData = NonNullable<RichTextSectionData["titleBlock"]>;
type BodyData = NonNullable<RichTextSectionData["body"]>;
type OptionsData = NonNullable<RichTextSectionData["options"]>;
type StyleData = NonNullable<RichTextSectionData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: RichTextSectionData): RichTextSectionData {
  return normalizeRichTextSectionData(value);
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: RichTextSectionVariantId;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function updateValue(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  updater: (current: RichTextSectionData) => RichTextSectionData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateTitleBlock(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  patch: Partial<TitleBlockData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    titleBlock: {
      ...current.titleBlock,
      ...patch,
    },
  }));
}

function updateBody(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  patch: Partial<BodyData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    body: {
      ...current.body,
      ...patch,
    },
  }));
}

function updateOptions(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  patch: Partial<OptionsData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    options: {
      ...current.options,
      ...patch,
    },
  }));
}

function updateStyle(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateBlock(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  index: number,
  patch: Partial<RichTextSectionBlock>
) {
  updateValue(value, onChange, (current) => {
    const blocks = normalizeRichTextBlocks(current.body?.blocks);
    if (!blocks[index]) return current;

    const nextBlocks = [...blocks];
    nextBlocks[index] = {
      ...nextBlocks[index],
      ...patch,
    };

    return {
      ...current,
      body: {
        ...current.body,
        blocks: nextBlocks,
      },
    };
  });
}

function setBlocksCount(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  count: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    body: {
      ...current.body,
      blocks: normalizeRichTextBlocks(current.body?.blocks, count),
    },
  }));
}

function addBlock(value: RichTextSectionData, onChange: (next: RichTextSectionData) => void) {
  updateValue(value, onChange, (current) => {
    const blocks = normalizeRichTextBlocks(current.body?.blocks);
    if (blocks.length >= richTextBlockMax) return current;

    return {
      ...current,
      body: {
        ...current.body,
        blocks: normalizeRichTextBlocks(
          [
            ...blocks,
            {
              heading: `Heading ${blocks.length + 1}`,
              content: "Paragraph content.",
            },
          ],
          blocks.length + 1
        ),
      },
    };
  });
}

function removeBlock(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => {
    const blocks = normalizeRichTextBlocks(current.body?.blocks);
    const nextBlocks = blocks.filter((_, currentIndex) => currentIndex !== index);

    return {
      ...current,
      body: {
        ...current.body,
        blocks: normalizeRichTextBlocks(nextBlocks, nextBlocks.length),
      },
    };
  });
}

function moveBlock(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const blocks = normalizeRichTextBlocks(current.body?.blocks);
    if (toIndex < 0 || toIndex >= blocks.length) return current;

    const nextBlocks = [...blocks];
    const [moved] = nextBlocks.splice(fromIndex, 1);
    if (!moved) return current;
    nextBlocks.splice(toIndex, 0, moved);

    return {
      ...current,
      body: {
        ...current.body,
        blocks: nextBlocks,
      },
    };
  });
}

function DiagnosticsSnapshot({ value }: { value: RichTextSectionData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function RichTextSectionWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<RichTextSectionData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Rich text layout</p>
        <Select
          value={resolveRichTextSectionVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select variant" />
          </SelectTrigger>
          <SelectContent>
            {variantOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Eyebrow</p>
        <Input
          value={normalized.titleBlock?.eyebrow ?? ""}
          onChange={(event) =>
            updateTitleBlock(value, onChange, { eyebrow: event.target.value })
          }
          placeholder="Editorial"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Title</p>
        <Input
          value={normalized.titleBlock?.title ?? ""}
          onChange={(event) =>
            updateTitleBlock(value, onChange, { title: event.target.value })
          }
          placeholder="Long-form content section"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Body HTML</p>
        <Textarea
          value={normalized.body?.html ?? ""}
          onChange={(event) => updateBody(value, onChange, { html: event.target.value })}
          placeholder="<p>Start writing your content...</p>"
          className="min-h-40"
        />
      </div>
    </div>
  );
}

export function RichTextSectionVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<RichTextSectionData>) {
  const normalized = normalizeValue(value);
  const blocks = normalizeRichTextBlocks(normalized.body?.blocks);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose reading layout and container width."
      >
        <VariantCards value={resolveRichTextSectionVariant(variant)} onChange={onVariantChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Content max width</p>
          <Select
            value={normalized.options?.maxWidth ?? "lg"}
            onValueChange={(next) =>
              updateOptions(value, onChange, { maxWidth: next as RichTextSectionMaxWidth })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select max width" />
            </SelectTrigger>
            <SelectContent>
              {maxWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Title block copy"
        description="Edit eyebrow and title shown above content."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Eyebrow</p>
          <Input
            value={normalized.titleBlock?.eyebrow ?? ""}
            onChange={(event) =>
              updateTitleBlock(value, onChange, { eyebrow: event.target.value })
            }
            placeholder="Editorial"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.titleBlock?.title ?? ""}
            onChange={(event) =>
              updateTitleBlock(value, onChange, { title: event.target.value })
            }
            placeholder="Long-form content section"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Body content"
        description="Edit the main HTML payload for rendered copy."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">HTML body</p>
          <Textarea
            value={normalized.body?.html ?? ""}
            onChange={(event) => updateBody(value, onChange, { html: event.target.value })}
            className="min-h-52"
            placeholder="<h2>Section heading</h2><p>Paragraph content...</p>"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Structured fallback blocks"
        description="Manage fallback blocks used when output mode uses structured content."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Blocks count</p>
          <Select
            value={String(blocks.length)}
            onValueChange={(next) => setBlocksCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select block count" />
            </SelectTrigger>
            <SelectContent>
              {blockCountOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {blocks.map((block, index) => (
          <div key={block.id ?? `fallback-block-${index + 1}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Block {index + 1}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveBlock(value, onChange, index, index - 1)}
                  disabled={index === 0}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveBlock(value, onChange, index, index + 1)}
                  disabled={index === blocks.length - 1}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeBlock(value, onChange, index)}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Heading</p>
              <Input
                value={block.heading ?? ""}
                onChange={(event) =>
                  updateBlock(value, onChange, index, { heading: event.target.value })
                }
                placeholder="Heading"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Content</p>
              <Textarea
                value={block.content ?? ""}
                onChange={(event) =>
                  updateBlock(value, onChange, index, { content: event.target.value })
                }
                placeholder="Paragraph content"
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => addBlock(value, onChange)}
          disabled={blocks.length >= richTextBlockMax}
        >
          Add fallback block
        </Button>
      </EditorSection>

      <EditorSection
        title="Reader options"
        description="Control dropcap and optional table of contents."
      >
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Enable dropcap</p>
            <p className="text-xs text-muted-foreground">
              Styles first letter in the first paragraph.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.options?.dropcap)}
            onCheckedChange={(checked) =>
              updateOptions(value, onChange, { dropcap: Boolean(checked) })
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Show table of contents</p>
            <p className="text-xs text-muted-foreground">
              Builds TOC from rendered H2/H3/H4 headings.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.options?.toc)}
            onCheckedChange={(checked) =>
              updateOptions(value, onChange, { toc: Boolean(checked) })
            }
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Typography and colors"
        description="Adjust text scale, line height, spacing, and colors."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Font scale</p>
          <Select
            value={normalized.style?.fontScale ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { fontScale: next as RichTextSectionFontScale })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select font scale" />
            </SelectTrigger>
            <SelectContent>
              {fontScaleOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Line height</p>
          <Select
            value={normalized.style?.lineHeight ?? "normal"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { lineHeight: next as RichTextSectionLineHeight })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select line height" />
            </SelectTrigger>
            <SelectContent>
              {lineHeightOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing density</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as RichTextSectionSpacing })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ColorField
          label="Text color"
          value={normalized.style?.textColor}
          onChange={(next) => updateStyle(value, onChange, { textColor: next })}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
        <ColorField
          label="Background color"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
      </EditorSection>
    </div>
  );
}

export function RichTextSectionAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<RichTextSectionData>) {
  const normalized = normalizeValue(value);
  const blocks = normalizeRichTextBlocks(normalized.body?.blocks);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Output mode and fallback"
        description="Control whether runtime uses HTML payload or structured blocks."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Output mode</p>
          <Select
            value={normalized.options?.outputMode ?? "blocks-fallback"}
            onValueChange={(next) =>
              updateOptions(value, onChange, { outputMode: next as RichTextSectionOutputMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select output mode" />
            </SelectTrigger>
            <SelectContent>
              {outputModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Current structured fallback block count: {blocks.length}
        </p>
      </EditorSection>

      <EditorSection
        title="Technical typography tokens"
        description="Low-level style tokens for output control."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Font scale token</p>
          <Select
            value={normalized.style?.fontScale ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { fontScale: next as RichTextSectionFontScale })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select font scale token" />
            </SelectTrigger>
            <SelectContent>
              {fontScaleOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Line height token</p>
          <Select
            value={normalized.style?.lineHeight ?? "normal"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { lineHeight: next as RichTextSectionLineHeight })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select line height token" />
            </SelectTrigger>
            <SelectContent>
              {lineHeightOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing token</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as RichTextSectionSpacing })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select spacing token" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic fallback values and payload shape."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(normalizeValue(value))}>
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(richTextSectionDefaults)}>
            Reset to defaults
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="Raw payload snapshot">
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
