// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import {
  AppointmentFormBlock,
  appointmentFormDefaults,
  normalizeAppointmentFormData,
  type AppointmentFormData,
} from "../../../core/widgets/core/appointmentForm";
import { getBookingRuntimeClientScript } from "../../../core/widgets/core/bookingRuntimeScript";

const SLOT_EVENT_NAME = "nextless:booking-slot-selected";

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const runBookingRuntimeScript = () => {
  // eslint-disable-next-line no-eval
  eval(getBookingRuntimeClientScript());
};

const renderAppointmentFormDom = (data: AppointmentFormData = appointmentFormDefaults) => {
  document.body.innerHTML = renderToString(
    React.createElement(AppointmentFormBlock, {
      data,
      variant: "default",
    })
  );
  const script = document.querySelector("script");
  if (script?.textContent) {
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  }
  const form = document.querySelector("form[data-nextless-appointment-form='1']");
  const button = document.querySelector("[data-booking-submit]");
  const errorNode = document.querySelector("[data-booking-form-error]");
  const successNode = document.querySelector("[data-booking-form-success]");
  const summaryNode = document.querySelector("[data-booking-selected-slot]");
  const nameInput = document.querySelector('input[name="customerName"]');
  const firstNameInput = document.querySelector('input[name="customerFirstName"]');
  const lastNameInput = document.querySelector('input[name="customerLastName"]');
  const notesInput = document.querySelector('textarea[name="notes"]');
  const notesCounter = document.querySelector("[data-booking-notes-counter]");

  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Appointment form failed to render for runtime test.");
  }
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Submit button failed to render for runtime test.");
  }

  return {
    form,
    button,
    errorNode,
    successNode,
    summaryNode,
    nameInput,
    firstNameInput,
    lastNameInput,
    notesInput,
    notesCounter,
  };
};

const setRuntimeSelection = (selection: Record<string, string> | null) => {
  const runtimeWindow = window as Window & {
    __nextlessBookingRuntimeState?: { selections: Record<string, Record<string, string>> };
  };
  const state = runtimeWindow.__nextlessBookingRuntimeState ?? { selections: {} };
  runtimeWindow.__nextlessBookingRuntimeState = state;

  if (selection) {
    state.selections["booking-flow"] = selection;
  } else {
    delete state.selections["booking-flow"];
  }

  window.dispatchEvent(
    new CustomEvent(SLOT_EVENT_NAME, {
      detail: {
        flowId: "booking-flow",
        selection,
      },
    })
  );
};

const submitForm = (form: HTMLFormElement) => {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
};

afterEach(() => {
  document.body.innerHTML = "";
  delete (
    window as Window & {
      __nextlessBookingRuntimeClient?: boolean;
      __nextlessBookingRuntimeBind?: () => void;
      __nextlessBookingRuntimeState?: unknown;
      fetch?: unknown;
      grecaptcha?: unknown;
    }
  ).__nextlessBookingRuntimeClient;
  delete (
    window as Window & {
      __nextlessBookingRuntimeClient?: boolean;
      __nextlessBookingRuntimeBind?: () => void;
      __nextlessBookingRuntimeState?: unknown;
      fetch?: unknown;
      grecaptcha?: unknown;
    }
  ).__nextlessBookingRuntimeBind;
  delete (
    window as Window & {
      __nextlessBookingRuntimeClient?: boolean;
      __nextlessBookingRuntimeBind?: () => void;
      __nextlessBookingRuntimeState?: unknown;
      fetch?: unknown;
      grecaptcha?: unknown;
    }
  ).__nextlessBookingRuntimeState;
  delete (
    window as Window & {
      __nextlessBookingRuntimeClient?: boolean;
      __nextlessBookingRuntimeBind?: () => void;
      __nextlessBookingRuntimeState?: unknown;
      fetch?: unknown;
      grecaptcha?: unknown;
    }
  ).grecaptcha;
  vi.restoreAllMocks();
});

