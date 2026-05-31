import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  AppointmentFormAdvancedEditor,
  AppointmentFormVisualEditor,
  AppointmentFormWizardEditor,
} from "../../../core/admin/ui/widgets/editors/AppointmentFormEditors";
import {
  AppointmentFormBlock,
  appointmentFormEditorContract,
  appointmentFormDefaults,
  createAppointmentFormWidget,
  normalizeAppointmentFormData,
  type AppointmentFormData,
} from "../../../core/widgets/core/appointmentForm";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<AppointmentFormData>> = () => null;

test("appointment form exposes a strict v2 editor contract", () => {
  const widget = createAppointmentFormWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(widget.editorContract).toBe(appointmentFormEditorContract);
  expect(validation.valid).toBe(true);
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "appointment-form.wizard.flow-setup",
    "appointment-form.visual.variant-flow",
    "appointment-form.visual.copy",
    "appointment-form.visual.slot-summary",
    "appointment-form.visual.fields",
    "appointment-form.visual.custom-fields",
    "appointment-form.visual.consent",
    "appointment-form.visual.surface",
    "appointment-form.advanced.runtime-endpoint",
    "appointment-form.advanced.submission-security",
  ]);
  expect(
    widget.editorContract?.sections
      .filter((section) => section.mode === "advanced")
      .flatMap((section) => section.writablePaths)
  ).toEqual([]);
  expect(
    widget.editorContract?.sections
      .flatMap((section) => section.writablePaths)
      .includes("customFields.id")
  ).toBe(false);
  expect(appointmentFormDefaults.style).toBeUndefined();
});

test("appointment form normalizes submission endpoint to a same-origin relative path", () => {
  expect(
    normalizeAppointmentFormData({
      submissionEndpoint: "https://example.test/api/booking/reservations",
    }).submissionEndpoint
  ).toBe(appointmentFormDefaults.submissionEndpoint);
  expect(
    normalizeAppointmentFormData({
      submissionEndpoint: "/api/booking/custom?tenant=demo",
    }).submissionEndpoint
  ).toBe("/api/booking/custom?tenant=demo");
});

test("appointment form renders flow contract and customer fields", () => {
  const html = renderToString(
    <AppointmentFormBlock data={appointmentFormDefaults} variant="default" />
  );

  expect(html).toContain('data-nextless-appointment-form="1"');
  expect(html).toContain('data-loading-message="Booking..."');
  expect(html).toContain('name="customerName"');
  expect(html).toContain('name="customerEmail"');
  expect(html).toContain('data-idle-label="Book appointment"');
  expect(html).toContain("disabled");
  expect(html).toContain("Select a slot in Booking Calendar first.");
});

test("appointment form supports nonce from resolved payload", () => {
  const html = renderToString(
    <AppointmentFormBlock
      variant="default"
      data={normalizeAppointmentFormData({
        ...appointmentFormDefaults,
        resolved: {
          submissionNonce: "nonce-token",
        },
      })}
    />
  );

  expect(html).toContain('name="formNonce"');
  expect(html).toContain("nonce-token");
});

test("appointment form normalizes hidden required fields and renders split-name accessibility", () => {
  const normalized = normalizeAppointmentFormData({
    ...appointmentFormDefaults,
    showEmail: false,
    requiredEmail: true,
    showPhone: false,
    requiredPhone: true,
    nameMode: "split",
  });

  const html = renderToString(<AppointmentFormBlock variant="default" data={normalized} />);

  expect(normalized.requiredEmail).toBe(false);
  expect(normalized.requiredPhone).toBe(false);
  expect(html).toContain('name="customerFirstName"');
  expect(html).toContain('name="customerLastName"');
  expect(html).not.toContain('name="customerName"');
  expect(html).not.toContain('name="customerEmail"');
  expect(html).not.toContain('name="customerPhone"');
  expect(html).toContain('autoComplete="given-name"');
  expect(html).toContain('autoComplete="family-name"');
  expect(html).toContain('aria-label="Appointment details"');
  expect(html).toContain(
    'aria-description="Provide contact details and confirm the selected slot."'
  );
});

test("appointment form renders phone validation and notes bounds when optional fields are visible", () => {
  const html = renderToString(
    <AppointmentFormBlock
      variant="default"
      data={normalizeAppointmentFormData({
        ...appointmentFormDefaults,
        requiredPhone: true,
        notesMaxLength: 320,
      })}
    />
  );

  expect(html).toContain('required=""');
  expect(html).toContain('pattern="^\\+?[0-9()\\-.\\s]{7,20}$"');
  expect(html).toContain('autoComplete="tel"');
  expect(html).toContain('maxLength="320"');
  expect(html).toContain('data-booking-notes-counter="true"');
});

test("appointment form preserves blank phone validation and omits runtime validation attrs", () => {
  const normalized = normalizeAppointmentFormData({
    ...appointmentFormDefaults,
    phonePattern: "",
    phonePatternMessage: "",
  });
  const html = renderToString(<AppointmentFormBlock variant="default" data={normalized} />);
  const phoneInput = html.match(/<input[^>]*name="customerPhone"[^>]*>/)?.[0] ?? "";

  expect(normalized.phonePattern).toBe("");
  expect(normalized.phonePatternMessage).toBe("");
  expect(phoneInput).toContain('name="customerPhone"');
  expect(phoneInput).not.toContain("pattern=");
  expect(phoneInput).not.toContain("title=");
  expect(html).not.toContain("Use digits, spaces, parentheses, or an optional leading +.");
});

