export type PostRichTextSlashState = {
  open: boolean;
  query: string;
};

// Trigger matcher: "/query" fragment at the end of the editor plain text.
const SLASH_TRIGGER_PATTERN = /(?:^|\s)\/([a-z0-9-]*)$/i;
// Select-clear matcher: the editor holds nothing but the slash command itself.
const SLASH_ONLY_PATTERN = /^\/[a-z0-9-]*$/i;

export const resolveSlashState = (plainText: string): PostRichTextSlashState => {
  const match = SLASH_TRIGGER_PATTERN.exec(plainText);
  if (!match) {
    return { open: false, query: "" };
  }
  return { open: true, query: (match[1] ?? "").toLowerCase() };
};

export const shouldClearEditorAfterSlashSelect = (plainText: string): boolean =>
  SLASH_ONLY_PATTERN.test(plainText.trim());
