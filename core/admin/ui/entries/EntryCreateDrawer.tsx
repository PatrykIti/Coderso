import { FileText, Tag, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import type { ContentSchema } from "@/services/contentTypesClient";
import {
  createEntry,
  type EntryData,
  type EntryDataValue,
  type EntryDetail,
} from "@/services/entriesClient";

import { fieldsFromSchema } from "../content-types/schemaMapping";
import { getContentTypeLabels } from "./contentTypeLabels";
import { buildEntryChecklist } from "./entryChecklist";
import { type EntryLinkedColumnValues, isEntryLinkedFieldName } from "./entryLinkedFields";
import { buildEntryPayloadData, buildInitialValues } from "./entryValueMapping";
import { FieldRenderer } from "./FieldRenderer";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/**
 * Nothing is hidden from a create form: `hiddenFieldNames` exists so the editor can carry
 * forward keys the schema stopped exposing, and there is no earlier entry to carry anything
 * forward from.
 */
const NO_HIDDEN_FIELD_NAMES: ReadonlySet<string> = new Set<string>();

/**
 * `buildInitialValues` resolves a LINKED name (title/slug) from the entry column rather than
 * from the schema. The fields seeded here are filtered to exclude those names, so it never
 * reads this -- it is passed only to satisfy the one signature both callers share.
 */
const UNUSED_LINKED_COLUMNS: EntryLinkedColumnValues = Object.freeze({ title: "", slug: "" });

type EntryCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The schema is not optional: it is the only thing that says what a valid entry of this
   * type is, and the drawer cannot ask for what it does not know about. `createEntry`
   * validates the payload against this exact schema before inserting, so a drawer that
   * guessed instead would offer a form whose only outcome is `entry_validation_failed`.
   */
  types: Array<{ id: string; slug: string; name: string; schema: ContentSchema }>;
  defaultTypeSlug?: string | null;
  onCreated?: (entry: EntryDetail, typeSlug: string, openAfterCreate: boolean) => void;
  onCreateError?: (error: unknown) => void;
};

