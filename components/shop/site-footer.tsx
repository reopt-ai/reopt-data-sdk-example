import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/account", label: "Account" },
  { href: "/guide", label: "SDK map" },
];

export function SiteFooter({ diagnostics }: { diagnostics: boolean }) {
  const links = diagnostics
    ? [...FOOTER_LINKS, { href: "/lab", label: "Instrumentation lab" }]
    : FOOTER_LINKS;

  return (
    <footer className="border-t border-border bg-bg-subtle">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div className="max-w-xl">
          <p className="text-lg font-semibold tracking-tight">Arc Supply</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            A fictional workspace-goods store built as a production-shaped
            reference for the reopt Data SDK. Products and orders in this demo
            are not real purchases.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm"
        >
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-text-secondary hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border-subtle px-4 py-4 text-center text-xs text-text-tertiary">
        Arc Supply is an illustrative brand for this open-source example.
      </div>
    </footer>
  );
}
