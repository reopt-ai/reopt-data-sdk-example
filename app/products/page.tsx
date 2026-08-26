import { Badge } from "@reopt-ai/opt-ui";
import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { CATEGORIES, PRODUCTS, type ProductCategory } from "@/lib/shop/catalog";

export const metadata = { title: "Products" };

/**
 * The category filter lives in the query string on purpose: `<ReoptPageView />`
 * counts pathname *and* query, so each filter change is its own page view with
 * `search` on the event.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = CATEGORIES.find((entry) => entry.id === category)?.id;
  const products = active
    ? PRODUCTS.filter((product) => product.category === active)
    : PRODUCTS;

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <header className="max-w-3xl py-2 sm:py-6">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
          Objects for focused work.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-text-secondary">
          Eight desk essentials, one calm visual language. Filter the collection
          without losing the measured journey.
        </p>
      </header>

      <nav
        className="flex scrollbar-none gap-2 overflow-x-auto pb-1"
        data-testid="category-filter"
        aria-label="Product categories"
      >
        <FilterLink label="All" href="/products" active={!active} />
        {CATEGORIES.map((entry) => (
          <FilterLink
            key={entry.id}
            label={entry.label}
            href={`/products?category=${entry.id}`}
            active={active === (entry.id as ProductCategory)}
          />
        ))}
      </nav>

      <p className="sr-only" aria-live="polite">
        {products.length} products shown
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <aside className="flex flex-col gap-3 rounded-[var(--opt-radius-lg)] border border-border bg-bg-subtle p-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="max-w-2xl leading-6 text-text-secondary">
          Category links use real query-string navigation, so the SDK records
          each filtered view with its search context.
        </p>
        <Link
          href="/guide"
          className="focus-ring shrink-0 rounded font-medium text-accent"
        >
          See the page-view pattern →
        </Link>
      </aside>
    </div>
  );
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="focus-ring shrink-0 rounded-full"
    >
      <Badge variant={active ? "info" : "default"} size="md">
        {label}
      </Badge>
    </Link>
  );
}
