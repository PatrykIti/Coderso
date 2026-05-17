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

const SLOT_EVENT_NAME = "nextless:booking-slot-selected";

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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
      __nextlessBookingRuntimeState?: unknown;
      fetch?: unknown;
    }
  ).__nextlessBookingRuntimeClient;
  delete (
    window as Window & {
      __nextlessBookingRuntimeClient?: boolean;
      __nextlessBookingRuntimeState?: unknown;
      fetch?: unknown;
    }
  ).__nextlessBookingRuntimeState;
  vi.restoreAllMocks();
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
  expect(view.successNode?.textContent).toContain("Reservation confirmed");
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
