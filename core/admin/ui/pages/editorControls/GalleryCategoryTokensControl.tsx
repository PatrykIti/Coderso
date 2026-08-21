import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import {
  PAGE_GALLERY_CATEGORY_MAX,
  PAGE_GALLERY_CATEGORY_TOKEN_MAX,
  PAGE_GALLERY_CATEGORY_TOKENS_MAX,
} from "../../../../services/pages/pageGalleryV2";
import { GALLERY_CATEGORY_PATTERN } from "../../../../services/pages/pageDocumentV2Types";
import {
  editorButtonClassFor,
  editorControlFocusClassFor,
  editorControlLabelClassFor,
  editorGhostButtonClassFor,
  editorPanelInputClass,
  editorPanelRowClass,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type GalleryCategoryTokensControlProps = {
  label: string;
  /** Stored category tokens in ordered first-occurrence order. */
  value: readonly string[];
  /** Emits the full next token array in the same ordered contract. */
  onChange: (value: string[]) => void;
  disabled?: boolean;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
};

/**
 * Category token builder (TASK-539) behind the gallery `filterCategories`
 * list. Tokens use the owner `GALLERY_CATEGORY_PATTERN` and owner bounds:
 * each token is at most 48 characters, the ordered first-occurrence unique
 * list is at most 12 tokens, and the space-joined category is at most 587
 * characters. Add trims and rejects an invalid or duplicate token rather than
 * sorting or silently replacing an existing token, and is disabled once 12
 * tokens are present. Removing a token emits the rest in stored order.
 */
export const GalleryCategoryTokensControl = ({
  label,
  value,
  onChange,
  disabled = false,
  tone,
}: GalleryCategoryTokensControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  const focusClass = editorControlFocusClassFor(resolvedTone);
  const inputClass = `w-full rounded-md px-2 py-1.5 text-sm ${
    resolvedTone === "light"
      ? editorPanelInputClass
      : "border border-white/15 bg-white/10 text-slate-100 placeholder:text-slate-500"
  } ${focusClass}`;
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fullDisabled = disabled || value.length >= PAGE_GALLERY_CATEGORY_TOKENS_MAX;

  const addToken = () => {
    if (fullDisabled) return;
    const token = draft.trim();
    if (!token) return;
    if (token.length > PAGE_GALLERY_CATEGORY_TOKEN_MAX) return;
    if (!GALLERY_CATEGORY_PATTERN.test(token)) return;
    if (value.includes(token)) return;
    const next = [...value, token];
    if (next.join(" ").length > PAGE_GALLERY_CATEGORY_MAX) return;
    setDraft("");
    onChange(next);
  };

  const removeToken = (index: number) => {
    // Keep focus usable: the always-mounted input takes focus after a removal.
    onChange(value.filter((_, tokenIndex) => tokenIndex !== index));
    inputRef.current?.focus();
  };

  return (
    <div className="grid gap-1.5" data-page-editor-control="gallery-category-tokens">
      <span className={editorControlLabelClassFor(resolvedTone)}>{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((token, index) => (
          <span
            // Chips carry no per-token state and are never reordered, so an
            // index key keeps rendering robust even for an unnormalized
            // incoming list; the control itself never emits duplicates.
            key={index}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
              resolvedTone === "light" ? editorPanelRowClass : "border border-white/10 bg-white/5"
            }`}
            data-page-editor-gallery-category-token={index + 1}
          >
            <span className={resolvedTone === "light" ? "text-foreground" : "text-slate-200"}>
              {token}
            </span>
            <button
              type="button"
              className={`flex h-4 w-4 items-center justify-center rounded-sm ${editorGhostButtonClassFor(
                resolvedTone
              )} ${focusClass}`}
              aria-label={`Remove category token ${index + 1}`}
              disabled={disabled}
              onClick={() => removeToken(index)}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          className={inputClass}
          value={draft}
          placeholder="Add a category"
          aria-label="New category token"
          disabled={fullDisabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addToken();
            }
          }}
        />
        <button
          type="button"
          className={`flex h-7 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold ${editorButtonClassFor(
            resolvedTone
          )} ${focusClass}`}
          aria-label="Add category token"
          disabled={fullDisabled}
          onClick={addToken}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
};
