import "server-only";

import { resolveSdkPackages, type SdkPackageMode } from "./sdk-resolution";

export type { SdkPackageMode };

/**
 * Which copy of the SDK this process is running: the published package, or the
 * one in a local reopt-data checkout.
 *
 * Shown in diagnostics because local and published builds have different
 * release fidelity and should never be confused during verification.
 */
let cached: SdkPackageMode[] | null = null;

export function sdkModeSummary(): SdkPackageMode[] {
  cached ??= resolveSdkPackages();
  return cached;
}
