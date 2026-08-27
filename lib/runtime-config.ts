import "server-only";

import { assertProductionRuntimeConfig } from "./runtime-config.shared.mjs";

/**
 * Diagnostic surfaces expose raw analytics payloads and deployment metadata.
 * They are convenient locally, but production must opt in explicitly.
 */
export function diagnosticsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.REOPT_DATA_EXAMPLE_DIAGNOSTICS === "true"
  );
}

/**
 * Validate configuration when the production server starts, not while Next.js
 * builds the application. `instrumentation.register()` calls this function;
 * Next deliberately skips that hook during `next build`.
 */
export function validateRuntimeConfig(): void {
  if (process.env.NODE_ENV !== "production") return;
  assertProductionRuntimeConfig(process.env);
}
