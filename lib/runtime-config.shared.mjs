const MIN_SECRET_LENGTH = 32;

/**
 * Validate the environment needed by a production process.
 *
 * Kept free of Next.js imports so the package start command can fail before it
 * launches the HTTP server. `lib/runtime-config.ts` wraps the same function in
 * a `server-only` boundary for Next.js instrumentation.
 */
export function assertProductionRuntimeConfig(environment) {
  const errors = [];
  const authSecret = environment.BETTER_AUTH_SECRET;
  const authUrl = environment.BETTER_AUTH_URL;
  const reoptUrl = environment.REOPT_DATA_BASE_URL ?? "https://data.reopt.ai";
  const clientId = environment.REOPT_DATA_CLIENT_ID;
  const clientSecret = environment.REOPT_DATA_CLIENT_SECRET;

  if (!authSecret) {
    errors.push("BETTER_AUTH_SECRET is required");
  } else if (authSecret.length < MIN_SECRET_LENGTH) {
    errors.push(
      `BETTER_AUTH_SECRET must contain at least ${MIN_SECRET_LENGTH} characters`,
    );
  }

  if (!authUrl) {
    errors.push("BETTER_AUTH_URL is required");
  } else {
    try {
      const url = new URL(authUrl);
      const local = isLoopback(url.hostname);
      if (url.username || url.password) {
        errors.push("BETTER_AUTH_URL must not contain credentials");
      }
      if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
        errors.push("BETTER_AUTH_URL must use HTTPS outside localhost");
      }
    } catch {
      errors.push("BETTER_AUTH_URL must be an absolute URL");
    }
  }

  validateServiceUrl(reoptUrl, "REOPT_DATA_BASE_URL", errors);

  if (Boolean(clientId) !== Boolean(clientSecret)) {
    errors.push(
      "REOPT_DATA_CLIENT_ID and REOPT_DATA_CLIENT_SECRET must be configured together",
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `[runtime-config] Unsafe production configuration:\n- ${errors.join("\n- ")}`,
    );
  }
}

function validateServiceUrl(value, name, errors) {
  try {
    const url = new URL(value);
    const local = isLoopback(url.hostname);
    if (url.username || url.password) {
      errors.push(`${name} must not contain credentials`);
    }
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
      errors.push(`${name} must use HTTPS outside localhost`);
    }
  } catch {
    errors.push(`${name} must be an absolute URL`);
  }
}

function isLoopback(hostname) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}
