import { useEffect, useMemo, useState } from "react";
import { Send, ShieldAlert, CheckCircle2 } from "lucide-react";
import { api, ApiError, type Board, type Entry, type ActionRequestInput } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActionType = "reset_leaderboard" | "wipe_entry" | "grant_reward";
const SENSITIVE: ActionType[] = ["reset_leaderboard", "wipe_entry"];

export function RequestAction({ onRequested }: { onRequested: () => void }) {
  const [type, setType] = useState<ActionType>("reset_leaderboard");
  const [boards, setBoards] = useState<Board[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [boardId, setBoardId] = useState<string>("");
  const [entryId, setEntryId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [reward, setReward] = useState("500 credits");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    api.boards().then((r) => {
      setBoards(r.boards);
      if (r.boards.length) setBoardId(String(r.boards[0].id));
    });
  }, []);

  useEffect(() => {
    if (!boardId) return;
    api.entries(Number(boardId)).then((r) => {
      setEntries(r.entries);
      setEntryId(r.entries.length ? String(r.entries[0].id) : "");
    });
  }, [boardId]);

  const needsEntry = type !== "reset_leaderboard";
  const isSensitive = SENSITIVE.includes(type);

  const canSubmit = useMemo(() => {
    if (!reason.trim()) return false;
    if (type === "reset_leaderboard") return !!boardId;
    return !!entryId;
  }, [type, boardId, entryId, reason]);

  async function submit() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const input: ActionRequestInput = { type, reason } as ActionRequestInput;
      if (type === "reset_leaderboard") {
        input.leaderboard_id = Number(boardId);
      } else {
        input.entry_id = Number(entryId);
      }
      if (type === "grant_reward") {
        input.payload_json = { reward } as ActionRequestInput["payload_json"];
      }
      const res = await api.requestAction(input);
      setOk(
        `Request #${res.action.id} created as ${res.action.status}. ${
          res.sensitive ? "Sensitive: it needs a distinct second approver." : "Single approval will do."
        }`,
      );
      setReason("");
      onRequested();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed.");
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
            Any operator can request. The API layer sets it to <code>pending</code> and, for sensitive
            types, holds it for a second approver. Nothing runs on request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Action type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ActionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reset_leaderboard">Reset leaderboard</SelectItem>
                <SelectItem value="wipe_entry">Wipe entry</SelectItem>
                <SelectItem value="grant_reward">Grant reward</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Board</Label>
            <Select value={boardId} onValueChange={setBoardId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id as number} value={String(b.id)}>
                    {b.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsEntry && (
            <div className="space-y-1.5">
              <Label>Entry</Label>
              <Select value={entryId} onValueChange={setEntryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick an entry" />
                </SelectTrigger>
                <SelectContent>
                  {entries.map((e) => (
                    <SelectItem key={e.id as number} value={String(e.id)}>
                      #{e.rank as number} {e.player_handle as string}
                      {e.flagged_cheat ? "  (suspected cheat)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Textarea
              id="reason"
              value={reason}
              placeholder="Why is this action needed?"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {isSensitive && (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <ShieldAlert className="size-4" />
              <AlertTitle>Sensitive action</AlertTitle>
              <AlertDescription>
                This type needs a distinct second approver before it can run.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {ok && (
            <Alert className="border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="size-4" />
              <AlertDescription>{ok}</AlertDescription>
            </Alert>
          )}

          <Button onClick={() => void submit()} disabled={!canSubmit || busy} className="w-full">
            <Send className="size-4" /> {busy ? "Submitting…" : "Submit request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
