import { Plus, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type {
  FormActionCondition,
  FormActionInput,
  FormActionType,
} from "@/services/formsClient";

type FormActionsPanelProps = {
  actions: FormActionInput[];
  onChange: (actions: FormActionInput[]) => void;
  contentTypes: ContentTypeSummary[];
  onOpenLogs: () => void;
};

const ACTION_OPTIONS: Array<{ value: FormActionType; label: string; help: string }> = [
  {
    value: "email",
    label: "Send email",
    help: "Send a notification email after submission.",
  },
  {
    value: "webhook",
    label: "Call webhook",
    help: "Push submission data to an external endpoint.",
  },
  {
    value: "entry_sync",
    label: "Sync entry",
    help: "Create or update a content entry from submission values.",
  },
  {
    value: "redirect",
    label: "Redirect",
    help: "Override redirect URL for this submission.",
  },
  {
    value: "success_message",
    label: "Success message",
    help: "Override the post-submit success message.",
  },
];

const CONDITION_OPTIONS: Array<{
  value: FormActionCondition["operator"];
  label: string;
}> = [
  { value: "always", label: "Always" },
  { value: "equals", label: "Field equals" },
  { value: "not_equals", label: "Field not equals" },
  { value: "exists", label: "Field has value" },
  { value: "not_exists", label: "Field is empty" },
];

const createActionDefaults = (type: FormActionType): FormActionInput => {
  if (type === "email") {
    return {
      type,
      label: "Send email",
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: {
        to: "{{submission.email}}",
        subject: "New form submission",
        text: "New submission received.",
      },
    };
  }

  if (type === "webhook") {
    return {
      type,
      label: "Call webhook",
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: {
        url: "https://",
        method: "POST",
        headers: {},
        timeoutMs: 8000,
        includeSubmission: true,
      },
    };
  }

  if (type === "entry_sync") {
    return {
      type,
      label: "Sync entry",
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: {
        contentTypeId: "",
        mode: "create",
        titleTemplate: "{{submission.name}}",
        slugTemplate: "{{submissionId}}",
        dataMapping: {},
      },
    };
  }

  if (type === "redirect") {
    return {
      type,
      label: "Redirect",
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: {
        url: "/thank-you",
      },
    };
  }

  return {
    type,
    label: "Success message",
    enabled: true,
    continueOnError: true,
    condition: { operator: "always" },
    config: {
      message: "Thanks for your submission.",
    },
  };
};

const normalizeCondition = (
  value: FormActionInput["condition"]
): FormActionCondition => {
  if (!value || typeof value !== "object" || !("operator" in value)) {
    return { operator: "always" };
  }

  const condition = value as FormActionCondition;
  if (condition.operator === "always") {
    return condition;
  }

  if (condition.operator === "exists" || condition.operator === "not_exists") {
    return {
      operator: condition.operator,
      field: condition.field ?? "",
    };
  }

  if (condition.operator !== "equals" && condition.operator !== "not_equals") {
    return { operator: "always" };
  }

  return {
    operator: condition.operator,
    field: condition.field ?? "",
    value: condition.value ?? "",
  };
};

const toActionTypeLabel = (type: FormActionType) =>
  ACTION_OPTIONS.find((option) => option.value === type)?.label ?? type;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function FormActionsPanel({
  actions,
  onChange,
  contentTypes,
  onOpenLogs,
}: FormActionsPanelProps) {
  const updateActions = (
    updater: (current: FormActionInput[]) => FormActionInput[]
  ) => {
    const next = updater(actions).map((action, index) => ({
      ...action,
      orderIndex: index,
    }));
    onChange(next);
  };

  const addAction = (type: FormActionType) => {
    updateActions((current) => [...current, createActionDefaults(type)]);
  };

  const updateAction = (
    index: number,
    patch: Partial<FormActionInput>
  ) => {
    updateActions((current) =>
      current.map((action, currentIndex) =>
        currentIndex === index ? { ...action, ...patch } : action
      )
    );
  };

  const updateActionConfig = (
    index: number,
    patch: Record<string, unknown>
  ) => {
    updateActions((current) =>
      current.map((action, currentIndex) => {
        if (currentIndex !== index) return action;
        return {
          ...action,
          config: {
            ...(isRecord(action.config) ? action.config : {}),
            ...patch,
          },
        };
      })
    );
  };

  const removeAction = (index: number) => {
    updateActions((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const moveAction = (index: number, direction: -1 | 1) => {
    updateActions((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  };

  const renderCondition = (action: FormActionInput, index: number) => {
    const condition = normalizeCondition(action.condition);
    return (
      <div className="space-y-2 rounded-md border bg-muted/20 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Run condition
        </p>
        <Select
          value={condition.operator}
          onValueChange={(value) => {
            const operator = value as FormActionCondition["operator"];
            if (operator === "always") {
              updateAction(index, { condition: { operator: "always" } });
              return;
            }
            if (operator === "exists" || operator === "not_exists") {
              updateAction(index, {
                condition: {
                  operator,
                  field:
                    "field" in condition && typeof condition.field === "string"
                      ? condition.field
                      : "",
                },
              });
              return;
            }
            updateAction(index, {
              condition: {
                operator,
                field:
                  "field" in condition && typeof condition.field === "string"
                    ? condition.field
                    : "",
                value:
                  "value" in condition
                    ? condition.value ?? ""
                    : "",
              },
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose condition" />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {condition.operator !== "always" ? (
          <Input
            value={"field" in condition ? condition.field : ""}
            onChange={(event) => {
              const field = event.target.value;
              if (condition.operator === "exists" || condition.operator === "not_exists") {
                updateAction(index, {
                  condition: {
                    operator: condition.operator,
                    field,
                  },
                });
                return;
              }

              updateAction(index, {
                condition: {
                  operator: condition.operator,
                  field,
                  value: "value" in condition ? condition.value : "",
                },
              });
            }}
            placeholder="submission.fieldName"
          />
        ) : null}
        {condition.operator === "equals" || condition.operator === "not_equals" ? (
          <Input
            value={
              "value" in condition && condition.value !== null
                ? String(condition.value)
                : ""
            }
            onChange={(event) => {
              updateAction(index, {
                condition: {
                  operator: condition.operator,
                  field: condition.field,
                  value: event.target.value,
                },
              });
            }}
            placeholder="Expected value"
          />
        ) : null}
      </div>
    );
  };

  const renderEmailConfig = (action: FormActionInput, index: number) => {
    const config = isRecord(action.config) ? action.config : {};
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          SMTP and default sender are loaded from Settings &gt; Email.
        </p>
        <Input
          value={typeof config.to === "string" ? config.to : ""}
          onChange={(event) => updateActionConfig(index, { to: event.target.value })}
          placeholder="To (e.g. {{submission.email}})"
        />
        <Input
          value={typeof config.subject === "string" ? config.subject : ""}
          onChange={(event) => updateActionConfig(index, { subject: event.target.value })}
          placeholder="Subject"
        />
        <Textarea
          rows={3}
          value={typeof config.text === "string" ? config.text : ""}
          onChange={(event) => updateActionConfig(index, { text: event.target.value })}
          placeholder="Text body"
        />
      </div>
    );
  };

  const renderWebhookConfig = (action: FormActionInput, index: number) => {
    const config = isRecord(action.config) ? action.config : {};
    const timeoutValue =
      typeof config.timeoutMs === "number" && Number.isFinite(config.timeoutMs)
        ? String(config.timeoutMs)
        : "8000";
    return (
      <div className="space-y-2">
        <Input
          value={typeof config.url === "string" ? config.url : ""}
          onChange={(event) => updateActionConfig(index, { url: event.target.value })}
          placeholder="https://example.com/webhook"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={typeof config.method === "string" ? config.method : "POST"}
            onValueChange={(value) => updateActionConfig(index, { method: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={timeoutValue}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              updateActionConfig(index, {
                timeoutMs: Number.isFinite(parsed) ? parsed : 8000,
              });
            }}
            placeholder="Timeout ms"
          />
        </div>
        <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
          <span className="text-xs text-muted-foreground">Include full submission payload</span>
          <Switch
            checked={config.includeSubmission !== false}
            onCheckedChange={(checked) =>
              updateActionConfig(index, { includeSubmission: checked })
            }
          />
        </div>
        <Textarea
          rows={2}
          value={typeof config.bodyTemplate === "string" ? config.bodyTemplate : ""}
          onChange={(event) =>
            updateActionConfig(index, { bodyTemplate: event.target.value })
          }
          placeholder='Optional payload template (JSON or plain text). Example: {"lead":"{{submission.name}}"}'
        />
      </div>
    );
  };

  const renderEntryMapping = (action: FormActionInput, index: number) => {
    const config = isRecord(action.config) ? action.config : {};
    const dataMapping = isRecord(config.dataMapping)
      ? (config.dataMapping as Record<string, unknown>)
      : {};
    const pairs = Object.entries(dataMapping);

    const updatePair = (pairIndex: number, nextKey: string, nextValue: string) => {
      const nextMapping: Record<string, string> = {};
      pairs.forEach(([key, value], currentIndex) => {
        if (currentIndex === pairIndex) {
          if (nextKey.trim().length > 0) {
            nextMapping[nextKey] = nextValue;
          }
          return;
        }
        if (typeof value === "string" && key.trim().length > 0) {
          nextMapping[key] = value;
        }
      });
      updateActionConfig(index, { dataMapping: nextMapping });
    };

    const addPair = () => {
      const nextMapping: Record<string, string> = {};
      pairs.forEach(([key, value]) => {
        if (typeof value === "string" && key.trim().length > 0) {
          nextMapping[key] = value;
        }
      });
      nextMapping[`field_${pairs.length + 1}`] = "{{submission.value}}";
      updateActionConfig(index, { dataMapping: nextMapping });
    };

    const removePair = (pairIndex: number) => {
      const nextMapping: Record<string, string> = {};
      pairs.forEach(([key, value], currentIndex) => {
        if (currentIndex === pairIndex) return;
        if (typeof value === "string" && key.trim().length > 0) {
          nextMapping[key] = value;
        }
      });
      updateActionConfig(index, { dataMapping: nextMapping });
    };

    return (
      <div className="space-y-2">
        <Select
          value={typeof config.contentTypeId === "string" ? config.contentTypeId : ""}
          onValueChange={(value) => updateActionConfig(index, { contentTypeId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose content type" />
          </SelectTrigger>
          <SelectContent>
            {contentTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeof config.mode === "string" ? config.mode : "create"}
          onValueChange={(value) => updateActionConfig(index, { mode: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sync mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="create">Always create</SelectItem>
            <SelectItem value="upsert_by_slug">Create or update by slug</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={typeof config.titleTemplate === "string" ? config.titleTemplate : ""}
          onChange={(event) =>
            updateActionConfig(index, { titleTemplate: event.target.value })
          }
          placeholder="Title template, e.g. {{submission.name}}"
        />
        <Input
          value={typeof config.slugTemplate === "string" ? config.slugTemplate : ""}
          onChange={(event) =>
            updateActionConfig(index, { slugTemplate: event.target.value })
          }
          placeholder="Slug template, e.g. {{submissionId}}"
        />
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Field mapping</p>
            <Button type="button" variant="outline" size="sm" onClick={addPair}>
              Add field
            </Button>
          </div>
          {pairs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Add at least one field mapping to transfer values into entry data.
            </p>
          ) : (
            pairs.map(([key, value], pairIndex) => (
              <div key={`${key}-${pairIndex}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  value={key}
                  onChange={(event) =>
                    updatePair(pairIndex, event.target.value, typeof value === "string" ? value : "")
                  }
                  placeholder="Entry field"
                />
                <Input
                  value={typeof value === "string" ? value : ""}
                  onChange={(event) => updatePair(pairIndex, key, event.target.value)}
                  placeholder="Template"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePair(pairIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderRedirectConfig = (action: FormActionInput, index: number) => {
    const config = isRecord(action.config) ? action.config : {};
    return (
      <Input
        value={typeof config.url === "string" ? config.url : ""}
        onChange={(event) => updateActionConfig(index, { url: event.target.value })}
        placeholder="/thank-you"
      />
    );
  };

  const renderSuccessMessageConfig = (action: FormActionInput, index: number) => {
    const config = isRecord(action.config) ? action.config : {};
    return (
      <Textarea
        rows={3}
        value={typeof config.message === "string" ? config.message : ""}
        onChange={(event) =>
          updateActionConfig(index, { message: event.target.value })
        }
        placeholder="Thanks for your submission."
      />
    );
  };

  const renderConfig = (action: FormActionInput, index: number) => {
    if (action.type === "email") return renderEmailConfig(action, index);
    if (action.type === "webhook") return renderWebhookConfig(action, index);
    if (action.type === "entry_sync") return renderEntryMapping(action, index);
    if (action.type === "redirect") return renderRedirectConfig(action, index);
    return renderSuccessMessageConfig(action, index);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Automation</p>
            <p className="text-xs text-muted-foreground">
              Configure post-submit actions and conditions.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenLogs} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Action logs
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {ACTION_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => addAction(option.value)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {option.label}
              </Button>
            ))}
          </div>

          {actions.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              No actions yet. Add one from the list above.
            </div>
          ) : (
            actions.map((action, index) => (
              <section key={`${action.type}-${index}`} className="space-y-3 rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Badge variant="outline">{toActionTypeLabel(action.type)}</Badge>
                    <Input
                      value={action.label ?? ""}
                      onChange={(event) => updateAction(index, { label: event.target.value })}
                      placeholder="Action label"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveAction(index, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveAction(index, 1)}
                      disabled={index === actions.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {ACTION_OPTIONS.find((option) => option.value === action.type)?.help}
                </p>

                <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Enabled</span>
                  <Switch
                    checked={action.enabled !== false}
                    onCheckedChange={(checked) => updateAction(index, { enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Continue on error</span>
                  <Switch
                    checked={action.continueOnError !== false}
                    onCheckedChange={(checked) =>
                      updateAction(index, { continueOnError: checked })
                    }
                  />
                </div>

                {renderCondition(action, index)}
                {renderConfig(action, index)}
              </section>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
