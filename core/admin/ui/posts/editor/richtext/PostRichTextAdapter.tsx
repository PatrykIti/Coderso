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
import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import { searchPostBlockCatalog } from "../blocks/blockCatalog";
import { SlashCommandMenu } from "../blocks/SlashCommandMenu";
import {
  PostRichTextToolbar,
  type PostRichTextCommand,
  type PostRichTextToolbarProfile,
} from "./PostRichTextToolbar";
import {
  applyAlignmentToBlocks,
  applyCommandToRootHtmlWithoutBlocks,
  executeBlockCommandOnBlocks,
  getPostRichTextCommandKind,
  resolveAlignmentForCommand,
  resolveBlockTagForCommand,
  resolveListTagForCommand,
} from "./postRichTextCommandEngine";
import { resolveBlockTransformForCommand } from "./postRichTextBlockTransforms";
import {
  applyFormatBlockCommand,
  applyInlineTypographySelection,
  clearFormattingInBlocks,
  getCurrentBlockElement,
  getSelectedBlockElements,
  insertHtmlAtCursor,
  runCommand,
  wrapSelectionWithTag,
} from "./postRichTextSelection";
import {
  applyImageLayoutToElement,
  buildClipboardImageInsertHtml,
  deriveClipboardImageAlt,
  escapeHtml,
  extractClipboardImageFiles,
  findSelectedImageElement,
  readImageLayoutFromElement,
} from "./postRichTextMedia";
import { resolveSlashState, shouldClearEditorAfterSlashSelect } from "./postRichTextSlashState";

// Compatibility re-exports: these selection/media symbols keep their historical
// adapter module path for existing importers (tests and sibling editors).
export {
  applyInlineTypographySelection,
  clearFormattingInBlocks,
  resolveInlineWrapperTextRange,
} from "./postRichTextSelection";
export { buildClipboardImageInsertHtml, extractClipboardImageFiles } from "./postRichTextMedia";

type PostRichTextAdapterProps = {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
  onSlashInsertBlock?: (type: PostBlockType) => void;
  onPasteDirectives?: (directives: PostPasteDirectives) => void;
  onFocus?: () => void;
  onEditorBlur?: (finalHtml: string) => void;
  onUnsafeLinkAttempt?: (href: string) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  toolbarProfile?: PostRichTextToolbarProfile;
  fontFamily?: "sans" | "serif" | "mono";
  baseTextScale?: "sm" | "md" | "lg" | "xl";
  onFontFamilyChange?: (value: "sans" | "serif" | "mono") => void;
  onBaseTextScaleChange?: (value: "sm" | "md" | "lg" | "xl") => void;
  onBlockTypeChange?: (targetType: PostBlockType, attrs?: Record<string, unknown>) => void;
  blockTransformMode?: "type-only" | "type-and-format";
};

type ShortcutInput = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
};

export const resolvePostRichTextShortcutCommand = (
  input: ShortcutInput
): PostRichTextCommand | null => {
  const modifier = Boolean(input.metaKey || input.ctrlKey);
  const key = input.key.toLowerCase();
  if (!modifier) return null;

  if (key === "b") return "bold";
  if (key === "i") return "italic";
  if (key === "u") return "underline";
  if (key === "k") return "link";
  if (Boolean(input.shiftKey) && key === "7") return "ordered-list";
  if (Boolean(input.shiftKey) && key === "8") return "bullet-list";
  return null;
};

