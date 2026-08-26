"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a browser-only value (a cookie, `localStorage`, the SDK's device id)
 * without a `setState` in an effect.
 *
 * `useSyncExternalStore` is the right tool for exactly this: the value lives
 * outside React, the server has no answer for it, and the alternative — read it
 * in an effect and store it in state — schedules a second render on every mount
 * and reads as if React owned the value.
 *
 * `read` must be stable across renders (a module-level function, or one from
 * `useCallback`) and must return a value that is `Object.is`-stable while
 * nothing changed: strings and numbers are, freshly built objects are not.
 */
export function useClientSnapshot<T>(
  read: () => T,
  serverValue: T,
  pollMs = 0,
): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (pollMs <= 0) return () => undefined;
      // Cookies and `document.cookie` have no change event; polling is the only
      // way to notice the proxy deleting one on the next request.
      const id = window.setInterval(onChange, pollMs);
      return () => window.clearInterval(id);
    },
    [pollMs],
  );

  return useSyncExternalStore(subscribe, read, () => serverValue);
}
