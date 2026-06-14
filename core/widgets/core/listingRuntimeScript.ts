const runtimeClientScript = String.raw`(() => {
  if (typeof window === "undefined") return;
  if ((window).__nextlessListingRuntimeClient) return;
  (window).__nextlessListingRuntimeClient = true;

  const LISTING_FORM_SELECTOR = "form[data-listing-runtime-form]";
  const GLOBAL_SEARCH_FORM_SELECTOR = "form[data-global-search-form]";

  const escapeCss = (value) => {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  };

  const toParamName = (queryId, token) => "lq." + queryId + "." + token;

  const clearQueryPrefix = (searchParams, prefix) => {
    const keys = Array.from(searchParams.keys());
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        searchParams.delete(key);
      }
    });
  };

  const readListingParamNames = (form) =>
    Array.from(
      new Set(
        (form.dataset.listingParamAliases || "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .concat(
            Array.from(form.querySelectorAll("[data-listing-param-name]"))
              .map((control) =>
                control instanceof HTMLElement
                  ? (control.dataset.listingParamName || "").trim()
                  : ""
              )
              .filter(Boolean)
          )
      )
    );

  const clearListingParams = (form, searchParams, queryId) => {
    clearQueryPrefix(searchParams, "lq." + queryId + ".");
    readListingParamNames(form).forEach((paramName) => {
      searchParams.delete(paramName);
    });
  };

  const resolveListingParamName = (queryId, control, token) => {
    if (control instanceof HTMLElement) {
      const explicitName = (control.dataset.listingParamName || "").trim();
      if (explicitName) return explicitName;
    }
    return toParamName(queryId, token);
  };

  const readControlValues = (control) => {
    if (!(control instanceof HTMLElement)) return [];
    if (control instanceof HTMLInputElement) {
      if (control.type === "checkbox") {
        return control.checked ? [control.value] : [];
      }
      if (control.type === "radio") {
        return control.checked ? [control.value] : [];
      }
      const value = control.value.trim();
      return value ? [value] : [];
    }
    if (control instanceof HTMLSelectElement) {
      if (control.multiple) {
        return Array.from(control.selectedOptions)
          .map((option) => option.value.trim())
          .filter(Boolean);
      }
      const value = control.value.trim();
      return value ? [value] : [];
    }
    if (control instanceof HTMLTextAreaElement) {
      const value = control.value.trim();
      return value ? [value] : [];
    }
    return [];
  };

  const toCompositeValue = (value) => String(value ?? "").trim();

  const composeCompositeToken = (start, end) => {
    const left = toCompositeValue(start);
    const right = toCompositeValue(end);
    return left || right ? left + "," + right : "";
  };

  const syncCompositeBounds = (left, right, source) => {
    const leftValue = toCompositeValue(left?.value);
    const rightValue = toCompositeValue(right?.value);
    if (!leftValue || !rightValue) {
      return { leftValue, rightValue };
    }

    if (source === "date") {
      if (leftValue > rightValue) {
        if (source === "date-end") {
          if (left) left.value = rightValue;
          return { leftValue: rightValue, rightValue };
        }
        if (right) right.value = leftValue;
        return { leftValue, rightValue: leftValue };
      }
      return { leftValue, rightValue };
    }

    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);
    if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) {
      return { leftValue, rightValue };
    }
    if (leftNumber <= rightNumber) {
      return { leftValue, rightValue };
    }
    if (source === "max") {
      if (left) left.value = rightValue;
      return { leftValue: rightValue, rightValue };
    }
    if (right) right.value = leftValue;
    return { leftValue, rightValue: leftValue };
  };

  const syncListingCompositeControl = (control, source) => {
    if (!(control instanceof HTMLElement)) return;
    const hidden = control.querySelector('[data-listing-token]');
    if (!(hidden instanceof HTMLInputElement)) return;
    const kind = (control.dataset.listingCompositeKind || "").trim();

    if (kind === "range") {
      const minInput = control.querySelector('[data-listing-range-part="min"]');
      const maxInput = control.querySelector('[data-listing-range-part="max"]');
      const minSlider = control.querySelector('[data-listing-range-slider="min"]');
      const maxSlider = control.querySelector('[data-listing-range-slider="max"]');

      if (minInput instanceof HTMLInputElement && minSlider instanceof HTMLInputElement) {
        if (source === "min-slider") {
          minInput.value = minSlider.value;
        } else if (source === "min") {
          minSlider.value = minInput.value;
        }
      }

      if (maxInput instanceof HTMLInputElement && maxSlider instanceof HTMLInputElement) {
        if (source === "max-slider") {
          maxInput.value = maxSlider.value;
        } else if (source === "max") {
          maxSlider.value = maxInput.value;
        }
      }

      const leftControl =
        minInput instanceof HTMLInputElement ? minInput : minSlider instanceof HTMLInputElement ? minSlider : null;
      const rightControl =
        maxInput instanceof HTMLInputElement ? maxInput : maxSlider instanceof HTMLInputElement ? maxSlider : null;
      const normalized = syncCompositeBounds(
        leftControl,
        rightControl,
        source === "max" || source === "max-slider" ? "max" : "min"
      );
      hidden.value = composeCompositeToken(normalized.leftValue, normalized.rightValue);
      return;
    }

    if (kind === "date-range") {
      const startInput = control.querySelector('[data-listing-date-part="start"]');
      const endInput = control.querySelector('[data-listing-date-part="end"]');
      const normalized = syncCompositeBounds(
        startInput instanceof HTMLInputElement ? startInput : null,
        endInput instanceof HTMLInputElement ? endInput : null,
        source === "date-end" ? "date-end" : "date"
      );
      hidden.value = composeCompositeToken(normalized.leftValue, normalized.rightValue);
    }
  };

  const bindListingCompositeControls = (root) => {
    root.querySelectorAll('[data-listing-composite-control="1"]').forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      if (control.dataset.listingCompositeBound === "1") return;
      control.dataset.listingCompositeBound = "1";
      syncListingCompositeControl(control, "");

      const bindControl = (selector, source) => {
        control.querySelectorAll(selector).forEach((element) => {
          element.addEventListener("input", () => {
            syncListingCompositeControl(control, source);
          });
          element.addEventListener("change", () => {
            syncListingCompositeControl(control, source);
          });
        });
      };

      bindControl('[data-listing-range-part="min"]', "min");
      bindControl('[data-listing-range-part="max"]', "max");
      bindControl('[data-listing-range-slider="min"]', "min-slider");
      bindControl('[data-listing-range-slider="max"]', "max-slider");
      bindControl('[data-listing-date-part="start"]', "date-start");
      bindControl('[data-listing-date-part="end"]', "date-end");
    });
  };

  const bindListingSearchableOptions = (root) => {
    root.querySelectorAll('[data-listing-searchable-options="1"]').forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      if (control.dataset.listingSearchableBound === "1") return;
      control.dataset.listingSearchableBound = "1";
      const searchInput = control.querySelector('[data-listing-option-search="1"]');
      if (!(searchInput instanceof HTMLInputElement)) return;
      const options = Array.from(control.querySelectorAll('[data-listing-searchable-option="1"]'));
      const applyFilter = () => {
        const query = searchInput.value.trim().toLowerCase();
        options.forEach((option) => {
          if (!(option instanceof HTMLElement)) return;
          const label = (option.dataset.listingOptionLabel || "").trim().toLowerCase();
          option.hidden = query.length > 0 && !label.includes(query);
        });
      };
      searchInput.addEventListener("input", applyFilter);
      applyFilter();
    });
  };

  const syncListingFormToUrl = (form, url) => {
    const queryId = (form.dataset.listingQueryId || "").trim();
    if (!queryId) return;

    clearListingParams(form, url.searchParams, queryId);

    const controls = Array.from(form.querySelectorAll("[data-listing-token]"));
    const valueMap = new Map();

    controls.forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      const token = (control.dataset.listingToken || "").trim();
      if (!token) return;
      const values = readControlValues(control);
      if (values.length === 0) return;
      const paramName = resolveListingParamName(queryId, control, token);
      const current = valueMap.get(paramName) || [];
      valueMap.set(paramName, current.concat(values));
    });

    valueMap.forEach((values, paramName) => {
      if (!Array.isArray(values) || values.length === 0) return;
      const deduped = Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
      if (deduped.length === 0) return;
      url.searchParams.set(paramName, deduped.join(","));
    });
  };

  const replaceListingBlocksFromHtml = (queryId, html) => {
    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(html, "text/html");
    const selector =
      '[data-listing-query-id="' + escapeCss(queryId) + '"]';
    const currentBlocks = Array.from(document.querySelectorAll(selector));

    currentBlocks.forEach((current) => {
      const blockId = (current.getAttribute("data-listing-block-id") || "").trim();
      if (!blockId) return;
      const next = nextDoc.querySelector(
        '[data-listing-block-id="' + escapeCss(blockId) + '"]'
      );
      if (next) {
        current.replaceWith(next);
      }
    });
  };

  const listingRefreshState = new Map();

  const getScopedListingElements = (queryId, selector) => {
    const querySelector = '[data-listing-query-id="' + escapeCss(queryId) + '"]';
    return Array.from(document.querySelectorAll(querySelector + " " + selector));
  };

  const setListingBusyState = (queryId, isBusy) => {
    getScopedListingElements(queryId, '[data-listing-runtime-form]').forEach((form) => {
      if (form instanceof HTMLFormElement) {
        form.setAttribute("aria-busy", isBusy ? "true" : "false");
      }
    });
    getScopedListingElements(queryId, '[data-listing-runtime-loading="1"]').forEach((node) => {
      if (node instanceof HTMLElement) {
        node.hidden = !isBusy;
      }
    });
  };

  const setListingRuntimeErrorState = (queryId, showError) => {
    getScopedListingElements(queryId, '[data-listing-runtime-error="1"]').forEach((node) => {
      if (node instanceof HTMLElement) {
        node.hidden = !showError;
      }
    });
  };

  const startListingRefresh = (queryId) => {
    const current = listingRefreshState.get(queryId) || { latestRequestId: 0 };
    const requestId = current.latestRequestId + 1;
    listingRefreshState.set(queryId, { latestRequestId: requestId });
    setListingBusyState(queryId, true);
    setListingRuntimeErrorState(queryId, false);
    return requestId;
  };

  const isLatestListingRefresh = (queryId, requestId) =>
    (listingRefreshState.get(queryId)?.latestRequestId ?? 0) === requestId;

  const finishListingRefresh = (queryId, requestId) => {
    if (!isLatestListingRefresh(queryId, requestId)) return;
    setListingBusyState(queryId, false);
  };

  const runListingRefresh = async (queryId, targetUrl, pushHistory) => {
    const requestId = startListingRefresh(queryId);
    try {
      const response = await fetch(targetUrl.toString(), {
        headers: {
          "x-nextless-runtime": "listing",
        },
      });
      if (!response.ok) {
        if (isLatestListingRefresh(queryId, requestId)) {
          setListingRuntimeErrorState(queryId, true);
        }
        return;
      }
      const html = await response.text();
      if (!isLatestListingRefresh(queryId, requestId)) return;
      replaceListingBlocksFromHtml(queryId, html);
      if (pushHistory) {
        window.history.pushState({}, "", targetUrl.toString());
      }
      bindListingForms();
      bindGlobalSearchForms();
    } catch {
      if (isLatestListingRefresh(queryId, requestId)) {
        setListingRuntimeErrorState(queryId, true);
      }
    } finally {
      finishListingRefresh(queryId, requestId);
    }
  };

  const submitListingForm = (form, pushHistory) => {
    const queryId = (form.dataset.listingQueryId || "").trim();
    if (!queryId) return;
    const nextUrl = new URL(window.location.href);
    syncListingFormToUrl(form, nextUrl);
    void runListingRefresh(queryId, nextUrl, pushHistory);
  };

  const clearListingForm = (form, pushHistory) => {
    const queryId = (form.dataset.listingQueryId || "").trim();
    if (!queryId) return;
    const nextUrl = new URL(window.location.href);
    clearListingParams(form, nextUrl.searchParams, queryId);
    void runListingRefresh(queryId, nextUrl, pushHistory);
  };

  const bindListingForm = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.listingRuntimeBound === "1") return;
    form.dataset.listingRuntimeBound = "1";
    bindListingCompositeControls(form);
    bindListingSearchableOptions(form);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitListingForm(form, true);
    });

    form.addEventListener("change", (event) => {
      const autoApply = form.dataset.listingAutoApply !== "0";
      if (!autoApply) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (
        !target.hasAttribute("data-listing-token") &&
        !target.hasAttribute("data-listing-auto-submit")
      ) {
        return;
      }
      submitListingForm(form, true);
    });

    const clearButton = form.querySelector('[data-listing-clear-all="1"]');
    if (clearButton instanceof HTMLButtonElement) {
      clearButton.addEventListener("click", (event) => {
        event.preventDefault();
        clearListingForm(form, true);
      });
    }
  };

  const bindListingForms = () => {
    const forms = Array.from(document.querySelectorAll(LISTING_FORM_SELECTOR));
    forms.forEach((form) => bindListingForm(form));
  };

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderGlobalResults = (form, payload) => {
    const boxId = (form.dataset.searchBoxId || "").trim();
    if (!boxId) return;
    const container = document.querySelector(
      '[data-global-search-results="' + escapeCss(boxId) + '"]'
    );
    if (!(container instanceof HTMLElement)) return;

    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-[var(--color-text)]/70">No results found.</p>';
      return;
    }

    const html = items
      .map((item) => {
        const title = escapeHtml(item?.title || "Untitled");
        const href = escapeHtml(item?.href || "#");
        const source = escapeHtml(item?.source || "result");
        return '<a class="block rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface)]/40" href="' +
          href +
          '"><span class="block font-medium">' +
          title +
          '</span><span class="mt-1 inline-block rounded-full border border-[var(--color-border)]/80 px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--color-text)]/65">' +
          source +
          "</span></a>";
      })
      .join("");

    container.innerHTML = '<div class="space-y-2">' + html + "</div>";
  };

  const runGlobalSearch = async (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    const endpoint = (form.dataset.searchEndpoint || "/api/search").trim();
    const qInput = form.querySelector('input[name="q"]');
    if (!(qInput instanceof HTMLInputElement)) return;
    const query = qInput.value.trim();
    if (query.length < 2) {
      renderGlobalResults(form, { items: [] });
      return;
    }

    const selectedSources = Array.from(
      form.querySelectorAll('input[name="sources"]')
    )
      .filter((input) => input instanceof HTMLInputElement && input.checked)
      .map((input) => input.value)
      .filter(Boolean);

    const targetUrl = new URL(endpoint, window.location.origin);
    targetUrl.searchParams.set("q", query);
    if (selectedSources.length > 0) {
      targetUrl.searchParams.set("sources", selectedSources.join(","));
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      renderGlobalResults(form, { items: [] });
      return;
    }
    const payload = await response.json();
    renderGlobalResults(form, payload);
  };

  const bindGlobalSearchForm = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.globalSearchBound === "1") return;
    form.dataset.globalSearchBound = "1";

    let debounceTimer = null;
    const schedule = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void runGlobalSearch(form);
      }, 220);
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void runGlobalSearch(form);
    });

    form.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.name !== "q") return;
      schedule();
    });

    form.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.name !== "sources") return;
      void runGlobalSearch(form);
    });
  };

  const bindGlobalSearchForms = () => {
    const forms = Array.from(document.querySelectorAll(GLOBAL_SEARCH_FORM_SELECTOR));
    forms.forEach((form) => bindGlobalSearchForm(form));
  };

  window.addEventListener("popstate", () => {
    const queryIds = Array.from(
      new Set(
        Array.from(document.querySelectorAll("[data-listing-query-id]"))
          .map((node) => (node.getAttribute("data-listing-query-id") || "").trim())
          .filter(Boolean)
      )
    );

    const targetUrl = new URL(window.location.href);
    queryIds.forEach((queryId) => {
      void runListingRefresh(queryId, targetUrl, false);
    });
  });

  // Pager pickup (TASK-459-03): numbered-pager and prev/next anchors carry
  // data-listing-page-link="1". For listing-bound blocks (a non-empty
  // data-listing-query-id ancestor) the click fetch-swaps the listing blocks
  // and pushes history; anything else (legacy cl.* pagers) keeps the plain
  // server-rendered navigation. Delegated once so swapped pagers stay bound.
  document.addEventListener("click", (event) => {
    const origin = event.target;
    if (!(origin instanceof Element)) return;
    const link = origin.closest('[data-listing-page-link="1"]');
    if (!(link instanceof HTMLAnchorElement)) return;
    const container = link.closest("[data-listing-query-id]");
    const queryId = (container?.getAttribute("data-listing-query-id") || "").trim();
    if (!queryId) return;
    event.preventDefault();
    const targetUrl = new URL(link.getAttribute("href") || "", window.location.href);
    void runListingRefresh(queryId, targetUrl, true);
  });

  bindListingForms();
  bindGlobalSearchForms();
})();`;

export function getListingRuntimeClientScript() {
  return runtimeClientScript;
}
