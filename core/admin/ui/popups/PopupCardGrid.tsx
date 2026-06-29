import { Megaphone, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  PopupRecord,
  PopupStatus,
  PopupTargeting,
  PopupTrigger,
} from "@/services/popupsClient";
import { AdminLink } from "@/ui/shared/AdminLink";
import { EmptyState } from "@/ui/shared/EmptyState";
import { StatusBadge } from "@/ui/shared/StatusBadge";

// Presentational tone rotation for the popup icon tile (token-driven, dark-safe).
const TONES = [
  "bg-primary-soft text-primary-soft-foreground",
  "bg-info-soft text-info",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
];

// Pure label helpers over REAL domain enums — no fabricated data.
export const triggerLabel = (trigger: PopupTrigger): string => {
  switch (trigger.type) {
    case "time_delay":
      return "Timed";
    case "scroll_depth":
      return "Scroll";
    case "exit_intent":
      return "Exit intent";
    case "cta_click":
      return "On click";
    default:
      return "Trigger";
  }
};

export const audienceLabel = (audience: PopupTargeting["audience"]): string => {
  switch (audience) {
    case "logged_in":
      return "Logged-in";
    case "logged_out":
      return "Logged-out";
    case "all":
    default:
      return "All visitors";
  }
};

export const frequencyLabel = (strategy: PopupRecord["frequency"]["strategy"]): string => {
  switch (strategy) {
    case "always":
      return "Every visit";
    case "session_once":
      return "Once / session";
    case "daily_once":
      return "Once / day";
    default:
      return "—";
  }
};

type PopupCardGridProps = {
  items: PopupRecord[];
  isLoading?: boolean;
  onStatusChange: (id: string, status: PopupStatus) => void;
  onDelete: (id: string) => void;
};

export function PopupCardGrid({ items, isLoading, onStatusChange, onDelete }: PopupCardGridProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone />}
        title={isLoading ? "Loading popups…" : "No popups yet."}
        description={
          isLoading
            ? "Fetching your popup campaigns."
            : "Create your first popup to capture attention with timed, scroll, and exit-intent overlays."
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((popup, index) => (
        <Card key={popup.id} className="flex h-full flex-col gap-0 p-5">
          <div className="flex items-start justify-between">
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl",
                TONES[index % TONES.length]
              )}
            >
              <Megaphone className="size-6" />
            </span>
            <div className="flex items-center gap-1">
              {/* Active toggle = REAL status mutation (published <-> draft). */}
              <Switch
                checked={popup.status === "published"}
                aria-label={`Toggle ${popup.name}`}
                onCheckedChange={(on) => onStatusChange(popup.id, on ? "published" : "draft")}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${popup.name}`}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <AdminLink
                      href={`/advanced/popups/${encodeURIComponent(popup.id)}`}
                      className="w-full"
                      prefetch
                    >
                      <Pencil className="size-4" />
                      Edit
                    </AdminLink>
                  </DropdownMenuItem>
                  {popup.status !== "published" ? (
                    <DropdownMenuItem onClick={() => onStatusChange(popup.id, "published")}>
                      Publish
                    </DropdownMenuItem>
                  ) : null}
                  {popup.status !== "draft" ? (
                    <DropdownMenuItem onClick={() => onStatusChange(popup.id, "draft")}>
                      Move to draft
                    </DropdownMenuItem>
                  ) : null}
                  {popup.status !== "archived" ? (
                    <DropdownMenuItem onClick={() => onStatusChange(popup.id, "archived")}>
                      Archive
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(popup.id)}>
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <AdminLink
            href={`/advanced/popups/${encodeURIComponent(popup.id)}`}
            prefetch
            aria-label={`Edit popup: ${popup.name}`}
            className="mt-4 font-display text-[15px] font-semibold text-foreground underline-offset-4 hover:underline focus-visible:underline"
          >
            {popup.name}
          </AdminLink>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="soft">{triggerLabel(popup.trigger)}</Badge>
            <StatusBadge status={popup.status} />
          </div>

          {/* Metadata row — REAL fields only (audience + frequency). NO analytics. */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Audience</div>
              <div className="font-medium">{audienceLabel(popup.targeting.audience)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Frequency</div>
              <div className="font-medium">{frequencyLabel(popup.frequency.strategy)}</div>
            </div>
          </div>

          <AdminLink
            href={`/advanced/popups/${encodeURIComponent(popup.id)}`}
            prefetch
            className="mt-auto pt-4"
          >
            <Button variant="soft" size="sm" className="w-full">
              Edit popup
            </Button>
          </AdminLink>
        </Card>
      ))}
    </div>
  );
}
