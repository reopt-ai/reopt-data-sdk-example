import { Card, CardContent } from "@reopt-ai/opt-ui";
import Link from "next/link";

import { formatWon, type Product } from "@/lib/shop/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="overflow-hidden" data-testid={`product-${product.slug}`}>
      <Link href={`/products/${product.slug}`}>
        <div
          className="h-40 w-full"
          style={{
            background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
          }}
          aria-hidden="true"
        />
        <CardContent className="flex flex-col gap-1 py-4">
          <span className="text-xs text-text-secondary">{product.blurb}</span>
          <span className="font-medium">{product.name}</span>
          <span className="text-sm">{formatWon(product.price)}</span>
        </CardContent>
      </Link>
    </Card>
  );
}
