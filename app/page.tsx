import { ArrowRight, Box, Radio, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { PRODUCTS } from "@/lib/shop/catalog";

const JOURNEY = [
  {
    icon: Radio,
    title: "See the browser journey",
    body: "Page views, cart intent, identity, consent, and Web Vitals stay attached to one visitor.",
  },
  {
    icon: ShieldCheck,
    title: "Trust the server boundary",
    body: "Orders use request-scoped identity and reject a forged browser handoff before conversion events are sent.",
  },
  {
    icon: Box,
    title: "Follow delayed work",
    body: "A local outbox preserves event identity for a worker after the original request has finished.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <section
        className="relative isolate min-h-[560px] overflow-hidden rounded-[calc(var(--opt-radius-lg)+0.5rem)] bg-[#182033] shadow-[var(--opt-shadow-lg)] sm:min-h-[620px]"
        data-testid="storefront-hero"
      >
        <Image
          src="/images/arc-supply-hero.webp"
          alt="A considered workspace with a cobalt keyboard, ivory lamp, walnut riser, and graphite desk mat"
          fill
          preload
          sizes="(max-width: 1280px) 100vw, 1216px"
          className="object-cover object-[68%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121725]/95 via-[#121725]/75 to-[#121725]/5" />
        <div className="relative flex min-h-[560px] max-w-2xl flex-col justify-end p-7 text-white sm:min-h-[620px] sm:justify-center sm:p-12 lg:p-16">
          <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
            Make room for better work.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
            Thoughtful tools for a calmer desk—built into a complete storefront
            that demonstrates the Reopt Data SDK in a journey worth measuring.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="store-button focus-ring">
              Shop the collection{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/guide"
              className="store-button store-button-secondary focus-ring"
            >
              Explore the SDK map
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="featured-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="featured-heading"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Desk essentials, considered.
            </h2>
            <p className="mt-2 max-w-xl text-text-secondary">
              A compact collection designed to work together without demanding
              attention.
            </p>
          </div>
          <Link
            href="/products"
            className="group focus-ring flex items-center gap-1.5 rounded text-sm font-medium text-accent"
          >
            View all products{" "}
            <ArrowRight
              className="size-4 transition group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section
        className="rounded-[calc(var(--opt-radius-lg)+0.5rem)] bg-[#20201f] px-6 py-10 text-white sm:px-10 sm:py-14"
        aria-labelledby="journey-heading"
      >
        <div className="max-w-2xl">
          <h2
            id="journey-heading"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Built as a real journey.
          </h2>
          <p className="mt-3 leading-7 text-white/65">
            The store remains useful when analytics is unavailable, while every
            SDK boundary stays inspectable when it is connected.
          </p>
        </div>
        <div className="mt-9 grid gap-px overflow-hidden rounded-[var(--opt-radius-lg)] bg-white/15 md:grid-cols-3">
          {JOURNEY.map(({ icon: Icon, title, body }) => (
            <article key={title} className="bg-[#20201f] p-6 sm:p-8">
              <Icon className="size-5 text-[#7ca0ff]" aria-hidden="true" />
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
