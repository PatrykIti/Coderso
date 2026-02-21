import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Plus,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";

export type PostRichTextCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "inline-code"
  | "link"
  | "highlight"
  | "paragraph"
  | "heading-2"
  | "heading-3"
  | "heading-4"
  | "heading-5"
  | "heading-6"
  | "bullet-list"
  | "ordered-list"
  | "quote"
  | "code-block"
  | "align-left"
  | "align-center"
  | "align-right"
  | "clear-formatting";

type PostRichTextToolbarProps = {
  onCommand: (command: PostRichTextCommand) => void;
  disabled?: boolean;
};

type ActionButton = {
  id: PostRichTextCommand;
  label: string;
  shortLabel?: string;
  icon?: ComponentType<{ className?: string }>;
};

const primaryActions: ActionButton[] = [
  { id: "bold", label: "Bold", icon: Bold },
  { id: "italic", label: "Italic", icon: Italic },
  { id: "link", label: "Link", icon: Link2 },
  { id: "paragraph", label: "Paragraph", icon: Pilcrow },
  { id: "heading-2", label: "Heading 2", icon: Heading2 },
  { id: "bullet-list", label: "Bullet list", icon: List },
  { id: "quote", label: "Quote", icon: Quote },
];

const advancedActions: ActionButton[] = [
  { id: "underline", label: "Underline", icon: Underline },
  { id: "strike", label: "Strike", icon: Strikethrough },
  { id: "inline-code", label: "Inline code", icon: Code2 },
  { id: "highlight", label: "Highlight", icon: Highlighter },
  { id: "heading-3", label: "Heading 3", icon: Heading3 },
  { id: "heading-4", label: "Heading 4", icon: Heading4 },
  { id: "heading-5", label: "Heading 5", shortLabel: "H5" },
  { id: "heading-6", label: "Heading 6", shortLabel: "H6" },
  { id: "ordered-list", label: "Ordered list", icon: ListOrdered },
  { id: "code-block", label: "Code block", icon: Code2 },
  { id: "align-left", label: "Align left", icon: AlignLeft },
  { id: "align-center", label: "Align center", icon: AlignCenter },
  { id: "align-right", label: "Align right", icon: AlignRight },
  { id: "clear-formatting", label: "Clear formatting", icon: Eraser },
];

const renderActionLabel = (action: ActionButton) => {
  if (action.shortLabel) return action.shortLabel;
  if (action.icon) {
    const Icon = action.icon;
    return <Icon className="h-3.5 w-3.5" />;
  }
  return action.label;
};

export function PostRichTextToolbar({
  onCommand,
  disabled = false,
}: PostRichTextToolbarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 p-2">
        {primaryActions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() => onCommand(action.id)}
            aria-label={action.label}
            title={action.label}
          >
            {renderActionLabel(action)}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={disabled}
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
          aria-controls="post-richtext-advanced-actions"
        >
          <Plus className="h-3.5 w-3.5" />
          More formatting
        </Button>
      </div>

      {showAdvanced ? (
        <div
          id="post-richtext-advanced-actions"
          className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed bg-background/50 p-2"
        >
          {advancedActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              onClick={() => onCommand(action.id)}
              aria-label={action.label}
              title={action.label}
            >
              {renderActionLabel(action)}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
