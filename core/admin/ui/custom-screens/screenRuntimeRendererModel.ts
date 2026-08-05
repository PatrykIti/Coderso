import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { EntryDataValue } from "@/services/entriesClient";
import {
  type ScreenBlockStyleV1,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
  type ScreenTabItem,
} from "../../../services/customScreens/customScreenSchemas";
import {
  screenBlockLabels,
  type ScreenBlockKind,
  type ScreenInsertTarget,
} from "../../../services/customScreens/screenDocumentOps";
import type { RelatedEntrySummary } from "../../../services/customScreens/relatedEntryResolver";
import type {
  ScreenEntryPresentationOverrideDraft,
  ScreenEntryPresentationOverridePropPath,
} from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import { isScreenMediaAssetUuid } from "../../../services/customScreens/screenMediaIdentity";
import type { ContentField } from "../content-types/SchemaBuilder";

export type ScreenRuntimeRendererProps = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  values: Record<string, unknown>;
  fields?: ContentField[];
  fieldErrors?: Record<string, string>;
  presentationOverrides?: ScreenEntryPresentationOverrideDraft[];
  relationTargets?: Array<{ slug: string; name: string }>;
  relatedEntries?: Record<string, RelatedEntrySummary[]>;
  presentationMediaUrlsById?: Readonly<Record<string, string>>;
  mode: "builder" | "preview" | "entry";
  selectedSectionId?: string | null;
  selectedBlockId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  onSelectBlock?: (blockId: string) => void;
  onRenameSection?: (sectionId: string, label: string) => void;
  onMoveSection?: (sectionId: string, direction: "up" | "down") => void;
  onDeleteSection?: (sectionId: string) => void;
  insertPoint?: ScreenInsertTarget | null;
  onSetInsertPoint?: (target: ScreenInsertTarget | null) => void;
  onDragMove?: (blockId: string, target: ScreenInsertTarget) => void;
  onFieldChange?: (field: string, value: EntryDataValue) => void;
  onTitleChange?: (value: string) => void;
  onSlugChange?: (value: string) => void;
  renderBuilderActions?: (block: ScreenBlockV1) => ReactNode;
  enableInlineFieldEditing?: boolean;
  emptyMessage?: string;
  showFieldMetadata?: boolean;
};

export type ScreenRuntimePresentationModel = {
  blocksWithOverrides: ReadonlySet<string>;
  readOverride: (
    blockId: string,
    propPath: ScreenEntryPresentationOverridePropPath
  ) => string | null;
  readMediaSource: (
    blockId: string
  ) =>
    | { readonly present: true; readonly assetId: string | null }
    | { readonly present: false; readonly assetId: null };
  resolveTextClassName: (blockId: string) => string;
  withTextClassName: (blockId: string, className: string) => string;
};

export type ScreenRuntimeContext = Omit<
  ScreenRuntimeRendererProps,
  | "document"
  | "fieldErrors"
  | "presentationOverrides"
  | "relationTargets"
  | "relatedEntries"
  | "enableInlineFieldEditing"
  | "showFieldMetadata"
> & {
  fieldErrors: Record<string, string>;
  relationTargets: Array<{ slug: string; name: string }>;
  relatedEntries: Record<string, RelatedEntrySummary[]>;
  enableInlineFieldEditing: boolean;
  showFieldMetadata: boolean;
  presentation: ScreenRuntimePresentationModel;
};

export type RenderBlockContext = {
  sectionId: string;
  suppressed: boolean;
  dropTargets?: { before: ScreenInsertTarget; after: ScreenInsertTarget };
};

export const SCREEN_SECTION_COLUMN_GAP_DEFAULT = 16;

export const systemFieldLabels = new Map([
  ["title", "Title"],
  ["slug", "Slug"],
  ["status", "Status"],
  ["createdAt", "Created"],
  ["updatedAt", "Updated"],
  ["publishedAt", "Published"],
]);

const systemFieldMap = new Map<string, ContentField>([
  ["title", { id: "system-title", name: "title", type: "text", label: "Title" }],
  ["slug", { id: "system-slug", name: "slug", type: "text", label: "Slug" }],
]);

export const fieldTypeLabels = {
  text: "Text",
  number: "Number",
  boolean: "Boolean",
  select: "Select",
  media: "Media",
  relation: "Relation",
  richtext: "Rich text",
} as const;

