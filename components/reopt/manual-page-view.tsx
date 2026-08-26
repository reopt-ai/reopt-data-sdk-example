"use client";

import { usePageView, useReopt } from "@reopt-ai/data-sdk-client/next";
import { useEffect, useRef } from "react";

import { normalizePath } from "@/lib/reopt/normalize-path";

/**
 * A page view sent by the page itself, for routes that know something the
 * router does not.
 *
 * Two details the SDK's docs are explicit about, both visible here:
 *
 * - `normalizePath` is **not** applied to a `path` passed in explicitly, so the
 *   same function has to run here. Two rules would give one visit two names.
 * - `register()` attaches properties to every *later* event too, the automatic
 *   ones included — which is how `$web_vitals` and `$pageleave` on this route
 *   get a `product_id` they would otherwise never carry.
 */
export function ManualPageView({
  enabled,
  properties,
}: {
  /** Off when `<ReoptPageView />` is mounted, or this page would count twice. */
  enabled: boolean;
  properties: Record<string, unknown>;
}) {
  const pageView = usePageView();
  const { register } = useReopt();
  const sent = useRef<string | null>(null);

  useEffect(() => {
    register(properties);
  }, [register, properties]);

  useEffect(() => {
    if (!enabled) return;
    const { path, properties: lifted } = normalizePath(
      window.location.pathname,
    );
    if (sent.current === path) return;
    sent.current = path;
    pageView({ path, properties: { ...lifted, ...properties } });
  }, [enabled, pageView, properties]);

  return null;
}
