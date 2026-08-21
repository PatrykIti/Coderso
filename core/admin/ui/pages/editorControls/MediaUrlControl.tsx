import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getCachedMedia, listMediaCached, type MediaRecord } from "../../../services/mediaClient";
import { MediaPickerControl } from "./MediaPickerControl";
import {
  editorGhostButtonClassFor,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type MediaUrlControlProps = {
  label: string;
  /** Stored URL value (page v2 media fields keep a URL string contract). */
  value: string;
  /**
   * Required stable identity for the field (target kind + target id + control
   * id encoded as an unambiguous tuple). Changing the scope remounts the
   * control and invalidates every pending media-resolution request.
   */
  scopeKey: string;
  /** Mime patterns forwarded to the shared media picker, e.g. ["image/*"]. */
  accept?: readonly string[];
  /**
   * Optional commit guard: when present, a resolved media URL may reach
   * `onChange` only when `url.length <= maxLength`. An over-limit selection
   * is rejected without an `onChange` call or replacement value; clear still
   * emits `null`. This is not a render transform: an already-stored over-limit
   * value renders byte-identical and remains clearable.
   */
  maxLength?: number;
  /** Emits the resolved URL string, or `null` for an explicit clear. */
  onChange: (value: string | null) => void;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
};

/**
 * Bridges URL-valued Page v2 media fields (image/video sources, card image,
 * section background image, gallery row sources) onto the shared media
 * library picker. The stored contract stays a URL string: picking a library
 * asset resolves and writes the asset URL, never the asset id. Stored URLs
 * that match a library asset show as that selection; other stored URLs
 * surface as a clearable readout.
 *
 * Stale-write protection: one request-generation ref is advanced on every
 * selection or clear intent and invalidated on `value`/`scopeKey`/callback
 * replacement and on unmount. An async media-list completion may call the
 * live callback only when its generation and captured scope still equal the
 * current values, so a pending request from one selected block/section can
 * never commit to a replacement target.
 */
export const MediaUrlControl = ({
  label,
  value,
  scopeKey,
  accept,
  maxLength,
  onChange,
  tone,
}: MediaUrlControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  const [assets, setAssets] = useState<readonly MediaRecord[] | null>(() => getCachedMedia());
  const requestGenerationRef = useRef(0);
  const liveScopeRef = useRef(scopeKey);
  const liveCallbackRef = useRef(onChange);

  // Keep the live scope and callback target observable to pending completions.
  useEffect(() => {
    liveScopeRef.current = scopeKey;
  }, [scopeKey]);
  useEffect(() => {
    liveCallbackRef.current = onChange;
  }, [onChange]);

  // Value/scopeKey/callback replacement and unmount invalidate in-flight
  // resolution intents: a stale completion must never write to a replaced
  // target or to a control that no longer exists.
  useEffect(() => {
    requestGenerationRef.current += 1;
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [value, scopeKey, onChange]);

  const selectedAssetId = value ? (assets?.find((asset) => asset.url === value)?.id ?? null) : null;

  // Load the library list when a stored value is present but no list has been
  // resolved yet, so external/unmatched values can surface as clearable.
  useEffect(() => {
    if (!value || assets) return;
    let active = true;
    listMediaCached()
      .then((items) => {
        if (active) setAssets(items);
      })
      .catch(() => {
        // The picker owns media load errors; the stored value is kept.
      });
    return () => {
      active = false;
    };
  }, [assets, value]);

  const handlePickerChange = (next: unknown) => {
    if (typeof next !== "string" || next.length === 0) {
      // Clear intent: always allowed and never replaced by a pending request.
      requestGenerationRef.current += 1;
      onChange(null);
      return;
    }
    requestGenerationRef.current += 1;
    const generation = requestGenerationRef.current;
    const capturedScope = liveScopeRef.current;
    void listMediaCached()
      .then((items) => {
        if (generation !== requestGenerationRef.current) return;
        if (capturedScope !== liveScopeRef.current) return;
        setAssets(items);
        const match = items.find((item) => item.id === next);
        if (!match) return;
        if (typeof maxLength === "number" && match.url.length > maxLength) return;
        liveCallbackRef.current(match.url);
      })
      .catch(() => {
        // Resolution failed: never write an asset id into a URL path.
      });
  };

  const showsExternalValue = Boolean(value) && assets !== null && !selectedAssetId;
  return (
    <div className="grid gap-1">
      <MediaPickerControl
        label={label}
        value={selectedAssetId}
        accept={accept ? [...accept] : undefined}
        onChange={handlePickerChange}
      />
      {showsExternalValue ? (
        <div
          className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${
            resolvedTone === "light" ? "bg-muted/40" : "bg-white/10"
          }`}
          data-page-editor-media-external={label}
        >
          <span
            className={`truncate text-xs ${
              resolvedTone === "light" ? "text-muted-foreground" : "text-slate-300"
            }`}
          >
            {value}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={editorGhostButtonClassFor(resolvedTone)}
            onClick={() => {
              requestGenerationRef.current += 1;
              onChange(null);
            }}
          >
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
};
