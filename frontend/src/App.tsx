import { useEffect, useState } from "react";
import { LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import {
  api,
  clearSession,
  getOperator,
  setSession,
  type LoginResponse,
  type Operator,
} from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RoleBadge, ROLE_HINT } from "@/lib/ui";
import { DEMO_PASSWORD, Login } from "@/screens/Login";
import { Leaderboards } from "@/screens/Leaderboards";
import { RequestAction } from "@/screens/RequestAction";
import { ReviewQueue } from "@/screens/ReviewQueue";
import { AuditTrail } from "@/screens/AuditTrail";

const TABS = [
  { key: "leaderboards", label: "Leaderboards" },
  { key: "request", label: "Request action" },
  { key: "queue", label: "Review queue" },
  { key: "audit", label: "Audit trail" },
];

export default function App() {
  const [operator, setOperator] = useState<Operator | null>(getOperator());
  const [tab, setTab] = useState("queue");
  const [initialSelect, setInitialSelect] = useState<number | undefined>(undefined);
  const [seeding, setSeeding] = useState(false);

  // Deep-link support: ?as=<name>&select=<id>&tab=<key> (or #<key>). Lets a
  // reviewer land straight on the governed-result view. `as` signs in a demo
  // operator; the password is the seeded demo one.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace("#", "");
    const wantTab = p.get("tab") || hash;
    if (wantTab && TABS.some((t) => t.key === wantTab)) setTab(wantTab);
    const sel = p.get("select");
    if (sel) setInitialSelect(Number(sel));
    const as = p.get("as");
    if (as && !getOperator()) {
      api
        .login({ email: `${as}@studio.games`, password: DEMO_PASSWORD })
        .then((r) => {
          setSession(r.token as string, r.operator);
          setOperator(r.operator);
        })
        .catch(() => {
          /* fall back to the login screen */
        });
    }
  }, []);

  function logout() {
    clearSession();
    setOperator(null);
  }

  async function reseed() {
    setSeeding(true);
    try {
      await api.seed(true);
    } finally {
      setSeeding(false);
      window.location.reload();
    }
  }

  if (!operator) return <Login onLogin={(r: LoginResponse) => setOperator(r.operator)} />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-semibold">Leaderboard Ops Review</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden max-w-xs text-right text-sm sm:block">
              <div className="font-medium">{operator.name}</div>
              <div className="text-xs text-muted-foreground">{ROLE_HINT[String(operator.role)]}</div>
            </div>
            <RoleBadge role={String(operator.role)} />
            <Button variant="outline" size="sm" onClick={reseed} disabled={seeding}>
              <RefreshCw className="mr-1 h-4 w-4" />
              {seeding ? "Resetting…" : "Reset demo"}
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="leaderboards">
            <Leaderboards />
          </TabsContent>
          <TabsContent value="request">
            <RequestAction operator={operator} onGoToQueue={() => setTab("queue")} />
          </TabsContent>
          <TabsContent value="queue">
            <ReviewQueue operator={operator} initialSelect={initialSelect} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditTrail />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
