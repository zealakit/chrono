"use client";

import { type ElementType, type ReactNode, forwardRef } from "react";
import { Slot } from "./slot.js";

type PartElementProps = {
  as: ElementType;
  asChild?: boolean;
  children?: ReactNode;
  [key: string]: unknown;
};

/** Renders the default element, or the consumer's own element with `asChild`. */
export const Part = forwardRef<HTMLElement, PartElementProps>(function Part(
  { as, asChild, children, ...props },
  ref,
) {
  const Component = (asChild ? Slot : as) as ElementType;
  return (
    <Component ref={ref} {...props}>
      {children}
    </Component>
  );
});
