"use client";

import { OptThemeProvider, ToastProvider } from "@reopt-ai/opt-ui";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <OptThemeProvider
      defaultPreset="default"
      defaultMode="light"
      lockedPreset="default"
      allowedModes={["light"]}
    >
      <ToastProvider>{children}</ToastProvider>
    </OptThemeProvider>
  );
}
