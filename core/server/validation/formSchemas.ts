import { FORM_SCHEMA_LIMITS, formSettingsSchema } from "../../services/forms/formSettings";
import { FORM_STATUS_VALUES } from "../../services/forms/formStatus";
import { SUBMISSION_ACCESS_MODE_VALUES } from "../../services/forms/submissionAccess";
import {
  formAttachmentUploadWriteSchema,
  formFieldsWriteSchema,
  formSubmissionWriteSchema,
} from "../../services/forms/validation";

const formProperties = {
  name: {
    type: "string",
    minLength: 1,
    maxLength: FORM_SCHEMA_LIMITS.name,
  },
  slug: {
    type: ["string", "null"],
    maxLength: FORM_SCHEMA_LIMITS.slug,
  },
  status: { enum: FORM_STATUS_VALUES },
  description: {
    type: ["string", "null"],
    maxLength: FORM_SCHEMA_LIMITS.description,
  },
  successMessage: {
    type: ["string", "null"],
    maxLength: FORM_SCHEMA_LIMITS.successMessage,
  },
  successRedirectUrl: {
    type: ["string", "null"],
    maxLength: FORM_SCHEMA_LIMITS.successRedirectUrl,
  },
  submissionAccess: { enum: SUBMISSION_ACCESS_MODE_VALUES },
  settings: formSettingsSchema,
} as const;

export const formCreateSchema = {
  type: "object",
  required: ["name"],
  properties: formProperties,
  additionalProperties: false,
} as const;

export const formUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: formProperties,
  additionalProperties: false,
} as const;

// Strict query schema for `GET /forms/:id/submissions/export` (TASK-490):
// reject-unknown at the schema boundary, `format` constrained to csv|json.
export const formSubmissionsExportQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["format"],
  properties: {
    format: { type: "string", enum: ["csv", "json"] },
  },
} as const;

export {
  formAttachmentUploadWriteSchema as formAttachmentUploadSchema,
  formFieldsWriteSchema as formFieldsSchema,
  formSubmissionWriteSchema as formSubmissionSchema,
};
