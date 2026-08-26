import { Badge, Card, CardContent } from "@reopt-ai/opt-ui";
import { Check, ChevronRight, PackageCheck, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
}): Promise<Metadata> {
  const { slug } = await params;
  const product = findProduct(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      images: [
        {
          url: product.image,
          width: 1254,
          height: 1254,
          alt: product.imageAlt,
        },
      ],
    },
  };
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
    <article className="flex flex-col gap-12 sm:gap-16">
      <ManualPageView
        enabled={!flags.autoPageview}
        properties={{
          product_id: product.id,
          category: product.category,
          page_id: `product:${product.slug}`,
        }}
      />

      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-text-secondary"
      >
        <Link href="/products" className="focus-ring rounded hover:text-accent">
          Products
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:gap-14">
        <div className="relative aspect-square overflow-hidden rounded-[calc(var(--opt-radius-lg)+0.5rem)] bg-bg-subtle">
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            preload
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col lg:py-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{product.category}</Badge>
            {product.badge && <Badge>{product.badge}</Badge>}
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-lg text-text-secondary">{product.blurb}</p>
          <p className="mt-7 text-2xl font-semibold">
            {formatWon(product.price)}
          </p>
          <p className="mt-5 max-w-xl leading-7 text-text-secondary">
            {product.description}
          </p>

          <dl className="mt-8 divide-y divide-border-subtle border-y border-border-subtle text-sm">
            {product.details.map((detail) => (
              <div
                key={detail.label}
                className="grid grid-cols-[7rem_1fr] gap-4 py-3.5"
              >
                <dt className="text-text-tertiary">{detail.label}</dt>
                <dd className="font-medium">{detail.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <AddToCartButton
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                category: product.category,
                price: product.price,
              }}
            />
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Check className="size-4 text-success" aria-hidden="true" />
              {product.stock} ready to ship in this demo
            </span>
          </div>

          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex gap-3 rounded-[var(--opt-radius-md)] bg-bg-subtle p-4">
              <PackageCheck
                className="size-5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <p>
                <strong className="block font-medium">
                  Tracked fulfillment
                </strong>
                <span className="text-text-secondary">
                  Server-confirmed order boundary
                </span>
              </p>
            </div>
            <div className="flex gap-3 rounded-[var(--opt-radius-md)] bg-bg-subtle p-4">
              <RotateCcw
                className="size-5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <p>
                <strong className="block font-medium">
                  Fail-open storefront
                </strong>
                <span className="text-text-secondary">
                  Shopping works without analytics
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-accent/20 bg-accent-subtle">
        <CardContent className="grid gap-6 py-6 lg:grid-cols-[0.55fr_1.45fr] lg:p-8">
          <div>
            <h2 className="text-xl font-semibold">What this view measures</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              A compact, inspectable contract for the product-detail journey.
            </p>
          </div>
          <ul className="grid gap-3 text-sm text-text-secondary sm:grid-cols-3">
            <li>
              <code className="text-text">$pageview</code>
              <span className="mt-1 block leading-6">
                Normalizes the slug and preserves product context.
              </span>
            </li>
            <li>
              <code className="text-text">register()</code>
              <span className="mt-1 block leading-6">
                Carries product and page identity into later events.
              </span>
            </li>
            <li>
              <code className="text-text">cart.added</code>
              <span className="mt-1 block leading-6">
                Records the intent once, beside the browser action.
              </span>
            </li>
          </ul>
          <p className="text-xs text-text-tertiary lg:col-start-2">
            Page-view mode:{" "}
            {flags.autoPageview
              ? "automatic via ReoptPageView"
              : "manual via pageView()"}
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