test("appointment form treats whitespace-only phone validation as accidental and restores defaults", () => {
  const normalized = normalizeAppointmentFormData({
    ...appointmentFormDefaults,
    phonePattern: "   ",
    phonePatternMessage: "   ",
  });
  const html = renderToString(<AppointmentFormBlock variant="default" data={normalized} />);
  const phoneInput = html.match(/<input[^>]*name="customerPhone"[^>]*>/)?.[0] ?? "";

  expect(normalized.phonePattern).toBe(appointmentFormDefaults.phonePattern);
  expect(normalized.phonePatternMessage).toBe(appointmentFormDefaults.phonePatternMessage);
  expect(phoneInput).toContain('pattern="^\\+?[0-9()\\-.\\s]{7,20}$"');
  expect(phoneInput).toContain(
    'title="Use digits, spaces, parentheses, or an optional leading +."'
  );
});

test("appointment form keeps non-empty phone validation presets active", () => {
  const normalized = normalizeAppointmentFormData({
    ...appointmentFormDefaults,
    phonePattern: "^[0-9\\s]{7,20}$",
    phonePatternMessage: "Use 7-20 digits and spaces.",
  });
  const html = renderToString(<AppointmentFormBlock variant="default" data={normalized} />);
  const phoneInput = html.match(/<input[^>]*name="customerPhone"[^>]*>/)?.[0] ?? "";

  expect(normalized.phonePattern).toBe("^[0-9\\s]{7,20}$");
  expect(normalized.phonePatternMessage).toBe("Use 7-20 digits and spaces.");
  expect(phoneInput).toContain('pattern="^[0-9\\s]{7,20}$"');
  expect(phoneInput).toContain('title="Use 7-20 digits and spaces."');
  expect(html).toContain("Use 7-20 digits and spaces.");
});

test("appointment form renders bounded custom fields with deterministic metadata markers", () => {
  const html = renderToString(
    <AppointmentFormBlock
      variant="default"
      data={normalizeAppointmentFormData({
        ...appointmentFormDefaults,
        customFields: [
          {
            id: "company",
            label: "Company",
            type: "text",
            placeholder: "Acme",
          },
          {
            id: "contact-method",
            label: "Preferred contact method",
            type: "select",
            options: ["Email", "Phone"],
          },
          {
            id: "nda",
            label: "NDA required",
            type: "checkbox",
          },
        ],
      })}
    />
  );

  expect(html).toContain('data-appointment-custom-field="company"');
  expect(html).toContain('data-appointment-custom-field-type="text"');
  expect(html).toContain('data-appointment-custom-field="contact-method"');
  expect(html).toContain('data-appointment-custom-field-type="select"');
  expect(html).toContain(">Email<");
  expect(html).toContain('data-appointment-custom-field="nda"');
  expect(html).toContain('data-appointment-custom-field-type="checkbox"');
});

test("appointment form renders consent controls and captcha bridge data when available", () => {
  const html = renderToString(
    <AppointmentFormBlock
      variant="default"
      data={normalizeAppointmentFormData({
        ...appointmentFormDefaults,
        consent: {
          enabled: true,
          label: "I agree to the booking terms.",
          required: true,
          privacyUrl: "/privacy",
          termsUrl: "/terms",
        },
        resolved: {
          captcha: {
            provider: "recaptcha_v3",
            siteKey: "site-key-1",
            action: "public_write",
          },
        },
      })}
    />
  );

  expect(html).toContain('name="consentAccepted"');
  expect(html).toContain("I agree to the booking terms.");
  expect(html).toContain('href="/privacy"');
  expect(html).toContain('href="/terms"');
  expect(html).toContain('data-captcha-site-key="site-key-1"');
  expect(html).toContain('data-captcha-action="public_write"');
});

test("appointment form cleared frame and summary styles omit decorative backgrounds", () => {
  const html = renderToString(
    <AppointmentFormBlock
      variant="default"
      data={normalizeAppointmentFormData({
        ...appointmentFormDefaults,
        style: {},
      })}
    />
  );
  const markup = html.split("<script>")[0] ?? html;

  expect(markup).not.toContain("bg-[var(--color-bg)]/95");
  expect(markup).not.toContain("bg-[var(--color-bg)]/70");
  expect(markup).not.toContain("bg-[var(--color-primary)]");
});

test("appointment form validator accepts resolved runtime payload", () => {
  clearWidgets();
  registerWidget(
    createAppointmentFormWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "appointment-form-1",
      type: "appointment-form",
      variant: "default",
      data: {
        ...appointmentFormDefaults,
        resolved: {
          submissionNonce: "nonce-token",
          error: "booking_nonce_unavailable",
        },
      },
    })
  ).not.toThrow();

  clearWidgets();
});

test("appointment form editors render expected sections", () => {
  const wizard = renderToString(
    <AppointmentFormWizardEditor
      value={appointmentFormDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(wizard).toContain("Flow");

  const visual = renderToString(
    <AppointmentFormVisualEditor
      value={appointmentFormDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(visual).toContain("Fields");

  const advanced = renderToString(
    <AppointmentFormAdvancedEditor
      value={{
        ...appointmentFormDefaults,
        resolved: {
          submissionNonce: "nonce-token",
          error: "booking_nonce_unavailable",
        },
      }}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(advanced).toContain("Runtime route");
  expect(advanced).toContain("Injected by server");
  expect(advanced).toContain("booking_nonce_unavailable");
  expect(advanced).not.toContain("nonce-token");
});
