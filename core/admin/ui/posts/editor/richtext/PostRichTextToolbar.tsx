import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  ChevronDown,
  Eraser,
  Heading,
  Highlighter,
  Italic,
  Layers,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoTip } from "@/ui/shared/InfoTip";
import { cn } from "@/lib/utils";

export type PostRichTextCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "inline-code"
  | "link"
  | "highlight"
  | "paragraph"
  | "type-section"
  | "type-paragraph"
  | "type-heading"
  | "type-quote"
  | "heading-1"
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

export type PostRichTextToolbarProfile =
  | "writing-canvas"
  | "paragraph"
  | "heading"
  | "quote"
  | "callout";

type PostRichTextToolbarProps = {
  onCommand: (command: PostRichTextCommand) => void;
  disabled?: boolean;
  profile?: PostRichTextToolbarProfile;
  fontFamily?: "sans" | "serif" | "mono";
  onFontFamilyChange?: (value: "sans" | "serif" | "mono") => void;
  baseTextScale?: "sm" | "md" | "lg" | "xl";
  onBaseTextScaleChange?: (value: "sm" | "md" | "lg" | "xl") => void;
};

type ActionButton = {
  id: PostRichTextCommand;
  label: string;
  shortLabel?: string;
  icon?: ComponentType<{ className?: string }>;
};

const createHeadingLevelIcon = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
  const HeadingLevelIcon = ({ className }: { className?: string }) => (
    <span
      className={cn(
        "relative inline-flex min-h-[1rem] min-w-[1rem] items-center justify-center text-muted-foreground",
        className
      )}
      aria-hidden="true"
    >
      <span className="text-[0.65rem] font-medium leading-none">H</span>
      <span className="absolute -bottom-[1px] right-0 text-[0.45rem] leading-none">
        {level}
      </span>
    </span>
  );
  HeadingLevelIcon.displayName = `HeadingLevelIcon${level}`;
  return HeadingLevelIcon;
};

const headingLevelIcons = {
  1: createHeadingLevelIcon(1),
  2: createHeadingLevelIcon(2),
  3: createHeadingLevelIcon(3),
  4: createHeadingLevelIcon(4),
  5: createHeadingLevelIcon(5),
  6: createHeadingLevelIcon(6),
} as const;

const primaryActions: ActionButton[] = [
  { id: "bold", label: "Bold", icon: Bold },
  { id: "italic", label: "Italic", icon: Italic },
  { id: "link", label: "Link", icon: Link2 },
];

const advancedActions: ActionButton[] = [
  { id: "underline", label: "Underline", icon: Underline },
  { id: "strike", label: "Strike", icon: Strikethrough },
  { id: "highlight", label: "Highlight", icon: Highlighter },
];

export const typeGroupActions: ActionButton[] = [
  { id: "type-section", label: "Section", icon: Layers },
  { id: "type-paragraph", label: "Paragraph", icon: Pilcrow },
  { id: "type-heading", label: "Heading", icon: Heading },
  { id: "type-quote", label: "Quote", icon: Quote },
];

const textStyleActions: ActionButton[] = [
  { id: "paragraph", label: "Paragraph", icon: Pilcrow },
  { id: "heading-1", label: "Heading 1", icon: headingLevelIcons[1] },
  { id: "heading-2", label: "Heading 2", icon: headingLevelIcons[2] },
  { id: "heading-3", label: "Heading 3", icon: headingLevelIcons[3] },
  { id: "heading-4", label: "Heading 4", icon: headingLevelIcons[4] },
  { id: "heading-5", label: "Heading 5", icon: headingLevelIcons[5] },
  { id: "heading-6", label: "Heading 6", icon: headingLevelIcons[6] },
  { id: "quote", label: "Quote", icon: Quote },
];

export const headingLevelActions: ActionButton[] = [
  { id: "heading-1", label: "Heading 1", icon: headingLevelIcons[1] },
  { id: "heading-2", label: "Heading 2", icon: headingLevelIcons[2] },
  { id: "heading-3", label: "Heading 3", icon: headingLevelIcons[3] },
  { id: "heading-4", label: "Heading 4", icon: headingLevelIcons[4] },
  { id: "heading-5", label: "Heading 5", icon: headingLevelIcons[5] },
  { id: "heading-6", label: "Heading 6", icon: headingLevelIcons[6] },
];