test("booking runtime rebinds forms and calendars when the paired widget script runs later", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items: [] }),
  });
  window.fetch = fetchMock as unknown as typeof window.fetch;

  const resetRuntime = () => {
    document.body.innerHTML = "";
    delete (
      window as Window & {
        __nextlessBookingRuntimeClient?: boolean;
        __nextlessBookingRuntimeBind?: () => void;
        __nextlessBookingRuntimeState?: unknown;
      }
    ).__nextlessBookingRuntimeClient;
    delete (
      window as Window & {
        __nextlessBookingRuntimeClient?: boolean;
        __nextlessBookingRuntimeBind?: () => void;
        __nextlessBookingRuntimeState?: unknown;
      }
    ).__nextlessBookingRuntimeBind;
    delete (
      window as Window & {
        __nextlessBookingRuntimeClient?: boolean;
        __nextlessBookingRuntimeBind?: () => void;
        __nextlessBookingRuntimeState?: unknown;
      }
    ).__nextlessBookingRuntimeState;
  };

  const appendCalendarShell = () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<section data-nextless-booking-calendar="1" data-flow-id="booking-flow" data-slots-endpoint="/api/booking/slots" data-loading-message="Loading" data-empty-slots-message="No slots" data-missing-selection-message="Select service and resource" data-error-message="Unable to load">
        <select data-booking-service>
          <option value="service-1" data-resource-ids="resource-1" data-duration-minutes="30" data-buffer-before-minutes="0" data-buffer-after-minutes="0" data-submission-access="public">Consultation</option>
        </select>
        <select data-booking-resource>
          <option value="resource-1" data-timezone="UTC">Room A</option>
        </select>
        <input data-booking-date type="date" value="2030-01-15" />
        <div data-booking-slots></div>
        <p data-booking-slots-status></p>
        <button data-booking-refresh type="button">Refresh</button>
      </section>`
    );
  };

  const appendFormShell = () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<form data-nextless-appointment-form="1" data-flow-id="booking-flow" action="/api/booking/reservations" data-success-message="Done">
        <p data-booking-selected-slot data-empty="Select a slot first.">Select a slot first.</p>
        <p data-booking-form-error data-no-selection="Select a slot first." hidden></p>
        <p data-booking-form-success hidden></p>
        <input name="customerName" value="Jamie Doe" />
        <button data-booking-submit type="submit" data-idle-label="Book" disabled>Book</button>
      </form>`
    );
  };

  appendCalendarShell();
  runBookingRuntimeScript();
  await flushPromises();
  appendFormShell();
  runBookingRuntimeScript();
  await flushPromises();

  expect(
    document
      .querySelector("[data-nextless-booking-calendar='1']")
      ?.getAttribute("data-booking-calendar-bound")
  ).toBe("1");
  expect(
    document
      .querySelector("form[data-nextless-appointment-form='1']")
      ?.getAttribute("data-booking-form-bound")
  ).toBe("1");

  resetRuntime();

  appendFormShell();
  runBookingRuntimeScript();
  await flushPromises();
  appendCalendarShell();
  runBookingRuntimeScript();
  await flushPromises();

  expect(
    document
      .querySelector("form[data-nextless-appointment-form='1']")
      ?.getAttribute("data-booking-form-bound")
  ).toBe("1");
  expect(
    document
      .querySelector("[data-nextless-booking-calendar='1']")
      ?.getAttribute("data-booking-calendar-bound")
  ).toBe("1");
});

