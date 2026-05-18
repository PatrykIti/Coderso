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

  const slotRequests = new WeakMap();
  const availabilityRequests = new WeakMap();
  const lastRenderedSlots = new WeakMap();
  const weekAnchors = new WeakMap();

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

  const toTimeLabel = (iso, options = {}) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString(options.locale ? [options.locale] : [], {
        hour: "2-digit",
        minute: "2-digit",
        ...(options.timezone ? { timeZone: options.timezone } : {}),
      });
    } catch {
      return iso;
    }
  };

  const toDateLabel = (iso, options = {}) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString(options.locale ? [options.locale] : [], {
        year: "numeric",
        month: options.dateStyle || "short",
        day: "2-digit",
        ...(options.timezone ? { timeZone: options.timezone } : {}),
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

  const toWeekdayLabel = (dateValue, locale) => {
    try {
      return new Date(dateValue + "T00:00:00.000Z").toLocaleDateString(
        locale ? [locale] : [],
        {
          weekday: "short",
          day: "2-digit",
        }
      );
    } catch {
      return dateValue;
    }
  };

  const addDays = (dateValue, days) => {
    const [year, month, day] = dateValue.split("-").map((value) => Number(value));
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const buildWeekDates = (anchorDate) =>
    Array.from({ length: 7 }, (_, index) => addDays(anchorDate, index));
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

  const readDatePolicy = (root) => ({
    defaultDate: (root.dataset.defaultDate || "").trim() || undefined,
    minDate: (root.dataset.minDate || "").trim() || undefined,
    maxDate: (root.dataset.maxDate || "").trim() || undefined,
  });

  const clampDateToPolicy = (value, policy, today) => {
    const requested = (value || "").trim();
    const minDate = policy.minDate || today;
    const maxDate = policy.maxDate;
    const base = requested || policy.defaultDate || today;

    if (base < minDate) return minDate;
    if (maxDate && base > maxDate) return maxDate;
    return base;
  };

  const bindCalendar = (root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.bookingCalendarBound === "1") return;
    root.dataset.bookingCalendarBound = "1";

    const flowId = (root.dataset.flowId || "booking-flow").trim() || "booking-flow";
    const endpoint = (root.dataset.slotsEndpoint || "/api/booking/slots").trim();
    const slotsToken = (root.dataset.slotsToken || "").trim();
    const interval = Number.parseInt(root.dataset.slotInterval || "15", 10);
    const summaryLocale = (root.dataset.summaryLocale || "").trim() || undefined;
    const summaryDateStyle = (root.dataset.summaryDateStyle || "short").trim() || "short";
    const datePickerMode = (root.dataset.datePickerMode || "native").trim() || "native";
    const slotIntervalMode = (root.dataset.slotIntervalMode || "fixed").trim() || "fixed";
    const showServicePrice = root.dataset.showServicePrice !== "false";
    const showServiceDuration = root.dataset.showServiceDuration !== "false";
    const showServiceDescription = root.dataset.showServiceDescription === "true";
    const showTimezone = root.dataset.showTimezone !== "false";

    const serviceSelect = root.querySelector("[data-booking-service]");
    const resourceSelect = root.querySelector("[data-booking-resource]");
    const dateInput = root.querySelector("[data-booking-date]");
    const slotsNode = root.querySelector("[data-booking-slots]");
    const statusNode = root.querySelector("[data-booking-slots-status]");
    const selectedNode = root.querySelector("[data-booking-selected-summary]");
    const sidebarSelectedNode = root.querySelector("[data-booking-selected-summary-sidebar]");
    const refreshButton = root.querySelector("[data-booking-refresh]");
    const clearSelectionButton = root.querySelector("[data-booking-clear-selection]");
    const skeletonNode = root.querySelector("[data-booking-loading-skeleton]");
    const serviceContextNode = root.querySelector("[data-booking-service-context]");
    const timezoneNode = root.querySelector("[data-booking-resource-timezone]");
    const weekLabelNode = root.querySelector("[data-booking-week-label]");
    const weekDaysNode = root.querySelector("[data-booking-week-days]");
    const weekPrevButton = root.querySelector("[data-booking-week-prev]");
    const weekNextButton = root.querySelector("[data-booking-week-next]");

    if (!(serviceSelect instanceof HTMLSelectElement)) return;
    if (!(resourceSelect instanceof HTMLSelectElement)) return;
    if (!(dateInput instanceof HTMLInputElement)) return;
    if (!(slotsNode instanceof HTMLElement)) return;

    const today = todayDateInputValue();
    const datePolicy = readDatePolicy(root);
    dateInput.min = datePolicy.minDate || today;
    if (datePolicy.maxDate) {
      dateInput.max = datePolicy.maxDate;
    } else {
      dateInput.removeAttribute("max");
    }
    dateInput.value = clampDateToPolicy(dateInput.value, datePolicy, today);

    syncResourceOptions(serviceSelect, resourceSelect);

    const resolveIntervalMinutes = () => {
      const selectedServiceOption = serviceSelect.selectedOptions[0];
      const serviceDuration = Number.parseInt(selectedServiceOption?.dataset.durationMinutes || "", 10);
      const safeDuration =
        Number.isFinite(serviceDuration) && serviceDuration > 0 ? serviceDuration : interval;

      if (slotIntervalMode === "service-duration") return safeDuration;
      if (slotIntervalMode === "non-overlapping") return Math.max(interval, safeDuration);
      return interval;
    };

    const buildTargetUrl = (dateValue) => {
      const target = new URL(endpoint, window.location.origin);
      target.searchParams.set("serviceId", serviceSelect.value);
      target.searchParams.set("resourceId", resourceSelect.value);
      target.searchParams.set("date", dateValue);
      if (slotsToken) {
        target.searchParams.set("runtimeToken", slotsToken);
      }
      const resolvedInterval = resolveIntervalMinutes();
      if (Number.isFinite(resolvedInterval) && resolvedInterval > 0) {
        target.searchParams.set("intervalMinutes", String(resolvedInterval));
      }
      const resourceOption = resourceSelect.selectedOptions[0];
      const timezone = resourceOption?.dataset.timezone;
      if (timezone) {
        target.searchParams.set("timezone", timezone);
      }
      return target;
    };

    const renderServiceContext = () => {
      const serviceOption = serviceSelect.selectedOptions[0];
      const resourceOption = resourceSelect.selectedOptions[0];

      if (serviceContextNode instanceof HTMLElement) {
        const metaParts = [];
        const duration = Number.parseInt(serviceOption?.dataset.durationMinutes || "", 10);
        const bufferBefore = Number.parseInt(serviceOption?.dataset.bufferBeforeMinutes || "", 10);
        const bufferAfter = Number.parseInt(serviceOption?.dataset.bufferAfterMinutes || "", 10);
        const priceCents = Number.parseInt(serviceOption?.dataset.priceCents || "", 10);
        const currency = (serviceOption?.dataset.currency || "").trim();

        if (showServiceDuration && Number.isFinite(duration) && duration > 0) {
          const bufferTotal =
            (Number.isFinite(bufferBefore) ? bufferBefore : 0) +
            (Number.isFinite(bufferAfter) ? bufferAfter : 0);
          metaParts.push(
            bufferTotal > 0 ? duration + " min + " + bufferTotal + " min buffer" : duration + " min"
          );
        }

        if (showServicePrice && Number.isFinite(priceCents) && currency) {
          try {
            metaParts.push(
              new Intl.NumberFormat(summaryLocale ? [summaryLocale] : [], {
                style: "currency",
                currency: currency.toUpperCase(),
              }).format(priceCents / 100)
            );
          } catch {
            metaParts.push((priceCents / 100).toFixed(2) + " " + currency.toUpperCase());
          }
        }

        const description = (serviceOption?.dataset.description || "").trim();
        serviceContextNode.innerHTML =
          "<p class=\"text-sm font-medium text-[var(--color-text)]\">" +
          (serviceOption?.textContent?.trim() || "No service selected") +
          "</p>" +
          (metaParts.length > 0
            ? "<p class=\"text-xs text-[var(--color-text)]/70\">" + metaParts.join(" · ") + "</p>"
            : "") +
          (showServiceDescription && description
            ? "<p class=\"text-xs text-[var(--color-text)]/70\">" + description + "</p>"
            : "");
      }

      if (timezoneNode instanceof HTMLElement) {
        const timezone = (resourceOption?.dataset.timezone || "").trim();
        timezoneNode.textContent = showTimezone && timezone ? "Timezone: " + timezone : "";
      }
    };

    const renderClearSelectionState = (selection) => {
      if (clearSelectionButton instanceof HTMLButtonElement) {
        clearSelectionButton.disabled = !selection;
      }
    };

    const renderSelectedSummary = (selection) => {
      if (!selection) {
        const emptyText =
          selectedNode instanceof HTMLElement
            ? selectedNode.dataset.empty || "No slot selected yet."
            : "No slot selected yet.";
        if (selectedNode instanceof HTMLElement) {
          selectedNode.textContent = emptyText;
        }
        if (sidebarSelectedNode instanceof HTMLElement) {
          sidebarSelectedNode.textContent = emptyText;
        }
        renderClearSelectionState(null);
        return;
      }

      const summaryText =
        toDateLabel(selection.startsAt, {
          locale: summaryLocale,
          dateStyle: summaryDateStyle,
          timezone: selection.timezone,
        }) +
        " • " +
        toTimeLabel(selection.startsAt, {
          locale: summaryLocale,
          timezone: selection.timezone,
        }) +
        " - " +
        toTimeLabel(selection.endsAt, {
          locale: summaryLocale,
          timezone: selection.timezone,
        }) +
        (selection.timezone ? " • " + selection.timezone : "");

      if (selectedNode instanceof HTMLElement) {
        selectedNode.textContent = summaryText;
      }
      if (sidebarSelectedNode instanceof HTMLElement) {
        sidebarSelectedNode.textContent = summaryText;
      }
      renderClearSelectionState(selection);
    };

    const setBusy = (busy) => {
      if (refreshButton instanceof HTMLButtonElement) {
        refreshButton.disabled = busy;
      }
      if (skeletonNode instanceof HTMLElement) {
        skeletonNode.hidden = !busy;
      }
    };

    const applyButtonVisualState = (button, isSelected) => {
      button.style.backgroundColor = "";
      button.style.borderColor = "";
      if (isSelected) {
        button.style.backgroundColor = "var(--booking-slot-selected-bg)";
        button.style.borderColor = "var(--booking-slot-selected-border)";
      }
      button.onmouseenter = () => {
        if (!isSelected) {
          button.style.borderColor = "var(--booking-slot-hover-border)";
        }
      };
      button.onmouseleave = () => {
        if (!isSelected) {
          button.style.borderColor = "";
        }
      };
    };

    const renderSlots = (items) => {
      const currentItems = Array.isArray(items) ? items : [];
      lastRenderedSlots.set(root, currentItems);
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
          "rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] transition";
        button.textContent =
          toTimeLabel(slot.startsAt, {
            locale: summaryLocale,
            timezone: slot.timezone,
          }) +
          " - " +
          toTimeLabel(slot.endsAt, {
            locale: summaryLocale,
            timezone: slot.timezone,
          });

        const isSelected =
          Boolean(selection) &&
          selection.startsAt === slot.startsAt &&
          selection.endsAt === slot.endsAt &&
          selection.resourceId === resourceSelect.value;
        applyButtonVisualState(button, isSelected);

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
      renderSlots(lastRenderedSlots.get(root) || []);
    };

    const renderWeekPicker = (availabilityMap = new Map()) => {
      if (!(weekDaysNode instanceof HTMLElement) || !(weekLabelNode instanceof HTMLElement)) return;

      const anchorDate = weekAnchors.get(root) || dateInput.value || today;
      weekAnchors.set(root, anchorDate);
      const dates = buildWeekDates(anchorDate).map((dateValue) =>
        clampDateToPolicy(dateValue, datePolicy, today)
      );
      weekLabelNode.textContent = dates[0] + " - " + dates[dates.length - 1];
      weekDaysNode.innerHTML = "";

      dates.forEach((dateValue) => {
        const availability = availabilityMap.get(dateValue) || { count: null };
        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "rounded-md border border-[var(--color-border)] px-2 py-2 text-left text-xs text-[var(--color-text)]";
        button.innerHTML =
          "<span class=\"block font-medium\">" +
          toWeekdayLabel(dateValue, summaryLocale) +
          "</span>" +
          "<span class=\"block text-[11px] text-[var(--color-text)]/65\">" +
          (availability.count === null
            ? "Check availability"
            : availability.count > 0
              ? availability.count + " slots"
              : "No slots") +
          "</span>";

        if (dateInput.value === dateValue) {
          button.style.backgroundColor = "var(--booking-slot-selected-bg)";
          button.style.borderColor = "var(--booking-slot-selected-border)";
        }
        button.disabled = availability.count === 0;
        button.addEventListener("click", () => {
          dateInput.value = dateValue;
          weekAnchors.set(root, dateValue);
          renderWeekPicker(availabilityMap);
          void loadSlots();
        });
        weekDaysNode.appendChild(button);
      });
    };

    const refreshAvailability = async () => {
      if (datePickerMode !== "week" || !(weekDaysNode instanceof HTMLElement)) return;
      const serviceId = serviceSelect.value;
      const resourceId = resourceSelect.value;
      const anchorDate = weekAnchors.get(root) || dateInput.value || today;
      weekAnchors.set(root, anchorDate);

      if (!serviceId || !resourceId) {
        renderWeekPicker(new Map());
        return;
      }

      availabilityRequests.get(root)?.abort();
      const controller = new AbortController();
      availabilityRequests.set(root, controller);
      const dates = buildWeekDates(anchorDate).map((dateValue) =>
        clampDateToPolicy(dateValue, datePolicy, today)
      );

      try {
        const entries = await Promise.all(
          dates.map(async (dateValue) => {
            const response = await fetch(buildTargetUrl(dateValue).toString(), {
              signal: controller.signal,
              headers: { Accept: "application/json" },
            });
            if (!response.ok) {
              return [dateValue, { count: null }];
            }
            const payload = await response.json();
            const items = Array.isArray(payload?.items) ? payload.items : [];
            return [dateValue, { count: items.length }];
          })
        );

        if (availabilityRequests.get(root) !== controller) return;
        renderWeekPicker(new Map(entries));
      } catch (error) {
        if (error?.name === "AbortError") return;
        renderWeekPicker(new Map());
      } finally {
        if (availabilityRequests.get(root) === controller) {
          availabilityRequests.delete(root);
        }
      }
    };

    const loadSlots = async () => {
      const serviceId = serviceSelect.value;
      const resourceId = resourceSelect.value;
      const date = clampDateToPolicy(dateInput.value, datePolicy, today);
      if (dateInput.value !== date) {
        dateInput.value = date;
      }

      renderServiceContext();

      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = statusNode.dataset.loading || "Loading slots...";
      }

      if (!serviceId || !resourceId || !date) {
        slotsNode.innerHTML =
          "<p class=\"text-xs text-[var(--color-text)]/65\">" +
          (slotsNode.dataset.missing || "Choose service, resource, and date first.") +
          "</p>";
        if (statusNode instanceof HTMLElement) statusNode.textContent = "";
        renderSelectedSummary(null);
        return;
      }

      const previousSelection = getSelection(flowId);
      slotRequests.get(root)?.abort();
      const controller = new AbortController();
      slotRequests.set(root, controller);
      setBusy(true);

      try {
        const response = await fetch(buildTargetUrl(date).toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("booking_slots_failed");
        }

        const payload = await response.json();
        if (slotRequests.get(root) !== controller) return;
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const nextSelection =
          previousSelection &&
          items.some(
            (slot) =>
              slot.startsAt === previousSelection.startsAt &&
              slot.endsAt === previousSelection.endsAt &&
              previousSelection.resourceId === resourceSelect.value
          )
            ? previousSelection
            : null;
        if (previousSelection && !nextSelection) {
          setSelection(flowId, null);
        }
        renderSelectedSummary(nextSelection);
        renderSlots(items);
        if (statusNode instanceof HTMLElement) {
          statusNode.textContent = "";
        }
        void refreshAvailability();
      } catch (error) {
        if (error?.name === "AbortError") return;
        slotsNode.innerHTML =
          "<p class=\"text-xs text-rose-600\">" +
          (slotsNode.dataset.error || "Unable to load slots right now.") +
          "</p>";
        if (statusNode instanceof HTMLElement) statusNode.textContent = "";
      } finally {
        if (slotRequests.get(root) === controller) {
          slotRequests.delete(root);
        }
        setBusy(false);
      }
    };

    serviceSelect.addEventListener("change", () => {
      syncResourceOptions(serviceSelect, resourceSelect);
      weekAnchors.set(root, clampDateToPolicy(dateInput.value, datePolicy, today));
      void loadSlots();
    });

    resourceSelect.addEventListener("change", () => {
      weekAnchors.set(root, clampDateToPolicy(dateInput.value, datePolicy, today));
      void loadSlots();
    });

    dateInput.addEventListener("change", () => {
      weekAnchors.set(root, clampDateToPolicy(dateInput.value, datePolicy, today));
      void loadSlots();
    });

    if (refreshButton instanceof HTMLElement) {
      refreshButton.addEventListener("click", () => {
        void loadSlots();
      });
    }

    window.addEventListener(SLOT_EVENT_NAME, onSlotSelected);

    if (clearSelectionButton instanceof HTMLElement) {
      clearSelectionButton.addEventListener("click", () => {
        setSelection(flowId, null);
        renderSelectedSummary(null);
        renderSlots(lastRenderedSlots.get(root) || []);
      });
    }

    if (weekPrevButton instanceof HTMLElement) {
      weekPrevButton.addEventListener("click", () => {
        weekAnchors.set(root, addDays(weekAnchors.get(root) || dateInput.value || today, -7));
        void refreshAvailability();
      });
    }

    if (weekNextButton instanceof HTMLElement) {
      weekNextButton.addEventListener("click", () => {
        weekAnchors.set(root, addDays(weekAnchors.get(root) || dateInput.value || today, 7));
        void refreshAvailability();
      });
    }

    renderServiceContext();
    renderSelectedSummary(getSelection(flowId));
    renderClearSelectionState(getSelection(flowId));
    weekAnchors.set(root, clampDateToPolicy(dateInput.value, datePolicy, today));
    void refreshAvailability();
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
        toDateLabel(selection.startsAt, {
          locale,
          timezone: selection.timezone,
        }) +
        " • " +
        toTimeLabel(selection.startsAt, {
          locale,
          timezone: selection.timezone,
        }) +
        " - " +
        toTimeLabel(selection.endsAt, {
          locale,
          timezone: selection.timezone,
        }) +
        (selection.timezone ? " • " + selection.timezone : "");
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
