import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AuthoringInsertionZone({
  label,
  onInsert,
}: {
  label: string;
  onInsert: () => void;
}) {
  return (
    <div
      className="group relative flex h-7 items-center justify-center"
      data-authoring-insertion-zone="true"
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-primary/30 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        aria-hidden="true"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative z-10 h-6 gap-1 rounded-full px-2 text-xs opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
        aria-label={label}
        onClick={onInsert}
      >
        <Plus className="h-3 w-3" />
        Add
      </Button>
    </div>
  );
}
