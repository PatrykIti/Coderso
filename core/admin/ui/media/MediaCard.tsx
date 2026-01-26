import { FileAudio, FileText, Image as ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MediaCardProps = {
  name: string;
  size: string;
  type: "image" | "document" | "audio";
  selected?: boolean;
};

const typeIconMap = {
  image: ImageIcon,
  document: FileText,
  audio: FileAudio,
};

export function MediaCard({ name, size, type, selected }: MediaCardProps) {
  const Icon = typeIconMap[type];
  return (
    <div className="group flex flex-col gap-2">
      <div
        className={cn(
          "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border bg-muted/30",
          selected && "border-primary ring-2 ring-primary/10"
        )}
      >
        <Icon className="h-10 w-10 text-muted-foreground" />
        {selected ? (
          <span className="absolute right-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
            Selected
          </span>
        ) : null}
      </div>
      <div className="space-y-1 px-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{size}</span>
          <Badge variant="outline" className="text-[10px]">
            {type}
          </Badge>
        </div>
      </div>
    </div>
  );
}
