import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import {
  POST_IMAGE_MARGIN_VALUES,
  POST_IMAGE_WIDTH_VALUES,
  POST_IMAGE_WRAP_VALUES,
} from "../../../../../services/posts/postImageWrapLayout";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export const ALIGNMENT_OPTIONS: SelectOption[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export const WIDTH_OPTIONS: SelectOption[] = [
  { value: "auto", label: "Auto" },
  { value: "narrow", label: "Narrow" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full width" },
];

export const SPACING_OPTIONS: SelectOption[] = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export const TEXT_SCALE_OPTIONS: SelectOption[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Regular" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra large" },
];

export const BUTTON_VARIANT_OPTIONS: SelectOption[] = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "ghost", label: "Ghost" },
  { value: "link", label: "Link style" },
];

export const BUTTON_SIZE_OPTIONS: SelectOption[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export const CALLOUT_TONE_OPTIONS: SelectOption[] = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "danger", label: "Danger" },
  { value: "neutral", label: "Neutral" },
];

export const SEPARATOR_STYLE_OPTIONS: SelectOption[] = [
  { value: "solid", label: "Solid line" },
  { value: "dashed", label: "Dashed line" },
  { value: "dotted", label: "Dotted line" },
];

export const EMBED_PROVIDER_OPTIONS: SelectOption[] = [
  { value: "custom", label: "Custom URL" },
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "loom", label: "Loom" },
];

export const EMBED_ASPECT_OPTIONS: SelectOption[] = [
  { value: "16:9", label: "16:9 (landscape)" },
  { value: "4:3", label: "4:3 (classic)" },
  { value: "1:1", label: "1:1 (square)" },
];

export const GALLERY_COLUMN_OPTIONS: SelectOption[] = [
  { value: "2", label: "2 columns" },
  { value: "3", label: "3 columns" },
  { value: "4", label: "4 columns" },
];

export const IMAGE_WRAP_OPTIONS: SelectOption[] = POST_IMAGE_WRAP_VALUES.map((value) => ({
  value,
  label:
    value === "none"
      ? "No wrap"
      : value === "left"
        ? "Wrap left"
        : "Wrap right",
}));

export const IMAGE_WIDTH_OPTIONS: SelectOption[] = POST_IMAGE_WIDTH_VALUES.map((value) => ({
  value: String(value),
  label: `${value}%`,
}));

export const IMAGE_MARGIN_OPTIONS: SelectOption[] = POST_IMAGE_MARGIN_VALUES.map((value) => ({
  value,
  label:
    value === "sm"
      ? "Compact"
      : value === "md"
        ? "Balanced"
        : "Spacious",
}));

export const BLOCK_STYLE_SCOPE: Record<PostBlockType, readonly string[]> = {
  paragraph: ["alignment", "width", "spacing", "textScale"],
  "writing-canvas": [],
  toc: ["alignment", "width", "spacing", "textScale"],
  heading: ["alignment", "width", "spacing", "textScale"],
  list: ["alignment", "width", "spacing", "textScale"],
  quote: ["alignment", "width", "spacing", "textScale"],
  code: ["width", "spacing"],
  image: ["alignment", "width", "spacing"],
  video: ["alignment", "width", "spacing"],
  gallery: ["alignment", "width", "spacing"],
  audio: ["alignment", "width", "spacing"],
  file: ["alignment", "width", "spacing"],
  separator: ["width", "spacing"],
  callout: ["alignment", "width", "spacing", "textScale"],
  button: ["alignment", "width", "spacing"],
  embed: ["alignment", "width", "spacing"],
};

export const BLOG_SEO_ROBOTS_OPTIONS: SelectOption[] = [
  { value: "index,follow", label: "Index + follow (default)" },
  { value: "noindex,follow", label: "Hide from search, keep links" },
  { value: "noindex,nofollow", label: "Hide from search and links" },
];

export const normalizeOptionalString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

export const normalizeTagList = (value: string) => {
  const seen = new Set<string>();
  const items: string[] = [];
  value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const normalized = tag.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      items.push(tag);
    });
  return items;
};
