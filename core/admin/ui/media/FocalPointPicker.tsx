import { Crosshair, RotateCcw } from "lucide-react";
import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FocalPointPickerProps = {
  src: string;
  focalX: number | null;
  focalY: number | null;
  onChange: (x: number, y: number) => void;
  alt?: string;
  className?: string;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * TASK-512-05: draggable focal-point marker over an image preview. Click/drag
 * sets a normalized `[0,1]` focal point; the preview reflects it live via
 * `object-position`; arrow keys nudge; "Reset to center" restores `0.5,0.5`.
 * Coords are clamped `[0,1]` client-side for UX — the server is authoritative.
 * Only meaningful for image assets (the caller gates on `item.type === "image"`).
 */
export function FocalPointPicker({
  src,
  focalX,
  focalY,
  onChange,
  alt = "Focal point preview",
  className,
}: FocalPointPickerProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const x = typeof focalX === "number" && Number.isFinite(focalX) ? clamp01(focalX) : 0.5;
  const y = typeof focalY === "number" && Number.isFinite(focalY) ? clamp01(focalY) : 0.5;

  const setFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = surfaceRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nextX = clamp01((clientX - rect.left) / rect.width);
      const nextY = clamp01((clientY - rect.top) / rect.height);
      onChange(round3(nextX), round3(nextY));
    },
    [onChange]
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setFromClient(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setFromClient(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    let handled = true;
    switch (event.key) {
      case "ArrowLeft":
        onChange(round3(clamp01(x - step)), round3(y));
        break;
      case "ArrowRight":
        onChange(round3(clamp01(x + step)), round3(y));
        break;
      case "ArrowUp":
        onChange(round3(x), round3(clamp01(y - step)));
        break;
      case "ArrowDown":
        onChange(round3(x), round3(clamp01(y + step)));
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  };

  const objectPosition = `${round3(x * 100)}% ${round3(y * 100)}%`;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        ref={surfaceRef}
        role="slider"
        tabIndex={0}
        aria-label="Focal point"
        aria-valuetext={`Focal point ${Math.round(x * 100)}% ${Math.round(y * 100)}%`}
        data-focal-x={x}
        data-focal-y={y}
        className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-xl border border-border bg-muted select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -ml-3 -mt-3 flex size-6 items-center justify-center rounded-full border-2 border-white bg-primary/40 text-white shadow-soft ring-1 ring-black/20"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        >
          <Crosshair className="size-3.5" />
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => onChange(0.5, 0.5)}
      >
        <RotateCcw className="size-3.5" />
        Reset to center
      </Button>
    </div>
  );
}