export function EntryCreateDrawer({
  open,
  onOpenChange,
  types,
  defaultTypeSlug,
  onCreated,
  onCreateError,
}: EntryCreateDrawerProps) {
  const [typeSlug, setTypeSlug] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [openAfterCreate, setOpenAfterCreate] = useState(true);
  const [editedValuesByType, setEditedValuesByType] = useState<Record<string, EntryData>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resolvedSlug = slugTouched ? slug : title ? slugify(title) : "";
  const resolvedTypeSlug = typeSlug || defaultTypeSlug || "";

  const resetForm = () => {
    setTypeSlug("");
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setOpenAfterCreate(true);
    setEditedValuesByType({});
    setError(null);
    setIsSaving(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const typeOptions = useMemo(() => types, [types]);
  const selectedType = useMemo(
    () => types.find((type) => type.slug === resolvedTypeSlug) ?? null,
    [types, resolvedTypeSlug]
  );
  const { singular: typeSingular } = getContentTypeLabels(selectedType?.name ?? typeSlug);

  const schemaFields = useMemo(
    () => (selectedType ? fieldsFromSchema(selectedType.schema) : []),
    [selectedType]
  );
  /**
   * The required fields this drawer has to ASK for. `title` and `slug` are required fields of
   * many schemas -- the default content type declares a required `title` -- but they are also
   * entry columns, and `entryLinkedFields` makes the column their single authority. Asking
   * again here would put a second input behind one value; they are answered below from the
   * Title/Slug inputs instead.
   */
  const promptedFields = useMemo(
    () => schemaFields.filter((field) => field.required && !isEntryLinkedFieldName(field.name)),
    [schemaFields]
  );
  const schemaFieldNames = useMemo(
    () => new Set(schemaFields.map((field) => field.name)),
    [schemaFields]
  );
  const relationTargets = useMemo(
    () => types.map((type) => ({ slug: type.slug, name: type.name })),
    [types]
  );
  const linkedColumns = useMemo<EntryLinkedColumnValues>(
    () => ({ title: title.trim(), slug: resolvedSlug.trim() }),
    [title, resolvedSlug]
  );

  /**
   * The starting answers for the selected type, seeded through the editor's own mapping so a
   * schema default materializes here exactly as it does there.
   */
  const seededValues = useMemo(
    () => buildInitialValues(promptedFields, {}, UNUSED_LINKED_COLUMNS),
    [promptedFields]
  );
  /**
   * Answers are derived, not reset: what the user typed is kept per content type and layered
   * over that type's own seed. Another content type asks other questions, and holding one flat
   * record would either carry an answer across to a question it does not answer, or need an
   * effect to clear it -- and an effect that setStates on every type change is a cascading
   * render the drawer does not need.
   */
  const values = useMemo(
    () => ({ ...seededValues, ...(editedValuesByType[resolvedTypeSlug] ?? {}) }),
    [seededValues, editedValuesByType, resolvedTypeSlug]
  );
  const setFieldValue = (fieldName: string, next: EntryDataValue) => {
    setEditedValuesByType((current) => ({
      ...current,
      [resolvedTypeSlug]: { ...(current[resolvedTypeSlug] ?? {}), [fieldName]: next },
    }));
  };

  /**
   * "Filled" has to mean the same thing here as it does on the editor's pre-publish
   * checklist, so both read it from `buildEntryChecklist`. A drawer with its own definition
   * could accept a value the editor calls missing, or refuse one it calls present.
   */
  const missingRequiredFields = buildEntryChecklist({
    title,
    slug: resolvedSlug,
    status: "draft",
    scheduledAt: "",
    fields: promptedFields,
    values,
  }).missingRequiredFields;
  const canSubmit =
    Boolean(selectedType) &&
    Boolean(title.trim()) &&
    Boolean(resolvedSlug.trim()) &&
    missingRequiredFields.length === 0;

  const handleSubmit = async () => {
    if (!selectedType || !canSubmit) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await createEntry(resolvedTypeSlug, {
        title: linkedColumns.title,
        slug: linkedColumns.slug,
        // Built by the same mapping the editor saves through, from the same columns, so the
        // linked names cannot end up with one value in the column and another in `data`.
        data: buildEntryPayloadData({
          fields: promptedFields,
          values,
          entry: null,
          columns: linkedColumns,
          hiddenFieldNames: NO_HIDDEN_FIELD_NAMES,
          schemaFieldNames,
        }),
      });
      onCreated?.(created, resolvedTypeSlug, openAfterCreate);
      handleOpenChange(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create entry.");
      }
      onCreateError?.(err);
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = !canSubmit || isSaving;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>{`Create New ${typeSingular}`}</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Select a content type and start drafting.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close create entry drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Content type
              </label>
              <Select value={resolvedTypeSlug} onValueChange={setTypeSlug}>
                <SelectTrigger className="h-10">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type.id} value={type.slug}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Title</label>
              <Input
                placeholder="e.g. Launch announcement"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Slug</label>
              <Input
                placeholder="launch-announcement"
                value={resolvedSlug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setSlugTouched(true);
                }}
              />
            </div>
            {promptedFields.length > 0 ? (
              <>
                <Separator />
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    This content type cannot be created without these fields.
                  </p>
                  {promptedFields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        {`${field.label} *`}
                      </label>
                      <FieldRenderer
                        field={field}
                        value={values[field.name]}
                        onChange={(next) => setFieldValue(field.name, next)}
                        relationTargets={relationTargets}
                        display="compact"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            <Separator />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Tags</label>
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="news, release, update" className="pl-9" />
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          {missingRequiredFields.length > 0 ? (
            <p className="mb-3 text-xs text-muted-foreground">
              {`Fill required fields: ${missingRequiredFields
                .map((field) => field.label)
                .join(", ")}.`}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="entry-open-after-create"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Checkbox
                id="entry-open-after-create"
                checked={openAfterCreate}
                onCheckedChange={(checked) => setOpenAfterCreate(checked === true)}
              />
              Open in editor after create
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isDisabled}>
                {isSaving ? "Creating..." : "Create Draft"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
