import { useLayoutEffect } from "react";
import { useRef, useMemo } from "react";

// Polyfill for useEffectEvent which isn't stable in React yet
export function useEffectEvent(callback) {
  const ref = useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });

  useLayoutEffect(() => {
    ref.current = callback;
  });

  return useMemo(
    () =>
      (...args) =>
        ref.current(...args),
    []
  );
}
