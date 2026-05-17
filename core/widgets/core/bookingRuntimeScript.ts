const runtimeClientScript = String.raw`(() => {
  if (typeof window === "undefined") return;
  if (window.__nextlessBookingRuntimeClient) return;
  window.__nextlessBookingRuntimeClient = true;

  const CALENDAR_SELECTOR = "[data-nextless-booking-calendar='1']";
  const FORM_SELECTOR = "form[data-nextless-appointment-form='1']";
  const SLOT_EVENT_NAME = "nextless:booking-slot-selected";

  const state = window.__nextlessBookingRuntimeState || {
    selections: {},
  };
  window.__nextlessBookingRuntimeState = state;

  const setSelection = (flowId, selection) => {
    if (!flowId) return;
    if (selection) {
      state.selections[flowId] = selection;
    } else {
      delete state.selections[flowId];
    }
    window.dispatchEvent(new CustomEvent(SLOT_EVENT_NAME, { detail: { flowId, selection } }));
  };

  const getSelection = (flowId) => {
    if (!flowId) return null;
    return state.selections[flowId] || null;
  };

  const toTimeLabel = (iso, locale) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString(locale ? [locale] : undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const toDateLabel = (iso, locale) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString(locale ? [locale] : undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  let recaptchaLoader = null;

  const ensureRecaptchaClient = (siteKey) => {
    if (window.grecaptcha?.execute) return Promise.resolve();
    if (recaptchaLoader) return recaptchaLoader;
    recaptchaLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(siteKey);
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("recaptcha_load_failed"));
      document.head.appendChild(script);
    });
    return recaptchaLoader;
  };

  const resolveCaptchaToken = async (form) => {
    const siteKey = (form.dataset.captchaSiteKey || "").trim();
    const action = (form.dataset.captchaAction || "public_write").trim() || "public_write";
    if (!siteKey) return undefined;
    await ensureRecaptchaClient(siteKey);
    if (!window.grecaptcha?.execute) {
      throw new Error("recaptcha_unavailable");
    }
    return window.grecaptcha.execute(siteKey, { action });
  };

  const syncResourceOptions = (serviceSelect, resourceSelect) => {
    if (!(serviceSelect instanceof HTMLSelectElement)) return;
    if (!(resourceSelect instanceof HTMLSelectElement)) return;

    const selectedServiceOption = serviceSelect.selectedOptions[0];
    const resourceIdsRaw = selectedServiceOption?.dataset.resourceIds || "";
    const allowedIds = new Set(
      resourceIdsRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    );

    let hasCurrent = false;
    Array.from(resourceSelect.options).forEach((option) => {
      if (!option.value) return;
      const allowed = allowedIds.size === 0 ? true : allowedIds.has(option.value);
      option.hidden = !allowed;
      option.disabled = !allowed;
      if (allowed && option.value === resourceSelect.value) {
        hasCurrent = true;
      }
    });

    if (!hasCurrent) {
      const firstAllowed = Array.from(resourceSelect.options).find(
        (option) => option.value && !option.disabled
      );
      resourceSelect.value = firstAllowed ? firstAllowed.value : "";
    }
  };

  const todayDateInputValue = () => {
    const now = new Date();
    const yyyy = String(now.getFullYear()).padStart(4, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
  };

  const bindCalendar = (root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.bookingCalendarBound === "1") return;
    root.dataset.bookingCalendarBound = "1";

    const flowId = (root.dataset.flowId || "booking-flow").trim() || "booking-flow";
    const endpoint = (root.dataset.slotsEndpoint || "/api/booking/slots").trim();
    const slotsToken = (root.dataset.slotsToken || "").trim();
    const interval = Number.parseInt(root.dataset.slotInterval || "15", 10);

    const serviceSelect = root.querySelector("[data-booking-service]");
    const resourceSelect = root.querySelector("[data-booking-resource]");
    const dateInput = root.querySelector("[data-booking-date]");
    const slotsNode = root.querySelector("[data-booking-slots]");
    const statusNode = root.querySelector("[data-booking-slots-status]");
    const selectedNode = root.querySelector("[data-booking-selected-summary]");
    const refreshButton = root.querySelector("[data-booking-refresh]");
    let currentItems = [];

    if (!(serviceSelect instanceof HTMLSelectElement)) return;
    if (!(resourceSelect instanceof HTMLSelectElement)) return;
    if (!(dateInput instanceof HTMLInputElement)) return;
    if (!(slotsNode instanceof HTMLElement)) return;

    if (!dateInput.value) {
      dateInput.value = todayDateInputValue();
    }

    syncResourceOptions(serviceSelect, resourceSelect);

    const renderSelectedSummary = (selection) => {
      if (!(selectedNode instanceof HTMLElement)) return;
      if (!selection) {
        selectedNode.textContent = selectedNode.dataset.empty || "No slot selected yet.";
        return;
      }
      selectedNode.textContent =
        toDateLabel(selection.startsAt) +
        " • " +
        toTimeLabel(selection.startsAt) +
        " - " +
        toTimeLabel(selection.endsAt);
    };

    const renderSlots = (items) => {
      currentItems = Array.isArray(items) ? items : [];
      slotsNode.innerHTML = "";
      if (currentItems.length === 0) {
        slotsNode.innerHTML =
          "<p class=\"text-xs text-[var(--color-text)]/65\">" +
          (slotsNode.dataset.empty || "No available slots for selected date.") +
          "</p>";
        return;
      }

      const selection = getSelection(flowId);

      currentItems.forEach((slot) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary)]";
        button.textContent = toTimeLabel(slot.startsAt) + " - " + toTimeLabel(slot.endsAt);
        if (
          selection &&
          selection.startsAt === slot.startsAt &&
          selection.endsAt === slot.endsAt &&
          selection.resourceId === resourceSelect.value
        ) {
          button.classList.add("border-[var(--color-primary)]", "bg-[var(--color-primary)]/10");
        }
        button.addEventListener("click", () => {
          const selectedResourceOption = resourceSelect.selectedOptions[0];
          const timezone = selectedResourceOption?.dataset.timezone || slot.timezone || "UTC";
          const nextSelection = {
            serviceId: serviceSelect.value,
            serviceName: serviceSelect.selectedOptions[0]?.textContent?.trim() || "",
            resourceId: resourceSelect.value,
            resourceName: resourceSelect.selectedOptions[0]?.textContent?.trim() || "",
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            timezone,
          };
          setSelection(flowId, nextSelection);
          renderSelectedSummary(nextSelection);
          renderSlots(currentItems);
        });
        slotsNode.appendChild(button);
      });
    };

    const onSlotSelected = (event) => {
      const detail = event?.detail;
      if (!detail || detail.flowId !== flowId) return;
      renderSelectedSummary(detail.selection || null);
      renderSlots(currentItems);
    };

    const loadSlots = async () => {
      const serviceId = serviceSelect.value;
      const resourceId = resourceSelect.value;
      const date = dateInput.value;

      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = statusNode.dataset.loading || "Loading slots...";
      }

      if (!serviceId || !resourceId || !date) {
        slotsNode.innerHTML =
          "<p class=\"text-xs text-[var(--color-text)]/65\">" +
          (slotsNode.dataset.missing || "Choose service, resource, and date first.") +
          "</p>";
        if (statusNode instanceof HTMLElement) statusNode.textContent = "";
        return;
      }

      const target = new URL(endpoint, window.location.origin);
      target.searchParams.set("serviceId", serviceId);
      target.searchParams.set("resourceId", resourceId);
      target.searchParams.set("date", date);
      if (slotsToken) {
        target.searchParams.set("runtimeToken", slotsToken);
      }
      if (Number.isFinite(interval) && interval > 0) {
        target.searchParams.set("intervalMinutes", String(interval));
      }

      const resourceOption = resourceSelect.selectedOptions[0];
      const timezone = resourceOption?.dataset.timezone;
      if (timezone) {
        target.searchParams.set("timezone", timezone);
      }

      try {
        const response = await fetch(target.toString(), {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("booking_slots_failed");
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];
        renderSlots(items);
        if (statusNode instanceof HTMLElement) {
          statusNode.textContent = "";
        }
      } catch {
        slotsNode.innerHTML =
          "<p class=\"text-xs text-rose-600\">" +
          (slotsNode.dataset.error || "Unable to load slots right now.") +
          "</p>";
        if (statusNode instanceof HTMLElement) statusNode.textContent = "";
      }
    };

    serviceSelect.addEventListener("change", () => {
      syncResourceOptions(serviceSelect, resourceSelect);
      void loadSlots();
    });

    resourceSelect.addEventListener("change", () => {
      void loadSlots();
    });

    dateInput.addEventListener("change", () => {
      void loadSlots();
    });

    if (refreshButton instanceof HTMLElement) {
      refreshButton.addEventListener("click", () => {
        void loadSlots();
      });
    }

    window.addEventListener(SLOT_EVENT_NAME, onSlotSelected);
    renderSelectedSummary(getSelection(flowId));
    void loadSlots();
  };

  const bindAppointmentForm = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.bookingFormBound === "1") return;
    form.dataset.bookingFormBound = "1";

    const flowId = (form.dataset.flowId || "booking-flow").trim() || "booking-flow";
    const endpoint = (
      form.getAttribute("action") ||
      form.dataset.submissionEndpoint ||
      "/api/booking/reservations"
    ).trim();

    const summaryNode = form.querySelector("[data-booking-selected-slot]");
    const errorNode = form.querySelector("[data-booking-form-error]");
    const successNode = form.querySelector("[data-booking-form-success]");
    const notesInput = form.querySelector('textarea[name="notes"]');
    const notesCounter = form.querySelector("[data-booking-notes-counter]");
    const submitButton =
      form.querySelector("[data-booking-submit]") || form.querySelector('button[type="submit"]');

    const hide = (node) => {
      if (!(node instanceof HTMLElement)) return;
      node.classList.add("hidden");
    };

    const show = (node) => {
      if (!(node instanceof HTMLElement)) return;
      node.classList.remove("hidden");
    };

    const clearError = () => {
      hide(errorNode);
    };

    const locale = (form.dataset.locale || "").trim();
    const showServiceInSummary = form.dataset.showServiceInSummary !== "false";
    const showResourceInSummary = form.dataset.showResourceInSummary !== "false";

    const resolveSafeRedirect = (raw) => {
      if (!raw || !raw.trim()) return null;
      try {
        const url = new URL(raw, window.location.origin);
        if (url.origin !== window.location.origin) return null;
        return url.pathname + url.search + url.hash;
      } catch {
        return null;
      }
    };

    const renderNotesCounter = () => {
      if (!(notesInput instanceof HTMLTextAreaElement)) return;
      if (!(notesCounter instanceof HTMLElement)) return;
      if (!Number.isFinite(notesInput.maxLength) || notesInput.maxLength <= 0) return;
      notesCounter.textContent = notesInput.value.length + " / " + notesInput.maxLength + " characters";
    };

    const buildCustomerName = (formData) => {
      const fullName = String(formData.get("customerName") || "").trim();
      if (fullName) return fullName;
      return [formData.get("customerFirstName"), formData.get("customerLastName")]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ");
    };

    const collectConsentMetadata = (formData) => {
      const consentInput = form.querySelector("[data-booking-consent-input]");
      if (!(consentInput instanceof HTMLInputElement)) return undefined;
      return {
        accepted: formData.get("consentAccepted") === "on",
        label: (consentInput.dataset.bookingConsentLabel || "").trim(),
      };
    };

    const setSubmittingState = (submitting) => {
      form.dataset.submitting = submitting ? "1" : "0";
      if (!(submitButton instanceof HTMLButtonElement)) return;
      const idleLabel =
        submitButton.dataset.idleLabel || submitButton.textContent || "Book appointment";
      const loadingLabel = (form.dataset.loadingMessage || "Booking...").trim() || "Booking...";
      submitButton.textContent = submitting ? loadingLabel : idleLabel;
      submitButton.disabled = submitting || !Boolean(getSelection(flowId));
    };

    const renderSelection = (selection) => {
      const hasSelection = Boolean(selection);
      if (submitButton instanceof HTMLButtonElement && form.dataset.submitting !== "1") {
        submitButton.disabled = !hasSelection;
      }
      if (!(summaryNode instanceof HTMLElement)) return;
      if (!selection) {
        summaryNode.textContent =
          summaryNode.dataset.empty || "Select a slot in Booking Calendar first.";
        return;
      }
      const serviceLabel =
        showServiceInSummary && typeof selection.serviceName === "string"
          ? selection.serviceName.trim()
          : "";
      const resourceLabel =
        showResourceInSummary && typeof selection.resourceName === "string"
          ? selection.resourceName.trim()
          : "";
      const dateAndTime =
        toDateLabel(selection.startsAt, locale) +
        " • " +
        toTimeLabel(selection.startsAt, locale) +
        " - " +
        toTimeLabel(selection.endsAt, locale);
      summaryNode.textContent = [serviceLabel, resourceLabel, dateAndTime]
        .filter(Boolean)
        .join(" - ");
    };

    const applySelection = (selection) => {
      renderSelection(selection);
    };

    const onSlotSelected = (event) => {
      const detail = event?.detail;
      if (!detail || detail.flowId !== flowId) return;
      applySelection(detail.selection || null);
    };

    window.addEventListener(SLOT_EVENT_NAME, onSlotSelected);
    applySelection(getSelection(flowId));
    setSubmittingState(false);
    renderNotesCounter();

    form.addEventListener(
      "input",
      () => {
        clearError();
        renderNotesCounter();
      },
      { passive: true }
    );
    form.addEventListener("change", clearError, { passive: true });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const selection = getSelection(flowId);
      if (!selection) {
        if (errorNode instanceof HTMLElement) {
          errorNode.textContent = errorNode.dataset.noSelection || "Select a slot first.";
          show(errorNode);
        }
        return;
      }

      hide(errorNode);
      hide(successNode);

      if (form.dataset.submitting === "1") return;
      setSubmittingState(true);

      try {
        const formData = new FormData(form);
        const consent = collectConsentMetadata(formData);
        const captchaToken = await resolveCaptchaToken(form);
        const payload = {
          serviceId: selection.serviceId,
          resourceId: selection.resourceId,
          startsAt: selection.startsAt,
          endsAt: selection.endsAt,
          timezone: selection.timezone,
          customerName: buildCustomerName(formData),
          customerEmail: String(formData.get("customerEmail") || "").trim() || null,
          customerPhone: String(formData.get("customerPhone") || "").trim() || null,
          notes: String(formData.get("notes") || "").trim() || null,
          formNonce:
            String(formData.get("formNonce") || formData.get("__nl_booking_nonce") || "") || "",
          captchaToken,
          metadata: {
            flowId,
            pathname: window.location.pathname,
            ...(consent ? { consent } : {}),
          },
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof result?.error?.message === "string"
              ? result.error.message
              : "Unable to submit booking right now.";
          throw new Error(message);
        }

        const runtimeMessage =
          typeof result?.runtime?.successMessage === "string"
            ? result.runtime.successMessage.trim()
            : "";
        const defaultMessage = (form.dataset.successMessage || "Booking submitted.").trim();

        if (successNode instanceof HTMLElement) {
          successNode.textContent = runtimeMessage || defaultMessage;
          show(successNode);
        }

        const redirectTarget = resolveSafeRedirect(form.dataset.successRedirect || "");
        form.reset();
        setSelection(flowId, null);
        applySelection(null);
        if (redirectTarget) {
          window.location.assign(redirectTarget);
        }
      } catch (error) {
        if (errorNode instanceof HTMLElement) {
          errorNode.textContent =
            error instanceof Error
              ? error.message === "recaptcha_load_failed" ||
                error.message === "recaptcha_unavailable"
                ? "Verification failed. Please try again."
                : error.message
              : "Unable to submit booking right now.";
          show(errorNode);
        }
      } finally {
        setSubmittingState(false);
      }
    });
  };

  const bindCalendars = () => {
    const nodes = Array.from(document.querySelectorAll(CALENDAR_SELECTOR));
    nodes.forEach((node) => bindCalendar(node));
  };

  const bindForms = () => {
    const nodes = Array.from(document.querySelectorAll(FORM_SELECTOR));
    nodes.forEach((node) => bindAppointmentForm(node));
  };

  bindCalendars();
  bindForms();
})();`;

export function getBookingRuntimeClientScript() {
  return runtimeClientScript;
}
