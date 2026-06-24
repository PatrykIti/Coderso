import { cn } from "@/lib/utils";

export type AuthoringSelectionLevel = "container" | "item";

export function selectionBorder({
  level,
  selected,
  editing,
  interactive = true,
}: {
  level: AuthoringSelectionLevel;
  selected?: boolean;
  editing?: boolean;
  interactive?: boolean;
}) {
  return cn(
    level === "container" ? "rounded-2xl" : "rounded-xl",
    "ring-inset transition-[box-shadow,background-color]",
    editing
      ? "ring-2 ring-primary outline-none"
      : selected
        ? "ring-2 ring-primary/45"
        : interactive
          ? "ring-1 ring-transparent hover:ring-border"
          : "ring-1 ring-transparent"
  );
}
