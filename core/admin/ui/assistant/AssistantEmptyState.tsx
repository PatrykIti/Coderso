import { Button } from "@/components/ui/button";

const defaultPrompts = [
  "Where can I configure Hero widget colors?",
  "How to switch widget template runtime preview device?",
  "Where are assistant global settings in admin?",
] as const;

type AssistantEmptyStateProps = {
  disabled?: boolean;
  onPromptSelect: (prompt: string) => void;
};

export function AssistantEmptyState({
  disabled = false,
  onPromptSelect,
}: AssistantEmptyStateProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 rounded-xl border border-dashed bg-muted/20 p-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Ask where something is in docs</p>
        <p className="text-xs text-muted-foreground">
          Assistant uses internal documentation snippets and returns exact sources.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {defaultPrompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            className="justify-start text-left"
            onClick={() => onPromptSelect(prompt)}
            disabled={disabled}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
