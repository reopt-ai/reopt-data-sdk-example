import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatWon, type Product } from "@/lib/shop/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article
      className="group overflow-hidden rounded-[var(--opt-radius-lg)] border border-border bg-surface-raised shadow-[var(--opt-shadow-sm)] transition duration-300 hover:-translate-y-1 hover:border-border-hover hover:shadow-[var(--opt-shadow-md)]"
      data-testid={`product-${product.slug}`}
    >
      <Link href={`/products/${product.slug}`} className="focus-ring block">
        <div className="relative aspect-square overflow-hidden bg-bg-subtle">
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
          />
          {product.badge && (
            <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
              {product.badge}
            </span>
          )}
        </div>
        <div className="flex min-h-32 flex-col gap-2 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">
              {product.name}
            </h3>
            <ArrowUpRight
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-text-tertiary transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
            />
          </div>
          <p className="text-sm text-text-secondary">{product.blurb}</p>
          <p className="mt-auto pt-2 font-medium">{formatWon(product.price)}</p>
        </div>
      </Link>
    </article>
  );
}
