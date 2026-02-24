import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";

export type PostBlockCategory = "text" | "media" | "interactive";

export type PostBlockCatalogItem = {
  type: PostBlockType;
  label: string;
  description: string;
  category: PostBlockCategory;
  keywords: string[];
};

export type PostBlockCatalogSearchOptions = {
  category?: PostBlockCategory | "all";
};

export type PostBlockCatalogGroup = {
  category: PostBlockCategory;
  items: PostBlockCatalogItem[];
};

export const POST_BLOCK_CATALOG: PostBlockCatalogItem[] = [
  {
    type: "writing-canvas",
    label: "Section",
    description: "Primary writing section for long-form post content.",
    category: "text",
    keywords: ["writing", "section", "article", "content"],
  },
  {
    type: "toc",
    label: "Table of contents",
    description: "Dynamic table of contents generated from post headings.",
    category: "text",
    keywords: ["toc", "table of contents", "headings", "navigation"],
  },
  {
    type: "paragraph",
    label: "Paragraph",
    description: "Standard text paragraph with rich formatting.",
    category: "text",
    keywords: ["text", "body", "paragraph", "copy"],
  },
  {
    type: "heading",
    label: "Heading",
    description: "Section heading (H1-H6) for document structure.",
    category: "text",
    keywords: ["title", "heading", "h1", "h2", "h3"],
  },
  {
    type: "list",
    label: "List",
    description: "Bullet or ordered list.",
    category: "text",
    keywords: ["list", "bullet", "ordered", "items"],
  },
  {
    type: "quote",
    label: "Quote",
    description: "Highlighted quotation or testimonial text.",
    category: "text",
    keywords: ["quote", "citation", "highlight"],
  },
  {
    type: "code",
    label: "Code",
    description: "Code snippet in mono formatting.",
    category: "text",
    keywords: ["code", "snippet", "developer"],
  },
  {
    type: "image",
    label: "Image",
    description: "Image media block with alt text.",
    category: "media",
    keywords: ["image", "photo", "media"],
  },
  {
    type: "separator",
    label: "Separator",
    description: "Horizontal divider between sections.",
    category: "media",
    keywords: ["divider", "separator", "line"],
  },
  {
    type: "callout",
    label: "Callout",
    description: "Highlighted note with tone styles.",
    category: "interactive",
    keywords: ["callout", "note", "alert", "info"],
  },
  {
    type: "button",
    label: "Button",
    description: "Call-to-action button with URL.",
    category: "interactive",
    keywords: ["button", "cta", "action", "link"],
  },
  {
    type: "embed",
    label: "Embed",
    description: "External media embed URL.",
    category: "interactive",
    keywords: ["embed", "video", "iframe", "external"],
  },
];

export const BLOCK_CATEGORY_LABELS: Record<PostBlockCategory, string> = {
  text: "Text",
  media: "Media",
  interactive: "Interactive",
};

export const POST_BLOCK_CATEGORY_ORDER: PostBlockCategory[] = [
  "text",
  "media",
  "interactive",
];

export const getPostBlockLabel = (type: string) =>
  POST_BLOCK_CATALOG.find((item) => item.type === type)?.label ?? "Block";

const normalizeCategory = (value: PostBlockCategory | "all" | undefined) =>
  value === "text" || value === "media" || value === "interactive"
    ? value
    : "all";

const matchesQuery = (item: PostBlockCatalogItem, query: string) => {
  if (!query) return true;
  if (item.label.toLowerCase().includes(query)) return true;
  if (item.description.toLowerCase().includes(query)) return true;
  return item.keywords.some((keyword) => keyword.toLowerCase().includes(query));
};

export const searchPostBlockCatalog = (
  query: string,
  options: PostBlockCatalogSearchOptions = {}
) => {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCategory = normalizeCategory(options.category);

  return POST_BLOCK_CATALOG.filter((item) => {
    if (normalizedCategory !== "all" && item.category !== normalizedCategory) {
      return false;
    }
    return matchesQuery(item, normalizedQuery);
  });
};

export const groupPostBlockCatalogByCategory = (
  items: PostBlockCatalogItem[]
): PostBlockCatalogGroup[] =>
  POST_BLOCK_CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

export const resolveMostUsedPostBlocks = (types: PostBlockType[]) => {
  const uniqueTypes = Array.from(new Set(types));
  return uniqueTypes
    .map((type) => POST_BLOCK_CATALOG.find((item) => item.type === type))
    .filter((item): item is PostBlockCatalogItem => Boolean(item));
};
