import { useState, type ReactNode } from "react";

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
import { listMediaCached, type MediaRecord } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { formatBytes } from "@/ui/media/utils";
import { PostRichTextAdapter } from "@/ui/posts/editor/richtext/PostRichTextAdapter";

import {
  normalizeRichTextBlocks,
  normalizeRichTextSectionData,
  renderRichTextSectionHtmlPreview,
  resolveRichTextDropcapStatus,
  resolveRichTextRenderedSource,
  resolveRichTextSectionVariant,
  richTextBlockMax,
  richTextSectionDefaults,
  sanitizeRichTextHtmlWithDiagnostics,
  type RichTextRenderedSourceState,
  type RichTextSanitizerDiagnostic,
  type RichTextSectionAttachmentBlock,
  type RichTextSectionBlock,
  type RichTextSectionBlockHeadingLevel,
  type RichTextSectionData,
  type RichTextSectionEmbedAspectRatio,
  type RichTextSectionFontScale,
  type RichTextSectionImageBlock,
  type RichTextSectionLineHeight,
  type RichTextSectionMaxWidth,
  type RichTextSectionOutputMode,
  type RichTextSectionSpacing,
  type RichTextSectionTextBlock,
  type RichTextSectionTitleHeadingLevel,
  type RichTextSectionVariantId,
} from "../../../../widgets/core/richTextSection";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ConfirmActionDialog } from "../../shared/ConfirmActionDialog";
import { SharedColorControl } from "./SharedColorControl";
import { WidgetEditorSection } from "./WidgetEditorControls";

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
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
];

const lineHeightOptions: Array<{ id: RichTextSectionLineHeight; label: string }> = [
  { id: "none", label: "None" },
  { id: "tight", label: "Tight" },
  { id: "normal", label: "Normal" },
  { id: "relaxed", label: "Relaxed" },
];

