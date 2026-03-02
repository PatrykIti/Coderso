import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import type { PostRichTextCommand } from "./PostRichTextToolbar";

export type PostRichTextBlockTransform = {
  type: PostBlockType;
  attrs?: Record<string, unknown>;
};

const headingLevelMap: Record<string, number> = {
  "heading-1": 1,
  "heading-2": 2,
  "heading-3": 3,
  "heading-4": 4,
  "heading-5": 5,
  "heading-6": 6,
};

export const resolveBlockTransformForCommand = (
  command: PostRichTextCommand
): PostRichTextBlockTransform | null => {
  if (command === "type-section") return { type: "writing-canvas" };
  if (command === "type-paragraph") return { type: "paragraph" };
  if (command === "type-heading") return { type: "heading", attrs: { level: 2 } };
  if (command === "type-quote") return { type: "quote" };
  if (command === "paragraph") return { type: "paragraph" };
  if (command === "quote") return { type: "quote" };
  if (command === "code-block") return { type: "code" };
  const headingLevel = headingLevelMap[command];
  if (headingLevel) {
    return { type: "heading", attrs: { level: headingLevel } };
  }

  return null;
};
