import { Card, CardContent, PageHeader } from "@reopt-ai/opt-ui";

import { AccountPanel } from "@/components/shop/account-panel";
import { currentSession, DEMO_ACCOUNTS } from "@/lib/auth";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await currentSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Account"
        description="Signing in calls identify(); signing out calls reset() and starts a new device."
      />

      <AccountPanel
        session={session}
        demoAccounts={DEMO_ACCOUNTS.map((account) => ({
          email: account.email,
          password: account.password,
        }))}
      />

      <Card>
        <CardContent className="flex flex-col gap-2 py-5 text-sm">
          <h2 className="font-medium">Why the server wins</h2>
          <p className="text-text-secondary">
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
