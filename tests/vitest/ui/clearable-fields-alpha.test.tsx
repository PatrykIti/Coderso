// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} {...props} />
  ),
}));

import {
  applySharedColorAlphaChange,
  applySharedColorPickerChange,
  isPickerRepresentableColorValue,
  resolveColorPickerValue,
  resolveColorSwatchValue,
} from "../../../core/admin/ui/widgets/editors/ClearableFields";

test("resolveColorPickerValue extracts parser metadata for every literal kind", () => {
  // 8-digit hex -> base #rrggbb (alpha owned by the slider).
  expect(resolveColorPickerValue("#0812209e", "#000000")).toBe("#081220");
  // Leading-dot rgba alpha -> base color extracted from the channels.
  expect(resolveColorPickerValue("rgba(8,17,31,.84)", "#000000")).toBe("#08111f");
  expect(resolveColorPickerValue("hsla(210,50%,40%,.5)", "#000000")).toBe("#336699");
  // Tokens are not picker-representable -> fallback.
  expect(resolveColorPickerValue("var(--color-brand)", "#ffffff")).toBe("#ffffff");
});

test("resolveColorSwatchValue delegates to resolveColorPickerValue with a default fallback", () => {
  expect(resolveColorSwatchValue("#0812209e")).toBe("#081220");
  expect(resolveColorSwatchValue("var(--color-brand)")).toBe("#000000");
});

test("isPickerRepresentableColorValue is true for hex/rgb/hsl and false for nonliterals", () => {
  expect(isPickerRepresentableColorValue("rgba(8,17,31,.84)")).toBe(true);
  expect(isPickerRepresentableColorValue("hsla(210,50%,40%,.5)")).toBe(true);
  expect(isPickerRepresentableColorValue("#0812209e")).toBe(true);
  expect(isPickerRepresentableColorValue("var(--color-x)")).toBe(false);
  expect(isPickerRepresentableColorValue("transparent")).toBe(false);
});

test("applySharedColorPickerChange preserves the current alpha when the base color changes", () => {
  const onChange = vi.fn();
  applySharedColorPickerChange({ currentValue: "#0812209e", nextValue: "#112233", onChange });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("#1122339e");
});

test("applySharedColorPickerChange passes opaque values through unchanged", () => {
  const onChange = vi.fn();
  applySharedColorPickerChange({ currentValue: "#0d6efd", nextValue: "#112233", onChange });
  expect(onChange).toHaveBeenCalledWith("#112233");
  expect(onChange).toHaveBeenCalledTimes(1);
});

test("applySharedColorPickerChange preserves HSL alpha through parser metadata", () => {
  const onChange = vi.fn();
  applySharedColorPickerChange({
    currentValue: "hsla(210,50%,40%,.5)",
    nextValue: "#112233",
    onChange,
  });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("#11223380");
});

test("applySharedColorPickerChange short-circuits to onPickerChange when provided", () => {
  const onChange = vi.fn();
  const onPickerChange = vi.fn();
  applySharedColorPickerChange({
    currentValue: "#0812209e",
    nextValue: "#112233",
    onChange,
    onPickerChange,
  });
  expect(onPickerChange).toHaveBeenCalledWith("#112233");
  expect(onPickerChange).toHaveBeenCalledTimes(1);
  expect(onChange).not.toHaveBeenCalled();
});

test("applySharedColorAlphaChange recomposes the base color with the new alpha", () => {
  const onChange = vi.fn();
  applySharedColorAlphaChange({ currentValue: "#081220", alphaPct: 50, onChange });
  expect(onChange).toHaveBeenCalledWith("#08122080");
  expect(onChange).toHaveBeenCalledTimes(1);
});

test("applySharedColorAlphaChange recomposes an HSL base without changing its metadata source", () => {
  const onChange = vi.fn();
  applySharedColorAlphaChange({
    currentValue: "hsl(210,50%,40%)",
    alphaPct: 25,
    onChange,
  });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("#33669940");
});

test("picker and alpha helpers reject invalid composition without callbacks", () => {
  const onChange = vi.fn();
  const onPickerChange = vi.fn();

  for (const nextValue of ["bad", "#abcd", "#11223344"]) {
    applySharedColorPickerChange({
      currentValue: "#081220",
      nextValue,
      onChange,
      onPickerChange,
    });
  }
  for (const alphaPct of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
    applySharedColorAlphaChange({ currentValue: "#081220", alphaPct, onChange });
  }
  for (const currentValue of ["var(--color-brand)", "transparent", "unknown"]) {
    applySharedColorAlphaChange({ currentValue, alphaPct: 50, onChange });
  }

  expect(onPickerChange).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});
