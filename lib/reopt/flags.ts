/**
 * The SDK options this demo can flip at runtime, and the cookie they live in.
 *
 * They are read on the **server**, in the root layout, and handed to the
 * provider as part of the config. That is not a detour: almost every option
 * here is read once, when the client is created, and `init()` is idempotent per
 * write key — so a toggle that only changed React state would be ignored until
 * the next full load. Putting them in a cookie makes the reload the honest
 * mechanism it has to be, and shows the config being resolved per request.
 *
 * Shared by client and server code: no imports, no side effects.
 */

export const FLAGS = {
  autoPageview: {
    label: "Automatic page views",
    detail:
      "Mounts <ReoptPageView />. When disabled, product pages call pageView() directly.",
    default: true,
  },
  exceptions: {
    label: "Exception capture",
    detail:
      "capture.exceptions reports uncaught errors and unhandled rejections as $exception events.",
    default: false,
  },
  exceptionSteps: {
    label: "Exception breadcrumbs",
    detail:
      "capture.exceptionSteps sends the last 20 steps before a failure as $exception_steps.",
    default: false,
  },
  externalConsent: {
    label: "External consent manager",
    detail:
      "Uses consent.persist:false; the banner owns persistence and synchronizes the SDK through setConsent().",
    default: false,
  },
  tracingHeaders: {
    label: "Tracing headers",
    detail:
      "Adds reopt-device-id to same-origin fetch/XHR and loads as a separate chunk.",
    default: false,
  },
  noBootstrap: {
    label: "No bootstrap",
    detail:
      "Omits getBootstrap() and relies only on the device cookie seeded by the proxy.",
    default: false,
  },
  noWriteKey: {
    label: "No write key (fail-open)",
    detail:
      "Disables analytics. The SDK logs a warning, becomes a no-op, and the storefront keeps working.",
    default: false,
  },
  debug: {
    label: "Debug logging",
    detail: "Writes internal SDK activity to the browser console.",
    default: false,
  },
} as const;

export type FlagName = keyof typeof FLAGS;
export type Flags = Record<FlagName, boolean>;

export const FLAG_NAMES = Object.keys(FLAGS) as FlagName[];

export const FLAGS_COOKIE = "shop_sdk_flags";

export function defaultFlags(): Flags {
  return Object.fromEntries(
    FLAG_NAMES.map((name) => [name, FLAGS[name].default]),
  ) as Flags;
}

/** Parses the cookie value: a comma-separated list of the flags that are on. */
export function parseFlags(value: string | undefined | null): Flags {
  if (value == null) return defaultFlags();
  const on = new Set(value.split(",").filter(Boolean));
  return Object.fromEntries(
    FLAG_NAMES.map((name) => [name, on.has(name)]),
  ) as Flags;
}

export function serializeFlags(flags: Flags): string {
  return FLAG_NAMES.filter((name) => flags[name]).join(",");
}
