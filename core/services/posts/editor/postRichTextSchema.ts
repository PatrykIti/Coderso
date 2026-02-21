export const POST_RICH_TEXT_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "mark",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
] as const;

export const POST_RICH_TEXT_SELF_CLOSING_TAGS = ["br"] as const;

export const POST_RICH_TEXT_ALIGNMENT_VALUES = ["left", "center", "right"] as const;

export type PostRichTextAllowedTag = (typeof POST_RICH_TEXT_ALLOWED_TAGS)[number];
export type PostRichTextAlignment = (typeof POST_RICH_TEXT_ALIGNMENT_VALUES)[number];

export const postRichTextAllowedTagSet = new Set<string>(POST_RICH_TEXT_ALLOWED_TAGS);
export const postRichTextSelfClosingTagSet = new Set<string>(
  POST_RICH_TEXT_SELF_CLOSING_TAGS
);
export const postRichTextAlignmentSet = new Set<string>(POST_RICH_TEXT_ALIGNMENT_VALUES);

export const POST_RICH_TEXT_BLOCK_TAGS = [
  "p",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "blockquote",
  "pre",
] as const;

export const postRichTextBlockTagSet = new Set<string>(POST_RICH_TEXT_BLOCK_TAGS);