test("appointment form runtime starts disabled and enables after slot selection", async () => {
  const view = renderAppointmentFormDom();

  expect(view.button.disabled).toBe(true);
  expect(view.summaryNode?.textContent).toContain("Select a slot in Booking Calendar first.");

  setRuntimeSelection({
    serviceId: "service-1",
    resourceId: "resource-1",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  expect(view.button.disabled).toBe(false);
  expect(view.summaryNode?.textContent).toContain("2030");
  expect(view.summaryNode?.textContent).not.toContain("Select a slot in Booking Calendar first.");
});

test("appointment form runtime clears stale API errors on first user input", async () => {
  const view = renderAppointmentFormDom();
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({
      error: {
        message: "Invalid payload",
      },
    }),
  });
  window.fetch = fetchMock as unknown as typeof window.fetch;

  setRuntimeSelection({
    serviceId: "service-1",
    resourceId: "resource-1",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  submitForm(view.form);
  await flushPromises();

  expect(view.errorNode?.classList.contains("hidden")).toBe(false);
  expect(view.errorNode?.textContent).toContain("Invalid payload");

  if (!(view.nameInput instanceof HTMLInputElement)) {
    throw new Error("Customer name input missing from runtime test.");
  }

  view.nameInput.value = "Jamie Doe";
  view.nameInput.dispatchEvent(new Event("input", { bubbles: true }));

  expect(view.errorNode?.classList.contains("hidden")).toBe(true);
});

test("appointment form runtime shows loading copy and clears selection after success", async () => {
  type RuntimeFetchResult = {
    ok: boolean;
    json: () => Promise<{ runtime: { successMessage: string } }>;
  };
  let resolveFetch: ((value: RuntimeFetchResult) => void) | undefined;
  const fetchMock = vi.fn(
    () =>
      new Promise<RuntimeFetchResult>((resolve) => {
        resolveFetch = resolve;
      })
  );
  window.fetch = fetchMock as unknown as typeof window.fetch;

  const view = renderAppointmentFormDom(
    normalizeAppointmentFormData({
      ...appointmentFormDefaults,
      loadingMessage: "Submitting booking",
    })
  );

  setRuntimeSelection({
    serviceId: "service-1",
    resourceId: "resource-1",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  submitForm(view.form);
  await flushPromises();

  expect(view.button.disabled).toBe(true);
  expect(view.button.textContent).toBe("Submitting booking");

  resolveFetch?.({
    ok: true,
    json: async () => ({
      runtime: {
        successMessage: "Reservation confirmed",
      },
    }),
  });
  await flushPromises();

  const runtimeWindow = window as Window & {
    __nextlessBookingRuntimeState?: { selections: Record<string, Record<string, string>> };
  };

  expect(runtimeWindow.__nextlessBookingRuntimeState?.selections["booking-flow"]).toBeUndefined();
  expect(view.button.disabled).toBe(true);
  expect(view.button.textContent).toBe("Book appointment");
  expect(view.summaryNode?.textContent).toContain("Select a slot in Booking Calendar first.");
  expect(view.successNode?.classList.contains("hidden")).toBe(false);
  expect(view.successNode?.textContent).toContain("Appointment booked successfully.");
});

test("appointment form runtime prefers widget success copy over API runtime default", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      runtime: {
        successMessage: "Appointment booked successfully.",
      },
    }),
  });
  window.fetch = fetchMock as unknown as typeof window.fetch;

  const view = renderAppointmentFormDom(
    normalizeAppointmentFormData({
      ...appointmentFormDefaults,
      successMessage: "Custom widget success",
    })
  );

  setRuntimeSelection({
    serviceId: "service-1",
    resourceId: "resource-1",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  submitForm(view.form);
  await flushPromises();

  expect(view.successNode?.classList.contains("hidden")).toBe(false);
  expect(view.successNode?.textContent).toContain("Custom widget success");
});

test("appointment form runtime renders service/resource summary context and follows a safe redirect", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      runtime: {
        successMessage: "Reservation confirmed",
      },
    }),
  });
  window.fetch = fetchMock as unknown as typeof window.fetch;
  const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

  const view = renderAppointmentFormDom(
    normalizeAppointmentFormData({
      ...appointmentFormDefaults,
      locale: "en-GB",
      successRedirectUrl: "/booking/confirmed?source=widget#done",
    })
  );

  setRuntimeSelection({
    serviceId: "service-1",
    serviceName: "Consultation",
    resourceId: "resource-1",
    resourceName: "Room A",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  expect(view.summaryNode?.textContent).toContain("Consultation");
  expect(view.summaryNode?.textContent).toContain("Room A");
  expect(view.summaryNode?.textContent).toContain("2030");

  submitForm(view.form);
  await flushPromises();

  expect(assignSpy).toHaveBeenCalledWith("/booking/confirmed?source=widget#done");
});

test("appointment form runtime composes split-name payload and updates notes counter", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      runtime: {
        successMessage: "Reservation confirmed",
      },
    }),
  });
  window.fetch = fetchMock as unknown as typeof window.fetch;

  const view = renderAppointmentFormDom(
    normalizeAppointmentFormData({
      ...appointmentFormDefaults,
      nameMode: "split",
      notesMaxLength: 320,
    })
  );

  if (!(view.firstNameInput instanceof HTMLInputElement)) {
    throw new Error("First name input missing from split-name runtime test.");
  }
  if (!(view.lastNameInput instanceof HTMLInputElement)) {
    throw new Error("Last name input missing from split-name runtime test.");
  }
  if (!(view.notesInput instanceof HTMLTextAreaElement)) {
    throw new Error("Notes textarea missing from runtime test.");
  }

  view.firstNameInput.value = "Jamie";
  view.firstNameInput.dispatchEvent(new Event("input", { bubbles: true }));
  view.lastNameInput.value = "Doe";
  view.lastNameInput.dispatchEvent(new Event("input", { bubbles: true }));
  view.notesInput.value = "Bring previous invoice";
  view.notesInput.dispatchEvent(new Event("input", { bubbles: true }));

  expect(view.notesCounter?.textContent).toBe("22 / 320 characters");

  setRuntimeSelection({
    serviceId: "service-1",
    resourceId: "resource-1",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  submitForm(view.form);
  await flushPromises();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
    customerName: "Jamie Doe",
    notes: "Bring previous invoice",
  });
});

