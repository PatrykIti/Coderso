import type * as React from "react";

type TestElementProps = {
  children?: React.ReactNode;
  value?: unknown;
  disabled?: unknown;
  [key: string]: unknown;
};

declare module "react" {
  function isValidElement<P extends object = TestElementProps>(
    object: unknown
  ): object is React.ReactElement<P>;
}
