import type {
  GridColumnsAlign,
  GridColumnsBorderWidth,
  GridColumnsGap,
  GridColumnsMinHeight,
  GridColumnsPadding,
  GridColumnsRadius,
  GridColumnsSelfAlign,
  GridColumnsSpan,
} from "./gridColumnsContract";

export const joinGridColumnsClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

export const gridColumnsSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "col-span-1",
  "2": "col-span-2",
  "3": "col-span-3",
  "4": "col-span-4",
  "5": "col-span-5",
  "6": "col-span-6",
  "7": "col-span-7",
  "8": "col-span-8",
  "9": "col-span-9",
  "10": "col-span-10",
  "11": "col-span-11",
  "12": "col-span-12",
};

export const gridColumnsTabletSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "md:col-span-1",
  "2": "md:col-span-2",
  "3": "md:col-span-3",
  "4": "md:col-span-4",
  "5": "md:col-span-5",
  "6": "md:col-span-6",
  "7": "md:col-span-7",
  "8": "md:col-span-8",
  "9": "md:col-span-9",
  "10": "md:col-span-10",
  "11": "md:col-span-11",
  "12": "md:col-span-12",
};

export const gridColumnsDesktopSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "lg:col-span-1",
  "2": "lg:col-span-2",
  "3": "lg:col-span-3",
  "4": "lg:col-span-4",
  "5": "lg:col-span-5",
  "6": "lg:col-span-6",
  "7": "lg:col-span-7",
  "8": "lg:col-span-8",
  "9": "lg:col-span-9",
  "10": "lg:col-span-10",
  "11": "lg:col-span-11",
  "12": "lg:col-span-12",
};

export const gridColumnsXlSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "xl:col-span-1",
  "2": "xl:col-span-2",
  "3": "xl:col-span-3",
  "4": "xl:col-span-4",
  "5": "xl:col-span-5",
  "6": "xl:col-span-6",
  "7": "xl:col-span-7",
  "8": "xl:col-span-8",
  "9": "xl:col-span-9",
  "10": "xl:col-span-10",
  "11": "xl:col-span-11",
  "12": "xl:col-span-12",
};

export const gridColumnsTwoXlSpanClassMap: Record<GridColumnsSpan, string> = {
  "1": "2xl:col-span-1",
  "2": "2xl:col-span-2",
  "3": "2xl:col-span-3",
  "4": "2xl:col-span-4",
  "5": "2xl:col-span-5",
  "6": "2xl:col-span-6",
  "7": "2xl:col-span-7",
  "8": "2xl:col-span-8",
  "9": "2xl:col-span-9",
  "10": "2xl:col-span-10",
  "11": "2xl:col-span-11",
  "12": "2xl:col-span-12",
};

export const gridColumnsGapXClassMap: Record<GridColumnsGap, string> = {
  none: "gap-x-0",
  "1": "gap-x-1",
  "2": "gap-x-2",
  "3": "gap-x-3",
  "4": "gap-x-4",
  "5": "gap-x-5",
  "6": "gap-x-6",
  "7": "gap-x-7",
  "8": "gap-x-8",
  "10": "gap-x-10",
  "12": "gap-x-12",
};

export const gridColumnsGapYClassMap: Record<GridColumnsGap, string> = {
  none: "gap-y-0",
  "1": "gap-y-1",
  "2": "gap-y-2",
  "3": "gap-y-3",
  "4": "gap-y-4",
  "5": "gap-y-5",
  "6": "gap-y-6",
  "7": "gap-y-7",
  "8": "gap-y-8",
  "10": "gap-y-10",
  "12": "gap-y-12",
};

export const gridColumnsAlignClassMap: Record<GridColumnsAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export const gridColumnsMobileReverseOrderClassMap: Record<number, string> = {
  1: "order-1 md:order-none",
  2: "order-2 md:order-none",
  3: "order-3 md:order-none",
  4: "order-4 md:order-none",
  5: "order-5 md:order-none",
  6: "order-6 md:order-none",
};

export const gridColumnsBorderWidthValueMap: Record<GridColumnsBorderWidth, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
};

export const gridColumnsRadiusClassMap: Record<GridColumnsRadius, string> = {
  none: "",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

export const gridColumnsPaddingClassMap: Record<GridColumnsPadding, string> = {
  none: "p-0",
  "2": "p-2",
  "3": "p-3",
  "4": "p-4",
  "5": "p-5",
  "6": "p-6",
};

export const gridColumnsMinHeightClassMap: Record<GridColumnsMinHeight, string> = {
  none: "min-h-0",
  sm: "min-h-[4rem]",
  md: "min-h-[6rem]",
  lg: "min-h-[8rem]",
  xl: "min-h-[10rem]",
};

export const gridColumnsTabletMinHeightClassMap: Record<GridColumnsMinHeight, string> = {
  none: "md:min-h-0",
  sm: "md:min-h-[4rem]",
  md: "md:min-h-[6rem]",
  lg: "md:min-h-[8rem]",
  xl: "md:min-h-[10rem]",
};

export const gridColumnsSelfAlignClassMap: Record<
  Exclude<GridColumnsSelfAlign, "inherit">,
  string
> = {
  start: "self-start",
  center: "self-center",
  end: "self-end",
  stretch: "self-stretch",
};
