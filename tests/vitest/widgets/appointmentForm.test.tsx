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
  appointmentFormDefaults,
  createAppointmentFormWidget,
  normalizeAppointmentFormData,
  type AppointmentFormData,
} from "../../../core/widgets/core/appointmentForm";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<AppointmentFormData>> = () => null;

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
      value={appointmentFormDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(advanced).toContain("Runtime endpoint");
});
