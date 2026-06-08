import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type AssistantChatResponse,
  type AssistantFollowUpOption,
} from "@/services/assistantClient";

type AssistantMessageProps = {
  role: "user" | "assistant";
  text: string;
  response?: AssistantChatResponse;
  error?: string;
  onFollowUpSelect?: (option: AssistantFollowUpOption) => void;
};

type MessageBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "ordered"; items: string[] }
  | { type: "unordered"; items: string[] };

const formatConfidence = (value: number) => `${Math.round(value * 100)}%`;

const parseAssistantMessageBlocks = (value: string): MessageBlock[] => {
  const blocks = value
    .split(/\n{2,}/)
    .map((entry) =>
      entry
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
    .filter((entry) => entry.length > 0);

  return blocks.map((lines) => {
    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return {
        type: "ordered",
        items: lines.map((line) => line.replace(/^\d+\.\s+/, "").trim()),
      };
    }

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return {
        type: "unordered",
        items: lines.map((line) => line.replace(/^[-*]\s+/, "").trim()),
      };
    }

    return {
      type: "paragraph",
      lines,
    };
  });
};

function AssistantMessageBody({ text, error }: { text: string; error?: string }) {
  const blocks = parseAssistantMessageBlocks(text);
  const blockClassName = cn(
    "min-w-0 break-words text-sm text-card-foreground [overflow-wrap:anywhere]",
    error && "text-destructive"
  );

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === "ordered") {
          return (
            <ol
              key={`ordered-${index}`}
              className={cn(blockClassName, "ml-5 list-decimal space-y-1 pl-1")}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ordered-item-${itemIndex}`}>{item}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered") {
          return (
            <ul
              key={`unordered-${index}`}
              className={cn(blockClassName, "ml-5 list-disc space-y-1 pl-1")}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`unordered-item-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${index}`} className={cn(blockClassName, "whitespace-pre-wrap")}>
            {block.lines.join("\n")}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantMessage({
  role,
  text,
  response,
  error,
  onFollowUpSelect,
}: AssistantMessageProps) {
  if (role === "user") {
    return (
      <div className="flex min-w-0 justify-end">
        <div className="max-h-80 max-w-[90%] min-w-0 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground [overflow-wrap:anywhere]">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-96 min-w-0 space-y-3 overflow-y-auto overscroll-contain rounded-xl border bg-card px-3 py-3">
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
        <AssistantMessageBody text={text} error={error} />
      </div>

      {response?.fallbackUsed ? (
        <Alert className="py-2">
          <AlertTitle className="text-xs">Fallback applied</AlertTitle>
          <AlertDescription className="text-xs">
            Requested mode switched to docs-only for this answer.
          </AlertDescription>
        </Alert>
      ) : null}

      {response && response.followUpOptions.length > 0 && !error ? (
        <div className="space-y-2 border-t pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Need more?
          </p>
          <div className="flex flex-wrap gap-2">
            {response.followUpOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="rounded-full border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                onClick={() => onFollowUpSelect?.(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
