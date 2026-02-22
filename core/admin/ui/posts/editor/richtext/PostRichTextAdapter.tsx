import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

import {
  deserializePostRichText,
  postRichTextToPlainText,
  serializePostRichText,
} from "../../../../../services/posts/editor/postRichTextSerializer";
import {
  normalizePostPastePayload,
  type NormalizePostPastePayloadInput,
} from "../../../../../services/posts/editor/postPasteNormalizer";
import { postRichTextBlockTagSet } from "../../../../../services/posts/editor/postRichTextSchema";
import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import { searchPostBlockCatalog } from "../blocks/blockCatalog";
import { SlashCommandMenu } from "../blocks/SlashCommandMenu";
import {
  PostRichTextToolbar,
  type PostRichTextCommand,
} from "./PostRichTextToolbar";

type PostRichTextAdapterProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
  onSlashInsertBlock?: (type: PostBlockType) => void;
  onFocus?: () => void;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const runCommand = (command: string, value?: string) => {
  if (typeof document === "undefined") return false;
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
};

const getCurrentBlockElement = (editorRoot: HTMLElement) => {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node: Node | null = selection.anchorNode;
  while (node && node !== editorRoot) {
    if (
      node instanceof HTMLElement &&
      postRichTextBlockTagSet.has(node.tagName.toLowerCase())
    ) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
};

const wrapSelectionWithTag = (tagName: "code" | "mark") => {
  if (typeof window === "undefined") return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const selectedText = selection.toString();
  if (!selectedText) return;
  runCommand("insertHTML", `<${tagName}>${escapeHtml(selectedText)}</${tagName}>`);
};

const insertHtmlAtCursor = (html: string) => {
  if (!html) return false;
  if (runCommand("insertHTML", html)) return true;
  if (typeof window === "undefined") return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    range.setStartAfter(lastNode);
    range.setEndAfter(lastNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return true;
};

export const buildPostRichTextPasteInsert = (input: NormalizePostPastePayloadInput) => {
  const normalized = normalizePostPastePayload(input);
  return {
    html: normalized.html,
    warnings: normalized.warnings.map((warning) => warning.message),
    mode: normalized.mode,
    source: normalized.source,
  };
};

export function PostRichTextAdapter({
  value,
  onChange,
  placeholder = "Start writing…",
  ariaLabel = "Rich text editor",
  disabled = false,
  className,
  minHeightClassName = "min-h-[18rem]",
  onSlashInsertBlock,
  onFocus,
}: PostRichTextAdapterProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [pasteHint, setPasteHint] = useState<string | null>(null);

  const emitChange = useCallback(() => {
    const current = editorRef.current;
    if (!current) return;
    const serialized = serializePostRichText(current.innerHTML);
    if (serialized === value) return;
    onChange(serialized);
  }, [onChange, value]);

  useEffect(() => {
    const current = editorRef.current;
    if (!current) return;
    const nextHtml = deserializePostRichText(value);
    if (current.innerHTML !== nextHtml) {
      current.innerHTML = nextHtml;
    }
  }, [value]);

  useEffect(() => {
    if (!pasteHint || typeof window === "undefined") return;
    const timeoutId = window.setTimeout(() => {
      setPasteHint(null);
    }, 7000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pasteHint]);

  const executeCommand = useCallback(
    (command: PostRichTextCommand) => {
      if (disabled) return;
      const current = editorRef.current;
      if (!current) return;
      current.focus();

      switch (command) {
        case "bold":
          runCommand("bold");
          break;
        case "italic":
          runCommand("italic");
          break;
        case "underline":
          runCommand("underline");
          break;
        case "strike":
          runCommand("strikeThrough");
          break;
        case "inline-code":
          wrapSelectionWithTag("code");
          break;
        case "highlight":
          wrapSelectionWithTag("mark");
          break;
        case "link": {
          if (typeof window === "undefined") break;
          const href = window.prompt("Enter link URL", "https://");
          if (href === null) break;
          const nextHref = href.trim();
          if (!nextHref) {
            runCommand("unlink");
          } else {
            runCommand("createLink", nextHref);
          }
          break;
        }
        case "paragraph":
          runCommand("formatBlock", "<p>");
          break;
        case "heading-2":
          runCommand("formatBlock", "<h2>");
          break;
        case "heading-3":
          runCommand("formatBlock", "<h3>");
          break;
        case "heading-4":
          runCommand("formatBlock", "<h4>");
          break;
        case "heading-5":
          runCommand("formatBlock", "<h5>");
          break;
        case "heading-6":
          runCommand("formatBlock", "<h6>");
          break;
        case "bullet-list":
          runCommand("insertUnorderedList");
          break;
        case "ordered-list":
          runCommand("insertOrderedList");
          break;
        case "quote":
          runCommand("formatBlock", "<blockquote>");
          break;
        case "code-block":
          runCommand("formatBlock", "<pre>");
          break;
        case "align-left":
        case "align-center":
        case "align-right": {
          const alignment =
            command === "align-left"
              ? "left"
              : command === "align-center"
                ? "center"
                : "right";
          const currentBlock = getCurrentBlockElement(current);
          if (currentBlock) {
            currentBlock.setAttribute("data-align", alignment);
          }
          break;
        }
        case "clear-formatting":
          runCommand("removeFormat");
          runCommand("unlink");
          break;
        default:
          break;
      }

      emitChange();
    },
    [disabled, emitChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && slashOpen) {
        event.preventDefault();
        setSlashOpen(false);
        setSlashQuery("");
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "b") {
        event.preventDefault();
        executeCommand("bold");
        return;
      }
      if (modifier && key === "i") {
        event.preventDefault();
        executeCommand("italic");
        return;
      }
      if (modifier && key === "u") {
        event.preventDefault();
        executeCommand("underline");
        return;
      }
      if (modifier && key === "k") {
        event.preventDefault();
        executeCommand("link");
        return;
      }
      if (modifier && event.shiftKey && key === "7") {
        event.preventDefault();
        executeCommand("ordered-list");
        return;
      }
      if (modifier && event.shiftKey && key === "8") {
        event.preventDefault();
        executeCommand("bullet-list");
        return;
      }
      if (event.shiftKey && event.altKey && key === "5") {
        event.preventDefault();
        executeCommand("quote");
      }
    },
    [executeCommand, slashOpen]
  );

  const hasValue = useMemo(() => postRichTextToPlainText(value).length > 0, [value]);

  const updateSlashState = useCallback(() => {
    if (!onSlashInsertBlock) {
      if (slashOpen) {
        setSlashOpen(false);
        setSlashQuery("");
      }
      return;
    }
    const current = editorRef.current;
    if (!current) return;
    const plainText = postRichTextToPlainText(current.innerHTML);
    const match = /(?:^|\s)\/([a-z0-9-]*)$/i.exec(plainText);
    if (!match) {
      setSlashOpen(false);
      setSlashQuery("");
      return;
    }
    setSlashOpen(true);
    setSlashQuery((match[1] ?? "").toLowerCase());
  }, [onSlashInsertBlock, slashOpen]);

  const slashOptions = useMemo(
    () => searchPostBlockCatalog(slashQuery).slice(0, 8),
    [slashQuery]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      const html = event.clipboardData.getData("text/html");
      const text = event.clipboardData.getData("text/plain");
      if (!html.trim() && !text.trim()) return;

      const normalized = buildPostRichTextPasteInsert({ html, text });
      if (!normalized.html) return;

      event.preventDefault();
      const inserted = insertHtmlAtCursor(normalized.html);
      if (!inserted) return;

      emitChange();
      updateSlashState();

      if (normalized.warnings.length > 0) {
        const firstWarning = normalized.warnings[0] ?? "";
        const suffix =
          normalized.warnings.length > 1
            ? ` (+${normalized.warnings.length - 1} more)`
            : "";
        setPasteHint(`${firstWarning}${suffix}`);
      } else {
        setPasteHint(null);
      }
    },
    [disabled, emitChange, updateSlashState]
  );

  const handleSlashSelect = useCallback(
    (type: PostBlockType) => {
      onSlashInsertBlock?.(type);
      const current = editorRef.current;
      if (current) {
        const plain = postRichTextToPlainText(current.innerHTML);
        if (/^\/[a-z0-9-]*$/i.test(plain.trim())) {
          current.innerHTML = "";
          onChange("");
        } else {
          emitChange();
        }
      }
      setSlashOpen(false);
      setSlashQuery("");
    },
    [emitChange, onChange, onSlashInsertBlock]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <PostRichTextToolbar onCommand={executeCommand} disabled={disabled} />
      <div className="relative rounded-lg border bg-background">
        {!hasValue ? (
          <div className="pointer-events-none absolute inset-0 flex items-start px-3 py-2 text-sm text-muted-foreground">
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          aria-label={ariaLabel}
          className={cn(
            "w-full rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none",
            minHeightClassName
          )}
          onInput={() => {
            emitChange();
            updateSlashState();
          }}
          onBlur={() => {
            emitChange();
            setSlashOpen(false);
            setSlashQuery("");
          }}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onPaste={handlePaste}
        />
        <SlashCommandMenu
          open={slashOpen}
          query={slashQuery}
          options={slashOptions}
          onSelect={handleSlashSelect}
          onClose={() => {
            setSlashOpen(false);
            setSlashQuery("");
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Shortcuts: Ctrl/Cmd+B, Ctrl/Cmd+I, Ctrl/Cmd+K, Shift+Alt+5.
      </p>
      {pasteHint ? (
        <p className="text-xs text-amber-500">
          Paste notice: {pasteHint}
        </p>
      ) : null}
    </div>
  );
}
