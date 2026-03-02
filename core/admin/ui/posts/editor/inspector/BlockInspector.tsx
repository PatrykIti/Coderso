import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  PostBlock,
  PostBlockType,
} from "../../../../../services/posts/editor/postBlockDocument";

import { getPostBlockLabel } from "../blocks/blockCatalog";
import {
  ALIGNMENT_OPTIONS,
  BLOCK_STYLE_SCOPE,
  BUTTON_SIZE_OPTIONS,
  BUTTON_VARIANT_OPTIONS,
  CALLOUT_TONE_OPTIONS,
  EMBED_ASPECT_OPTIONS,
  EMBED_PROVIDER_OPTIONS,
  IMAGE_MARGIN_OPTIONS,
  IMAGE_WIDTH_OPTIONS,
  IMAGE_WRAP_OPTIONS,
  SEPARATOR_STYLE_OPTIONS,
  SPACING_OPTIONS,
  TEXT_SCALE_OPTIONS,
  WIDTH_OPTIONS,
} from "./inspectorSchemas";
import { InspectorSection } from "./InspectorSection";

export type BlockInspectorProps = {
  block: PostBlock | null;
  onChangeAttrs: (patch: Record<string, unknown>) => void;
};

const readString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const readBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const readNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseClampedNumber = (
  value: string,
  fallback: number,
  min: number,
  max: number
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clampNumber(parsed, min, max);
};

const hasScope = (type: PostBlockType, scope: string) =>
  BLOCK_STYLE_SCOPE[type]?.includes(scope) ?? false;

