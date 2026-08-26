import { Card, CardContent } from "@reopt-ai/opt-ui";

import { AccountPanel } from "@/components/shop/account-panel";
import { currentSession, DEMO_ACCOUNTS } from "@/lib/auth";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await currentSession();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Account
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-text-secondary">
          Use a fictional shopper account to see a browser profile connect to a
          server-verified session.
        </p>
      </header>

      <AccountPanel
        session={session}
        demoAccounts={DEMO_ACCOUNTS.map((account) => ({
          email: account.email,
          password: account.password,
        }))}
      />

      <Card className="bg-bg-subtle">
        <CardContent className="grid gap-3 py-6 text-sm sm:grid-cols-[13rem_1fr]">
          <h2 className="text-lg font-semibold">Why the server wins</h2>
          <p className="leading-6 text-text-secondary">
            The browser announces a profile with <code>identify()</code>. The
            server verifies it from the session through <code>createReopt</code>
            's <code>getProfileId</code> resolver. Because a page can modify a
            cookie but cannot forge the server session, the server value takes
            precedence. The resolver runs once per request.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