const spacingOptions: Array<{ id: RichTextSectionSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const outputModeOptions: Array<{
  id: RichTextSectionOutputMode;
  label: string;
  description: string;
}> = [
  {
    id: "html",
    label: "Prefer rich text body",
    description: "Render the Visual body copy only.",
  },
  {
    id: "blocks-fallback",
    label: "Use body, then blocks",
    description: "Render body copy when present, otherwise use structured blocks.",
  },
  {
    id: "blocks",
    label: "Use structured blocks only",
    description: "Render the structured blocks and keep body copy on standby.",
  },
];

const titleHeadingLevelOptions: Array<{
  id: RichTextSectionTitleHeadingLevel;
  label: string;
}> = [
  { id: 1, label: "H1" },
  { id: 2, label: "H2" },
  { id: 3, label: "H3" },
];

const blockHeadingLevelOptions: Array<{
  id: RichTextSectionBlockHeadingLevel;
  label: string;
}> = [
  { id: 2, label: "H2" },
  { id: 3, label: "H3" },
  { id: 4, label: "H4" },
];

const embedAspectRatioOptions: Array<{
  id: RichTextSectionEmbedAspectRatio;
  label: string;
}> = [
  { id: "16:9", label: "16:9" },
  { id: "4:3", label: "4:3" },
  { id: "1:1", label: "1:1" },
];

const blockCountOptions = Array.from({ length: richTextBlockMax + 1 }, (_, index) => String(index));
const wizardBlockCount = Math.max(richTextSectionDefaults.body?.blocks?.length ?? 2, 2);
const blockPageSize = 5;

type TitleBlockData = NonNullable<RichTextSectionData["titleBlock"]>;
type BodyData = NonNullable<RichTextSectionData["body"]>;
type OptionsData = NonNullable<RichTextSectionData["options"]>;
type StyleData = NonNullable<RichTextSectionData["style"]>;
type PendingUndoState = {
  label: string;
  blocks: RichTextSectionBlock[];
};

function normalizeValue(value: RichTextSectionData): RichTextSectionData {
  return normalizeRichTextSectionData(value);
}

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
  compact = false,
}: {
  value: RichTextSectionVariantId;
  onChange?: (next: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-3" : "space-y-2"}>
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "rounded-lg border text-left transition",
            compact ? "p-2.5" : "w-full p-3",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p
              className={cn("min-w-0 font-semibold leading-tight", compact ? "text-xs" : "text-sm")}
            >
              {option.label}
            </p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className={cn("mt-1 text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
            {option.description}
          </p>
        </button>
      ))}
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

function clearStyleField(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
}

function replaceBlocks(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  nextBlocks: RichTextSectionBlock[]
) {
  updateBody(value, onChange, { blocks: normalizeRichTextBlocks(nextBlocks) });
}

function updateBlocks(
  value: RichTextSectionData,
  onChange: (next: RichTextSectionData) => void,
  updater: (blocks: RichTextSectionBlock[]) => RichTextSectionBlock[]
) {
  updateValue(value, onChange, (current) => {
    const nextBlocks = updater(normalizeRichTextBlocks(current.body?.blocks));
    return {
      ...current,
      body: {
        ...current.body,
        blocks: normalizeRichTextBlocks(nextBlocks),
      },
    };
  });
}

function createTextBlock(index: number): RichTextSectionTextBlock {
  return {
    id: `block-${index + 1}`,
    kind: "text",
    heading: `Heading ${index + 1}`,
    headingLevel: index === 0 ? 2 : 3,
    contentHtml: "<p>Paragraph content.</p>",
  };
}

function createImageBlock(index: number): RichTextSectionImageBlock {
  return {
    id: `block-${index + 1}`,
    kind: "image",
    width: "wide",
    align: "center",
  };
}

function createAttachmentBlock(index: number): RichTextSectionAttachmentBlock {
  return {
    id: `block-${index + 1}`,
    kind: "attachment",
    label: `Attachment ${index + 1}`,
  };
}

function createEmbedBlock(index: number): RichTextSectionBlock {
  return {
    id: `block-${index + 1}`,
    kind: "embed",
    title: `Shared link ${index + 1}`,
    aspectRatio: "16:9",
    renderMode: "link-card",
  };
}

function createBlockByKind(
  kind: RichTextSectionBlock["kind"],
  index: number
): RichTextSectionBlock {
  if (kind === "image") return createImageBlock(index);
  if (kind === "attachment") return createAttachmentBlock(index);
  if (kind === "embed") return createEmbedBlock(index);
  return createTextBlock(index);
}

function ensureBlocksCount(blocks: RichTextSectionBlock[], desiredCount: number) {
  const normalized = normalizeRichTextBlocks(blocks);
  if (normalized.length >= desiredCount) {
    return normalized.slice(0, desiredCount);
  }

  const nextBlocks = [...normalized];
  while (nextBlocks.length < desiredCount) {
    nextBlocks.push(createTextBlock(nextBlocks.length));
  }
  return normalizeRichTextBlocks(nextBlocks, desiredCount);
}

function escapePlainText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveTextBlockEditorValue(block: RichTextSectionTextBlock) {
  if (typeof block.contentHtml === "string" && block.contentHtml.trim().length > 0) {
    return block.contentHtml;
  }
  if (typeof block.content === "string" && block.content.trim().length > 0) {
    return `<p>${escapePlainText(block.content.trim()).replace(/\n/g, "<br />")}</p>`;
  }
  return "";
}

function resolveMediaRecordLabel(media: MediaRecord) {
  const title = media.title?.trim();
  if (title) return title;
  const originalName = media.originalName?.trim();
  if (originalName) return originalName;
  const keyPart = media.key?.split("/").pop()?.trim();
  if (keyPart) return keyPart;
  const urlPart = media.url?.split("/").pop()?.trim();
  return urlPart || "asset";
}

function formatSanitizerMessage(diagnostic: RichTextSanitizerDiagnostic) {
  if (diagnostic.code === "href_rewritten") {
    return "Unsafe link URLs are rewritten to a safe placeholder before save.";
  }

  if (diagnostic.code === "tag_removed") {
    if (diagnostic.tagName === "img") {
      return "Pasted images are removed from HTML. Use a structured image block instead.";
    }
    if (
      diagnostic.tagName === "iframe" ||
      diagnostic.tagName === "embed" ||
      diagnostic.tagName === "object"
    ) {
      return "Raw embeds and iframes are removed. Use a safe embed or attachment block instead.";
    }
    if (diagnostic.tagName === "script" || diagnostic.tagName === "style") {
      return "Executable or styling tags are removed from public rich text.";
    }
    if (diagnostic.tagName === "h1") {
      return "H1 is removed from the body. Use the section title or H2/H3/H4 headings instead.";
    }
    return `Unsupported <${diagnostic.tagName}> markup is removed before save.`;
  }

  if (diagnostic.attributeName?.startsWith("on")) {
    return "Inline event handlers are removed from rich text content.";
  }

  if (diagnostic.attributeName) {
    return `Unsupported ${diagnostic.attributeName} attributes are removed from public rich text.`;
  }

  return "Unsupported rich text markup is removed before save.";
}

function RichTextSanitizerNotice({ diagnostics }: { diagnostics: RichTextSanitizerDiagnostic[] }) {
  if (diagnostics.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900">
      <p className="font-medium">Sanitizer guidance</p>
      <ul className="mt-2 space-y-1 text-xs text-amber-950/85">
        {diagnostics.map((diagnostic, index) => (
          <li
            key={`${diagnostic.code}-${diagnostic.tagName ?? "tag"}-${diagnostic.attributeName ?? index}`}
          >
            {formatSanitizerMessage(diagnostic)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RichTextSourceStatus({
  source,
  section,
}: {
  source: RichTextRenderedSourceState;
  section: "html" | "blocks";
}) {
  const isActive = section === "html" ? source.htmlIsActive : source.blocksAreActive;
  const label = section === "html" ? "Rich text body" : "Structured blocks";

  let description = "";
  if (section === "html") {
    description =
      source.mode === "html"
        ? "Rich text body is the only rendered source for this preference."
        : source.reason === "fallback-html-present"
          ? "Rich text body currently renders because it has content."
          : source.reason === "fallback-html-empty"
            ? "Rich text body is empty, so blocks currently render instead."
            : "Choose a body-first source preference to render this source.";
  } else {
    description =
      source.mode === "blocks"
        ? "Structured blocks are the only rendered source for this preference."
        : source.reason === "fallback-html-empty"
          ? "Blocks currently render because the rich text body is empty."
          : source.reason === "fallback-html-present"
            ? "Blocks are on standby until the rich text body becomes empty."
            : "Choose structured blocks only to render this source.";
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
      <Badge variant={isActive ? "default" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function UndoNotice({
  pendingUndo,
  onUndo,
  onDismiss,
}: {
  pendingUndo: PendingUndoState | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!pendingUndo) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/10 p-3">
      <p className="text-sm text-foreground/80">{pendingUndo.label}. Undo is available.</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onUndo}>
          Undo
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function resolveBlockLabel(block: RichTextSectionBlock, index: number) {
  if (block.kind === "image") {
    return block.caption?.trim() || block.alt?.trim() || `Image ${index + 1}`;
  }
  if (block.kind === "attachment") {
    return block.label?.trim() || `Attachment ${index + 1}`;
  }
  if (block.kind === "embed") {
    return block.title?.trim() || `Embed ${index + 1}`;
  }
  return block.heading?.trim() || `Text block ${index + 1}`;
}

function resolveBlockKindLabel(block: RichTextSectionBlock) {
  if (block.kind === "image") return "Image";
  if (block.kind === "attachment") return "Attachment";
  if (block.kind === "embed") return "Embed";
  return "Text";
}

export function RichTextSectionWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<RichTextSectionData>) {
  const normalized = normalizeValue(value);
  const source = resolveRichTextRenderedSource(normalized);
  const blocks = ensureBlocksCount(
    normalizeRichTextBlocks(normalized.body?.blocks),
    wizardBlockCount
  );

  return (
    <WidgetEditorSection
      id="rich-text-section.wizard.starter-copy"
      mode="wizard"
      role="setup"
      title="Starter copy"
      description="Seed the layout, title, and first structured text blocks."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Rich text layout</p>
          <VariantCards
            value={resolveRichTextSectionVariant(variant)}
            onChange={onVariantChange}
            compact
          />
        </div>

        <div className="space-y-2 rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-sm font-medium">Output mode stays untouched in Wizard</p>
          <p className="text-xs text-muted-foreground">
            Current mode: {source.mode}. Wizard updates the first two structured text blocks without
            changing which source renders publicly.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Eyebrow</p>
          <Input
            value={normalized.titleBlock?.eyebrow ?? ""}
            onChange={(event) => updateTitleBlock(value, onChange, { eyebrow: event.target.value })}
            placeholder="Editorial"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.titleBlock?.title ?? ""}
            onChange={(event) => updateTitleBlock(value, onChange, { title: event.target.value })}
            placeholder="Long-form content section"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Structured quick-start blocks</p>
          <p className="text-xs text-muted-foreground">
            Wizard keeps the first two text blocks beginner-friendly. Media, attachments, embeds,
            and raw HTML stay in Visual and Advanced.
          </p>
          {blocks.slice(0, 2).map((block, index) => {
            if (block.kind && block.kind !== "text") {
              return (
                <div
                  key={block.id ?? `wizard-block-${index + 1}`}
                  className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground"
                >
                  Block {index + 1} currently contains {resolveBlockKindLabel(block).toLowerCase()}.
                  Use Visual mode to edit non-text structured blocks.
                </div>
              );
            }

            return (
              <div key={block.id ?? `wizard-block-${index + 1}`} className="space-y-2">
                <Input
                  value={block.heading ?? ""}
                  onChange={(event) =>
                    updateBlocks(value, onChange, (currentBlocks) => {
                      const nextBlocks = ensureBlocksCount(currentBlocks, wizardBlockCount);
                      nextBlocks[index] = {
                        ...(nextBlocks[index] as RichTextSectionTextBlock),
                        kind: "text",
                        heading: event.target.value,
                      };
                      return nextBlocks;
                    })
                  }
                  placeholder={`Heading ${index + 1}`}
                />
                <Textarea
                  value={(block.contentHtml ? "" : block.content) ?? ""}
                  onChange={(event) =>
                    updateBlocks(value, onChange, (currentBlocks) => {
                      const nextBlocks = ensureBlocksCount(currentBlocks, wizardBlockCount);
                      nextBlocks[index] = {
                        ...(nextBlocks[index] as RichTextSectionTextBlock),
                        kind: "text",
                        content: event.target.value,
                        contentHtml: undefined,
                      };
                      return nextBlocks;
                    })
                  }
                  placeholder={`Paragraph ${index + 1}`}
                  className="min-h-28"
                />
              </div>
            );
          })}
        </div>
      </div>
    </WidgetEditorSection>
  );
}

export function RichTextSectionVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<RichTextSectionData>) {
  const normalized = normalizeValue(value);
  const source = resolveRichTextRenderedSource(normalized);
  const dropcapStatus = resolveRichTextDropcapStatus(normalized);
  const selectedOutputMode =
    outputModeOptions.find(
      (option) => option.id === (normalized.options?.outputMode ?? "blocks-fallback")
    ) ?? outputModeOptions[1];
  const blocks = normalizeRichTextBlocks(normalized.body?.blocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id ?? null);
  const [blockPage, setBlockPage] = useState(0);
  const [pendingRemoveBlockId, setPendingRemoveBlockId] = useState<string | null>(null);
  const [pendingBlockCount, setPendingBlockCount] = useState<number | null>(null);
  const [pendingUndo, setPendingUndo] = useState<PendingUndoState | null>(null);
  const [bodyDiagnostics, setBodyDiagnostics] = useState<RichTextSanitizerDiagnostic[]>([]);
  const [blockDiagnosticsById, setBlockDiagnosticsById] = useState<
    Record<string, RichTextSanitizerDiagnostic[]>
  >({});
  const [selectedMediaIdsByBlockId, setSelectedMediaIdsByBlockId] = useState<
    Record<string, string | null>
  >({});
  const [mediaPickerErrorsByBlockId, setMediaPickerErrorsByBlockId] = useState<
    Record<string, string>
  >({});

  const maxPage = Math.max(0, Math.ceil(blocks.length / blockPageSize) - 1);
  const safePage = Math.min(blockPage, maxPage);
  const visibleBlocks = blocks.slice(
    safePage * blockPageSize,
    safePage * blockPageSize + blockPageSize
  );
  const activeBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? visibleBlocks[0] ?? blocks[0] ?? null;
  const activeBlockId = activeBlock?.id ?? null;
  const activeBlockIndex = activeBlockId
    ? blocks.findIndex((block) => block.id === activeBlockId)
    : -1;
  const pendingRemoveBlock =
    pendingRemoveBlockId !== null
      ? blocks.find((block) => block.id === pendingRemoveBlockId)
      : undefined;

  const handleBodyRichTextChange = (nextHtml: string) => {
    const result = sanitizeRichTextHtmlWithDiagnostics(nextHtml);
    setBodyDiagnostics(result.diagnostics);
    updateBody(value, onChange, { html: result.html });
  };

  const handleBlockRichTextChange = (blockId: string, nextHtml: string) => {
    const result = sanitizeRichTextHtmlWithDiagnostics(nextHtml);
    setBlockDiagnosticsById((current) => ({
      ...current,
      [blockId]: result.diagnostics,
    }));
    updateBlocks(value, onChange, (currentBlocks) => {
      const nextBlocks = [...currentBlocks];
      const blockIndex = nextBlocks.findIndex((block) => block.id === blockId);
      if (blockIndex < 0) return currentBlocks;
      const currentBlock = nextBlocks[blockIndex];
      if (!currentBlock || (currentBlock.kind && currentBlock.kind !== "text")) {
        return currentBlocks;
      }
      nextBlocks[blockIndex] = {
        ...(currentBlock as RichTextSectionTextBlock),
        kind: "text",
        contentHtml: result.html,
        content: undefined,
      };
      return nextBlocks;
    });
  };

  const handleAddBlock = (kind: RichTextSectionBlock["kind"]) => {
    updateBlocks(value, onChange, (currentBlocks) => {
      if (currentBlocks.length >= richTextBlockMax) return currentBlocks;
      const nextBlocks = [...currentBlocks, createBlockByKind(kind, currentBlocks.length)];
      return normalizeRichTextBlocks(nextBlocks);
    });
    const nextIndex = Math.min(blocks.length, richTextBlockMax - 1);
    setSelectedBlockId(`block-${nextIndex + 1}`);
    setBlockPage(Math.floor(nextIndex / blockPageSize));
  };

  const handleRequestBlockCount = (nextCount: number) => {
    if (nextCount < blocks.length) {
      setPendingBlockCount(nextCount);
      return;
    }
    replaceBlocks(value, onChange, ensureBlocksCount(blocks, nextCount));
  };

  const handleConfirmBlockCountReduction = () => {
    if (pendingBlockCount === null) return;
    setPendingUndo({
      label: `Reduced structured blocks from ${blocks.length} to ${pendingBlockCount}`,
      blocks,
    });
    replaceBlocks(value, onChange, ensureBlocksCount(blocks, pendingBlockCount));
    setPendingBlockCount(null);
  };

  const handleUndo = () => {
    if (!pendingUndo) return;
    replaceBlocks(value, onChange, pendingUndo.blocks);
    setPendingUndo(null);
  };

  const handleDismissUndo = () => setPendingUndo(null);

  const handleMoveBlock = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= blocks.length) return;
    updateBlocks(value, onChange, (currentBlocks) => {
      const nextBlocks = [...currentBlocks];
      const [moved] = nextBlocks.splice(fromIndex, 1);
      if (!moved) return currentBlocks;
      nextBlocks.splice(toIndex, 0, moved);
      return nextBlocks;
    });
  };

  const handleConfirmRemoveBlock = () => {
    if (!pendingRemoveBlockId) return;
    setPendingUndo({
      label: `${
        pendingRemoveBlock?.id
          ? resolveBlockLabel(
              pendingRemoveBlock,
              blocks.findIndex((entry) => entry.id === pendingRemoveBlock.id)
            )
          : "Block"
      } removed`,
      blocks,
    });
    updateBlocks(value, onChange, (currentBlocks) =>
      currentBlocks.filter((block) => block.id !== pendingRemoveBlockId)
    );
    setPendingRemoveBlockId(null);
  };

  const setBlockMediaError = (blockId: string, message?: string) => {
    setMediaPickerErrorsByBlockId((current) => {
      if (!message) {
        const next = { ...current };
        delete next[blockId];
        return next;
      }
      return {
        ...current,
        [blockId]: message,
      };
    });
  };

  const handleImageMediaSelection = async (blockId: string, nextValue: unknown) => {
    const mediaId = typeof nextValue === "string" && nextValue.trim().length > 0 ? nextValue : null;
    setSelectedMediaIdsByBlockId((current) => ({ ...current, [blockId]: mediaId }));
    setBlockMediaError(blockId);

    if (!mediaId) {
      updateBlocks(value, onChange, (currentBlocks) => {
        const nextBlocks = [...currentBlocks];
        const blockIndex = nextBlocks.findIndex((block) => block.id === blockId);
        const currentBlock = nextBlocks[blockIndex];
        if (!currentBlock || currentBlock.kind !== "image") return currentBlocks;
        nextBlocks[blockIndex] = {
          ...currentBlock,
          mediaId: undefined,
          src: undefined,
        };
        return nextBlocks;
      });
      return;
    }

    try {
      const mediaItems = await listMediaCached({ force: false });
      const media = mediaItems.find((item) => item.id === mediaId);
      if (!media || !media.url || !media.mimeType.toLowerCase().startsWith("image/")) {
        throw new Error("rich_text_image_media_invalid");
      }

      updateBlocks(value, onChange, (currentBlocks) => {
        const nextBlocks = [...currentBlocks];
        const blockIndex = nextBlocks.findIndex((block) => block.id === blockId);
        const currentBlock = nextBlocks[blockIndex];
        if (!currentBlock || currentBlock.kind !== "image") return currentBlocks;
        nextBlocks[blockIndex] = {
          ...currentBlock,
          mediaId: media.id,
          src: media.url,
          alt:
            currentBlock.alt?.trim() ||
            media.alt?.trim() ||
            media.title?.trim() ||
            media.caption?.trim() ||
            media.originalName?.trim() ||
            undefined,
          caption: currentBlock.caption ?? media.caption ?? undefined,
        };
        return nextBlocks;
      });
    } catch {
      setBlockMediaError(blockId, "Selected image is unavailable or missing a public render URL.");
    }
  };

  const handleAttachmentMediaSelection = async (blockId: string, nextValue: unknown) => {
    const mediaId = typeof nextValue === "string" && nextValue.trim().length > 0 ? nextValue : null;
    setSelectedMediaIdsByBlockId((current) => ({ ...current, [blockId]: mediaId }));
    setBlockMediaError(blockId);

    if (!mediaId) {
      updateBlocks(value, onChange, (currentBlocks) => {
        const nextBlocks = [...currentBlocks];
        const blockIndex = nextBlocks.findIndex((block) => block.id === blockId);
        const currentBlock = nextBlocks[blockIndex];
        if (!currentBlock || currentBlock.kind !== "attachment") return currentBlocks;
        nextBlocks[blockIndex] = {
          ...currentBlock,
          mediaId: undefined,
          src: undefined,
        };
        return nextBlocks;
      });
      return;
    }

    try {
      const mediaItems = await listMediaCached({ force: false });
      const media = mediaItems.find((item) => item.id === mediaId);
      if (!media || !media.url) {
        throw new Error("rich_text_attachment_media_invalid");
      }
      if (media.mimeType.toLowerCase().startsWith("image/")) {
        throw new Error("rich_text_attachment_image_invalid");
      }

      updateBlocks(value, onChange, (currentBlocks) => {
        const nextBlocks = [...currentBlocks];
        const blockIndex = nextBlocks.findIndex((block) => block.id === blockId);
        const currentBlock = nextBlocks[blockIndex];
        if (!currentBlock || currentBlock.kind !== "attachment") return currentBlocks;
        nextBlocks[blockIndex] = {
          ...currentBlock,
          mediaId: media.id,
          src: media.url,
          label: currentBlock.label?.trim() || resolveMediaRecordLabel(media),
          mimeType: media.mimeType,
          sizeLabel: formatBytes(media.size),
        };
        return nextBlocks;
      });
    } catch {
      setBlockMediaError(blockId, "Selected asset cannot be used as a public attachment card.");
    }
  };

  const activeTextBlock =
    activeBlock && (!activeBlock.kind || activeBlock.kind === "text")
      ? (activeBlock as RichTextSectionTextBlock)
      : null;
  const activeImageBlock =
    activeBlock?.kind === "image" ? (activeBlock as RichTextSectionImageBlock) : null;
  const activeAttachmentBlock =
    activeBlock?.kind === "attachment" ? (activeBlock as RichTextSectionAttachmentBlock) : null;
  const activeEmbedBlock = activeBlock?.kind === "embed" ? activeBlock : null;

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
        description="Edit the section eyebrow, title, and heading semantics."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Eyebrow</p>
          <Input
            value={normalized.titleBlock?.eyebrow ?? ""}
            onChange={(event) => updateTitleBlock(value, onChange, { eyebrow: event.target.value })}
            placeholder="Editorial"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.titleBlock?.title ?? ""}
            onChange={(event) => updateTitleBlock(value, onChange, { title: event.target.value })}
            placeholder="Long-form content section"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Title heading level</p>
          <Select
            value={String(normalized.titleBlock?.headingLevel ?? 2)}
            onValueChange={(next) =>
              updateTitleBlock(value, onChange, {
                headingLevel: Number(next) as RichTextSectionTitleHeadingLevel,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select title heading level" />
            </SelectTrigger>
            <SelectContent>
              {titleHeadingLevelOptions.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Body content"
        description="Edit the primary HTML source with safe rich-text authoring instead of raw HTML."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Source preference</p>
          <Select
            value={normalized.options?.outputMode ?? "blocks-fallback"}
            onValueChange={(next) =>
              updateOptions(value, onChange, { outputMode: next as RichTextSectionOutputMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source preference" />
            </SelectTrigger>
            <SelectContent>
              {outputModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{selectedOutputMode.description}</p>
        </div>
        <RichTextSourceStatus source={source} section="html" />
        <PostRichTextAdapter
          value={normalized.body?.html ?? ""}
          onChange={handleBodyRichTextChange}
          placeholder="Write the primary story body here..."
          ariaLabel="Rich text body editor"
          minHeightClassName="min-h-52"
          toolbarProfile="writing-canvas"
        />
        <p className="text-xs text-muted-foreground">
          Allowed body markup stays within the widget contract. Images, raw embeds, H1, and unsafe
          attributes are stripped before save and surfaced below.
        </p>
        <RichTextSanitizerNotice diagnostics={bodyDiagnostics} />
      </EditorSection>

      <EditorSection
        title="Structured content blocks"
        description="Manage fallback blocks, inline media, attachments, and safe embed link cards."
      >
        <RichTextSourceStatus source={source} section="blocks" />

        <div className="space-y-2">
          <p className="text-sm font-medium">Blocks count</p>
          <Select
            value={String(blocks.length)}
            onValueChange={(next) => handleRequestBlockCount(Number(next))}
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
          <p className="text-xs text-muted-foreground">
            Reducing the count requires confirmation and can be undone.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => handleAddBlock("text")}>
            Add text block
          </Button>
          <Button type="button" variant="outline" onClick={() => handleAddBlock("image")}>
            Add image block
          </Button>
          <Button type="button" variant="outline" onClick={() => handleAddBlock("attachment")}>
            Add attachment block
          </Button>
          <Button type="button" variant="outline" onClick={() => handleAddBlock("embed")}>
            Add embed block
          </Button>
        </div>

        <UndoNotice pendingUndo={pendingUndo} onUndo={handleUndo} onDismiss={handleDismissUndo} />

        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No structured blocks yet. Add a text, image, attachment, or embed block to create a
            fallback reading flow.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Block navigator</p>
                {blocks.length > blockPageSize ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextPage = Math.max(0, safePage - 1);
                        setBlockPage(nextPage);
                        setSelectedBlockId(blocks[nextPage * blockPageSize]?.id ?? selectedBlockId);
                      }}
                      disabled={safePage === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextPage = Math.min(maxPage, safePage + 1);
                        setBlockPage(nextPage);
                        setSelectedBlockId(blocks[nextPage * blockPageSize]?.id ?? selectedBlockId);
                      }}
                      disabled={safePage >= maxPage}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {visibleBlocks.map((block, index) => {
                  const blockIndex = safePage * blockPageSize + index;
                  const isActive = block.id === activeBlockId;
                  return (
                    <button
                      key={block.id ?? `block-${blockIndex + 1}`}
                      type="button"
                      onClick={() => setSelectedBlockId(block.id ?? null)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition",
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">
                          {resolveBlockLabel(block, blockIndex)}
                        </p>
                        <Badge variant={isActive ? "default" : "outline"}>
                          {resolveBlockKindLabel(block)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Block {blockIndex + 1}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeBlock && activeBlockIndex >= 0 ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {resolveBlockLabel(activeBlock, activeBlockIndex)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resolveBlockKindLabel(activeBlock)} block · position {activeBlockIndex + 1}{" "}
                      of {blocks.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveBlock(activeBlockIndex, activeBlockIndex - 1)}
                      disabled={activeBlockIndex === 0}
                    >
                      Move up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveBlock(activeBlockIndex, activeBlockIndex + 1)}
                      disabled={activeBlockIndex === blocks.length - 1}
                    >
                      Move down
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingRemoveBlockId(activeBlock.id ?? null)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {activeTextBlock ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Heading</p>
                        <Input
                          value={activeTextBlock.heading ?? ""}
                          onChange={(event) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionTextBlock),
                                kind: "text",
                                heading: event.target.value,
                              };
                              return nextBlocks;
                            })
                          }
                          placeholder="Heading"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Heading level</p>
                        <Select
                          value={String(activeTextBlock.headingLevel ?? 3)}
                          onValueChange={(next) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionTextBlock),
                                kind: "text",
                                headingLevel: Number(next) as RichTextSectionBlockHeadingLevel,
                              };
                              return nextBlocks;
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select heading level" />
                          </SelectTrigger>
                          <SelectContent>
                            {blockHeadingLevelOptions.map((option) => (
                              <SelectItem key={option.id} value={String(option.id)}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Rich block content</p>
                      <PostRichTextAdapter
                        value={resolveTextBlockEditorValue(activeTextBlock)}
                        onChange={(next) => handleBlockRichTextChange(activeBlock.id ?? "", next)}
                        placeholder="Add the supporting copy for this block..."
                        ariaLabel={`Structured text block ${activeBlockIndex + 1}`}
                        minHeightClassName="min-h-40"
                        toolbarProfile="writing-canvas"
                      />
                      <p className="text-xs text-muted-foreground">
                        Legacy plain text is preserved until you edit it here. Rich block content is
                        sanitized through the same allowlist as the main HTML body.
                      </p>
                      <RichTextSanitizerNotice
                        diagnostics={blockDiagnosticsById[activeBlock.id ?? ""] ?? []}
                      />
                    </div>
                  </>
                ) : null}

                {activeImageBlock ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Image asset</p>
                      <MediaPicker
                        value={
                          selectedMediaIdsByBlockId[activeImageBlock.id ?? ""] ??
                          activeImageBlock.mediaId ??
                          null
                        }
                        onChange={(next) => {
                          void handleImageMediaSelection(activeImageBlock.id ?? "", next);
                        }}
                        multiple={false}
                        accept={["image/*"]}
                      />
                      {mediaPickerErrorsByBlockId[activeImageBlock.id ?? ""] ? (
                        <p className="text-xs text-destructive">
                          {mediaPickerErrorsByBlockId[activeImageBlock.id ?? ""]}
                        </p>
                      ) : null}
                      {!activeImageBlock.src ? (
                        <p className="text-xs text-amber-700">
                          Pick a public image to render this block. Raw image HTML stays
                          unsupported.
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Alt text</p>
                        <Input
                          value={activeImageBlock.alt ?? ""}
                          onChange={(event) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionImageBlock),
                                alt: event.target.value,
                              };
                              return nextBlocks;
                            })
                          }
                          placeholder="Describe the image"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">Decorative image</p>
                          <p className="text-xs text-muted-foreground">
                            Decorative images render empty alt text.
                          </p>
                        </div>
                        <Switch
                          checked={Boolean(activeImageBlock.decorative)}
                          onCheckedChange={(checked) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionImageBlock),
                                decorative: Boolean(checked),
                              };
                              return nextBlocks;
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Caption</p>
                      <Textarea
                        value={activeImageBlock.caption ?? ""}
                        onChange={(event) =>
                          updateBlocks(value, onChange, (currentBlocks) => {
                            const nextBlocks = [...currentBlocks];
                            nextBlocks[activeBlockIndex] = {
                              ...(nextBlocks[activeBlockIndex] as RichTextSectionImageBlock),
                              caption: event.target.value,
                            };
                            return nextBlocks;
                          })
                        }
                        placeholder="Optional caption"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Link URL</p>
                        <Input
                          value={activeImageBlock.href ?? ""}
                          onChange={(event) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionImageBlock),
                                href: event.target.value,
                              };
                              return nextBlocks;
                            })
                          }
                          placeholder="https://example.com/story"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Width</p>
                        <Select
                          value={activeImageBlock.width ?? "wide"}
                          onValueChange={(next) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionImageBlock),
                                width: next as RichTextSectionImageBlock["width"],
                              };
                              return nextBlocks;
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select width" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="content">Content</SelectItem>
                            <SelectItem value="wide">Wide</SelectItem>
                            <SelectItem value="full">Full</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Alignment</p>
                        <Select
                          value={activeImageBlock.align ?? "center"}
                          onValueChange={(next) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionImageBlock),
                                align: next as RichTextSectionImageBlock["align"],
                              };
                              return nextBlocks;
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select alignment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeAttachmentBlock ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attachment asset</p>
                      <MediaPicker
                        value={
                          selectedMediaIdsByBlockId[activeAttachmentBlock.id ?? ""] ??
                          activeAttachmentBlock.mediaId ??
                          null
                        }
                        onChange={(next) => {
                          void handleAttachmentMediaSelection(activeAttachmentBlock.id ?? "", next);
                        }}
                        multiple={false}
                        accept={["application/*", "audio/*", "video/*", "text/*"]}
                      />
                      {mediaPickerErrorsByBlockId[activeAttachmentBlock.id ?? ""] ? (
                        <p className="text-xs text-destructive">
                          {mediaPickerErrorsByBlockId[activeAttachmentBlock.id ?? ""]}
                        </p>
                      ) : null}
                      {!activeAttachmentBlock.src ? (
                        <p className="text-xs text-amber-700">
                          Pick a public document, audio, or video file to render an attachment card.
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Label</p>
                        <Input
                          value={activeAttachmentBlock.label ?? ""}
                          onChange={(event) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionAttachmentBlock),
                                label: event.target.value,
                              };
                              return nextBlocks;
                            })
                          }
                          placeholder="Download attachment"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Description</p>
                        <Input
                          value={activeAttachmentBlock.description ?? ""}
                          onChange={(event) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionAttachmentBlock),
                                description: event.target.value,
                              };
                              return nextBlocks;
                            })
                          }
                          placeholder="Optional context or summary"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">MIME type</p>
                        <Input
                          value={activeAttachmentBlock.mimeType ?? ""}
                          onChange={(event) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionAttachmentBlock),
                                mimeType: event.target.value,
                              };
                              return nextBlocks;
                            })
                          }
                          placeholder="application/pdf"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Size label</p>
                        <Input
                          value={activeAttachmentBlock.sizeLabel ?? ""}
                          onChange={(event) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...(nextBlocks[activeBlockIndex] as RichTextSectionAttachmentBlock),
                                sizeLabel: event.target.value,
                              };
                              return nextBlocks;
                            })
                          }
                          placeholder="2.4 MB"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeEmbedBlock && activeEmbedBlock.kind === "embed" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Embed URL</p>
                      <Input
                        value={activeEmbedBlock.url ?? ""}
                        onChange={(event) =>
                          updateBlocks(value, onChange, (currentBlocks) => {
                            const nextBlocks = [...currentBlocks];
                            nextBlocks[activeBlockIndex] = {
                              ...nextBlocks[activeBlockIndex],
                              kind: "embed",
                              url: event.target.value,
                            };
                            return nextBlocks;
                          })
                        }
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Safe embeds render as provider-validated link cards. Raw iframe HTML is
                        removed by the sanitizer.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Card title</p>
                        <Input
                          value={activeEmbedBlock.title ?? ""}
                          onChange={(event) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...nextBlocks[activeBlockIndex],
                                kind: "embed",
                                title: event.target.value,
                              };
                              return nextBlocks;
                            })
                          }
                          placeholder="Shared link title"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Aspect ratio token</p>
                        <Select
                          value={activeEmbedBlock.aspectRatio ?? "16:9"}
                          onValueChange={(next) =>
                            updateBlocks(value, onChange, (currentBlocks) => {
                              const nextBlocks = [...currentBlocks];
                              nextBlocks[activeBlockIndex] = {
                                ...nextBlocks[activeBlockIndex],
                                kind: "embed",
                                aspectRatio: next as RichTextSectionEmbedAspectRatio,
                              };
                              return nextBlocks;
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ratio" />
                          </SelectTrigger>
                          <SelectContent>
                            {embedAspectRatioOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {!activeEmbedBlock.url ? (
                      <p className="text-xs text-amber-700">
                        Add a safe public URL to render this link-card embed block.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </EditorSection>

      <EditorSection
        title="Reader options"
        description="Control dropcap and optional table of contents."
      >
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Enable dropcap</p>
            <p className="text-xs text-muted-foreground">
              Styles the first paragraph in the active rendered source.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.options?.dropcap)}
            onCheckedChange={(checked) =>
              updateOptions(value, onChange, { dropcap: Boolean(checked) })
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {dropcapStatus.enabled
            ? dropcapStatus.applies
              ? `Dropcap will style the first paragraph from the ${dropcapStatus.source} source.`
              : `Dropcap is enabled, but the active ${dropcapStatus.source} source does not currently contain a paragraph.`
            : "Dropcap is off until you enable it."}
        </p>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Show table of contents</p>
            <p className="text-xs text-muted-foreground">
              Builds TOC from rendered H2, H3, and H4 headings.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.options?.toc)}
            onCheckedChange={(checked) => updateOptions(value, onChange, { toc: Boolean(checked) })}
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Typography and colors"
        description="Adjust the reader-facing text scale, spacing, and color swatches."
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
        <SharedColorControl
          label="Text color"
          value={normalized.style?.textColor}
          onChange={(next) => updateStyle(value, onChange, { textColor: next })}
          onClear={() => clearStyleField(value, onChange, "textColor")}
          pickerFallback="#0f172a"
          showValueInput={false}
        />
        <SharedColorControl
          label="Background color"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          onClear={() => clearStyleField(value, onChange, "background")}
          pickerFallback="#ffffff"
          showValueInput={false}
        />
      </EditorSection>

      <ConfirmActionDialog
        open={pendingRemoveBlockId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoveBlockId(null);
        }}
        title="Remove structured block"
        description={
          pendingRemoveBlock
            ? `Remove ${resolveBlockLabel(
                pendingRemoveBlock,
                blocks.findIndex((entry) => entry.id === pendingRemoveBlock.id)
              )}? This action can be undone from the editor notice.`
            : "Remove this block? This action can be undone from the editor notice."
        }
        confirmLabel="Remove"
        onConfirm={handleConfirmRemoveBlock}
      />

      <ConfirmActionDialog
        open={pendingBlockCount !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBlockCount(null);
        }}
        title="Reduce structured block count"
        description={`Reduce blocks from ${blocks.length} to ${pendingBlockCount ?? blocks.length}? Extra blocks will be removed, but you can undo this change immediately from the editor notice.`}
        confirmLabel="Reduce"
        onConfirm={handleConfirmBlockCountReduction}
      />
    </div>
  );
}