const layoutActions: ActionButton[] = [
  { id: "align-left", label: "Align left", icon: AlignLeft },
  { id: "align-center", label: "Align center", icon: AlignCenter },
  { id: "align-right", label: "Align right", icon: AlignRight },
  { id: "clear-formatting", label: "Clear formatting", icon: Eraser },
];

const listGroupActions: ActionButton[] = [
  { id: "bullet-list", label: "Bullet list", icon: List },
  { id: "ordered-list", label: "Ordered list", icon: ListOrdered },
];

const codeGroupActions: ActionButton[] = [
  { id: "inline-code", label: "Inline code", icon: Code2 },
  { id: "code-block", label: "Code block", icon: Code2 },
];

const toolbarProfileCapabilities: Record<
  PostRichTextToolbarProfile,
  ReadonlySet<PostRichTextCommand>
> = {
  "writing-canvas": new Set<PostRichTextCommand>([
    "bold",
    "italic",
    "underline",
    "strike",
    "inline-code",
    "link",
    "highlight",
    "paragraph",
    "type-section",
    "type-paragraph",
    "type-heading",
    "type-quote",
    "heading-1",
    "heading-2",
    "heading-3",
    "heading-4",
    "heading-5",
    "heading-6",
    "bullet-list",
    "ordered-list",
    "quote",
    "code-block",
    "align-left",
    "align-center",
    "align-right",
    "clear-formatting",
  ]),
  paragraph: new Set<PostRichTextCommand>([
    "bold",
    "italic",
    "link",
    "type-section",
    "type-paragraph",
    "type-heading",
    "type-quote",
    "align-left",
    "align-center",
    "align-right",
    "clear-formatting",
  ]),
  heading: new Set<PostRichTextCommand>([
    "bold",
    "italic",
    "link",
    "type-section",
    "type-paragraph",
    "type-heading",
    "type-quote",
    "heading-1",
    "heading-2",
    "heading-3",
    "heading-4",
    "heading-5",
    "heading-6",
    "align-left",
    "align-center",
    "align-right",
    "clear-formatting",
  ]),
  quote: new Set<PostRichTextCommand>([
    "bold",
    "italic",
    "link",
    "type-section",
    "type-paragraph",
    "type-heading",
    "type-quote",
    "align-left",
    "align-center",
    "align-right",
    "clear-formatting",
  ]),
  callout: new Set<PostRichTextCommand>([
    "bold",
    "italic",
    "link",
    "type-section",
    "type-paragraph",
    "type-heading",
    "type-quote",
    "align-left",
    "align-center",
    "align-right",
    "clear-formatting",
  ]),
};

