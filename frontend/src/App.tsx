import { useEffect, useState } from "react";
import { ShieldCheck, LogOut, RotateCcw } from "lucide-react";
import { api, loadAuthToken, setAuthToken, type Me } from "@/lib/api";
import { Login } from "@/screens/Login";
import { Leaderboards } from "@/screens/Leaderboards";
import { RequestAction } from "@/screens/RequestAction";
import { ReviewQueue } from "@/screens/ReviewQueue";
import { AuditTrail } from "@/screens/AuditTrail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roleStyle } from "@/lib/format";

const DEMO_EMAILS: Record<string, string> = {
  priya: "priya@studio.games",
  marco: "marco@studio.games",
  dana: "dana@studio.games",
};
const TABS = ["queue", "boards", "request", "audit"];

function initialTab(): string {
  const h = typeof location !== "undefined" ? location.hash.replace("#", "").toLowerCase() : "";
  return TABS.includes(h) ? h : "queue";
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState(initialTab());
  const [refreshKey, setRefreshKey] = useState(0);
  const initialSelect =
    typeof location !== "undefined"
      ? new URLSearchParams(location.search).get("select") ?? undefined
      : undefined;

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(location.search);
      const as = (params.get("as") || "").toLowerCase();

      const token = loadAuthToken();
      if (token && !as) {
        try {
          setMe(await api.me());
          setBooting(false);
          return;
        } catch {
          setAuthToken(null);
        }
      }
      // Ensure the demo dataset exists (idempotent — a no-op once seeded).
      try {
        await api.seed();
      } catch {
        /* backend may be briefly unavailable; login/seed can be retried. */
      }
      // Optional one-click sign-in for demos and deep links (?as=dana).
      if (as && DEMO_EMAILS[as]) {
        try {
          const res = await api.login({ email: DEMO_EMAILS[as], password: "password123" });
          setAuthToken(res.authToken as string);
          setMe(await api.me());
        } catch {
          /* fall through to the login screen */
        }
      }
      setBooting(false);
    })();
  }, []);

  function logout() {
    setAuthToken(null);
    setMe(null);
  }
  async function resetDemo() {
    try {
      await api.seed(true); // force a fresh reset
    } finally {
      setRefreshKey((k) => k + 1);
    }
  }
  const bump = () => setRefreshKey((k) => k + 1);

  if (booting) {
    return (
      <div className="text-muted-foreground grid min-h-screen place-items-center">Loading…</div>
    );
  }
  if (!me) return <Login onAuthed={setMe} />;

  return (
    <div className="min-h-screen">
      <header className="border-border/60 bg-card/40 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight sm:text-base">
                Leaderboard Ops Review
              </h1>
              <p className="text-muted-foreground text-xs">Governed backend · one Xano API layer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{me.name as string}</div>
              <div className="text-muted-foreground text-xs">{me.email as string}</div>
            </div>
            <Badge variant="outline" className={roleStyle(me.role as string)}>
              {me.role as string}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => void resetDemo()} title="Reset demo data">
              <RotateCcw className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            try {
              history.replaceState(null, "", `#${v}`);
            } catch {
              /* ignore */
            }
          }}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="queue">Review queue</TabsTrigger>
            <TabsTrigger value="boards">Leaderboards</TabsTrigger>
            <TabsTrigger value="request">Request action</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">
            <ReviewQueue me={me} refreshKey={refreshKey} onChanged={bump} initialSelect={initialSelect} />
          </TabsContent>
          <TabsContent value="boards">
            <Leaderboards />
          </TabsContent>
          <TabsContent value="request">
            <RequestAction onRequested={bump} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditTrail refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
