import { CirclePlus, GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FieldPreviewProps = {
  label: string;
  placeholder?: string;
  value?: string;
  selected?: boolean;
  multiline?: boolean;
};

function FieldPreview({
  label,
  placeholder,
  value,
  selected = false,
  multiline = false,
}: FieldPreviewProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4 transition",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-transparent hover:border-border/70"
      )}
    >
      <div className="absolute -left-10 top-1/2 hidden -translate-y-1/2 opacity-0 transition group-hover:opacity-100 lg:flex">
        <Button variant="ghost" size="icon-xs" aria-label="Reorder field">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
      {selected ? (
        <div className="absolute -right-2 -top-2">
          <Button
            variant="ghost"
            size="icon-xs"
            className="border bg-background/90 shadow-sm"
            aria-label="Remove field"
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      ) : null}
      <div className="space-y-2">
        <label
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.2em]",
            selected ? "text-primary" : "text-muted-foreground"
          )}
        >
          {label}
        </label>
        {multiline ? (
          <Textarea
            placeholder={placeholder}
            defaultValue={value}
            rows={4}
            readOnly
            className={cn(
              "resize-none",
              selected
                ? "border-primary/30 bg-background"
                : "bg-muted/40 text-muted-foreground"
            )}
          />
        ) : (
          <Input
            placeholder={placeholder}
            defaultValue={value}
            readOnly
            className={cn(
              selected ? "border-primary/30 bg-background" : "bg-muted/40 text-muted-foreground"
            )}
          />
        )}
      </div>
    </div>
  );
}

export function FormCanvas() {
  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-[radial-gradient(circle_at_1px_1px,_rgba(148,163,184,0.25),_transparent_0)] bg-[size:20px_20px] px-8 py-10 dark:bg-[radial-gradient(circle_at_1px_1px,_rgba(51,65,85,0.45),_transparent_0)] lg:px-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col">
          <Card className="gap-6 rounded-3xl border-border/60 bg-background p-8 shadow-xl">
            <div className="space-y-1 border-b border-border/60 pb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Contact Us
              </h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll get back to you within 24 hours.
              </p>
            </div>
            <div className="space-y-4">
              <FieldPreview
                label="Full Name"
                value="John Doe"
                selected
              />
              <FieldPreview
                label="Email Address"
                placeholder="example@email.com"
              />
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 text-center text-muted-foreground">
                <CirclePlus className="mb-2 h-6 w-6" />
                <p className="text-xs font-medium">
                  Drop a field here to add to your form
                </p>
              </div>
              <FieldPreview
                label="Message"
                placeholder="Type your request..."
                multiline
              />
            </div>
            <div className="pt-4">
              <Button className="w-full">Submit Message</Button>
            </div>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
