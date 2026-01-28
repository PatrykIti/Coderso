import { FileText, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type EntryCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EntryCreateDrawer({ open, onOpenChange }: EntryCreateDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Create New Entry</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Select a collection and start drafting.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close create entry drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 px-6 py-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Collection
              </label>
              <Select defaultValue="blog">
                <SelectTrigger className="h-10">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Posts</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Title
              </label>
              <Input placeholder="e.g. Launch announcement" />
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Tags
              </label>
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="news, release, update" className="pl-9" />
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>Create Draft</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
