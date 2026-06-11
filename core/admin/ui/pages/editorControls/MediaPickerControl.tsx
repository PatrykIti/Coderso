import { MediaPicker } from "@/ui/media/MediaPicker";

import {
  editorControlLabelClass,
  editorDarkButtonClass,
  editorDarkGhostButtonClass,
} from "./controlChrome";

export type MediaPickerControlProps = {
  label: string;
  /** Media asset id (string) or null/undefined when nothing is selected. */
  value: unknown;
  onChange: (value: unknown) => void;
  /** Mime patterns forwarded to the shared media picker, e.g. ["image/*"]. */
  accept?: string[];
  disabled?: boolean;
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
}: MediaPickerControlProps) => (
  <div
    className="grid gap-1"
    data-page-editor-control="media"
    data-page-editor-media-control={label}
    aria-disabled={disabled || undefined}
  >
    <span className={editorControlLabelClass}>{label}</span>
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      <MediaPicker
        value={value}
        onChange={onChange}
        multiple={false}
        accept={accept}
        triggerButtonClassName={editorDarkButtonClass}
        removeButtonClassName={editorDarkGhostButtonClass}
      />
    </div>
  </div>
);