const presentationTextSizeClassMap: Record<string, string> = {
  "2xs": "text-[0.625rem] leading-4",
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

const presentationTextEmphasisClassMap: Record<string, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const presentationToneClassMap: Record<string, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  strong: "text-foreground",
  neutral: "text-muted-foreground",
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  accent: "text-accent-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

const screenBlockWidthClass: Record<string, string> = {
  auto: "",
  full: "w-full",
  half: "w-1/2",
  third: "w-1/3",
  "two-thirds": "w-2/3",
};

const screenBlockAlignClass: Record<string, string> = {
  start: "mr-auto",
  center: "mx-auto",
  end: "ml-auto",
  stretch: "w-full",
};

export const screenImageRatioClass: Record<string, string> = {
  "1/1": "aspect-square",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-video",
  "3/2": "aspect-[3/2]",
};

const screenBoxSides = ["top", "right", "bottom", "left"] as const;

const resolveScreenBlockBoxStyle = (
  style: ScreenBlockStyleV1 | undefined
): CSSProperties | undefined => {
  if (!style) return undefined;
  const result: CSSProperties = {};
  if (typeof style.minHeight === "number") result.minHeight = style.minHeight;
  for (const side of screenBoxSides) {
    const capitalizedSide = side[0].toUpperCase() + side.slice(1);
    const margin = style.margin?.[side];
    if (typeof margin === "number") {
      (result as Record<string, number>)[`margin${capitalizedSide}`] = margin;
    }
    const padding = style.padding?.[side];
    if (typeof padding === "number") {
      (result as Record<string, number>)[`padding${capitalizedSide}`] = padding;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const resolveScreenBlockPresentation = (style: ScreenBlockStyleV1 | undefined) => {
  const widthClass = style?.width ? (screenBlockWidthClass[style.width] ?? "") : "";
  const hasHorizontalMargin =
    style?.margin?.left !== undefined || style?.margin?.right !== undefined;
  const alignClass =
    style?.align && !hasHorizontalMargin
      ? style.align === "stretch"
        ? widthClass
          ? ""
          : "w-full"
        : (screenBlockAlignClass[style.align] ?? "")
      : "";
  return {
    widthClass,
    alignClass,
    boxStyle: resolveScreenBlockBoxStyle(style),
  };
};

export const stringifyValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "Empty";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const editableTextValue = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const normalizeInlineFieldValue = (value: string, field: ContentField): EntryDataValue => {
  if (field.type !== "number") return value;
  if (!value.trim()) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

export const isInlineEditableField = (field: ContentField) =>
  field.type === "text" || field.type === "number" || field.type === "select";

export const readText = (data: Record<string, unknown>, key: string, fallback = "") => {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

export const findField = (fields: ContentField[] | undefined, fieldName: string) =>
  fields?.find((field) => field.name === fieldName) ?? systemFieldMap.get(fieldName) ?? null;

export const resolveBlockBinding = (
  bindings: ScreenFieldBinding[],
  blockId: string,
  propPath: string
) =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === propPath) ?? null;

export const formatStatValue = (value: unknown, format: string) => {
  if (value === undefined || value === null || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (format === "percent") return `${numeric}%`;
  if (format === "money") return `$${numeric}`;
  return String(numeric);
};

export const formatRelatedTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const relatedInitials = (title: string): string => {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const selectionInteractiveOriginSelector =
  'a,button,input,select,textarea,[contenteditable="true"],[role="tab"]';

export const isSelectionInteractiveOrigin = (target: EventTarget | null, boundary: HTMLElement) => {
  if (!(target instanceof Element) || target === boundary) return false;
  const interactive = target.closest(selectionInteractiveOriginSelector);
  return interactive !== null && boundary.contains(interactive);
};

export const resolveRovingTabIndex = (
  key: string,
  index: number,
  length: number
): number | null => {
  if (length <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % length;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + length) % length;
  return null;
};

const blockContainsId = (block: ScreenBlockV1, targetId: string): boolean =>
  block.id === targetId ||
  (block.children ?? []).some((child) => blockContainsId(child, targetId)) ||
  Object.values(block.slots ?? {}).some((children) =>
    children.some((child) => blockContainsId(child, targetId))
  );

const tabSlotContainingBlock = (
  block: ScreenBlockV1,
  tabs: readonly ScreenTabItem[],
  targetId: string
): string | null =>
  tabs.find((tab) =>
    (block.slots?.[tab.id] ?? []).some((child) => blockContainsId(child, targetId))
  )?.id ?? null;

export const builderTabSlot = (
  block: ScreenBlockV1,
  tabs: readonly ScreenTabItem[],
  current: ScreenInsertTarget | null | undefined
): string | null => {
  if (!current || (current.kind !== "slot-end" && current.kind !== "slot-index")) return null;
  if (current.parentId === block.id) {
    return tabs.some((tab) => tab.id === current.slotId) ? current.slotId : null;
  }
  return tabSlotContainingBlock(block, tabs, current.parentId);
};

export const builderSelectionTabSlot = (
  block: ScreenBlockV1,
  tabs: readonly ScreenTabItem[],
  selectedBlockId: string | null | undefined
): string | null => {
  if (!selectedBlockId || selectedBlockId === block.id) return null;
  return tabSlotContainingBlock(block, tabs, selectedBlockId);
};

export const bindingAllowsWrite = (binding: ScreenFieldBinding | null | undefined) =>
  binding?.mode === "write" || binding?.mode === "readwrite";

export const insertTargetsEqual = (a: ScreenInsertTarget, b: ScreenInsertTarget): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === "section-end" || a.kind === "section-index") {
    if (a.sectionId !== b.sectionId) return false;
    return a.kind === "section-index" && b.kind === "section-index" ? a.index === b.index : true;
  }
  if (b.kind !== "slot-end" && b.kind !== "slot-index") return false;
  if (a.parentId !== b.parentId || a.slotId !== b.slotId) return false;
  return a.kind === "slot-index" && b.kind === "slot-index" ? a.index === b.index : true;
};

export const resolveBlockLabel = (block: ScreenBlockV1) =>
  readText(block.data, "label", screenBlockLabels[block.type as ScreenBlockKind] ?? block.type);

export const resolveBlockTypeLabel = (block: ScreenBlockV1) =>
  screenBlockLabels[block.type as ScreenBlockKind] ?? block.type;

export const createScreenRuntimePresentationModel = (
  overrides: ScreenEntryPresentationOverrideDraft[]
): ScreenRuntimePresentationModel => {
  const overrideMap = new Map<string, string>();
  const blocksWithOverrides = new Set<string>();
  for (const override of overrides) {
    overrideMap.set(`${override.blockId}\u0000${override.propPath}`, override.value);
    blocksWithOverrides.add(override.blockId);
  }
  const readOverride = (blockId: string, propPath: ScreenEntryPresentationOverridePropPath) =>
    overrideMap.get(`${blockId}\u0000${propPath}`) ?? null;
  const resolveTextClassName = (blockId: string) => {
    const textSize = readOverride(blockId, "textSize");
    const textEmphasis = readOverride(blockId, "textEmphasis");
    const tone = readOverride(blockId, "tone");
    return cn(
      textSize ? presentationTextSizeClassMap[textSize] : undefined,
      textEmphasis ? presentationTextEmphasisClassMap[textEmphasis] : undefined,
      tone ? presentationToneClassMap[tone] : undefined
    );
  };
  return {
    blocksWithOverrides,
    readOverride,
    readMediaSource: (blockId) => {
      for (const propPath of ["mediaAssetId", "image"] as const) {
        const key = `${blockId}\u0000${propPath}`;
        if (!overrideMap.has(key)) continue;
        const value = overrideMap.get(key);
        return { present: true, assetId: isScreenMediaAssetUuid(value) ? value : null };
      }
      return { present: false, assetId: null };
    },
    resolveTextClassName,
    withTextClassName: (blockId, className) => cn(className, resolveTextClassName(blockId)),
  };
};

export const createScreenRuntimeContext = (
  props: ScreenRuntimeRendererProps
): ScreenRuntimeContext => ({
  ...props,
  fieldErrors: props.fieldErrors ?? {},
  relationTargets: props.relationTargets ?? [],
  relatedEntries: props.relatedEntries ?? {},
  enableInlineFieldEditing: props.enableInlineFieldEditing ?? false,
  showFieldMetadata: props.showFieldMetadata ?? false,
  presentation: createScreenRuntimePresentationModel(props.presentationOverrides ?? []),
});
