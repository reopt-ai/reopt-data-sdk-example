import { Badge, Card, CardContent, Separator } from "@reopt-ai/opt-ui";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ManualPageView } from "@/components/reopt/manual-page-view";
import { AddToCartButton } from "@/components/shop/add-to-cart";
import { FLAGS_COOKIE, parseFlags } from "@/lib/reopt/flags";
import { findProduct, formatWon } from "@/lib/shop/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: findProduct(slug)?.name ?? "Product" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = findProduct(slug);
  if (!product) notFound();

  const flags = parseFlags((await cookies()).get(FLAGS_COOKIE)?.value);

  return (
    <article className="flex flex-col gap-8">
      {/* With the automatic page view off, this route sends its own — with the
          product context the router could not have known. `register()` runs
          either way, so $pageleave and $web_vitals carry it too. */}
      <ManualPageView
        enabled={!flags.autoPageview}
        properties={{
          product_id: product.id,
          category: product.category,
          page_id: `product:${product.slug}`,
        }}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <div
          className="h-72 w-full rounded"
          style={{
            background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
          }}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-4">
          <Badge variant="info">{product.category}</Badge>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-text-secondary">{product.description}</p>
          <p className="text-xl">{formatWon(product.price)}</p>
          <p className="text-sm text-text-secondary">
            {product.stock} in stock
          </p>
          <AddToCartButton product={product} />
        </div>
      </div>

      <Separator />

      <Card>
        <CardContent className="flex flex-col gap-2 py-5 text-sm">
          <h2 className="font-medium">What this page sends</h2>
          <ul className="list-disc pl-5 text-text-secondary">
            <li>
              <code>$pageview</code> — <code>normalizePath</code> folds the URL
              into <code>/products/:slug</code> and preserves the removed value
              as <code>product_slug</code>.
            </li>
            <li>
              <code>register()</code> — <code>product_id</code>,{" "}
              <code>page_id</code> is attached to every subsequent event.
            </li>
            <li>
              <code>cart.added</code> — emitted by the button. The Server Action
              changes the cart without duplicating the browser event.
            </li>
          </ul>
          <p className="text-text-secondary">
            Current page-view mode:{" "}
            <strong>
              {flags.autoPageview
                ? "automatic (<ReoptPageView />)"
                : "manual (pageView())"}
            </strong>
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
