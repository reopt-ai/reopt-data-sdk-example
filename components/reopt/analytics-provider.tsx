"use client";

import {
  ReoptPageView,
  ReoptProvider,
  ReoptWebVitals,
  type ReoptBootstrap,
  type ReoptClientConfig,
} from "@reopt-ai/data-sdk-client/next";
import type { ConsentCategory } from "@reopt-ai/data-sdk-client";
import type { ReactNode } from "react";

import type { Flags } from "@/lib/reopt/flags";
import { normalizePath } from "@/lib/reopt/normalize-path";
import { devtools } from "@/lib/reopt/devtools";

/**
 * The client boundary for analytics.
 *
 * `<ReoptProvider>` can be rendered straight from `app/layout.tsx` when every
 * option is a plain value — but `normalizePath` and `fetch` are functions, and
 * a function cannot cross the RSC boundary as a prop. So the server resolves
 * the *data* (write key, flags, bootstrap) and this component adds the
 * *behaviour*. Any app with a `normalizePath` needs a component in this shape.
 */
const CONSENT_CATEGORIES: ConsentCategory[] = ["analytics", "marketing"];

export interface AnalyticsConfig {
  /** `null` when no project owns this request — the SDK then does nothing. */
  writeKey: string | null;
  baseUrl: string;
  flags: Flags;
  /**
   * The visitor's recorded decision, read on the server. Only used in the
   * external-banner mode, where the SDK keeps no memory of its own.
   */
  consentDefault: boolean;
}

export function AnalyticsProvider({
  config,
  bootstrap,
  children,
}: {
  config: AnalyticsConfig;
  bootstrap: ReoptBootstrap | null;
  children: ReactNode;
}) {
  const clientConfig: ReoptClientConfig = {
    // A missing write key is a supported state, not a crash: the SDK warns once
    // and every call becomes a no-op. The shop must not care.
    writeKey: config.writeKey ?? "",
    baseUrl: config.baseUrl,
    normalizePath,
    // The devtools recorder: the SDK sends through it and the panel reads it.
    fetch: devtools.fetch,
    debug: config.flags.debug,
    capture: {
      // `<ReoptPageView />` owns page views when it is mounted. With the toggle
      // off, nothing sends one automatically and the pages do it themselves.
      exceptions: config.flags.exceptions,
    },
    ...(config.flags.tracingHeaders ? { tracingHeaders: true } : {}),
    ...(config.flags.externalConsent
      ? // The banner owns the decision; the SDK keeps no cookie of its own that
        // could disagree with it. An undecided visitor is still allowed.
        {
          consent: {
            persist: false,
            categories: CONSENT_CATEGORIES,
            // Applied at creation, before anything can be queued or any id
            // minted. Without it a refusal would not survive a reload.
            defaultConsent: config.consentDefault,
          },
        }
      : {}),
    // Global properties from the very first event — web vitals can fire before
    // any effect of ours gets to call `register()`.
    properties: { shop_surface: "web" },
  };

  return (
    <ReoptProvider config={clientConfig} bootstrap={bootstrap}>
      {config.flags.autoPageview ? <ReoptPageView /> : null}
      <ReoptWebVitals />
      {children}
    </ReoptProvider>
  );
}
