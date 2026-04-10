import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssistantMode } from "@/services/assistantClient";

type AssistantModeSwitchProps = {
  value: AssistantMode;
  llmAvailable: boolean;
  disabled?: boolean;
  onChange: (mode: AssistantMode) => void;
};

export function AssistantModeSwitch({
  value,
  llmAvailable,
  disabled = false,
  onChange,
}: AssistantModeSwitchProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Assistant mode
        </p>
        <Badge variant={llmAvailable ? "secondary" : "outline"}>
          {llmAvailable ? "LLM ready" : "Docs only"}
        </Badge>
      </div>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as AssistantMode)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" aria-label="Assistant mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="docs-only">Docs Assistant</SelectItem>
          <SelectItem value="llm-rag" disabled={!llmAvailable}>
            LLM Guide
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
