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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  deserializePostRichText,
  postRichTextToPlainText,
  serializePostRichText,
} from "../../../../../services/posts/editor/postRichTextSerializer";
import {
  DEFAULT_POST_IMAGE_LAYOUT,
  normalizePostImageLayout,
  normalizePostImageMargin,
  normalizePostImageWidth,
  normalizePostImageWrap,
  POST_IMAGE_MARGIN_VALUES,
  POST_IMAGE_WIDTH_VALUES,
  POST_IMAGE_WRAP_VALUES,
  type PostImageLayout,
} from "../../../../../services/posts/postImageWrapLayout";
import {
  normalizePostPastePayload,
  type NormalizePostPastePayloadInput,
  type PostPasteDirectives,
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
  onPasteDirectives?: (directives: PostPasteDirectives) => void;
  onFocus?: () => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
};

type ClipboardItemLike = {
  kind?: string;
  type?: string;
  getAsFile?: () => File | null;
};

type ClipboardDataLike = {
  items?: ArrayLike<ClipboardItemLike> | null;
  files?: ArrayLike<File> | null;
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

export const extractClipboardImageFiles = (clipboard: ClipboardDataLike | null | undefined) => {
  if (!clipboard) return [] as File[];

  const fromItems: File[] = [];
  for (const item of Array.from(clipboard.items ?? [])) {
    if (!item) continue;
    const itemType = (item.type ?? "").toLowerCase();
    if (item.kind !== "file" && !itemType.startsWith("image/")) continue;
    const file = item.getAsFile?.() ?? null;
    if (!file) continue;
    if (!file.type.toLowerCase().startsWith("image/")) continue;
    fromItems.push(file);
  }

  if (fromItems.length > 0) {
    return fromItems;
  }

  return Array.from(clipboard.files ?? []).filter((file) =>
    file.type.toLowerCase().startsWith("image/")
  );
};

const deriveClipboardImageAlt = (file: File) => {
  const base = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
  return (base || "Pasted image").slice(0, 200);
};

export const buildClipboardImageInsertHtml = (
  asset: { id: string; url: string },
  alt: string,
  layout: PostImageLayout = DEFAULT_POST_IMAGE_LAYOUT
) => {
  const safeAlt = alt.trim().slice(0, 500);
  return `<img src="${escapeHtml(asset.url)}" data-media-id="${escapeHtml(asset.id)}" alt="${escapeHtml(safeAlt)}" data-wrap="${layout.wrap}" data-width="${layout.widthPercent}" data-margin="${layout.marginPreset}" loading="lazy">`;
};

const findClosestImageFromNode = (
  node: Node | null,
  editorRoot: HTMLElement
): HTMLImageElement | null => {
  let cursor: Node | null = node;
  while (cursor && cursor !== editorRoot) {
    if (cursor instanceof HTMLImageElement) {
      return cursor;
    }
    if (
      cursor instanceof HTMLElement &&
      cursor.tagName.toLowerCase() === "img"
    ) {
      return cursor as HTMLImageElement;
    }
    cursor = cursor.parentNode;
  }
  return null;
};

const findSelectedImageElement = (editorRoot: HTMLElement) => {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const anchor = findClosestImageFromNode(selection.anchorNode, editorRoot);
  if (anchor) return anchor;
  const focus = findClosestImageFromNode(selection.focusNode, editorRoot);
  if (focus) return focus;

  const range = selection.getRangeAt(0);
  const fromStart =
    range.startContainer instanceof Element
      ? (range.startContainer.querySelector("img") as HTMLImageElement | null)
      : null;
  if (fromStart && editorRoot.contains(fromStart)) {
    return fromStart;
  }
  return null;
};

const readImageLayoutFromElement = (image: HTMLImageElement): PostImageLayout =>
  normalizePostImageLayout({
    wrap: image.getAttribute("data-wrap"),
    widthPercent: image.getAttribute("data-width"),
    marginPreset: image.getAttribute("data-margin"),
  });

const applyImageLayoutToElement = (
  image: HTMLImageElement,
  layout: PostImageLayout
) => {
  image.setAttribute("data-wrap", layout.wrap);
  image.setAttribute("data-width", String(layout.widthPercent));
  image.setAttribute("data-margin", layout.marginPreset);
};

export const buildPostRichTextPasteInsert = (input: NormalizePostPastePayloadInput) => {
  const normalized = normalizePostPastePayload(input);
  return {
    html: normalized.html,
    warnings: normalized.warnings.map((warning) => warning.message),
    mode: normalized.mode,
    source: normalized.source,
    directives: normalized.directives,
    diagnostics: normalized.diagnostics,
  };
};

export const resolveClipboardPasteMode = (input: {
  normalizedHtml: string;
  imageFilesCount: number;
  hasPostPasteDirectives?: boolean;
}): "rich-text" | "images" | "none" => {
  if (input.normalizedHtml.trim().length > 0) return "rich-text";
  if (input.hasPostPasteDirectives) return "rich-text";
  if (input.imageFilesCount > 0) return "images";
  return "none";
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
  onPasteDirectives,
  onFocus,
  onUploadClipboardImage,
}: PostRichTextAdapterProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedImageLayout, setSelectedImageLayout] = useState<PostImageLayout | null>(
    null
  );

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

  const updateSelectedImageState = useCallback(() => {
    const editorRoot = editorRef.current;
    if (!editorRoot) return;
    const selectedImage = findSelectedImageElement(editorRoot);
    if (!selectedImage) {
      selectedImageRef.current = null;
      setSelectedImageLayout(null);
      return;
    }
    selectedImageRef.current = selectedImage;
    setSelectedImageLayout(readImageLayoutFromElement(selectedImage));
  }, []);

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
        case "heading-1":
          runCommand("formatBlock", "<h1>");
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

  const applySelectedImageLayout = useCallback(
    (patch: Partial<PostImageLayout>) => {
      const selectedImage = selectedImageRef.current;
      if (!selectedImage) return;
      const currentLayout = readImageLayoutFromElement(selectedImage);
      const nextLayout: PostImageLayout = {
        wrap: patch.wrap ?? currentLayout.wrap,
        widthPercent: patch.widthPercent ?? currentLayout.widthPercent,
        marginPreset: patch.marginPreset ?? currentLayout.marginPreset,
      };
      const normalized: PostImageLayout = {
        wrap: normalizePostImageWrap(nextLayout.wrap),
        widthPercent: normalizePostImageWidth(nextLayout.widthPercent),
        marginPreset: normalizePostImageMargin(nextLayout.marginPreset),
      };

      applyImageLayoutToElement(selectedImage, normalized);
      setSelectedImageLayout(normalized);
      emitChange();
    },
    [emitChange]
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      const html = event.clipboardData.getData("text/html");
      const text = event.clipboardData.getData("text/plain");
      const normalized = buildPostRichTextPasteInsert({ html, text });
      const imageFiles = extractClipboardImageFiles(event.clipboardData);

      const pasteMode = resolveClipboardPasteMode({
        normalizedHtml: normalized.html,
        imageFilesCount: imageFiles.length,
        hasPostPasteDirectives: normalized.directives.replaceWordTocWithDynamicToc,
      });

      if (pasteMode === "images") {
        event.preventDefault();
        if (!onUploadClipboardImage) {
          setPasteHint("Image paste is unavailable in this editor context.");
          return;
        }

        setImageUploading(true);
        setPasteHint(
          imageFiles.length === 1
            ? "Uploading image from clipboard..."
            : `Uploading ${imageFiles.length} images from clipboard...`
        );

        let insertedCount = 0;
        try {
          for (const file of imageFiles) {
            const uploaded = await onUploadClipboardImage(file);
            const inserted = insertHtmlAtCursor(
              buildClipboardImageInsertHtml(
                uploaded,
                deriveClipboardImageAlt(file),
                DEFAULT_POST_IMAGE_LAYOUT
              )
            );
            if (inserted) {
              insertedCount += 1;
            }
          }

          if (insertedCount > 0) {
            emitChange();
            updateSlashState();
            updateSelectedImageState();
          }

          if (insertedCount === 0) {
            setPasteHint("Image upload finished but insertion failed. Try paste again.");
          } else if (insertedCount === 1) {
            setPasteHint("Image uploaded and inserted.");
          } else {
            setPasteHint(`${insertedCount} images uploaded and inserted.`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Image upload failed.";
          setPasteHint(`Image upload failed: ${message}. Paste again to retry.`);
        } finally {
          setImageUploading(false);
        }
        return;
      }

      if (pasteMode !== "rich-text") return;

      event.preventDefault();
      const canInsertHtml = normalized.html.trim().length > 0;
      const inserted = canInsertHtml ? insertHtmlAtCursor(normalized.html) : true;
      if (!inserted && !normalized.directives.replaceWordTocWithDynamicToc) return;

      if (inserted && canInsertHtml) {
        emitChange();
        updateSlashState();
      }

      if (normalized.directives.replaceWordTocWithDynamicToc) {
        onPasteDirectives?.(normalized.directives);
      }

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
    [
      disabled,
      emitChange,
      onPasteDirectives,
      onUploadClipboardImage,
      updateSelectedImageState,
      updateSlashState,
    ]
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
      <PostRichTextToolbar onCommand={executeCommand} disabled={disabled || imageUploading} />
      <div className="relative rounded-lg border bg-background">
        {!hasValue ? (
          <div className="pointer-events-none absolute inset-0 flex items-start px-3 py-2 text-lg leading-relaxed text-muted-foreground">
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          contentEditable={!disabled && !imageUploading}
          data-post-editor-primary-editable="true"
          suppressContentEditableWarning
          aria-label={ariaLabel}
          className={cn(
            "post-editor-richtext w-full rounded-lg px-3 py-2 text-lg leading-relaxed focus:outline-none",
            minHeightClassName
          )}
          onInput={() => {
            emitChange();
            updateSlashState();
            updateSelectedImageState();
          }}
          onBlur={() => {
            emitChange();
            setSlashOpen(false);
            setSlashQuery("");
            selectedImageRef.current = null;
            setSelectedImageLayout(null);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={() => {
            updateSelectedImageState();
          }}
          onMouseUp={() => {
            updateSelectedImageState();
          }}
          onFocus={() => {
            onFocus?.();
            updateSelectedImageState();
          }}
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
      {selectedImageLayout ? (
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-2">
          <p className="text-xs font-semibold text-muted-foreground">Selected image layout</p>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Wrap</p>
              <Select
                value={selectedImageLayout.wrap}
                onValueChange={(value) =>
                  applySelectedImageLayout({
                    wrap: normalizePostImageWrap(value),
                  })
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_IMAGE_WRAP_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === "none"
                        ? "No wrap"
                        : value === "left"
                          ? "Left"
                          : "Right"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Width</p>
              <Select
                value={String(selectedImageLayout.widthPercent)}
                onValueChange={(value) =>
                  applySelectedImageLayout({
                    widthPercent: normalizePostImageWidth(value),
                  })
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_IMAGE_WIDTH_VALUES.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Spacing</p>
              <Select
                value={selectedImageLayout.marginPreset}
                onValueChange={(value) =>
                  applySelectedImageLayout({
                    marginPreset: normalizePostImageMargin(value),
                  })
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_IMAGE_MARGIN_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === "sm"
                        ? "Compact"
                        : value === "md"
                          ? "Balanced"
                          : "Spacious"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}
      {pasteHint ? (
        <p className="text-xs text-amber-500">
          Paste notice: {pasteHint}
        </p>
      ) : null}
    </div>
  );
}
