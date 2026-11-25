import type { ForwardedRef, RefCallback } from "react";

/** Combine a forwarded ref with a local one. */
export function mergeRefs<T>(...refs: (ForwardedRef<T> | undefined)[]): RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(value);
      else if (ref) ref.current = value;
    }
  };
}
