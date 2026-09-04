/**
 * Every SDK capability this app exercises, and where to read the code.
 *
 * One list, two readers: the `/guide` page renders it, and the README links to
 * it. Adding a feature without adding a row here is the thing to notice in a
 * review.
 */
export interface FeatureRow {
  area: "browser" | "server" | "proxy" | "node" | "test";
  api: string;
  what: string;
  where: string;
}

export const FEATURE_MAP: FeatureRow[] = [
  {
    area: "browser",
    api: "<ReoptProvider config bootstrap>",
    what: "The server resolves the write key, flags, and bootstrap before crossing the client boundary",
    where: "app/layout.tsx · components/reopt/analytics-provider.tsx",
  },
  {
    area: "browser",
    api: "<ReoptPageView /> / pageView()",
    what: "Automatic page views, with a switch to exercise manual pageView() calls",
    where:
      "components/reopt/analytics-provider.tsx · components/reopt/manual-page-view.tsx",
  },
  {
    area: "browser",
    api: "<ReoptWebVitals />",
    what: "Forwards the Core Web Vitals reported by Next.js as $web_vitals",
    where:
      "components/reopt/analytics-provider.tsx · components/reopt/web-vitals-table.tsx",
  },
  {
    area: "browser",
    api: "normalizePath",
    what: "Folds /products/aster-65 into /products/:slug and preserves the slug as a property",
    where: "lib/reopt/normalize-path.ts",
  },
  {
    area: "browser",
    api: "init({ properties }) / register()",
    what: "Global properties from the first event, plus a page_id registered on product pages",
    where:
      "components/reopt/analytics-provider.tsx · components/reopt/manual-page-view.tsx",
  },
  {
    area: "browser",
    api: "track()",
    what: "Property-rich product.viewed · cart.* · checkout.* funnel events",
    where:
      "components/reopt/product-view-event.tsx · components/reopt/checkout-view-event.tsx · components/shop/add-to-cart.tsx · components/shop/cart-lines.tsx",
  },
  {
    area: "browser",
    api: "identify() / reset()",
    what: "Links a profile on sign-in and starts a new device on sign-out",
    where: "components/shop/account-panel.tsx",
  },
  {
    area: "browser",
    api: "getDeviceId()",
    what: "Passes the browser device id explicitly with a server-bound form",
    where: "components/shop/checkout-form.tsx",
  },
  {
    area: "browser",
    api: "capture.exceptions / captureException()",
    what: "Captures unhandled errors and manually reported exceptions",
    where: "components/reopt/instrumentation-lab.tsx",
  },
  {
    area: "browser",
    api: "captureException(error, { level, fingerprint })",
    what: "Reports a handled failure at its own severity and with its own grouping",
    where: "components/reopt/error-lab.tsx",
  },
  {
    area: "browser",
    api: "capture.exceptionSteps / addExceptionStep()",
    what: "Carries the last steps before a failure as $exception_steps",
    where: "components/reopt/error-lab.tsx",
  },
  {
    area: "browser",
    api: "consent.persist:false / setConsent()",
    what: "Lets an external consent banner own persistence and synchronize the SDK",
    where: "components/reopt/consent-banner.tsx · app/api/consent/route.ts",
  },
  {
    area: "browser",
    api: "config.fetch / config.observe",
    what: "Records sanitized lifecycle and shows profile and signed-session state in the diagnostic status bar",
    where:
      "lib/reopt/devtools.ts · components/reopt/diagnostic-analytics-provider.tsx · components/reopt/devtools-drawer.tsx",
  },
  {
    area: "browser",
    api: "flush() / pauseTracking() / resumeTracking()",
    what: "Exercises explicit queue flush, pause, and resume controls",
    where: "components/reopt/instrumentation-lab.tsx",
  },
  {
    area: "server",
    api: "createReopt({ writeKey, credentials, getProfileId })",
    what: "Creates request-scoped clients from one memoized factory per tenant",
    where: "lib/reopt/server.ts",
  },
  {
    area: "server",
    api: "getBootstrap()",
    what: "Gives the server and browser the same visitor identity on the first render",
    where: "app/layout.tsx",
  },
  {
    area: "server",
    api: "getReopt().track()",
    what: "Records completed orders through both a Server Action and a Route Handler",
    where: "app/actions.ts · app/api/orders/route.ts",
  },
  {
    area: "server",
    api: "createOnRequestError()",
    what: "Captures server failures as $exception events with Next.js routing context",
    where: "instrumentation.ts · app/api/boom/route.ts",
  },
  {
    area: "proxy",
    api: "reoptProxy({ writeKey: resolver, proxy: true })",
    what: "Seeds and removes device cookies and rewrites the first-party /ingest endpoint",
    where: "proxy.ts",
  },
  {
    area: "node",
    api: "createReoptNode() + identity.deviceId",
    what: "Forwards an outbox batch whose rows may belong to different visitors",
    where: "scripts/forward.ts · lib/shop/outbox.ts",
  },
  {
    area: "test",
    api: "window.__reoptDevtools",
    what: "Lets Playwright assert real SDK payloads without intercepting ingest traffic",
    where: "e2e/*.spec.ts",
  },
  {
    area: "test",
    api: "ingest requestId → Query API requestId",
    what: "Tags one lab event with a run id and proves browser → ingest → materialization → query",
    where: "e2e/roundtrip.spec.ts · lib/reopt/scenarios.ts",
  },
];
