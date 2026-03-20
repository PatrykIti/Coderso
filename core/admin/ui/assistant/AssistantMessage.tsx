import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssistantChatResponse } from "@/services/assistantClient";

type AssistantMessageProps = {
  role: "user" | "assistant";
  text: string;
  response?: AssistantChatResponse;
  error?: string;
};

const formatConfidence = (value: number) => `${Math.round(value * 100)}%`;

export function AssistantMessage({
  role,
  text,
  response,
  error,
}: AssistantMessageProps) {
  if (role === "user") {
    return (
      <div className="flex min-w-0 justify-end">
        <div className="max-w-[90%] min-w-0 whitespace-pre-wrap break-words rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground [overflow-wrap:anywhere]">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3 overflow-hidden rounded-xl border bg-card px-3 py-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Assistant</Badge>
          {response ? (
            <>
              <Badge variant="outline">{response.effectiveMode}</Badge>
              <Badge variant="outline">Confidence {formatConfidence(response.confidence)}</Badge>
              <Badge variant="outline">Internal Docs</Badge>
            </>
          ) : null}
        </div>
        <p
          className={cn(
            "min-w-0 whitespace-pre-wrap break-words text-sm text-card-foreground [overflow-wrap:anywhere]",
            error && "text-destructive"
          )}
        >
          {text}
        </p>
      </div>

      {response?.fallbackUsed ? (
        <Alert className="py-2">
          <AlertTitle className="text-xs">Fallback applied</AlertTitle>
          <AlertDescription className="text-xs">
            Requested mode switched to docs-only for this answer.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
