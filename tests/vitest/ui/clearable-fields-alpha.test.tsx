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
  isHexColorValue,
  isPickerRepresentableColorValue,
  resolveColorPickerValue,
  resolveColorSwatchValue,
} from "../../../core/admin/ui/widgets/editors/ClearableFields";

test("resolveColorPickerValue extracts the base color for hex8 / rgba, keeping fallback for tokens", () => {
  // 8-digit hex -> base #rrggbb (alpha owned by the slider).
  expect(resolveColorPickerValue("#0812209e", "#000000")).toBe("#081220");
  // Leading-dot rgba alpha -> base color extracted from the channels.
  expect(resolveColorPickerValue("rgba(8,17,31,.84)", "#000000")).toBe("#08111f");
  // Tokens are not picker-representable -> fallback.
  expect(resolveColorPickerValue("var(--color-brand)", "#ffffff")).toBe("#ffffff");
});

test("resolveColorSwatchValue delegates to resolveColorPickerValue with a default fallback", () => {
  expect(resolveColorSwatchValue("#0812209e")).toBe("#081220");
  expect(resolveColorSwatchValue("var(--color-brand)")).toBe("#000000");
});

test("isHexColorValue accepts alpha-capable 4/8-digit hex", () => {
  expect(isHexColorValue("#0812209e")).toBe(true);
  expect(isHexColorValue("#abcd")).toBe(true);
  expect(isHexColorValue("#112233")).toBe(true);
  expect(isHexColorValue("var(--color-x)")).toBe(false);
});

test("isPickerRepresentableColorValue is true for hex/rgb(a), false for tokens", () => {
  expect(isPickerRepresentableColorValue("rgba(8,17,31,.84)")).toBe(true);
  expect(isPickerRepresentableColorValue("#0812209e")).toBe(true);
  expect(isPickerRepresentableColorValue("var(--color-x)")).toBe(false);
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
  expect(onChange).not.toHaveBeenCalled();
});

test("applySharedColorAlphaChange recomposes the base color with the new alpha", () => {
  const onChange = vi.fn();
  applySharedColorAlphaChange({ currentValue: "#081220", alphaPct: 50, onChange });
  expect(onChange).toHaveBeenCalledWith("#08122080");
});
