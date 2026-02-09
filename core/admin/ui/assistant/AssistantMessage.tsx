import { useCallback } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const copySourceRef = useCallback(async (value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard failures should not break the chat flow.
    }
  }, []);

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[90%] rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card px-3 py-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Assistant</Badge>
          {response ? (
            <>
              <Badge variant="outline">{response.effectiveMode}</Badge>
              <Badge variant="outline">Confidence {formatConfidence(response.confidence)}</Badge>
              <Badge variant="outline">
                {response.retrievalBackend === "db" ? "Internal Docs" : "Filesystem Docs"}
              </Badge>
            </>
          ) : null}
        </div>
        <p className={cn("text-sm text-card-foreground", error && "text-destructive")}>
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

      {response?.sources.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sources
          </p>
          <div className="flex flex-col gap-2">
            {response.sources.map((source, index) => {
              const sourceRef = `${source.path} -> ${source.heading}`;
              return (
                <Button
                  key={`${source.path}-${source.heading}-${index}`}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
                  onClick={() => copySourceRef(sourceRef)}
                  title="Click to copy source reference"
                >
                  <span className="block text-xs text-muted-foreground">[{index + 1}]</span>
                  <span className="block text-xs font-medium">{source.path}</span>
                  <span className="block text-xs text-muted-foreground">
                    {source.heading} ({source.lineStart}-{source.lineEnd})
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