function DiagnosticsSnapshot({ value }: { value: RichTextSectionData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

type RichTextSectionAdvancedEditorContentProps = {
  value: RichTextSectionData;
  onChange: WidgetEditorProps<RichTextSectionData>["onChange"];
  variant: WidgetEditorProps<RichTextSectionData>["variant"];
  normalized: RichTextSectionData;
  blocks: RichTextSectionBlock[];
  source: RichTextRenderedSourceState;
};

type AdvancedSupportAction = "normalize" | "reset" | null;

export function RichTextSectionAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<RichTextSectionData>) {
  const normalized = normalizeValue(value);
  const blocks = normalizeRichTextBlocks(normalized.body?.blocks);
  const source = resolveRichTextRenderedSource(normalized);

  return (
    <RichTextSectionAdvancedEditorContent
      key={normalized.body?.html ?? "__empty__"}
      value={value}
      onChange={onChange}
      variant={variant}
      normalized={normalized}
      blocks={blocks}
      source={source}
    />
  );
}

function RichTextSectionAdvancedEditorContent({
  value,
  onChange,
  variant,
  normalized,
  blocks,
  source,
}: RichTextSectionAdvancedEditorContentProps) {
  const [pendingSupportAction, setPendingSupportAction] = useState<AdvancedSupportAction>(null);
  const htmlDiagnostics = sanitizeRichTextHtmlWithDiagnostics(normalized.body?.html ?? "");
  const supportActionDescription =
    pendingSupportAction === "reset"
      ? "Reset this rich text section to the default sample content? This replaces the current title, body, blocks, options, and style."
      : "Normalize this rich text section now? The current content is preserved while deterministic defaults are reapplied.";

  return (
    <div className="space-y-4">
      <EditorSection
        title="Output mode and source diagnostics"
        description="Read-only output mode and rendered-source summary."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Output mode</p>
            <p className="mt-1 text-muted-foreground">
              {normalized.options?.outputMode ?? "blocks-fallback"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Rendered source</p>
            <p className="mt-1 text-muted-foreground">{source.renderedSource}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/20 p-3 text-sm">
          <p className="font-medium">Source status</p>
          <p className="mt-1 text-muted-foreground">
            Variant: {resolveRichTextSectionVariant(variant)} · Block count: {blocks.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Reason: {source.reason}. Rich content, output preference, typography, spacing, and color
            swatches stay in Visual mode.
          </p>
        </div>
      </EditorSection>

      <EditorSection
        title="Sanitizer diagnostics"
        description="Read-only sanitizer status for the active HTML source."
      >
        <RichTextSanitizerNotice diagnostics={htmlDiagnostics.diagnostics} />
        <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
          <p>
            Stored HTML length: {htmlDiagnostics.html.length} characters · Diagnostics:{" "}
            {htmlDiagnostics.diagnostics.length}
          </p>
          <p className="mt-1 text-xs">
            Edit body copy and structured blocks in Visual mode. Advanced only reports sanitizer
            results.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Sanitized preview</p>
          <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
            {htmlDiagnostics.html.length > 0 ? (
              <div>{renderRichTextSectionHtmlPreview(htmlDiagnostics.html)}</div>
            ) : (
              <p>No rendered HTML after sanitization.</p>
            )}
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Confirmed support actions for deterministic cleanup."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPendingSupportAction("normalize")}
          >
            Normalize now
          </Button>
          <Button type="button" variant="outline" onClick={() => setPendingSupportAction("reset")}>
            Reset to defaults
          </Button>
        </div>
      </EditorSection>

      <EditorSection title="Raw payload snapshot">
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>

      <ConfirmActionDialog
        open={pendingSupportAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSupportAction(null);
        }}
        title={
          pendingSupportAction === "reset"
            ? "Reset rich text section"
            : "Normalize rich text section"
        }
        description={supportActionDescription}
        confirmLabel={pendingSupportAction === "reset" ? "Reset" : "Normalize"}
        onConfirm={() => {
          if (pendingSupportAction === "reset") {
            onChange(richTextSectionDefaults);
          } else {
            onChange(normalizeValue(value));
          }
          setPendingSupportAction(null);
        }}
      />
    </div>
  );
}
