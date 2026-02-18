import type { FormFieldInput } from "./validation";
import type { FormLayoutMode, FormPresetId } from "./formSettings";

export type FormPresetDefinition = {
  id: Exclude<FormPresetId, "custom">;
  label: string;
  description: string;
  layoutMode: FormLayoutMode;
  saveProgress: boolean;
  stepTitles: string[];
  successMessage: string;
  fields: FormFieldInput[];
};

const presets: FormPresetDefinition[] = [
  {
    id: "contact",
    label: "Contact form",
    description: "Simple contact form for sales or support requests.",
    layoutMode: "single",
    saveProgress: false,
    stepTitles: [],
    successMessage: "Thanks! We will get back to you shortly.",
    fields: [
      {
        type: "text",
        label: "Full name",
        name: "full_name",
        required: true,
        settings: {
          placeholder: "Jane Doe",
          helper: "Tell us who is contacting us.",
        },
      },
      {
        type: "email",
        label: "Email",
        name: "email",
        required: true,
        settings: {
          placeholder: "jane@example.com",
        },
      },
      {
        type: "textarea",
        label: "Message",
        name: "message",
        required: true,
        settings: {
          placeholder: "How can we help?",
          helper: "Include key details so we can respond faster.",
        },
      },
    ],
  },
  {
    id: "lead_capture",
    label: "Lead capture",
    description: "Collect qualified leads for sales follow-up.",
    layoutMode: "single",
    saveProgress: false,
    stepTitles: [],
    successMessage: "Thanks! Our team will contact you soon.",
    fields: [
      {
        type: "text",
        label: "Full name",
        name: "full_name",
        required: true,
        settings: {
          placeholder: "Jane Doe",
        },
      },
      {
        type: "email",
        label: "Work email",
        name: "work_email",
        required: true,
        settings: {
          placeholder: "jane@company.com",
        },
      },
      {
        type: "phone",
        label: "Phone",
        name: "phone",
        required: false,
        settings: {
          placeholder: "+1 555 123 4567",
        },
      },
      {
        type: "text",
        label: "Company",
        name: "company",
        required: false,
        settings: {
          placeholder: "Acme Inc.",
        },
      },
      {
        type: "select",
        label: "Team size",
        name: "team_size",
        required: true,
        settings: {
          options: ["1-10", "11-50", "51-200", "200+"],
        },
      },
    ],
  },
  {
    id: "service_intake",
    label: "Service intake",
    description: "Multi-step intake flow for booking service requests.",
    layoutMode: "multi_step",
    saveProgress: true,
    stepTitles: ["Contact", "Request", "Schedule"],
    successMessage: "Your request has been submitted. We will confirm the appointment.",
    fields: [
      {
        type: "text",
        label: "Full name",
        name: "full_name",
        required: true,
        settings: {
          placeholder: "Jane Doe",
          step: 1,
        },
      },
      {
        type: "email",
        label: "Email",
        name: "email",
        required: true,
        settings: {
          placeholder: "jane@example.com",
          step: 1,
        },
      },
      {
        type: "phone",
        label: "Phone",
        name: "phone",
        required: true,
        settings: {
          placeholder: "+1 555 123 4567",
          step: 1,
        },
      },
      {
        type: "select",
        label: "Service type",
        name: "service_type",
        required: true,
        settings: {
          options: ["Maintenance", "Repair", "Diagnostics", "Other"],
          step: 2,
        },
      },
      {
        type: "text",
        label: "Asset / vehicle",
        name: "asset",
        required: false,
        settings: {
          placeholder: "e.g. Ford Transit 2022",
          step: 2,
        },
      },
      {
        type: "textarea",
        label: "Issue details",
        name: "issue_details",
        required: true,
        settings: {
          placeholder: "Describe what needs to be done.",
          step: 2,
        },
      },
      {
        type: "date",
        label: "Preferred date",
        name: "preferred_date",
        required: false,
        settings: {
          step: 3,
        },
      },
      {
        type: "textarea",
        label: "Additional notes",
        name: "additional_notes",
        required: false,
        settings: {
          placeholder: "Any extra information for the team.",
          step: 3,
        },
      },
    ],
  },
];

export function listFormPresets() {
  return presets.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
  }));
}

export function getFormPresetDefinition(id: FormPresetId) {
  if (id === "custom") return null;
  return presets.find((preset) => preset.id === id) ?? null;
}

export function clonePresetFields(fields: FormFieldInput[]) {
  return fields.map((field) => ({
    ...field,
    settings: field.settings ? { ...field.settings } : undefined,
  }));
}
