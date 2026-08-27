/**
 * Root layout — where the analytics session begins.
 *
 * The order here is the whole integration:
 *
 *   1. resolve the project for this request (host → write key, from a store)
 *   2. read what the server already knows about the visitor (`getBootstrap()`)
 *   3. hand both to the client boundary, which creates the browser client
 *
 * Step 2 is what makes the first render agree with the server about who this
 * is. It reads `cookies()`, so it must stay outside any `"use cache"` scope —
 * a cached bootstrap would hand every visitor the same device id.
 */

import "@/app/globals.css";

// The `/theme/server` subpath, not the root barrel: the root is a client
// module, and calling this from a server component fails at build time.
import { createThemeBootScript } from "@reopt-ai/opt-ui/theme/server";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Script from "next/script";

import { Providers } from "@/app/providers";
import { AnalyticsProvider } from "@/components/reopt/analytics-provider";
import { ConsentBanner } from "@/components/reopt/consent-banner";
import { DevtoolsDrawer } from "@/components/reopt/devtools-drawer";
import { DiagnosticAnalyticsProvider } from "@/components/reopt/diagnostic-analytics-provider";
import { SdkVersionFooter } from "@/components/reopt/sdk-version-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { SiteFooter } from "@/components/shop/site-footer";
import { cartCount } from "@/lib/shop/cart-session";
import { FLAGS_COOKIE, parseFlags } from "@/lib/reopt/flags";
import { sdkVersionSummary } from "@/lib/reopt/sdk-versions";
import { currentConsentDefault, getBootstrap } from "@/lib/reopt/server";
import { reoptBaseUrl, tenantForHost } from "@/lib/reopt/tenants";
import { diagnosticsEnabled } from "@/lib/runtime-config";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:4100"),
  title: {
    default: "Arc Supply — reopt Data SDK Example",
    template: "%s · Arc Supply",
  },
  description:
    "A production-shaped storefront demonstrating the reopt Data SDK across browser, server, proxy, and worker boundaries.",
  applicationName: "Arc Supply",
  openGraph: {
    type: "website",
    siteName: "Arc Supply",
    title: "reopt Data SDK Example",
    description:
      "Explore a production-shaped reference implementation for the reopt Data SDK.",
  },
  twitter: {
    card: "summary_large_image",
    title: "reopt Data SDK Example",
    description:
      "A production-shaped reference implementation for the reopt Data SDK.",
  },
};

const THEME_BOOT_SCRIPT = createThemeBootScript("default", "light", {
  lockedPreset: "default",
  allowedModes: ["light"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const flags = parseFlags(cookieStore.get(FLAGS_COOKIE)?.value);
  const tenant = tenantForHost(headerStore.get("host"));
  // Read unconditionally: whether this route is dynamic must not depend on a
  // toggle. The flag only decides whether the value is handed to the browser.
  const bootstrap = await getBootstrap();
  const consentDefault = await currentConsentDefault();
  const showDiagnostics = diagnosticsEnabled();
  const ReoptBoundary = showDiagnostics
    ? DiagnosticAnalyticsProvider
    : AnalyticsProvider;

  return (
    <html
      lang="en"
      data-theme="default"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
        <Providers>
          <ReoptBoundary
            config={{
              // Resolved per request, never from a public env var.
              writeKey: flags.noWriteKey ? null : (tenant?.writeKey ?? null),
              // First-party ingest: `proxy.ts` rewrites /ingest/* to reopt-data.
              baseUrl: "/ingest",
              flags,
              consentDefault,
            }}
            bootstrap={flags.noBootstrap ? null : bootstrap}
          >
            <div className="flex min-h-screen flex-col">
              <SiteHeader
                cartCount={await cartCount()}
                diagnostics={showDiagnostics}
              />
              <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
              >
                {children}
              </main>
              <SiteFooter diagnostics={showDiagnostics} />
              {showDiagnostics ? (
                <SdkVersionFooter
                  versions={sdkVersionSummary()}
                  tenant={tenant?.name ?? null}
                  writeKey={
                    flags.noWriteKey ? null : (tenant?.writeKey ?? null)
                  }
                  baseUrl={reoptBaseUrl()}
                />
              ) : null}
            </div>
            <ConsentBanner
              external={flags.externalConsent}
              diagnostics={showDiagnostics}
            />
            {showDiagnostics ? (
              <DevtoolsDrawer
                consoleOrigin={reoptBaseUrl()}
                projectId={tenant?.projectId ?? null}
              />
            ) : null}
          </ReoptBoundary>
        </Providers>
      </body>
    </html>
  );
}
