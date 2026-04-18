import { Badge } from "@/components/ui/badge";

type AssistantModeSwitchProps = {
  llmAvailable: boolean;
};

export function AssistantModeSwitch({
  llmAvailable,
}: AssistantModeSwitchProps) {
  return (
    <Badge variant={llmAvailable ? "secondary" : "outline"}>
      {llmAvailable ? "LLM ready" : "Docs only"}
    </Badge>
  );
}
