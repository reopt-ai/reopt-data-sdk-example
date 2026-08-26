import { Badge, Separator } from "@reopt-ai/opt-ui";
import Link from "next/link";

import { currentSession } from "@/lib/auth";

const NAV = [
  { href: "/products", label: "Products" },
  { href: "/orders", label: "Orders" },
  { href: "/lab", label: "Instrumentation lab" },
  { href: "/guide", label: "SDK map" },
];

export async function SiteHeader({ cartCount }: { cartCount: number }) {
  const session = await currentSession();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          reopt<span className="text-text-secondary"> shop</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <Link
            href="/cart"
            className="hover:text-accent"
            data-testid="cart-link"
          >
            Cart{" "}
            <Badge variant={cartCount > 0 ? "info" : "default"}>
              {cartCount}
            </Badge>
          </Link>
          <Separator orientation="vertical" />
          <Link
            href="/account"
            className="hover:text-accent"
            data-testid="account-link"
          >
            {session ? session.name : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
