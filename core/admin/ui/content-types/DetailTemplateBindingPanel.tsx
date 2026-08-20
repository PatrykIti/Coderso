import { Link2, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { PageBlockV2 } from "../../../services/pages/pageDocumentV2";
import type {
  DetailPageBinding,
  DetailPageBindingSource,
  DetailPageBindingTransform,
} from "../../../services/content/detailPageTypes";
import { collectV2BlockBindingPropPaths } from "../../../services/utils/bindingPropPaths";

import type { ContentField } from "./SchemaBuilder";

type DetailTemplateBindingPanelProps = {
  selectedBlock: PageBlockV2 | null;
  value: DetailPageBinding[];
  fields: ContentField[];
  onChange: (next: DetailPageBinding[]) => void;
  focusedPropPath?: string | null;
  onFocusedPropPathChange?: (propPath: string | null) => void;
};

type DetailTemplateSourceOption = {
  value: string;
  label: string;
  type: string;
  source: DetailPageBindingSource;
};

const transformOptions: Array<{
  value: DetailPageBindingTransform | "__none";
  label: string;
}> = [
  { value: "__none", label: "None" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "area", label: "Area" },
  { value: "image", label: "Image" },
  { value: "gallery", label: "Gallery" },
  { value: "list", label: "List" },
];

const entryMetaSourceOptions: DetailTemplateSourceOption[] = [
  {
    value: "entry-meta:title",
    label: "Title",
    type: "entry meta",
    source: { kind: "entry-meta", field: "title" },
  },
  {
    value: "entry-meta:slug",
    label: "Slug",
    type: "entry meta",
    source: { kind: "entry-meta", field: "slug" },
  },
  {
    value: "entry-meta:publishedAt",
    label: "Published date",
    type: "entry meta",
    source: { kind: "entry-meta", field: "publishedAt" },
  },
  {
    value: "entry-meta:author",
    label: "Author",
    type: "entry meta",
    source: { kind: "entry-meta", field: "author" },
  },
];

const computedSourceOptions: DetailTemplateSourceOption[] = [
  {
    value: "computed:detailHref",
    label: "Detail URL",
    type: "computed",
    source: { kind: "computed", resolver: "detailHref" },
  },
  {
    value: "computed:relatedItems",
    label: "Related items",
    type: "computed",
    source: { kind: "computed", resolver: "relatedItems" },
  },
  {
    value: "computed:formContext",
    label: "Form context",
    type: "computed",
    source: { kind: "computed", resolver: "formContext" },
  },
];

const secretLikePattern =
  /\b[\w.-]*(token|secret|password|api[-_]?key|credential|cookie|session|csrf)[\w.-]*\b/i;

const createBindingId = () => `binding-${crypto.randomUUID().slice(0, 8)}`;

const sourceToOptionValue = (source: DetailPageBindingSource) => {
  if (source.kind === "entry-field") return `entry-field:${source.field}`;
  if (source.kind === "entry-meta") return `entry-meta:${source.field}`;
  return `computed:${source.resolver}`;
};

const sourceToLabel = (source: DetailPageBindingSource) => {
  if (source.kind === "entry-field") return source.field;
  if (source.kind === "entry-meta") return source.field;
  return source.resolver;
};

const cloneSource = (source: DetailPageBindingSource): DetailPageBindingSource => ({ ...source });

const resolveDefaultTransform = (
  source: DetailPageBindingSource
): DetailPageBindingTransform | undefined => {
  if (source.kind === "computed" && source.resolver === "relatedItems") return "list";
  if (source.kind === "computed" && source.resolver === "formContext") return undefined;
  return "text";
};

export const buildDetailTemplateSourceOptions = (
  fields: ContentField[]
): DetailTemplateSourceOption[] => [
  ...entryMetaSourceOptions,
  ...fields
    .filter((field) => !secretLikePattern.test(field.name))
    .map((field) => ({
      value: `entry-field:${field.name}`,
      label: field.label,
      type: field.type,
      source: { kind: "entry-field", field: field.name } satisfies DetailPageBindingSource,
    })),
  ...computedSourceOptions,
];

const fallbackToInputValue = (value: DetailPageBinding["fallback"]) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const updateBindingFallback = (binding: DetailPageBinding, rawValue: string): DetailPageBinding => {
  const { fallback: _fallback, ...withoutFallback } = binding;
  const nextFallback = rawValue.trim();
  return nextFallback.length > 0 ? { ...withoutFallback, fallback: nextFallback } : withoutFallback;
};

const updateBindingTransform = (
  binding: DetailPageBinding,
  nextTransform: DetailPageBindingTransform | "__none"
): DetailPageBinding => {
  const { transform: _transform, ...withoutTransform } = binding;
  return nextTransform === "__none"
    ? withoutTransform
    : { ...withoutTransform, transform: nextTransform };
};

const updateBindingRequired = (
  binding: DetailPageBinding,
  required: boolean
): DetailPageBinding => {
  const { required: _required, ...withoutRequired } = binding;
  return required ? { ...withoutRequired, required: true } : withoutRequired;
};

const resolveBindingPropPathOptions = (
  block: PageBlockV2 | null,
  existingBindings: DetailPageBinding[]
) => {
  const detectedPaths = block ? collectV2BlockBindingPropPaths(block) : [];
  const existingPaths = existingBindings.map((binding) => binding.propPath);

  return Array.from(new Set([...detectedPaths, ...existingPaths]))
    .filter(Boolean)
    .slice(0, 80);
};

const buildSavedSourceOption = (source: DetailPageBindingSource): DetailTemplateSourceOption => ({
  value: sourceToOptionValue(source),
  label: sourceToLabel(source),
  type: "saved source",
  source,
});

export function DetailTemplateBindingPanel({
  selectedBlock,
  value,
  fields,
  onChange,
  focusedPropPath,
  onFocusedPropPathChange,
}: DetailTemplateBindingPanelProps) {
  const selectedBindings = useMemo(
    () => (selectedBlock ? value.filter((binding) => binding.blockId === selectedBlock.id) : []),
    [selectedBlock, value]
  );
  const sourceOptions = useMemo(() => buildDetailTemplateSourceOptions(fields), [fields]);
  const sourceOptionsByValue = useMemo(
    () => new Map(sourceOptions.map((option) => [option.value, option] as const)),
    [sourceOptions]
  );
  const propPathSuggestions = useMemo(
    () => resolveBindingPropPathOptions(selectedBlock, selectedBindings),
    [selectedBindings, selectedBlock]
  );

  const updateBinding = (
    bindingId: string,
    updater: (binding: DetailPageBinding) => DetailPageBinding
  ) => {
    onChange(value.map((binding) => (binding.id === bindingId ? updater(binding) : binding)));
  };

  const removeBinding = (bindingId: string) => {
    onChange(value.filter((binding) => binding.id !== bindingId));
  };

  const addBinding = (preferredPropPath?: string) => {
    if (!selectedBlock) return;
    const usedPropPaths = new Set(selectedBindings.map((binding) => binding.propPath));
    const nextPropPath =
      preferredPropPath && !usedPropPaths.has(preferredPropPath)
        ? preferredPropPath
        : (propPathSuggestions.find((path) => !usedPropPaths.has(path)) ??
          propPathSuggestions[0] ??
          "value");
    const initialSource =
      sourceOptions.find(
        (option) => option.source.kind === "entry-field" && option.source.field === nextPropPath
      ) ??
      sourceOptions.find((option) => option.source.kind === "entry-field") ??
      sourceOptions[0];
    if (!initialSource) return;
    const source = cloneSource(initialSource.source);
    onChange([
      ...value,
      {
        id: createBindingId(),
        blockId: selectedBlock.id,
        propPath: nextPropPath,
        source,
        ...(resolveDefaultTransform(source) ? { transform: resolveDefaultTransform(source) } : {}),
      },
    ]);
    onFocusedPropPathChange?.(nextPropPath);
  };

  if (!selectedBlock) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a block to configure content field bindings.
      </div>
    );
  }

  if (sourceOptions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Load a content type before mapping widget props to entry fields.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Content field bindings</p>
          <p className="text-xs text-muted-foreground">
            Map props from <span className="font-medium">{selectedBlock.type}</span> to entry values
            for this detail template.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => addBinding()}
        >
          <Plus className="h-4 w-4" />
          Add binding
        </Button>
      </div>

      {propPathSuggestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Available widget props
          </p>
          <div className="flex flex-wrap gap-2">
            {propPathSuggestions.map((path) => {
              const isBound = selectedBindings.some((binding) => binding.propPath === path);
              return (
                <Button
                  key={path}
                  type="button"
                  size="sm"
                  variant={isBound ? "secondary" : "outline"}
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => (isBound ? onFocusedPropPathChange?.(path) : addBinding(path))}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {path}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {selectedBindings.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          No content field bindings are configured for this block. Static widget values remain the
          fallback until a binding is added.
        </div>
      ) : null}

      <div className="space-y-3">
        {selectedBindings.map((binding) => {
          const sourceValue = sourceToOptionValue(binding.source);
          const savedSourceOption = sourceOptionsByValue.has(sourceValue)
            ? null
            : buildSavedSourceOption(binding.source);
          const renderedSourceOptions = savedSourceOption
            ? [savedSourceOption, ...sourceOptions]
            : sourceOptions;

          return (
            <div
              key={binding.id}
              data-prop-path={binding.propPath}
              data-focused={focusedPropPath === binding.propPath ? "true" : "false"}
              className={cn(
                "space-y-3 rounded-lg border p-3",
                focusedPropPath === binding.propPath && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{binding.propPath}</p>
                  <p className="text-xs text-muted-foreground">{sourceToLabel(binding.source)}</p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove binding for ${binding.propPath}`}
                  onClick={() => removeBinding(binding.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Widget prop path
                </label>
                <Input
                  value={binding.propPath}
                  list={`detail-template-binding-props-${selectedBlock.id}`}
                  placeholder="headline"
                  onChange={(event) => {
                    onFocusedPropPathChange?.(event.target.value);
                    updateBinding(binding.id, (current) => ({
                      ...current,
                      propPath: event.target.value,
                    }));
                  }}
                />
                <datalist id={`detail-template-binding-props-${selectedBlock.id}`}>
                  {propPathSuggestions.map((path) => (
                    <option key={path} value={path} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Entry source
                </label>
                <Select
                  value={sourceValue}
                  onValueChange={(next) => {
                    const option = sourceOptionsByValue.get(next);
                    if (!option) return;
                    const nextSource = cloneSource(option.source);
                    const nextTransform = resolveDefaultTransform(nextSource);
                    updateBinding(binding.id, (current) => {
                      const { transform: _transform, ...withoutTransform } = current;
                      return {
                        ...withoutTransform,
                        source: nextSource,
                        ...(nextTransform ? { transform: nextTransform } : {}),
                      };
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entry source" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderedSourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} ({option.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Transform
                  </label>
                  <Select
                    value={binding.transform ?? "__none"}
                    onValueChange={(next) =>
                      updateBinding(binding.id, (current) =>
                        updateBindingTransform(
                          current,
                          next as DetailPageBindingTransform | "__none"
                        )
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transformOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fallback
                  <Input
                    value={fallbackToInputValue(binding.fallback)}
                    placeholder="Keep empty to use widget value"
                    onChange={(event) =>
                      updateBinding(binding.id, (current) =>
                        updateBindingFallback(current, event.target.value)
                      )
                    }
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Required value</p>
                  <p className="text-xs text-muted-foreground">
                    Runtime rejects the detail page if this source is missing.
                  </p>
                </div>
                <Switch
                  checked={binding.required === true}
                  onCheckedChange={(checked) =>
                    updateBinding(binding.id, (current) => updateBindingRequired(current, checked))
                  }
                  aria-label={`Toggle required binding for ${binding.propPath}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
