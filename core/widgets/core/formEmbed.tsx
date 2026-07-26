import { useId, type CSSProperties, type ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableCssColorValue } from "./clearableStyle";
import { getFormRuntimeClientScript } from "./formRuntimeScript";
import {
  formThemeGapClass,
  formThemeInputSizeClass,
  formThemePaddingClass,
  formThemeRadiusClass,
  formThemeShadowClass,
  formThemeTitleSizeClass,
  formThemeWidthClass,
  type FormFormTheme,
  type FormThemeFontFamily,
} from "../../services/forms/formTheme";
import {
  formEmbedDefaults,
  formEmbedSchema,
  isFieldGap,
  isInputSize,
  isTitleSize,
  isWidth,
  normalizeFormEmbedData,
  resolveFields,
  resolveFormEmbedRuntimeErrorMessage,
  resolveLayout,
  resolveNavigation,
  resolveStyle,
  resolveSubmitBehavior,
} from "./formEmbedContract";
import type {
  FormEmbedData,
  FormEmbedLayout,
  FormEmbedResolvedData,
  FormEmbedStyle,
  FormEmbedVariantId,
} from "./formEmbedContract";
import {
  allocateFieldDomIds,
  groupFieldsByStep,
  renderFieldControl,
  resolveFieldGridSpanClass,
} from "./formEmbedFields";

export {
  clampSavedProgressTtl,
  formEmbedDefaults,
  formEmbedSchema,
  formEmbedThemeDefaultColorValues,
  isFormEmbedThemeDefaultStyleValue,
  normalizeFormEmbedData,
  resolveFormEmbedRuntimeErrorMessage,
  resolveFormEmbedSpacing,
} from "./formEmbedContract";
export type {
  FormEmbedData,
  FormEmbedFields,
  FormEmbedLayout,
  FormEmbedNavigation,
  FormEmbedResolvedData,
  FormEmbedStyle,
  FormEmbedSubmitBehavior,
  FormEmbedVariantId,
  ResolvedFormField,
} from "./formEmbedContract";