test("appointment form runtime serializes custom field metadata into the bounded payload shape", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      runtime: {
        successMessage: "Reservation confirmed",
      },
    }),
  });
  window.fetch = fetchMock as unknown as typeof window.fetch;

  const view = renderAppointmentFormDom(
    normalizeAppointmentFormData({
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
    })
  );

  const companyInput = view.form.querySelector(
    '[data-appointment-custom-field="company"]'
  ) as HTMLInputElement | null;
  const contactMethodInput = view.form.querySelector(
    '[data-appointment-custom-field="contact-method"]'
  ) as HTMLSelectElement | null;
  const ndaInput = view.form.querySelector(
    '[data-appointment-custom-field="nda"]'
  ) as HTMLInputElement | null;

  if (!(companyInput instanceof HTMLInputElement)) {
    throw new Error("Custom text field missing from runtime test.");
  }
  if (!(contactMethodInput instanceof HTMLSelectElement)) {
    throw new Error("Custom select field missing from runtime test.");
  }
  if (!(ndaInput instanceof HTMLInputElement)) {
    throw new Error("Custom checkbox field missing from runtime test.");
  }

  companyInput.value = "Acme Corp";
  companyInput.dispatchEvent(new Event("input", { bubbles: true }));
  contactMethodInput.value = "Phone";
  contactMethodInput.dispatchEvent(new Event("change", { bubbles: true }));
  ndaInput.checked = true;
  ndaInput.dispatchEvent(new Event("change", { bubbles: true }));

  setRuntimeSelection({
    serviceId: "service-1",
    resourceId: "resource-1",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  submitForm(view.form);
  await flushPromises();

  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
    metadata: {
      customFields: [
        {
          id: "company",
          label: "Company",
          type: "text",
          value: "Acme Corp",
        },
        {
          id: "contact-method",
          label: "Preferred contact method",
          type: "select",
          value: "Phone",
        },
        {
          id: "nda",
          label: "NDA required",
          type: "checkbox",
          checked: true,
        },
      ],
    },
  });
});

test("appointment form runtime executes recaptcha and submits consent metadata", async () => {
  const execute = vi.fn().mockResolvedValue("captcha-token-1");
  (
    window as Window & {
      grecaptcha?: {
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    }
  ).grecaptcha = { execute };

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      runtime: {
        successMessage: "Reservation confirmed",
      },
    }),
  });
  window.fetch = fetchMock as unknown as typeof window.fetch;

  const view = renderAppointmentFormDom(
    normalizeAppointmentFormData({
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
    })
  );

  const consentInput = view.form.querySelector('input[name="consentAccepted"]');
  if (!(consentInput instanceof HTMLInputElement)) {
    throw new Error("Consent input missing from runtime test.");
  }

  consentInput.checked = true;
  consentInput.dispatchEvent(new Event("change", { bubbles: true }));

  setRuntimeSelection({
    serviceId: "service-1",
    resourceId: "resource-1",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  submitForm(view.form);
  await flushPromises();

  expect(execute).toHaveBeenCalledWith("site-key-1", { action: "public_write" });
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
    captchaToken: "captcha-token-1",
    metadata: {
      consent: {
        accepted: true,
        label: "I agree to the booking terms.",
      },
    },
  });
});

test("appointment form runtime skips captcha for an internal selected service in a mixed catalog", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      runtime: {
        successMessage: "Appointment booked successfully.",
      },
    }),
  });
  window.fetch = fetchMock as unknown as typeof window.fetch;

  const view = renderAppointmentFormDom(
    normalizeAppointmentFormData({
      ...appointmentFormDefaults,
      resolved: {
        submissionNonce: "public-nonce",
        captcha: {
          provider: "recaptcha_v3",
          siteKey: "site-key-1",
          action: "public_write",
        },
      },
    })
  );

  setRuntimeSelection({
    serviceId: "internal-service",
    serviceName: "Internal repair",
    submissionAccess: "internal",
    resourceId: "resource-1",
    startsAt: "2030-01-15T12:00:00.000Z",
    endsAt: "2030-01-15T12:30:00.000Z",
    timezone: "UTC",
  });
  await flushPromises();

  submitForm(view.form);
  await flushPromises();

  const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(payload).toMatchObject({
    serviceId: "internal-service",
    formNonce: "",
  });
  expect(payload).not.toHaveProperty("captchaToken");
});
