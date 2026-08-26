"use client";

import { OptThemeProvider, ToastProvider } from "@reopt-ai/opt-ui";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <OptThemeProvider defaultPreset="default">
      <ToastProvider>{children}</ToastProvider>
    </OptThemeProvider>
  );
}
