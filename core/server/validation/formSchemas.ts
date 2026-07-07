import { FORM_STATUS_VALUES } from "../../services/forms/formStatus";

export const formCreateSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    status: { enum: FORM_STATUS_VALUES },
    description: { type: ["string", "null"] },
    successMessage: { type: ["string", "null"] },
    successRedirectUrl: { type: ["string", "null"] },
    submissionAccess: { enum: ["public", "internal"] },
    settings: { type: "object" },
  },
  additionalProperties: false,
};

export const formUpdateSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    status: { enum: FORM_STATUS_VALUES },
    description: { type: ["string", "null"] },
    successMessage: { type: ["string", "null"] },
    successRedirectUrl: { type: ["string", "null"] },
    submissionAccess: { enum: ["public", "internal"] },
    settings: { type: "object" },
  },
  additionalProperties: false,
};

export const formFieldsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      type: { type: "string" },
      label: { type: "string" },
      name: { type: "string" },
      required: { type: "boolean" },
      orderIndex: { type: "number" },
      settings: { type: "object" },
    },
    additionalProperties: false,
  },
};

export const formSubmissionSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: { type: "object" },
    captchaToken: { type: "string", minLength: 1 },
    formNonce: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

// A JSON schema cannot assert `file` is a real binary upload transport — the handler
// mirrors the media route's two-step pattern: validate(schema) THEN a runtime
// isUploadFile(...) guard before uploadMedia.
export const formAttachmentUploadSchema = {
  type: "object",
  required: ["fieldName", "file"],
  properties: {
    fieldName: { type: "string" },
    file: { type: "object" },
    formNonce: { type: "string" },
    captchaToken: { type: "string" },
  },
  additionalProperties: false,
};
