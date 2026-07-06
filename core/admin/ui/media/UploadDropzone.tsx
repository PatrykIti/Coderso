import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadDropzoneHandle = {
  openFileDialog: () => void;
};

type UploadDropzoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  error?: string | null;
  /**
   * "panel" (default) renders the full dashed drop area. "headless" renders
   * only the hidden file input (+ imperative openFileDialog handle) so a
   * caller can drive uploads from an existing button without the large drop
   * area consuming vertical space above the asset list.
   */
  variant?: "panel" | "headless";
};

export const UploadDropzone = forwardRef<UploadDropzoneHandle, UploadDropzoneProps>(
  ({ onFiles, disabled, error, variant = "panel" }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useImperativeHandle(ref, () => ({
      openFileDialog: () => inputRef.current?.click(),
    }));

    const handleFiles = (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      onFiles(Array.from(fileList));
    };

    if (variant === "headless") {
      return (
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => handleFiles(event.target.files)}
        />
      );
    }

    return (
      <div className="space-y-2">
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground transition",
            isDragging && "border-primary bg-primary/5 text-foreground",
            disabled && "opacity-60"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (disabled) return;
            handleFiles(event.dataTransfer.files);
          }}
        >
          <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drag and drop files here, or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, PDF, MP3 - up to 10MB each</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }
);

UploadDropzone.displayName = "UploadDropzone";
