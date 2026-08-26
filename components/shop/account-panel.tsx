"use client";

import { useReopt } from "@reopt-ai/data-sdk-client/next";
import { Button, Card, CardContent, Input, toast } from "@reopt-ai/opt-ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn, signOut } from "@/lib/auth-client";
import type { ShopSession } from "@/lib/auth";

/**
 * Sign-in and sign-out, and the two analytics calls that belong to them.
 *
 * `identify()` on sign-in, so events before and after it belong to one person.
 * `reset()` on sign-out, which mints a **new device id** — the next person at
 * a shared computer must not inherit this one's history.
 */
export function AccountPanel({
  session,
  demoAccounts,
}: {
  session: ShopSession | null;
  demoAccounts: { email: string; password: string }[];
}) {
  const { identify, reset, getDeviceId } = useReopt();
  const router = useRouter();
  const [email, setEmail] = useState(demoAccounts[0]?.email ?? "");
  const [password, setPassword] = useState(demoAccounts[0]?.password ?? "");
  const [busy, setBusy] = useState(false);

  if (session) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-5">
          <div className="flex-1">
            <p className="font-medium" data-testid="account-name">
              {session.name}
            </p>
            <p className="text-sm text-text-secondary">{session.email}</p>
            <p className="font-mono text-xs text-text-secondary">
              profile {session.userId}
            </p>
          </div>
          <Button
            variant="secondary"
            loading={busy}
            data-testid="sign-out"
            onClick={async () => {
              setBusy(true);
              await signOut();
              // A new device from here on. Anything queued for the old one is
              // dropped with it — that is the point of reset().
              reset();
              setBusy(false);
              toast.info(
                `Signed out. New device: ${getDeviceId()?.slice(0, 12) ?? "none"}…`,
              );
              router.refresh();
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            const { data, error } = await signIn.email({ email, password });
            setBusy(false);

            if (error || !data?.user) {
              toast.error(error?.message ?? "Sign-in failed");
              return;
            }

            identify({
              profileId: data.user.id,
              email: data.user.email,
              properties: { plan: "demo" },
            });
            router.refresh();
          }}
        >
          <Input
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            data-testid="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            data-testid="password"
          />
          <Button type="submit" loading={busy} data-testid="sign-in">
            Sign in
          </Button>
          <p className="text-xs text-text-secondary">
            Demo accounts:{" "}
            {demoAccounts.map((account) => account.email).join(", ")} /
            password: <code>{demoAccounts[0]?.password}</code>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