// 516-06 owns this LOCAL font-family token→class map (present-only path). The embed
// cannot call resolveFormTheme (it over-defaults fontFamily→"display"), so it maps the
// RAW theme token here. Full vocabulary, matching the preview + canvas maps; "display"
// (the resolved default) MUST be present, "inherit" emits no class.
const FORM_THEME_FONT_CLASS: Record<FormThemeFontFamily, string> = {
  display: "font-display",
  inherit: "",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

type FormEmbedSubmitTheme = NonNullable<FormFormTheme["submit"]> & {
  supportingText?: unknown;
};

const widthClassMap: Record<NonNullable<FormEmbedLayout["width"]>, string> = {
  none: "",
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};

const alignClassMap: Record<NonNullable<FormEmbedLayout["alignment"]>, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

const buttonAlignClassMap: Record<NonNullable<FormEmbedLayout["buttonAlignment"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const sectionPaddingXClassMap: Record<NonNullable<FormEmbedLayout["sectionPaddingX"]>, string> = {
  sm: "px-4",
  md: "px-6",
  lg: "px-8",
};

const sectionPaddingYClassMap: Record<NonNullable<FormEmbedLayout["sectionPaddingY"]>, string> = {
  none: "py-0",
  sm: "py-6",
  md: "py-8",
  lg: "py-10",
  xl: "py-12",
};

const fieldGapClassMap: Record<NonNullable<FormEmbedLayout["fieldGap"]>, string> = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

const radiusClassMap: Record<NonNullable<FormEmbedStyle["radius"]>, string> = {
  none: "",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
};

const inputSizeClassMap: Record<NonNullable<FormEmbedStyle["inputSize"]>, string> = {
  none: "",
  sm: "px-3 py-2 text-sm",
  md: "px-3 py-2.5 text-sm",
  lg: "px-4 py-3 text-base",
};

const titleSizeClassMap: Record<NonNullable<FormEmbedStyle["titleSize"]>, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

const titleWeightClassMap: Record<NonNullable<FormEmbedStyle["titleWeight"]>, string> = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const borderWidthClassMap: Record<NonNullable<FormEmbedStyle["borderWidth"]>, string> = {
  "0": "border-0",
  "1": "border",
  "2": "border-2",
};

// 516-06: translate a RAW (present-only, NOT resolveFormTheme-defaulted) form theme
// into the widget's FormEmbedStyle/FormEmbedLayout vocabulary. The two enum
// vocabularies are NON-IDENTITY: several tokens are renamed (align left→start) or
// clamped (radius xl→lg, titleWeight normal→medium, buttonAlignment full→center).
// Each helper emits ONLY keys the theme actually set (present-only) — never a
// fabricated default — so an un-themed form yields `{}` and stays byte-identical.
//
// Deliberately EXCLUDED (widget class-maps DIVERGE from the theme maps, so these are
// direct-applied as container classes in FormEmbedBlock, mirroring the width seam):
//   style.titleSize + style.inputSize (widget titleSize/inputSize maps diverge);
//   layout.width + layout.fieldGap (widget width/gap maps diverge).
// Also with NO widget axis (handled entirely via direct-apply / CSS in FormEmbedBlock):
//   surface.padding/shadow/card, input.radius/background/borderColor/textColor,
//   submit.radius/fullWidth/label, typography.fontFamily, layout.columns.
function mapFormThemeToEmbedStyle(theme?: FormFormTheme): Partial<FormEmbedStyle> {
  if (!theme) return {};
  const out: Partial<FormEmbedStyle> = {};
  const { surface, typography, submit } = theme;
  // Render-boundary re-check (Security Contract §2, defence in depth): every
  // theme-derived color re-runs the STRICT CSS-color policy before it enters
  // `themeStyle` → `style` → the widget's existing weak/raw color seams (which
  // must NOT be widened to unchecked theme input). Idempotent for values already
  // policy-checked at write (normalizeFormTheme); drops anything that bypassed it.
  const safeColor = (value: string | undefined): string | undefined =>
    value === undefined ? undefined : resolveClearableCssColorValue(value, "inherited-render");
  if (surface) {
    const bg = safeColor(surface.background);
    if (bg !== undefined) out.surface = bg;
    const border = safeColor(surface.borderColor);
    if (border !== undefined) out.borderColor = border;
    if (surface.borderWidth !== undefined) {
      out.borderWidth =
        surface.borderWidth === "none" ? "0" : surface.borderWidth === "sm" ? "1" : "2";
    }
    if (surface.radius !== undefined) {
      // xl LOSSY → clamp to lg (widget radius enum lacks xl).
      out.radius = surface.radius === "xl" ? "lg" : surface.radius;
    }
  }
  if (typography) {
    const titleColor = safeColor(typography.titleColor);
    if (titleColor !== undefined) out.titleColor = titleColor;
    const labelColor = safeColor(typography.labelColor);
    if (labelColor !== undefined) out.labelColor = labelColor;
    const helperColor = safeColor(typography.helperColor);
    if (helperColor !== undefined) out.helperColor = helperColor;
    if (typography.titleWeight !== undefined) {
      // normal LOSSY → clamp to medium (widget titleWeight enum lacks normal).
      out.titleWeight = typography.titleWeight === "normal" ? "medium" : typography.titleWeight;
    }
  }
  if (submit) {
    const submitBg = safeColor(submit.background);
    if (submitBg !== undefined) out.submitBackground = submitBg;
    const submitText = safeColor(submit.textColor);
    if (submitText !== undefined) out.submitTextColor = submitText;
  }
  return out;
}

function mapFormThemeToEmbedLayout(theme?: FormFormTheme): Partial<FormEmbedLayout> {
  if (!theme) return {};
  const out: Partial<FormEmbedLayout> = {};
  const layout = theme.layout;
  if (layout) {
    if (layout.align !== undefined) {
      out.alignment =
        layout.align === "left" ? "start" : layout.align === "right" ? "end" : "center";
    }
    if (layout.buttonAlignment !== undefined) {
      // full LOSSY → clamp to center (widget buttonAlignment has no full-width axis;
      // the widget-native full-width submit is submit.fullWidth, applied separately).
      out.buttonAlignment =
        layout.buttonAlignment === "left"
          ? "start"
          : layout.buttonAlignment === "right"
            ? "end"
            : "center";
    }
  }
  return out;
}

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const buildFormAction = (formId?: string) =>
  formId ? `/forms/${encodeURIComponent(formId)}/submissions` : undefined;

const resolveTitle = (data: FormEmbedData, resolved?: FormEmbedResolvedData) => {
  return data.title ?? resolved?.formName ?? "Form";
};

const resolveDescription = (data: FormEmbedData, resolved?: FormEmbedResolvedData) => {
  return data.description ?? resolved?.description ?? "";
};

export function FormEmbedBlock({ data, variant }: { data: FormEmbedData; variant: string }) {
  const widgetId = useId().replace(/:/g, "");
  const normalizedData = normalizeFormEmbedData(data);
  const resolvedVariant: FormEmbedVariantId = variant === "standard" ? "standard" : "standard";
  const resolved = normalizedData.resolved;

  // 516-06: form theme = BASE, per-embed instance = OVERRIDE. `formTheme` is the RAW
  // normalized theme (present-only), NOT resolveFormTheme output (which would
  // over-default tokens the form never set and break byte-identity). The instance
  // spread is gated on `data.style`/`data.layout` PRESENCE because
  // normalizeFormEmbedData is fully-defaulted (it always re-emits a complete
  // style/layout) — spreading it unconditionally would clobber the theme layer with
  // widget defaults. When neither theme nor instance is set, the spreads collapse to
  // the pre-516 `{ ...resolveStyle(undefined) }` / `resolveLayout(normalizedData.layout)`
  // (byte-identical markup, snapshot-tested).
  const formTheme = resolved?.settings?.theme;
  const themeStyle = mapFormThemeToEmbedStyle(formTheme);
  const themeLayout = mapFormThemeToEmbedLayout(formTheme);
  const hasInstanceStyle = data.style !== undefined;
  const hasInstanceLayout = data.layout !== undefined;
  const layout = resolveLayout({
    ...themeLayout,
    ...(hasInstanceLayout ? (normalizedData.layout ?? {}) : {}),
  });
  const style: Required<FormEmbedStyle> = {
    ...resolveStyle(undefined),
    ...themeStyle,
    ...(hasInstanceStyle ? (normalizedData.style ?? {}) : {}),
  };
  const fieldsConfig = resolveFields(normalizedData.fields);
  const navigation = resolveNavigation(normalizedData.navigation);
  const submitBehavior = resolveSubmitBehavior(normalizedData.submitBehavior);
  const fields = Array.isArray(resolved?.fields) ? resolved?.fields : [];
  const runtimeLayoutMode =
    resolved?.settings?.layoutMode === "multi_step" ? "multi_step" : "single";
  const stepGroups = groupFieldsByStep(fields);
  const runtimeStepTitles = Array.isArray(resolved?.settings?.stepTitles)
    ? resolved?.settings?.stepTitles
    : [];
  const saveProgressEnabled = resolved?.settings?.saveProgress === true;

  const resolvedBorderColor =
    resolveClearableCssColorValue(style.borderColor, "inherited-render") ?? "var(--color-border)";
  const sectionStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableCssColorValue(style.background, "inherited-render"),
    }) ?? {};
  const surfaceStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableCssColorValue(style.surface, "inherited-render"),
      borderColor: resolvedBorderColor,
    }) ?? {};

  const borderClassName = borderWidthClassMap[style.borderWidth];
  const radiusClassName = radiusClassMap[style.radius];

  // 516-06 direct-apply seam. These tokens BYPASS FormEmbedStyle/Layout because the
  // widget class-maps DIVERGE from the theme maps (routing them through the widget
  // enum would render a different size/gap/width than the canvas + preview show for
  // the SAME theme). Precedence: per-instance (raw data.*) > theme (present-only) >
  // widget default (byte-identity fallback). Each per-instance value is re-validated
  // (data.* is un-normalized) so an invalid instance token falls through cleanly.
  const instanceWidth =
    typeof data.layout?.width === "string" && isWidth(data.layout.width)
      ? data.layout.width
      : undefined;
  const containerWidthClass = instanceWidth
    ? widthClassMap[instanceWidth]
    : formTheme?.layout?.width
      ? formThemeWidthClass[formTheme.layout.width]
      : widthClassMap["md"];

  const instanceInputSize =
    typeof data.style?.inputSize === "string" && isInputSize(data.style.inputSize)
      ? data.style.inputSize
      : undefined;
  const inputClassName = instanceInputSize
    ? inputSizeClassMap[instanceInputSize]
    : formTheme?.input?.size
      ? formThemeInputSizeClass[formTheme.input.size]
      : inputSizeClassMap[style.inputSize];

  const instanceTitleSize =
    typeof data.style?.titleSize === "string" && isTitleSize(data.style.titleSize)
      ? data.style.titleSize
      : undefined;
  const titleSizeClass = instanceTitleSize
    ? titleSizeClassMap[instanceTitleSize]
    : formTheme?.typography?.titleSize
      ? formThemeTitleSizeClass[formTheme.typography.titleSize]
      : titleSizeClassMap[style.titleSize ?? "md"];

  const instanceFieldGap =
    typeof data.layout?.fieldGap === "string" && isFieldGap(data.layout.fieldGap)
      ? data.layout.fieldGap
      : undefined;
  const fieldGapClass = instanceFieldGap
    ? fieldGapClassMap[instanceFieldGap]
    : formTheme?.layout?.fieldGap
      ? formThemeGapClass[formTheme.layout.fieldGap]
      : fieldGapClassMap[layout.fieldGap];

  // columns: SWAP the hardcoded `md:grid-cols-2` for the theme's columns class
  // (present-only; un-themed keeps `md:grid-cols-2` for byte-identity). columns:1 ⇒
  // `grid-cols-1` collapses to one column (per-field half spans become inert).
  const gridColumnsClass =
    formTheme?.layout?.columns === 1
      ? "grid-cols-1"
      : formTheme?.layout?.columns === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2";
  const fieldsGridClassName = joinClasses("grid", gridColumnsClass, fieldGapClass);

  // input.radius / submit.radius: no widget axis (both share the container
  // radiusClassName today). Direct-apply the shared FormThemeRadius map (handles xl,
  // no clamp) present-only; fall back to the container radius when unset.
  const inputRadiusClassName = formTheme?.input?.radius
    ? formThemeRadiusClass[formTheme.input.radius]
    : radiusClassName;
  const submitRadiusClassName = formTheme?.submit?.radius
    ? formThemeRadiusClass[formTheme.submit.radius]
    : radiusClassName;

  // fontFamily: no widget axis — direct-apply on the outer wrapper (present-only).
  const fontFamilyClass = formTheme?.typography?.fontFamily
    ? FORM_THEME_FONT_CLASS[formTheme.typography.fontFamily]
    : "";

  // surface.padding / shadow / card: no widget axis. Present-only swaps on the card
  // wrapper (un-themed keeps `p-6` + no shadow). card===false drops the card chrome.
  const themeCardOff = formTheme?.surface?.card === false;
  const cardPaddingClass = formTheme?.surface?.padding
    ? formThemePaddingClass[formTheme.surface.padding]
    : "p-6";
  const cardShadowClass = formTheme?.surface?.shadow
    ? formThemeShadowClass[formTheme.surface.shadow]
    : "";
  const cardWrapperClassName = themeCardOff
    ? "w-full"
    : joinClasses(
        "w-full space-y-6",
        cardPaddingClass,
        cardShadowClass,
        borderClassName,
        radiusClassName
      );

  // input.background / borderColor / textColor: no widget axis. Present-only inline
  // style on the inputs (colors re-checked via resolveClearableCssColorValue — the
  // strict color policy, defence in depth). borderColor falls back to the surface
  // border so a background-only theme keeps a visible border. When the theme sets no
  // input color, `themeInputStyle` is undefined and renderFieldControl keeps its
  // pre-516 `{ borderColor }` inline style (byte-identity).
  const themeInputBorderColor = formTheme?.input?.borderColor
    ? resolveClearableCssColorValue(formTheme.input.borderColor, "inherited-render")
    : undefined;
  const themeInputBackground = formTheme?.input?.background
    ? resolveClearableCssColorValue(formTheme.input.background, "inherited-render")
    : undefined;
  const themeInputTextColor = formTheme?.input?.textColor
    ? resolveClearableCssColorValue(formTheme.input.textColor, "inherited-render")
    : undefined;
  const themeInputStyle: CSSProperties | undefined =
    themeInputBorderColor || themeInputBackground || themeInputTextColor
      ? (compactStyle({
          borderColor: themeInputBorderColor ?? resolvedBorderColor,
          backgroundColor: themeInputBackground,
          color: themeInputTextColor,
        }) ?? {})
      : undefined;

  // submit.fullWidth / label: no widget axis. Present-only.
  const submitFullWidthClass = formTheme?.submit?.fullWidth ? "w-full" : "";
  const submitLabel =
    data.submitLabel === undefined && formTheme?.submit?.label !== undefined
      ? formTheme.submit.label
      : normalizedData.submitLabel;
  const rawSubmitSupportingText = (formTheme?.submit as FormEmbedSubmitTheme | undefined)
    ?.supportingText;
  const submitSupportingText =
    typeof rawSubmitSupportingText === "string" && rawSubmitSupportingText.trim().length > 0
      ? rawSubmitSupportingText.trim()
      : undefined;

  const title = resolveTitle(normalizedData, resolved);
  const description = resolveDescription(normalizedData, resolved);
  const titleClassName = joinClasses(
    titleSizeClass,
    titleWeightClassMap[style.titleWeight ?? "semibold"]
  );
  const sectionLabelId = title.trim().length > 0 ? `${widgetId}-title` : undefined;
  const fieldDomIds = allocateFieldDomIds(widgetId, fields, sectionLabelId ? [sectionLabelId] : []);
  const resolvedHeadingLevel = layout.headingLevel ?? "2";
  const titleStyle =
    compactStyle({
      color: resolveClearableCssColorValue(style.titleColor, "inherited-render"),
    }) ?? {};
  const descriptionStyle =
    compactStyle({
      color:
        resolveClearableCssColorValue(style.helperColor, "inherited-render") ?? "var(--color-text)",
    }) ?? {};
  const labelColor =
    resolveClearableCssColorValue(style.labelColor, "inherited-render") ?? "var(--color-text)";
  const helperColor =
    resolveClearableCssColorValue(style.helperColor, "inherited-render") ?? "var(--color-text)";
  const submitButtonStyle =
    compactStyle({
      backgroundColor: resolveClearableCssColorValue(style.submitBackground, "inherited-render"),
      color: resolveClearableCssColorValue(style.submitTextColor, "inherited-render"),
    }) ?? {};

  const showDescription = description.trim().length > 0;
  const showSuccessMessage = (normalizedData.successMessage ?? "").trim().length > 0;
  const formAction = buildFormAction(normalizedData.formId);
  const hasMultipleSteps = runtimeLayoutMode === "multi_step" && stepGroups.length > 1;
  const hasRuntimeFormReference = Boolean(normalizedData.formId);
  const runtimeDataMissing = hasRuntimeFormReference && resolved === undefined;
  const isInternalOnlyForm = resolved?.submissionAccess === "internal";
  const canRenderInteractiveForm = fields.length > 0 && !isInternalOnlyForm;
  const showProgress = hasMultipleSteps && navigation.showProgress;
  const HeadingTag = `h${resolvedHeadingLevel}` as "h2" | "h3" | "h4";

  return (
    <section
      className={joinClasses(
        "mx-auto flex w-full flex-col",
        sectionPaddingXClassMap[layout.sectionPaddingX],
        sectionPaddingYClassMap[layout.sectionPaddingY]
      )}
      style={sectionStyle}
      aria-labelledby={sectionLabelId}
      aria-label={sectionLabelId ? undefined : "Form"}
      data-form-embed-variant={resolvedVariant}
      data-form-embed-spacing={layout.spacing}
    >
      <div
        className={joinClasses(
          "flex w-full flex-col",
          containerWidthClass,
          alignClassMap[layout.alignment],
          fontFamilyClass
        )}
        data-form-embed-width={layout.width}
      >
        <div
          className={cardWrapperClassName}
          style={surfaceStyle}
          data-form-embed-radius={style.radius}
          data-form-embed-input-size={style.inputSize}
        >
          <div className="space-y-2">
            <HeadingTag id={sectionLabelId} className={titleClassName} style={titleStyle}>
              {title}
            </HeadingTag>
            {showDescription ? (
              <p className="text-sm" style={descriptionStyle}>
                {description}
              </p>
            ) : null}
          </div>
          {isInternalOnlyForm ? (
            <div
              className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text)]/70"
              data-form-embed-runtime-boundary="internal"
            >
              This form is not accepting public submissions right now.
            </div>
          ) : resolved?.error ? (
            <div
              className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text)]/70"
              data-form-embed-runtime-boundary="error"
            >
              {resolveFormEmbedRuntimeErrorMessage(resolved.error)}
            </div>
          ) : fields.length === 0 ? (
            <div
              className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text)]/70"
              data-form-embed-runtime-boundary={runtimeDataMissing ? "missing" : "empty"}
            >
              {runtimeDataMissing
                ? "Form fields load in runtime preview."
                : "No fields configured yet."}
            </div>
          ) : canRenderInteractiveForm ? (
            <form
              className="space-y-4"
              method="post"
              action={formAction}
              data-form-id={normalizedData.formId}
              data-nextless-form-runtime="1"
              data-form-layout-mode={runtimeLayoutMode}
              data-form-save-progress={saveProgressEnabled ? "1" : "0"}
              data-form-success-message={normalizedData.successMessage ?? ""}
              data-form-success-behavior={submitBehavior.successBehavior}
              data-form-loading-label={submitBehavior.loadingLabel}
              data-form-submit-label={submitLabel}
              data-form-progress-ttl-days={String(navigation.savedProgressTtlDays)}
              data-form-captcha-site-key={resolved?.botProtection?.siteKey ?? ""}
              data-form-captcha-action={resolved?.botProtection?.action ?? ""}
              data-form-root="true"
            >
              {resolved?.submissionNonce ? (
                <input
                  type="hidden"
                  name="__nl_form_nonce"
                  value={resolved.submissionNonce}
                  data-form-security-nonce="1"
                />
              ) : null}
              {showProgress ? (
                <div className="space-y-2" data-form-progress-root="true">
                  <p
                    className="text-xs font-medium text-[var(--color-text)]/70"
                    data-form-progress-text="true"
                  >
                    Step 1 of {stepGroups.length}
                  </p>
                  <div className="h-1.5 rounded-full bg-[var(--color-border)]/40">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)]"
                      data-form-progress-bar="true"
                      style={{ width: `${Math.round(100 / stepGroups.length)}%` }}
                    />
                  </div>
                </div>
              ) : null}
              <div data-form-embed-form-body="true" className="space-y-4">
                {runtimeLayoutMode === "multi_step" ? (
                  <div className="space-y-4">
                    {stepGroups.map((group, index) => (
                      <div
                        key={`step-${group.step}`}
                        data-nextless-form-step="1"
                        data-step-index={group.step}
                        className={joinClasses("space-y-4", index === 0 ? undefined : "hidden")}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]/60">
                          {runtimeStepTitles[group.step - 1]?.trim() || `Step ${group.step}`}
                        </p>
                        <div className={fieldsGridClassName}>
                          {group.fields.map((field) => (
                            <div
                              key={field.id}
                              className={resolveFieldGridSpanClass(field)}
                              data-form-field={field.name}
                              data-logic-operator={field.settings?.logic?.operator}
                              data-logic-field={field.settings?.logic?.field}
                              data-logic-value={field.settings?.logic?.value}
                            >
                              {renderFieldControl(field, {
                                ids: fieldDomIds.get(field)!,
                                showLabels: fieldsConfig.showLabels,
                                showRequiredIndicator: fieldsConfig.showRequiredIndicator,
                                inputClassName,
                                borderClassName,
                                radiusClassName: inputRadiusClassName,
                                borderColor: resolvedBorderColor,
                                labelColor,
                                helperColor,
                                inputStyle: themeInputStyle,
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={fieldsGridClassName}>
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className={resolveFieldGridSpanClass(field)}
                        data-form-field={field.name}
                        data-logic-operator={field.settings?.logic?.operator}
                        data-logic-field={field.settings?.logic?.field}
                        data-logic-value={field.settings?.logic?.value}
                      >
                        {renderFieldControl(field, {
                          ids: fieldDomIds.get(field)!,
                          showLabels: fieldsConfig.showLabels,
                          showRequiredIndicator: fieldsConfig.showRequiredIndicator,
                          inputClassName,
                          borderClassName,
                          radiusClassName: inputRadiusClassName,
                          borderColor: resolvedBorderColor,
                          labelColor,
                          helperColor,
                          inputStyle: themeInputStyle,
                        })}
                      </div>
                    ))}
                  </div>
                )}
                {submitSupportingText ? (
                  <p
                    className="text-xs"
                    style={{ color: helperColor }}
                    data-form-submit-supporting-text="true"
                  >
                    {submitSupportingText}
                  </p>
                ) : null}
                <div className={joinClasses("flex", buttonAlignClassMap[layout.buttonAlignment])}>
                  {hasMultipleSteps ? (
                    <button
                      type="button"
                      data-form-nav="back"
                      hidden
                      className={joinClasses(
                        "border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)]",
                        submitRadiusClassName
                      )}
                    >
                      {navigation.backLabel}
                    </button>
                  ) : null}
                  {hasMultipleSteps ? (
                    <button
                      type="button"
                      data-form-nav="next"
                      className={joinClasses(
                        "px-5 py-2 text-sm font-semibold",
                        submitRadiusClassName,
                        submitFullWidthClass
                      )}
                      style={submitButtonStyle}
                    >
                      {navigation.nextLabel}
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    data-form-submit="1"
                    hidden={hasMultipleSteps}
                    className={joinClasses(
                      "px-5 py-2 text-sm font-semibold",
                      submitRadiusClassName,
                      submitFullWidthClass
                    )}
                    style={submitButtonStyle}
                  >
                    {submitLabel}
                  </button>
                </div>
              </div>
              {resolved?.botProtection?.siteKey ? (
                <input type="hidden" name="captchaToken" value="" data-form-security-captcha="1" />
              ) : null}
              <p
                className="hidden text-xs text-[var(--color-text)]/65"
                data-form-embed-success="true"
                role="alert"
                aria-live="polite"
              >
                {showSuccessMessage ? normalizedData.successMessage : ""}
              </p>
              <p
                className="hidden text-xs text-rose-600"
                data-form-embed-error="true"
                role="alert"
                aria-live="assertive"
              >
                Unable to submit the form. Please try again.
              </p>
            </form>
          ) : null}
          {canRenderInteractiveForm ? (
            <script dangerouslySetInnerHTML={{ __html: getFormRuntimeClientScript() }} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const formEmbedEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "form-embed.wizard.form-selection",
      title: "Form selection",
      role: "setup",
      writablePaths: ["formId"],
      readOnlyPaths: ["resolved.formName", "resolved.status", "resolved.submissionAccess"],
    },
    {
      mode: "wizard",
      id: "form-embed.wizard.setup-diagnostics",
      title: "Setup diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "formId",
        "resolved.fields",
        "resolved.settings.layoutMode",
        "resolved.settings.saveProgress",
        "resolved.error",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.form-status",
      title: "Form preview",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: [
        "formId",
        "resolved.formName",
        "resolved.status",
        "resolved.submissionAccess",
        "resolved.fields",
        "resolved.settings.layoutMode",
        "resolved.settings.saveProgress",
        "resolved.error",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.content",
      title: "Content",
      role: "content",
      writablePaths: ["title", "description", "submitLabel", "successMessage"],
    },
    {
      mode: "visual",
      id: "form-embed.visual.layout",
      title: "Layout",
      role: "layout",
      writablePaths: [
        "layout.alignment",
        "layout.width",
        "layout.spacing",
        "layout.buttonAlignment",
        "layout.sectionPaddingX",
        "layout.sectionPaddingY",
        "layout.fieldGap",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.field-labels",
      title: "Field labels",
      role: "content",
      writablePaths: ["fields.showLabels", "fields.showRequiredIndicator"],
    },
    {
      mode: "visual",
      id: "form-embed.visual.style",
      title: "Style",
      role: "visual",
      writablePaths: [
        "style.background",
        "style.surface",
        "style.borderColor",
        "style.borderWidth",
        "style.radius",
        "style.inputSize",
        "style.titleColor",
        "style.titleSize",
        "style.titleWeight",
        "style.labelColor",
        "style.helperColor",
        "style.submitBackground",
        "style.submitTextColor",
        "layout.headingLevel",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.navigation",
      title: "Multi-step navigation",
      role: "visual",
      writablePaths: [
        "navigation.backLabel",
        "navigation.nextLabel",
        "navigation.showProgress",
        "navigation.savedProgressTtlDays",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.submit-behavior",
      title: "Submit behavior",
      role: "visual",
      writablePaths: ["submitBehavior.loadingLabel", "submitBehavior.successBehavior"],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.runtime-diagnostics",
      title: "Runtime diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "formId",
        "resolved.fields",
        "resolved.settings.layoutMode",
        "resolved.settings.saveProgress",
        "resolved.error",
      ],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.submission-security",
      title: "Submission security",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "resolved.submissionAccess",
        "resolved.submissionNonce",
        "resolved.botProtection",
        "resolved.successRedirectUrl",
        "successMessage",
        "submitBehavior.successBehavior",
      ],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.authoring-summary",
      title: "Authoring summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["title", "layout", "fields", "style", "navigation", "submitBehavior"],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
    },
  ],
};

export function createFormEmbedWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<FormEmbedData>>;
  visual: ComponentType<WidgetEditorProps<FormEmbedData>>;
  advanced: ComponentType<WidgetEditorProps<FormEmbedData>>;
}): WidgetDefinition<FormEmbedData> {
  return {
    type: "form-embed",
    title: "Form Embed",
    description: "Embed a saved form with layout controls.",
    category: "forms",
    variants: [
      {
        id: "standard",
        label: "Standard",
        description: "Default form layout with configurable styling.",
      },
    ],
    schema: formEmbedSchema,
    defaults: formEmbedDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    editorContract: formEmbedEditorContract,
    render: FormEmbedBlock,
  };
}
