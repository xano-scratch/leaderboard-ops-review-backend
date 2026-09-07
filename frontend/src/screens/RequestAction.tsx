import { useEffect, useState } from "react";
import { Send, ShieldAlert } from "lucide-react";
import { api, ApiError, type Leaderboard, type Entry, type ActionType, type Operator } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TYPE_LABEL } from "@/lib/ui";

const TYPES: { key: ActionType; blurb: string; sensitive: boolean; needs: "board" | "entry" }[] = [
  { key: "reset_leaderboard", blurb: "Clear a board's entries. Needs an admin approver.", sensitive: true, needs: "board" },
  { key: "wipe_entry", blurb: "Remove one entry, such as a suspected cheat. Needs a lead approver.", sensitive: true, needs: "entry" },
  { key: "grant_reward", blurb: "Record a reward for an entry. A standard action.", sensitive: false, needs: "entry" },
];

const selectClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function RequestAction({ onGoToQueue }: { operator: Operator; onGoToQueue: () => void }) {
  const [type, setType] = useState<ActionType>("wipe_entry");
  const [boards, setBoards] = useState<Leaderboard[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [boardId, setBoardId] = useState(0);
  const [entryId, setEntryId] = useState(0);
  const [reason, setReason] = useState("Flagged in match review.");
  const [reward, setReward] = useState("Season 7 Finalist badge");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const meta = TYPES.find((t) => t.key === type)!;

  useEffect(() => {
    api
      .leaderboards()
      .then((b) => {
        setBoards(b);
        if (b[0]) setBoardId(b[0].id);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!boardId) return;
    api
      .entries(boardId)
      .then((e) => {
        setEntries(e);
        setEntryId(e[0]?.id ?? 0);
      })
      .catch(() => setEntries([]));
  }, [boardId]);

  async function submit() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const payload =
        type === "grant_reward"
          ? { reward, amount: 1 }
          : type === "reset_leaderboard"
            ? { scope: "full", reason }
            : { reason };
      const res = await api.request({
        type,
        leaderboard_id: boardId,
        entry_id: meta.needs === "entry" ? entryId : 0,
        payload_json: payload,
        reason,
      });
      setOk(`Requested action #${res.id} (${TYPE_LABEL[type]}). Status: ${res.status}. It is now in the review queue.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Request an action</CardTitle>
          <CardDescription>
            You are requesting a change to game state. Nothing is applied now: a sensitive action waits for a
            second approver and an execute step, and every step is audited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`rounded-lg border p-3 text-left text-sm transition ${
                  type === t.key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <div className="font-medium">{TYPE_LABEL[t.key]}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.blurb}</div>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="board">Board</Label>
            <select id="board" className={selectClass} value={boardId} onChange={(e) => setBoardId(Number(e.target.value))}>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · Season {b.season}
                </option>
              ))}
            </select>
          </div>

          {meta.needs === "entry" && (
            <div className="space-y-1.5">
              <Label htmlFor="entry">Entry</Label>
              <select id="entry" className={selectClass} value={entryId} onChange={(e) => setEntryId(Number(e.target.value))}>
                {entries.map((en) => (
                  <option key={en.id} value={en.id}>
                    #{en.rank} {en.player_handle}
                    {en.flagged_cheat ? " (suspected cheat)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === "grant_reward" && (
            <div className="space-y-1.5">
              <Label htmlFor="reward">Reward</Label>
              <Input id="reward" value={reward} onChange={(e) => setReward(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {meta.sensitive && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Sensitive action</AlertTitle>
              <AlertDescription>
                This type needs a distinct second approver before it can run. You cannot approve your own
                request.
              </AlertDescription>
            </Alert>
          )}

          {ok && (
            <Alert className="border-emerald-500/30 bg-emerald-500/10">
              <AlertTitle>Submitted</AlertTitle>
              <AlertDescription>
                {ok}{" "}
                <button className="underline" onClick={onGoToQueue}>
                  Open the review queue
                </button>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={submit} disabled={busy || !boardId}>
            <Send className="mr-1 h-4 w-4" /> {busy ? "Submitting…" : "Submit request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
