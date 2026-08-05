import { MediaPicker } from "@/ui/media/MediaPicker";

import {
  editorButtonClassFor,
  editorControlLabelClassFor,
  editorGhostButtonClassFor,
  useEditorControlTone,
  type EditorControlTone,
} from "./controlChrome";

export type MediaPickerControlProps = {
  label: string;
  /** Media asset id (string) or null/undefined when nothing is selected. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Mime patterns forwarded to the shared media picker, e.g. ["image/*"]. */
  accept?: string[];
  disabled?: boolean;
  /** Light/dark surface tone; defaults to the surrounding panel context. */
  tone?: EditorControlTone;
};

/**
 * Media/source control for the floating toolbar. Wraps the shared library
 * MediaPicker so media values are always chosen through the media library;
 * a bare URL text input is never the primary path for media sources.
 */
export const MediaPickerControl = ({
  label,
  value,
  onChange,
  accept,
  disabled = false,
  tone,
}: MediaPickerControlProps) => {
  const resolvedTone = useEditorControlTone(tone);
  return (
    <div
      className="grid gap-1"
      data-page-editor-control="media"
      data-page-editor-media-control={label}
      aria-disabled={disabled || undefined}
    >
      <span className={editorControlLabelClassFor(resolvedTone)}>{label}</span>
      <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
        <MediaPicker
          value={value}
          onChange={(next) => onChange(typeof next === "string" ? next : null)}
          multiple={false}
          accept={accept}
          triggerButtonClassName={editorButtonClassFor(resolvedTone)}
          removeButtonClassName={editorGhostButtonClassFor(resolvedTone)}
        />
      </div>
    </div>
  );
};
