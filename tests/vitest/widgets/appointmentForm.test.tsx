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
  expect(html).toContain('name="customerName"');
  expect(html).toContain('name="customerEmail"');
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
