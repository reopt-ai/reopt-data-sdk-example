import { Button, Card, CardContent, PageHeader } from "@reopt-ai/opt-ui";
import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { PRODUCTS } from "@/lib/shop/catalog";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="reopt shop"
        description="A reference storefront that exercises the Reopt Data SDK across browser, server, proxy, and worker boundaries."
        actions={
          <div className="flex gap-2">
            <Link href="/products">
              <Button>Browse products</Button>
            </Link>
            <Link href="/guide">
              <Button variant="secondary">SDK capability map</Button>
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "In the browser",
            body: "The layout mounts ReoptProvider, ReoptPageView, and ReoptWebVitals; interactions call track().",
          },
          {
            title: "On the server",
            body: "Server Actions and Route Handlers confirm orders with a request-scoped Reopt client.",
          },
          {
            title: "After the request",
            body: "An outbox records delayed conversions and a Node worker forwards identity per event.",
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardContent className="flex flex-col gap-2 py-5">
              <h2 className="font-medium">{card.title}</h2>
              <p className="text-sm text-text-secondary">{card.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Featured this week</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
