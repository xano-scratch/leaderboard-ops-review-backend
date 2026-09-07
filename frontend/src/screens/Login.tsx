import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { api, setSession, ApiError, type LoginResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DEMO = [
  { email: "priya@studio.games", label: "Priya", role: "ops" },
  { email: "marco@studio.games", label: "Marco", role: "lead" },
  { email: "dana@studio.games", label: "Dana", role: "admin" },
];
export const DEMO_PASSWORD = "password123";

export function Login({ onLogin }: { onLogin: (r: LoginResponse) => void }) {
  const [email, setEmail] = useState("dana@studio.games");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e?: FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.login(creds ?? { email, password });
      setSession(r.token as string, r.operator);
      onLogin(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Sign in failed. Is the demo seeded?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Leaderboard Ops Review
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            The governed console for a game studio's leaderboard ops. Every sensitive action is routed by
            role, held for a second approver, and written to an audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Demo operators (password: {DEMO_PASSWORD})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map((d) => (
                <Button
                  key={d.email}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(DEMO_PASSWORD);
                    void submit(undefined, { email: d.email, password: DEMO_PASSWORD });
                  }}
                >
                  {d.label}
                  <span className="ml-1 text-[10px] uppercase text-muted-foreground">{d.role}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
