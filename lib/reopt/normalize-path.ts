/**
 * Collapses the ids out of a pathname and lifts them into properties.
 *
 * `/products/aster-65` is fine on its own, but a catalogue of ten thousand
 * items would make `path` a dimension with ten thousand values — useless for a
 * breakdown and expensive to store. The slug is more useful as a property.
 *
 * The SDK applies this wherever it fills in a path itself ($pageview,
 * $pageleave, $web_vitals, $exception) and **not** to a `path` passed to
 * `pageView()` explicitly — so the manual page-view demo runs it by hand, and
 * both routes agree on what a product page is called.
 *
 * Must stay synchronous and pure.
 */
export function normalizePath(pathname: string): {
  path: string;
  properties?: Record<string, unknown>;
} {
  const product = /^\/products\/([^/]+)$/.exec(pathname);
  if (product)
    return {
      path: "/products/:slug",
      properties: { product_slug: product[1] },
    };

  const order = /^\/orders\/([^/]+)$/.exec(pathname);
  if (order) return { path: "/orders/:id", properties: { order_id: order[1] } };

  return { path: pathname };
}
