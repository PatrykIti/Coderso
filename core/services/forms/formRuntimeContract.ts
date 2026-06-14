import type { FormSettings } from "./formSettings";
import type { FormFieldLogic, FormFieldStyle } from "./fieldSettings";

export type FormRuntimeField = {
  id: string;
  type: string;
  label: string;
  name: string;
  required: boolean;
  orderIndex: number;
  settings: {
    placeholder?: string;
    helper?: string;
    options?: string[];
    defaultValue?: string | boolean;
    pattern?: string;
    min?: number;
    max?: number;
    formStep?: number;
    inputStep?: number;
    step?: number;
    logic?: FormFieldLogic;
    style?: FormFieldStyle;
  };
};

export type FormRuntimeResolution = {
  formId: string;
  formName: string;
  description: string | null;
  status: string;
  successMessage: string | null;
  successRedirectUrl: string | null;
  settings: FormSettings;
  submissionAccess: "public" | "internal";
  submissionNonce?: string | null;
  botProtection?: {
    provider: "recaptcha_v3";
    siteKey: string;
    action: "public_write";
  } | null;
  fields: FormRuntimeField[];
  error?: string;
};
