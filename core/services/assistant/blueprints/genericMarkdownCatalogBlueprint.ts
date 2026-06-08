import { inferContentTypeFieldAdditions } from "../contentTypeFieldInference";
import type { AssistantIntentFamily, AssistantPromptKind } from "../actionPlanTypes";
import { normalizeAssistantPlannerPrompt } from "../actionPlanHeuristics";
import {
  mergeContentTypeSchemaFields,
  type ContentTypeFieldAddSpec,
} from "../../content/contentTypeSchemaFields";
import { buildCatalogFamilyPlan, type CatalogFamilyPreset } from "./catalogFamilyBlueprint";
import { createListingTemplateConfig } from "./catalogFamilyPresets";

const catalogSignals = ["katalog", "catalog", "lista", "listing"];
const setupSignals = [
  "chce",
  "chcę",
  "potrzebuje",
  "potrzebuję",
  "stworz",
  "stwórz",
  "zrob",
  "zrób",
  "utworz",
  "utwórz",
  "create",
  "build",
  "set up",
];
const fieldListSignals = ["pola", "fields", "field list", "lista pol", "lista pól"];

const normalizeAscii = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L");

const slugify = (value: string) => {
  const slug = normalizeAscii(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "catalog";
};

const titleize = (value: string) =>
  normalizeAscii(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const includesAny = (value: string, candidates: readonly string[]) =>
  candidates.some((candidate) => value.includes(candidate));

const readMarkdownTitle = (prompt: string) => {
  const titleLine = prompt
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => /^#{1,2}\s+\S/u.test(line));
  if (!titleLine) return null;
  return titleLine.replace(/^#{1,2}\s+/u, "").trim();
};

const extractCatalogSubject = (prompt: string) => {
  const markdownTitle = readMarkdownTitle(prompt);
  const source = markdownTitle ?? prompt;
  const normalized = normalizeAscii(source)
    .replace(/\b(content type|engine|cms|stronie|strona|site|page)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const catalogMatch = normalized.match(
    /\b(?:katalogu|katalog|catalog|listing|lista)\s+([a-z0-9ąćęłńóśźż _-]{3,80})/i
  );
  const rawSubject = catalogMatch?.[1] ?? markdownTitle ?? "Catalog";
  return (
    rawSubject
      .replace(/\b(?:ma|bedzie|będzie|sluzyc|służyć|do|na|stronie|site|page|pola|fields)\b.*$/i, "")
      .replace(/[.:#]+$/u, "")
      .trim() || "Catalog"
  );
};

const hasField = (fields: ContentTypeFieldAddSpec[], name: string) =>
  fields.some((field) => field.name === name);

const appendField = (fields: ContentTypeFieldAddSpec[], field: ContentTypeFieldAddSpec) => {
  if (!hasField(fields, field.name)) fields.push(field);
};

const chooseField = (
  fields: ContentTypeFieldAddSpec[],
  candidates: readonly string[],
  fallback: string
) =>
  fields.find((field) => candidates.includes(field.name))?.name ??
  fields.find((field) => candidates.some((candidate) => field.name.includes(candidate)))?.name ??
  fallback;

const chooseFirstByType = (
  fields: ContentTypeFieldAddSpec[],
  type: ContentTypeFieldAddSpec["type"],
  fallback: string
) => fields.find((field) => field.type === type)?.name ?? fallback;

const pickDisplayFields = (
  fields: ContentTypeFieldAddSpec[],
  reserved: Set<string>,
  count: number
) =>
  fields
    .filter((field) => !reserved.has(field.name))
    .slice(0, count)
    .map((field) => ({
      id: slugify(field.name),
      label: field.label ?? titleize(field.name),
      helper: `Field from the pasted catalog brief: ${field.label ?? field.name}.`,
      tone: "default" as const,
      field: field.name,
    }));

const buildBaseSchema = (fields: ContentTypeFieldAddSpec[]) =>
  mergeContentTypeSchemaFields(
    {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    fields
  ) as unknown as Record<string, unknown>;

export const buildGenericMarkdownCatalogPlan = (
  prompt: string,
  options: {
    promptKind: AssistantPromptKind;
    intentFamily: AssistantIntentFamily;
  }
) => {
  const normalized = normalizeAssistantPlannerPrompt(prompt);
  if (!includesAny(normalized, catalogSignals)) return null;
  if (!includesAny(normalized, setupSignals)) return null;

  const inferred = inferContentTypeFieldAdditions(prompt);
  if (inferred.fields.length < 4 && !includesAny(normalized, fieldListSignals)) return null;
  if (inferred.fields.length < 4) return null;

  const fields: ContentTypeFieldAddSpec[] = inferred.fields.map((field) => ({ ...field }));
  appendField(fields, { name: "title", label: "Title", type: "text" });
  appendField(fields, { name: "slug", label: "Slug", type: "text" });

  const summaryField = chooseField(
    fields,
    ["summary", "short_description", "excerpt", "description", "full_description"],
    "summary"
  );
  if (!hasField(fields, summaryField)) {
    appendField(fields, { name: summaryField, label: "Summary", type: "richtext" });
  }

  const imageField = chooseField(
    fields,
    ["featured_image", "heroImage", "hero_image", "image", "cover_image"],
    chooseFirstByType(
      fields.filter((field) => !field.multiple),
      "media",
      "heroImage"
    )
  );
  if (!hasField(fields, imageField)) {
    appendField(fields, {
      name: imageField,
      label: "Hero Image",
      type: "media",
      mediaAccept: ["image/*"],
    });
  }

  const statusField = chooseField(
    fields,
    ["availability_status", "projectStatus", "status", "stock_status"],
    "projectStatus"
  );
  if (!hasField(fields, statusField)) {
    appendField(fields, { name: statusField, label: "Status", type: "text" });
  }

  const numericFields = fields.filter((field) => field.type === "number");
  const primaryField = chooseField(
    fields,
    ["price", "price_from", "amount"],
    numericFields[0]?.name ?? "title"
  );
  const secondaryField = chooseField(
    fields,
    ["year", "sku", "code", "mileage_km"],
    numericFields.find((field) => field.name !== primaryField)?.name ?? "slug"
  );
  const locationField = chooseField(fields, ["brand", "category", "model", "location"], "title");
  const subject = extractCatalogSubject(prompt);
  const subjectTitle = titleize(subject);
  const slug = slugify(subject);
  const key = `generic-catalog-${slug}`;
  const reserved = new Set(["title", "slug", summaryField, imageField, statusField]);
  const leftFields = pickDisplayFields(fields, reserved, 2);
  const rightFields = pickDisplayFields(
    fields.filter((field) => !leftFields.some((left) => left.field === field.name)),
    reserved,
    3
  );

  const preset: CatalogFamilyPreset = {
    key,
    intentId: key,
    title: `${subjectTitle} Catalog`,
    summary: `Create a structured ${subjectTitle.toLowerCase()} catalog from the pasted markdown brief.`,
    answerIntro: `I can set up a complete catalog flow for ${subjectTitle.toLowerCase()} from the pasted markdown fields.`,
    contentTypeSlug: slug,
    contentTypeName: subjectTitle,
    catalogPageSlug: `/${slug}`,
    catalogHiddenListPath: `/_catalog/${slug}`,
    detailPath: `/${slug}/:slug`,
    listingQueryName: `${subjectTitle} Catalog Query`,
    listingTemplateSlug: `${slug}-catalog-grid`,
    listingTemplateName: `${subjectTitle} Catalog Grid`,
    customScreenName: subjectTitle,
    introTitle: `${subjectTitle} Catalog`,
    introBody: `Browse ${subjectTitle.toLowerCase()} entries and open details for each catalog item.`,
    ctaLabel: "View details",
    contentSchema: buildBaseSchema(fields),
    summaryField,
    statusField,
    coverImageUrlField: imageField,
    listingTemplateConfig: createListingTemplateConfig({
      emptyTitle: `No ${subjectTitle.toLowerCase()} entries yet`,
      emptyDescription: `Create the first ${subjectTitle.toLowerCase()} entry in Coderso to populate this catalog.`,
      summaryLabel: titleize(summaryField),
      numericLabel: titleize(primaryField),
      secondaryNumericLabel: titleize(secondaryField),
      statusLabel: titleize(statusField),
      locationLabel: titleize(locationField),
      summaryField,
      numericField: primaryField,
      secondaryNumericField: secondaryField,
      statusField,
      locationField,
      imageUrlField: imageField,
    }),
    screen: {
      eyebrow: subjectTitle,
      subtitle: "Review the main catalog fields in one place.",
      description: "Use this record screen to review the fields from the pasted markdown brief.",
      badge: "active",
      leftTitle: `${subjectTitle} facts`,
      rightTitle: "Catalog details",
      leftGroupTitle: "Core fields",
      leftGroupDescription: "Fields inferred from the pasted markdown list.",
      rightGroupTitle: "Secondary fields",
      rightGroupDescription: "Additional catalog facts surfaced for editors.",
      leftFields,
      rightFields,
    },
    assumptions: [
      "The pasted markdown field list is treated as the source of truth for the initial content model.",
      "Unsupported nested object arrays stay gated until a typed repeater/editor contract exists.",
      ...(inferred.gates.length
        ? [
            `Unsupported field shapes were skipped: ${inferred.gates.map((gate) => gate.name).join(", ")}.`,
          ]
        : []),
    ],
    refinement: {
      defaultFilterTitle: `${subjectTitle} filters`,
      defaultFilterDescription: `Filter ${subjectTitle.toLowerCase()} entries by supported catalog fields.`,
      defaultSearchPlaceholder: `Search ${subjectTitle.toLowerCase()}`,
      availableFacets: [],
    },
  };

  return buildCatalogFamilyPlan(preset, {
    promptKind: options.promptKind,
    intentFamily: options.intentFamily,
  });
};