export const getToolbarCommandsForProfile = (
  profile: PostRichTextToolbarProfile
) => toolbarProfileCapabilities[profile];

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
  profile = "writing-canvas",
  fontFamily = "sans",
  onFontFamilyChange,
  baseTextScale = "md",
  onBaseTextScaleChange,
}: PostRichTextToolbarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const allowedCommands = getToolbarCommandsForProfile(profile);
  const visiblePrimaryActions = primaryActions.filter((action) =>
    allowedCommands.has(action.id)
  );
  const visibleTypeGroupActions = typeGroupActions.filter((action) =>
    allowedCommands.has(action.id)
  );
  const visibleTextStyleActions = textStyleActions.filter((action) =>
    allowedCommands.has(action.id)
  );
  const visibleHeadingLevelActions = headingLevelActions.filter((action) =>
    allowedCommands.has(action.id)
  );
  const visibleListGroupActions = listGroupActions.filter((action) =>
    allowedCommands.has(action.id)
  );
  const visibleCodeGroupActions = codeGroupActions.filter((action) =>
    allowedCommands.has(action.id)
  );
  const showLayoutInline =
    profile === "paragraph" || profile === "heading" || profile === "quote" || profile === "callout";
  const inlineLayoutActions = showLayoutInline ? layoutActions : [];
  const advancedLayoutActions = showLayoutInline ? [] : layoutActions;
  const visibleLayoutActions = inlineLayoutActions.filter((action) =>
    allowedCommands.has(action.id)
  );
  const visibleAdvancedActions = [...advancedActions, ...advancedLayoutActions].filter(
    (action) => allowedCommands.has(action.id)
  );
  const showTextStyleGroup = profile === "writing-canvas";
  const showHeadingLevelGroup = profile === "heading";
  const hasAdvancedActions = visibleAdvancedActions.length > 0;
  const hasTypographyControls = Boolean(onFontFamilyChange) || Boolean(onBaseTextScaleChange);
  const showTypographyRow = hasTypographyControls || hasAdvancedActions;

  const renderCommandGroup = (
    label: string,
    actions: ActionButton[],
    triggerAriaLabel: string,
    options?: { forceDropdown?: boolean }
  ) => {
    if (actions.length === 0) return null;
    if (actions.length === 1 && !options?.forceDropdown) {
      const action = actions[0]!;
      return (
        <Button
          key={action.id}
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => onCommand(action.id)}
          aria-label={action.label}
          title={action.label}
        >
          {renderActionLabel(action)}
        </Button>
      );
    }

    return (
      <DropdownMenu key={label}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            aria-label={triggerAriaLabel}
            title={label}
          >
            {label}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onSelect={() => {
                onCommand(action.id);
              }}
              aria-label={action.label}
            >
              {action.icon ? (
                <action.icon className="h-3.5 w-3.5" />
              ) : action.shortLabel ? (
                <span className="text-[0.65rem] font-semibold leading-none">
                  {action.shortLabel}
                </span>
              ) : null}
              <span>{action.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/30 p-2">
        {visiblePrimaryActions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => onCommand(action.id)}
            aria-label={action.label}
            title={action.label}
          >
            {renderActionLabel(action)}
          </Button>
        ))}
        {renderCommandGroup("Type", visibleTypeGroupActions, "Type", {
          forceDropdown: true,
        })}
        {showTextStyleGroup
          ? renderCommandGroup("Text", visibleTextStyleActions, "Text", {
              forceDropdown: true,
            })
          : null}
        {showHeadingLevelGroup
          ? renderCommandGroup("Headings", visibleHeadingLevelActions, "Headings", {
              forceDropdown: true,
            })
          : null}
        {visibleLayoutActions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => onCommand(action.id)}
            aria-label={action.label}
            title={action.label}
          >
            {renderActionLabel(action)}
          </Button>
        ))}
        {renderCommandGroup("List", visibleListGroupActions, "List")}
        {renderCommandGroup("Code", visibleCodeGroupActions, "Code")}
      </div>

      {showTypographyRow ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 p-2">
          {hasTypographyControls ? (
            <div className="flex flex-wrap items-center gap-2">
              {onFontFamilyChange ? (
                <Select
                  value={fontFamily}
                  disabled={disabled}
                  onValueChange={(value) =>
                    onFontFamilyChange(
                      value === "serif" || value === "mono" ? value : "sans"
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-[7.5rem] bg-background text-xs">
                    <SelectValue placeholder="Font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sans">Sans</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="mono">Mono</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {onBaseTextScaleChange ? (
                <Select
                  value={baseTextScale}
                  disabled={disabled}
                  onValueChange={(value) =>
                    onBaseTextScaleChange(
                      value === "sm" || value === "lg" || value === "xl" ? value : "md"
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-[6.5rem] bg-background text-xs">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Text S</SelectItem>
                    <SelectItem value="md">Text M</SelectItem>
                    <SelectItem value="lg">Text L</SelectItem>
                    <SelectItem value="xl">Text XL</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {disabled
                  ? "Typography unavailable for the current selection."
                  : "Typography follows the selected block style."}
              </span>
              <InfoTip
                content={
                  disabled
                    ? "Select an editable writing block to change typography."
                    : "Use these controls to align typography with the current writing block."
                }
              />
            </div>
          ) : null}
          {hasAdvancedActions ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => setShowAdvanced((prev) => !prev)}
              aria-expanded={showAdvanced}
              aria-controls="post-richtext-advanced-actions"
              className="ml-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              More formatting
            </Button>
          ) : null}
        </div>
      ) : null}

      {showAdvanced && hasAdvancedActions ? (
        <div
          id="post-richtext-advanced-actions"
          className="flex flex-wrap items-center gap-1.5 rounded-lg bg-background/50 p-2"
        >
          {visibleAdvancedActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
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
