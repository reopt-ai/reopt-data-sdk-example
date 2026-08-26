import { Badge, PageHeader } from "@reopt-ai/opt-ui";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="Changing the category updates the query string and records another page view."
      />

      <nav className="flex flex-wrap gap-2" data-testid="category-filter">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
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
    <Link href={href}>
      <Badge variant={active ? "info" : "default"} size="md">
        {label}
      </Badge>
    </Link>
  );
}
