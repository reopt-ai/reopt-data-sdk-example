import { Badge } from "@reopt-ai/opt-ui";
import { ShoppingBag, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { currentSession } from "@/lib/auth";

const NAV = [
  { href: "/products", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/guide", label: "SDK map" },
];

export async function SiteHeader({
  cartCount,
  diagnostics,
}: {
  cartCount: number;
  diagnostics: boolean;
}) {
  const session = await currentSession();
  const navigation = diagnostics
    ? [
        ...NAV,
        { href: "/lab", label: "Lab" },
        { href: "/debug/errors", label: "Errors" },
      ]
    : NAV;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-xl">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="focus-ring flex min-w-0 items-center gap-2.5 rounded"
          aria-label="Arc Supply home"
        >
          <span className="grid size-9 place-items-center rounded-[var(--opt-radius-sm)] bg-[#20201f] p-1 shadow-sm">
            <Image
              src="/brand/arc-supply-mark.png"
              width={32}
              height={32}
              alt=""
              className="size-7"
            />
          </span>
          <span className="truncate text-base font-semibold tracking-tight sm:text-lg">
            Arc Supply
          </span>
        </Link>
        <span className="hidden rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary xl:inline-flex">
          reopt SDK reference
        </span>
        <nav
          className="ml-5 hidden items-center gap-5 text-sm md:flex"
          aria-label="Primary"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded py-2 text-text-secondary hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm sm:gap-3">
          <Link
            href="/cart"
            className="focus-ring flex items-center gap-1.5 rounded-full border border-border px-2.5 py-2 hover:border-border-hover hover:text-accent sm:px-3"
            data-testid="cart-link"
            aria-label={`Cart with ${cartCount} items`}
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            <Badge variant={cartCount > 0 ? "info" : "default"}>
              {cartCount}
            </Badge>
          </Link>
          <Link
            href="/account"
            className="focus-ring flex items-center gap-1.5 rounded-full px-2.5 py-2 text-text-secondary hover:bg-bg-subtle hover:text-accent"
            data-testid="account-link"
          >
            <UserRound className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {session ? session.name : "Sign in"}
            </span>
          </Link>
        </div>
      </div>
      <nav
        className="flex scrollbar-none gap-5 overflow-x-auto border-t border-border-subtle px-4 py-2.5 text-sm md:hidden"
        aria-label="Primary mobile"
      >
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="focus-ring shrink-0 rounded text-text-secondary hover:text-accent"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