const textToolbarOwnedTypes = new Set<PostBlockType>([
  "writing-canvas",
  "paragraph",
  "heading",
  "quote",
  "callout",
]);

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function ToggleField({ label, checked, onCheckedChange }: ToggleFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function BlockInspector({ block, onChangeAttrs }: BlockInspectorProps) {
  if (!block) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a block on canvas or list view to edit block settings.
      </div>
    );
  }

  const attrs = (block.attrs ?? {}) as Record<string, unknown>;
  const toolbarOwnsAlignment = textToolbarOwnedTypes.has(block.type);
  const toolbarOwnsTextScale = textToolbarOwnedTypes.has(block.type);
  const hasAlignmentControl = hasScope(block.type, "alignment") && !toolbarOwnsAlignment;
  const hasWidthControl = hasScope(block.type, "width");
  const hasSpacingControl = hasScope(block.type, "spacing");
  const hasTextScaleControl = hasScope(block.type, "textScale") && !toolbarOwnsTextScale;
  const hasAnyLayoutControl =
    hasAlignmentControl || hasWidthControl || hasSpacingControl || hasTextScaleControl;

  return (
    <div className="space-y-4 p-4">
      <InspectorSection
        title="Selected block"
        info="Block settings apply only to the selected block."
        tone="muted"
        className="space-y-2"
      >
        <p className="text-sm font-semibold">{getPostBlockLabel(block.type)}</p>
        <p className="text-xs text-muted-foreground">ID: {block.id}</p>
      </InspectorSection>

      <InspectorSection
        title="Layout and style"
        info="Control spacing and width before tweaking advanced options."
      >
        {hasAlignmentControl ? (
          <SelectField
            label="Alignment"
            value={readString(attrs.align, "left")}
            onChange={(value) => onChangeAttrs({ align: value })}
            options={ALIGNMENT_OPTIONS}
          />
        ) : null}
        {hasWidthControl ? (
          <SelectField
            label="Width"
            value={readString(attrs.width, "auto")}
            onChange={(value) => onChangeAttrs({ width: value })}
            options={WIDTH_OPTIONS}
          />
        ) : null}
        {hasSpacingControl ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <SelectField
              label="Spacing top"
              value={readString(attrs.spacingTop, "md")}
              onChange={(value) => onChangeAttrs({ spacingTop: value })}
              options={SPACING_OPTIONS}
            />
            <SelectField
              label="Spacing bottom"
              value={readString(attrs.spacingBottom, "md")}
              onChange={(value) => onChangeAttrs({ spacingBottom: value })}
              options={SPACING_OPTIONS}
            />
          </div>
        ) : null}
        {hasTextScaleControl ? (
          <SelectField
            label="Text size"
            value={readString(attrs.textScale, "md")}
            onChange={(value) => onChangeAttrs({ textScale: value })}
            options={TEXT_SCALE_OPTIONS}
          />
        ) : null}
        {!hasAnyLayoutControl ? (
          <p className="text-xs text-muted-foreground">
            This block uses a fixed layout. Edit content directly on the canvas.
          </p>
        ) : null}
      </InspectorSection>

      <InspectorSection
        title="Block-specific"
        info="These controls depend on the selected block type."
      >

        {block.type === "heading" ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Heading level (1-6)</label>
            <Input
              type="number"
              min={1}
              max={6}
              value={clampNumber(readNumber(attrs.level, 2), 1, 6)}
              onChange={(event) =>
                onChangeAttrs({
                  level: parseClampedNumber(event.target.value, readNumber(attrs.level, 2), 1, 6),
                })
              }
            />
          </div>
        ) : null}

        {block.type === "toc" ? (
          <>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Title</label>
              <Input
                value={readString(attrs.title, "Table of contents")}
                onChange={(event) => onChangeAttrs({ title: event.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Minimum heading level</label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={clampNumber(readNumber(attrs.minLevel, 1), 1, 6)}
                  onChange={(event) =>
                    onChangeAttrs({
                      minLevel: parseClampedNumber(
                        event.target.value,
                        readNumber(attrs.minLevel, 1),
                        1,
                        6
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Maximum heading level</label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={clampNumber(readNumber(attrs.maxLevel, 3), 1, 6)}
                  onChange={(event) =>
                    onChangeAttrs({
                      maxLevel: parseClampedNumber(
                        event.target.value,
                        readNumber(attrs.maxLevel, 3),
                        1,
                        6
                      ),
                    })
                  }
                />
              </div>
            </div>
            <ToggleField
              label="Numbered list"
              checked={readBoolean(attrs.ordered, false)}
              onCheckedChange={(checked) => onChangeAttrs({ ordered: checked })}
            />
            <ToggleField
              label="Hide when empty"
              checked={readBoolean(attrs.hideIfEmpty, true)}
              onCheckedChange={(checked) => onChangeAttrs({ hideIfEmpty: checked })}
            />
          </>
        ) : null}

        {block.type === "list" ? (
          <>
            <ToggleField
              label="Ordered list"
              checked={readBoolean(attrs.ordered, false)}
              onCheckedChange={(checked) => onChangeAttrs({ ordered: checked })}
            />
            <ToggleField
              label="Compact spacing"
              checked={readBoolean(attrs.compact, false)}
              onCheckedChange={(checked) => onChangeAttrs({ compact: checked })}
            />
          </>
        ) : null}

        {block.type === "image" ? (
          <>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Media ID</label>
              <Input
                value={readString(attrs.mediaId)}
                onChange={(event) => onChangeAttrs({ mediaId: event.target.value })}
              />
            </div>
            <SelectField
              label="Text wrap"
              value={readString(attrs.wrap, "none")}
              onChange={(value) => onChangeAttrs({ wrap: value })}
              options={IMAGE_WRAP_OPTIONS}
            />
            <SelectField
              label="Image width"
              value={String(readNumber(attrs.widthPercent, 50))}
              onChange={(value) => onChangeAttrs({ widthPercent: Number(value) })}
              options={IMAGE_WIDTH_OPTIONS}
            />
            <SelectField
              label="Image spacing"
              value={readString(attrs.marginPreset, "md")}
              onChange={(value) => onChangeAttrs({ marginPreset: value })}
              options={IMAGE_MARGIN_OPTIONS}
            />
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Alt text</label>
              <Input
                value={readString(attrs.alt)}
                onChange={(event) => onChangeAttrs({ alt: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Caption</label>
              <Input
                value={readString(attrs.caption)}
                onChange={(event) => onChangeAttrs({ caption: event.target.value })}
              />
            </div>
          </>
        ) : null}

        {block.type === "callout" ? (
          <>
            <SelectField
              label="Tone"
              value={readString(attrs.tone, "info")}
              onChange={(value) => onChangeAttrs({ tone: value })}
              options={CALLOUT_TONE_OPTIONS}
            />
            <ToggleField
              label="Show icon"
              checked={readBoolean(attrs.showIcon, true)}
              onCheckedChange={(checked) => onChangeAttrs({ showIcon: checked })}
            />
          </>
        ) : null}

        {block.type === "separator" ? (
          <>
            <SelectField
              label="Style"
              value={readString(attrs.style, "solid")}
              onChange={(value) => onChangeAttrs({ style: value })}
              options={SEPARATOR_STYLE_OPTIONS}
            />
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Thickness (px)</label>
              <Input
                type="number"
                min={1}
                max={8}
                value={clampNumber(readNumber(attrs.thickness, 1), 1, 8)}
                onChange={(event) =>
                  onChangeAttrs({
                    thickness: parseClampedNumber(
                      event.target.value,
                      readNumber(attrs.thickness, 1),
                      1,
                      8
                    ),
                  })
                }
              />
            </div>
          </>
        ) : null}

        {block.type === "button" ? (
          <>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Label</label>
              <Input
                value={readString(attrs.label, "Button")}
                onChange={(event) => onChangeAttrs({ label: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">URL</label>
              <Input
                value={readString(attrs.url)}
                onChange={(event) => onChangeAttrs({ url: event.target.value })}
              />
            </div>
            <SelectField
              label="Variant"
              value={readString(attrs.variant, "primary")}
              onChange={(value) => onChangeAttrs({ variant: value })}
              options={BUTTON_VARIANT_OPTIONS}
            />
            <SelectField
              label="Size"
              value={readString(attrs.size, "md")}
              onChange={(value) => onChangeAttrs({ size: value })}
              options={BUTTON_SIZE_OPTIONS}
            />
            <ToggleField
              label="Open in new tab"
              checked={readBoolean(attrs.newTab, false)}
              onCheckedChange={(checked) => onChangeAttrs({ newTab: checked })}
            />
          </>
        ) : null}

        {block.type === "embed" ? (
          <>
            <SelectField
              label="Provider"
              value={readString(attrs.provider, "custom")}
              onChange={(value) => onChangeAttrs({ provider: value })}
              options={EMBED_PROVIDER_OPTIONS}
            />
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Embed URL</label>
              <Input
                value={readString(attrs.url)}
                onChange={(event) => onChangeAttrs({ url: event.target.value })}
              />
            </div>
            <SelectField
              label="Aspect ratio"
              value={readString(attrs.aspect, "16:9")}
              onChange={(value) => onChangeAttrs({ aspect: value })}
              options={EMBED_ASPECT_OPTIONS}
            />
            <ToggleField
              label="Lazy load embed"
              checked={readBoolean(attrs.lazy, true)}
              onCheckedChange={(checked) => onChangeAttrs({ lazy: checked })}
            />
          </>
        ) : null}

        {block.type === "code" ? (
          <>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Language</label>
              <Input
                value={readString(attrs.language)}
                onChange={(event) => onChangeAttrs({ language: event.target.value })}
                placeholder="js, ts, css..."
              />
            </div>
            <ToggleField
              label="Show line numbers"
              checked={readBoolean(attrs.showLineNumbers, false)}
              onCheckedChange={(checked) => onChangeAttrs({ showLineNumbers: checked })}
            />
          </>
        ) : null}

        {block.type === "writing-canvas" ? (
          <p className="text-xs text-muted-foreground">
            Use the canvas editor to format paragraphs, headings, lists, and inline images.
            Select an image in the canvas to adjust wrap and width.
          </p>
        ) : null}

        {(block.type === "paragraph" || block.type === "quote") ? (
          <ToggleField
            label="Highlight block"
            checked={readBoolean(attrs.highlight, false)}
            onCheckedChange={(checked) => onChangeAttrs({ highlight: checked })}
          />
        ) : null}
      </InspectorSection>

      <Collapsible defaultOpen={false}>
        <InspectorSection
          title="Advanced"
          info="Advanced options are optional and usually left empty."
          action={
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="group">
                Toggle
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          }
        >
          <CollapsibleContent className="space-y-3 border-t pt-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Anchor ID</label>
              <Input
                value={readString(attrs.anchorId)}
                onChange={(event) => onChangeAttrs({ anchorId: event.target.value })}
                placeholder="section-id"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Custom class</label>
              <Input
                value={readString(attrs.className)}
                onChange={(event) => onChangeAttrs({ className: event.target.value })}
                placeholder="custom-css-class"
              />
            </div>
            <ToggleField
              label="Hide on mobile"
              checked={readBoolean(attrs.hideOnMobile, false)}
              onCheckedChange={(checked) => onChangeAttrs({ hideOnMobile: checked })}
            />
          </CollapsibleContent>
        </InspectorSection>
      </Collapsible>
    </div>
  );
}
