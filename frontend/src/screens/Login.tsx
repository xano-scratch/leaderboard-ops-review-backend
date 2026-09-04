import { useState } from "react";
import { ShieldCheck, LogIn } from "lucide-react";
import { api, setAuthToken, ApiError, type Me } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { roleStyle } from "@/lib/format";

const DEMO = [
  { email: "priya@studio.games", name: "Priya Rao", role: "ops" },
  { email: "marco@studio.games", name: "Marco Diaz", role: "lead" },
  { email: "dana@studio.games", name: "Dana Kim", role: "admin" },
];

export function Login({ onAuthed }: { onAuthed: (me: Me) => void }) {
  const [email, setEmail] = useState("dana@studio.games");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(nextEmail?: string) {
    const useEmail = nextEmail ?? email;
    setBusy(true);
    setError(null);
    try {
      // A fresh clone has no accounts yet; seed on demand, then sign in.
      await api.seed().catch(() => {});
      const res = await api.login({ email: useEmail, password });
      setAuthToken(res.authToken as string);
      const me = await api.me();
      onAuthed(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leaderboard Ops Review</h1>
          <p className="text-muted-foreground text-sm">Governed backend for game-studio ops</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Every sensitive action is role-routed, held for a second approver, and audited by the API
            layer. Your role decides what you can approve.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              <LogIn className="size-4" /> {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="border-border/60 border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs">
              Demo operators (password <code className="bg-muted rounded px-1 py-0.5">password123</code>)
            </p>
            <div className="grid gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEmail(d.email);
                    void submit(d.email);
                  }}
                  className="border-border/60 hover:bg-muted/60 flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground ml-2">{d.email}</span>
                  </span>
                  <Badge variant="outline" className={roleStyle(d.role)}>
                    {d.role}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
