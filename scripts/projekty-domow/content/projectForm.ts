import { normalizeFormActionsInput } from "../../../core/services/forms/formActionsContract";
import { normalizeFormSettings } from "../../../core/services/forms/formSettings";
import { normalizeFormStatus } from "../../../core/services/forms/formStatus";
import { normalizeSubmissionAccess } from "../../../core/services/forms/submissionAccess";
import { normalizeFormFields } from "../../../core/services/forms/validation";
import type { JsonObject, ResourceSeed } from "../../../core/services/kits/fullSitePackage/types";
import { cleanJsonObject } from "../json";

export const PROJECT_BRIEF_FORM_KEY = "project-brief";
export const PROJECT_BRIEF_FORM_TITLE = "Zacznij projekt";
export const PROJECT_BRIEF_SUBMIT_LABEL = "Wyślij brief";
export const PROJECT_BRIEF_INITIAL_NOTE =
  "Odpisujemy zwykle w ciągu jednego dnia roboczego. Bez zobowiązań i bez sprzedażowej presji.";
export const PROJECT_BRIEF_SUCCESS_MESSAGE =
  "Dziękujemy! Odezwiemy się z pierwszym pomysłem na Twój dom — do usłyszenia.";
export const PROJECT_BRIEF_LOADING_LABEL = "Wysyłanie...";

const FIELD_IDS = [
  "00000000-0000-4000-8000-000000000551",
  "00000000-0000-4000-8000-000000000552",
  "00000000-0000-4000-8000-000000000553",
  "00000000-0000-4000-8000-000000000554",
  "00000000-0000-4000-8000-000000000555",
] as const;

function assertKnownKeys(
  value: unknown,
  allowed: readonly string[],
  errorCode = "project_brief_form_invalid"
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorCode);
  }
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new Error(errorCode);
  }
}

const rawFields = () => [
  {
    id: FIELD_IDS[0],
    type: "text" as const,
    label: "Imię i nazwisko",
    name: "name",
    required: true,
    orderIndex: 0,
    settings: { placeholder: "Jan Kowalski" },
  },
  {
    id: FIELD_IDS[1],
    type: "email" as const,
    label: "E-mail",
    name: "email",
    required: true,
    orderIndex: 1,
    settings: { placeholder: "jan@email.pl" },
  },
  {
    id: FIELD_IDS[2],
    type: "select" as const,
    label: "Na jakim jesteś etapie?",
    name: "stage",
    required: true,
    orderIndex: 2,
    settings: {
      options: [
        "Mam działkę",
        "Szukam działki",
        "Mam gotowy projekt do adaptacji",
        "Chcę tylko konsultację",
      ],
    },
  },
  {
    id: FIELD_IDS[3],
    type: "textarea" as const,
    label: "Krótki opis",
    name: "message",
    required: true,
    orderIndex: 3,
    settings: {
      placeholder: "Napisz, jaki dom Ci się marzy, gdzie jest działka i jaki styl lubisz.",
    },
  },
  {
    id: FIELD_IDS[4],
    type: "checkbox" as const,
    label: "Zgoda na kontakt w sprawie zapytania",
    name: "consent",
    required: true,
    orderIndex: 4,
    settings: { defaultValue: false },
  },
];

const rawActions = () => [
  {
    id: "00000000-0000-4000-8000-000000000556",
    type: "success_message" as const,
    label: "Potwierdzenie wysłania",
    enabled: true,
    continueOnError: false,
    condition: { operator: "always" as const },
    config: { message: PROJECT_BRIEF_SUCCESS_MESSAGE },
    orderIndex: 0,
  },
];

const rawSettings = () => ({
  theme: {
    submit: {
      label: PROJECT_BRIEF_SUBMIT_LABEL,
      supportingText: PROJECT_BRIEF_INITIAL_NOTE,
    },
  },
});

const assertProjectBriefSettings = (value: unknown) => {
  assertKnownKeys(value, ["theme"]);
  assertKnownKeys(value.theme, ["submit"]);
  assertKnownKeys(value.theme.submit, ["label", "supportingText"]);
};

const assertProjectBriefField = (value: unknown) => {
  assertKnownKeys(value, ["id", "type", "label", "name", "required", "orderIndex", "settings"]);
  const record = value as Record<string, unknown>;
  if (record.type === "text" || record.type === "email" || record.type === "textarea") {
    assertKnownKeys(record.settings, ["placeholder"]);
    return;
  }
  if (record.type === "select") {
    assertKnownKeys(record.settings, ["options"]);
    return;
  }
  if (record.type === "checkbox") {
    assertKnownKeys(record.settings, ["defaultValue"]);
    return;
  }
  throw new Error("project_brief_form_invalid");
};

const assertProjectBriefAction = (value: unknown) => {
  assertKnownKeys(value, [
    "id",
    "type",
    "label",
    "enabled",
    "continueOnError",
    "condition",
    "config",
    "orderIndex",
  ]);
  const record = value as Record<string, unknown>;
  assertKnownKeys(record.condition, ["operator"]);
  assertKnownKeys(record.config, ["message"]);
};

export const normalizeProjectBriefDesired = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("project_brief_form_invalid");
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set([
    "name",
    "slug",
    "status",
    "description",
    "successMessage",
    "successRedirectUrl",
    "submissionAccess",
    "settings",
    "fields",
    "actions",
  ]);
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    throw new Error("project_brief_form_invalid");
  }
  if (record.successRedirectUrl !== undefined && record.successRedirectUrl !== null) {
    throw new Error("project_brief_form_invalid");
  }
  if (typeof record.name !== "string" || typeof record.slug !== "string") {
    throw new Error("project_brief_form_invalid");
  }
  assertProjectBriefSettings(record.settings);
  if (!Array.isArray(record.fields)) {
    throw new Error("project_brief_form_invalid");
  }
  record.fields.forEach(assertProjectBriefField);
  if (!Array.isArray(record.actions)) {
    throw new Error("project_brief_form_invalid");
  }
  record.actions.forEach(assertProjectBriefAction);
  return cleanJsonObject({
    name: record.name.trim(),
    slug: record.slug.trim(),
    status: normalizeFormStatus(record.status, "draft"),
    description: typeof record.description === "string" ? record.description.trim() : null,
    successMessage: typeof record.successMessage === "string" ? record.successMessage.trim() : null,
    successRedirectUrl: null,
    submissionAccess: normalizeSubmissionAccess(record.submissionAccess, "public"),
    settings: normalizeFormSettings(record.settings),
    fields: normalizeFormFields(record.fields as ReturnType<typeof rawFields>),
    actions: normalizeFormActionsInput(record.actions),
  });
};

export const buildProjectBriefForm = (): ResourceSeed => ({
  key: PROJECT_BRIEF_FORM_KEY,
  desired: normalizeProjectBriefDesired({
    name: PROJECT_BRIEF_FORM_TITLE,
    slug: PROJECT_BRIEF_FORM_KEY,
    status: "published",
    description: null,
    successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
    successRedirectUrl: null,
    submissionAccess: "public",
    settings: rawSettings(),
    fields: rawFields(),
    actions: rawActions(),
  }),
});