export const resolvePostRichTextCommandKind = getPostRichTextCommandKind;

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
  id,
  placeholder = "Start writing…",
  ariaLabel = "Rich text editor",
  ariaLabelledBy,
  ariaDescribedBy,
  disabled = false,
  className,
  minHeightClassName = "min-h-[18rem]",
  onSlashInsertBlock,
  onPasteDirectives,
  onFocus,
  onEditorBlur,
  onUnsafeLinkAttempt,
  onUploadClipboardImage,
  toolbarProfile = "writing-canvas",
  fontFamily = "sans",
  baseTextScale = "md",
  onFontFamilyChange,
  onBaseTextScaleChange,
  onBlockTypeChange,
  blockTransformMode = "type-and-format",
}: PostRichTextAdapterProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const focusedRef = useRef(false);
  const lastEmittedRef = useRef<string | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedImageLayout, setSelectedImageLayout] = useState<PostImageLayout | null>(null);

  const emitChange = useCallback(() => {
    const current = editorRef.current;
    if (!current) return;
    const serialized = serializePostRichText(current.innerHTML);
    if (serialized === value) return;
    lastEmittedRef.current = serialized;
    onChange(serialized);
  }, [onChange, value]);

  useEffect(() => {
    const current = editorRef.current;
    if (!current) return;
    const nextHtml = deserializePostRichText(value);
    if (focusedRef.current && nextHtml === lastEmittedRef.current) {
      return;
    }
    if (current.innerHTML !== nextHtml) {
      current.innerHTML = nextHtml;
    }
  }, [value]);

  const saveSelectionRange = useCallback(() => {
    const editorRoot = editorRef.current;
    if (!editorRoot || typeof window === "undefined") return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editorRoot.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }, []);

  const restoreSelectionRange = useCallback(() => {
    const editorRoot = editorRef.current;
    const savedRange = savedRangeRef.current;
    if (!editorRoot || !savedRange || typeof window === "undefined") return false;
    const selection = window.getSelection();
    if (!selection) return false;
    if (!editorRoot.contains(savedRange.commonAncestorContainer)) return false;
    selection.removeAllRanges();
    selection.addRange(savedRange);
    return true;
  }, []);

  const applyInlineTypography = useCallback(
    (attributes: Record<string, string>) => {
      const editorRoot = editorRef.current;
      if (!editorRoot) return false;
      editorRoot.focus();
      restoreSelectionRange();
      const applied = applyInlineTypographySelection(editorRoot, attributes);
      if (!applied) return false;
      saveSelectionRange();
      emitChange();
      return true;
    },
    [emitChange, restoreSelectionRange, saveSelectionRange]
  );

  const handleFontFamilyChange = useCallback(
    (nextFontFamily: "sans" | "serif" | "mono") => {
      const applied = applyInlineTypography({ "data-font": nextFontFamily });
      if (applied) return;
      onFontFamilyChange?.(nextFontFamily);
    },
    [applyInlineTypography, onFontFamilyChange]
  );

  const handleBaseTextScaleChange = useCallback(
    (nextScale: "sm" | "md" | "lg" | "xl") => {
      const applied = applyInlineTypography({ "data-text-scale": nextScale });
      if (applied) return;
      onBaseTextScaleChange?.(nextScale);
    },
    [applyInlineTypography, onBaseTextScaleChange]
  );

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

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleSelectionChange = () => {
      if (!focusedRef.current) return;
      saveSelectionRange();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [saveSelectionRange]);

  const executeCommand = useCallback(
    (command: PostRichTextCommand) => {
      if (disabled) return;
      const editorRoot = editorRef.current;
      if (!editorRoot) return;
      editorRoot.focus();
      restoreSelectionRange();

      const selectedBlocks = getSelectedBlockElements(editorRoot);
      const currentBlock = getCurrentBlockElement(editorRoot);
      const targetBlocks =
        selectedBlocks.length > 0 ? selectedBlocks : currentBlock ? [currentBlock] : [];
      const commandKind = getPostRichTextCommandKind(command);

      if (onBlockTypeChange) {
        const shouldHandleBlockType =
          commandKind === "block-type" ||
          (commandKind === "block-format" && blockTransformMode === "type-and-format");
        if (shouldHandleBlockType) {
          const transform = resolveBlockTransformForCommand(command);
          if (transform) {
            onBlockTypeChange(transform.type, transform.attrs);
            return;
          }
        }
      }

      if (commandKind === "native-inline") {
        if (command === "bold") runCommand("bold");
        if (command === "italic") runCommand("italic");
        if (command === "underline") runCommand("underline");
        if (command === "strike") runCommand("strikeThrough");
      } else if (commandKind === "inline-wrapper") {
        wrapSelectionWithTag(command === "inline-code" ? "code" : "mark", editorRoot);
      } else if (commandKind === "link") {
        if (typeof window !== "undefined") {
          const href = window.prompt("Enter link URL", "https://");
          if (href !== null) {
            const nextHref = href.trim();
            if (!nextHref) {
              runCommand("unlink");
            } else {
              const hrefIsSafe = /^(https?:|mailto:|tel:|\/|#)/i.test(nextHref);
              const commandHref = hrefIsSafe ? nextHref : "#";
              if (!hrefIsSafe) {
                onUnsafeLinkAttempt?.(nextHref);
              }
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                if (selection.isCollapsed) {
                  const label = window.prompt("Link text", nextHref) ?? nextHref;
                  runCommand(
                    "insertHTML",
                    `<a href="${escapeHtml(commandHref)}">${escapeHtml(label)}</a>`
                  );
                } else {
                  runCommand("createLink", commandHref);
                }
              }
            }
          }
        }
      } else if (commandKind === "block-format" || commandKind === "list-format") {
        const handled =
          targetBlocks.length > 0
            ? executeBlockCommandOnBlocks(command, targetBlocks)
            : (() => {
                const nextHtml = applyCommandToRootHtmlWithoutBlocks(command, editorRoot.innerHTML);
                if (!nextHtml) return false;
                editorRoot.innerHTML = nextHtml;
                return true;
              })();
        if (!handled) {
          const fallbackBlockTag = resolveBlockTagForCommand(command);
          const fallbackListTag = resolveListTagForCommand(command);
          if (fallbackBlockTag) {
            applyFormatBlockCommand(fallbackBlockTag);
          } else if (fallbackListTag === "ul") {
            runCommand("insertUnorderedList");
          } else if (fallbackListTag === "ol") {
            runCommand("insertOrderedList");
          }
        }
      } else if (commandKind === "alignment") {
        const alignment = resolveAlignmentForCommand(command);
        if (alignment) {
          applyAlignmentToBlocks(targetBlocks, alignment);
        }
      } else if (commandKind === "clear-formatting") {
        runCommand("removeFormat");
        runCommand("unlink");
        clearFormattingInBlocks(targetBlocks);
        if (targetBlocks.length > 0) {
          executeBlockCommandOnBlocks("paragraph", targetBlocks);
        } else {
          const nextHtml = applyCommandToRootHtmlWithoutBlocks("paragraph", editorRoot.innerHTML);
          if (nextHtml) {
            editorRoot.innerHTML = nextHtml;
          }
        }
      }

      saveSelectionRange();
      emitChange();
    },
    [
      blockTransformMode,
      disabled,
      emitChange,
      onBlockTypeChange,
      onUnsafeLinkAttempt,
      restoreSelectionRange,
      saveSelectionRange,
    ]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && slashOpen) {
        event.preventDefault();
        setSlashOpen(false);
        setSlashQuery("");
        return;
      }

      const key = event.key.toLowerCase();
      const shortcutCommand = resolvePostRichTextShortcutCommand({
        key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
      });
      if (shortcutCommand) {
        event.preventDefault();
        executeCommand(shortcutCommand);
        return;
      }

      if (key === "enter" && !event.shiftKey) {
        const current = editorRef.current;
        if (!current) return;
        const currentBlock = getCurrentBlockElement(current);
        const currentTag = currentBlock?.tagName.toLowerCase();
        if (currentTag !== "ul" && currentTag !== "ol") {
          event.preventDefault();
          runCommand("insertParagraph");
          emitChange();
          return;
        }
      }

      if (event.shiftKey && event.altKey && key === "5") {
        event.preventDefault();
        executeCommand("quote");
      }
    },
    [emitChange, executeCommand, slashOpen]
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
    const nextSlashState = resolveSlashState(postRichTextToPlainText(current.innerHTML));
    setSlashOpen(nextSlashState.open);
    setSlashQuery(nextSlashState.query);
  }, [onSlashInsertBlock, slashOpen]);

  const slashOptions = useMemo(() => searchPostBlockCatalog(slashQuery).slice(0, 8), [slashQuery]);

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
          normalized.warnings.length > 1 ? ` (+${normalized.warnings.length - 1} more)` : "";
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
        if (shouldClearEditorAfterSlashSelect(plain)) {
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
      <PostRichTextToolbar
        onCommand={executeCommand}
        disabled={disabled || imageUploading}
        profile={toolbarProfile}
        fontFamily={fontFamily}
        onFontFamilyChange={onFontFamilyChange ? handleFontFamilyChange : undefined}
        baseTextScale={baseTextScale}
        onBaseTextScaleChange={onBaseTextScaleChange ? handleBaseTextScaleChange : undefined}
      />
      <div className="relative rounded-lg bg-background">
        {!hasValue ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-start px-3 py-2 leading-relaxed text-muted-foreground",
              baseTextScale === "sm"
                ? "text-base"
                : baseTextScale === "lg"
                  ? "text-xl"
                  : baseTextScale === "xl"
                    ? "text-2xl"
                    : "text-lg",
              fontFamily === "serif"
                ? "font-serif"
                : fontFamily === "mono"
                  ? "font-mono"
                  : "font-sans"
            )}
          >
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          id={id}
          contentEditable={!disabled && !imageUploading}
          data-post-editor-primary-editable="true"
          suppressContentEditableWarning
          aria-label={ariaLabelledBy ? undefined : ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "post-editor-richtext w-full rounded-lg px-3 py-2 leading-relaxed focus:outline-none",
            baseTextScale === "sm"
              ? "text-base"
              : baseTextScale === "lg"
                ? "text-xl"
                : baseTextScale === "xl"
                  ? "text-2xl"
                  : "text-lg",
            fontFamily === "serif"
              ? "font-serif"
              : fontFamily === "mono"
                ? "font-mono"
                : "font-sans",
            minHeightClassName
          )}
          onInput={() => {
            emitChange();
            saveSelectionRange();
            updateSlashState();
            updateSelectedImageState();
          }}
          onBlur={() => {
            focusedRef.current = false;
            emitChange();
            saveSelectionRange();
            const current = editorRef.current;
            if (current) {
              onEditorBlur?.(serializePostRichText(current.innerHTML));
            }
            setSlashOpen(false);
            setSlashQuery("");
            selectedImageRef.current = null;
            setSelectedImageLayout(null);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={() => {
            saveSelectionRange();
            updateSelectedImageState();
          }}
          onMouseUp={() => {
            saveSelectionRange();
            updateSelectedImageState();
          }}
          onFocus={() => {
            onFocus?.();
            focusedRef.current = true;
            runCommand("defaultParagraphSeparator", "p");
            saveSelectionRange();
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
                      {value === "none" ? "No wrap" : value === "left" ? "Left" : "Right"}
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
                      {value === "sm" ? "Compact" : value === "md" ? "Balanced" : "Spacious"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}
      {pasteHint ? <p className="text-xs text-amber-500">Paste notice: {pasteHint}</p> : null}
    </div>
  );
}
