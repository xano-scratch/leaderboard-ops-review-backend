import { useCallback, useEffect, useState } from "react";
import { Ban, Check, X, Play, ShieldAlert, ScrollText, Clock } from "lucide-react";
import {
  api,
  ApiError,
  type Me,
  type QueueResponse,
  type OpsAction,
  type DetailResponse,
  type AuditRow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { actionTypeLabel, statusStyle, roleStyle, auditStyle, fmtTime } from "@/lib/format";

export function ReviewQueue({
  me,
  refreshKey,
  onChanged,
  initialSelect,
}: {
  me: Me;
  refreshKey: number;
  onChanged: () => void;
  initialSelect?: string;
}) {
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [trail, setTrail] = useState<AuditRow[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    const q = await api.queue();
    setQueue(q);
    setSelectedId((cur) => {
      if (cur !== null) return cur;
      if (!q.actions.length) return null;
      if (initialSelect) {
        const match =
          q.actions.find((a) => String(a.id) === initialSelect) ??
          q.actions.find((a) => (a.type as string) === initialSelect);
        if (match) return match.id as number;
      }
      return q.actions[0].id as number;
    });
  }, [initialSelect]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue, refreshKey]);

  const loadDetail = useCallback(async (id: number) => {
    const [d, a] = await Promise.all([api.detail(id), api.audit({ ops_action_id: id })]);
    setDetail(d);
    setTrail(a.rows);
  }, []);

  useEffect(() => {
    if (selectedId !== null) void loadDetail(selectedId);
  }, [selectedId, loadDetail, refreshKey]);

  const operators = queue?.operators ?? [];
  const nameOf = (id: number) =>
    (operators.find((o) => o.id === id)?.name as string | undefined) ?? `#${id}`;

  async function decide(action: OpsAction, decision: "approve" | "reject") {
    setBusy(true);
    setBlocked(null);
    try {
      await api.approve({ ops_action_id: action.id as number, decision, note: `${decision} by ${me.name}` });
      await Promise.all([loadQueue(), loadDetail(action.id as number)]);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 400)) setBlocked(err.message);
      else setBlocked(err instanceof Error ? err.message : "Failed.");
      await loadDetail(action.id as number); // the denial was written to the trail
    } finally {
      setBusy(false);
    }
  }

  async function execute(action: OpsAction) {
    setBusy(true);
    setBlocked(null);
    try {
      await api.execute(action.id as number);
      await Promise.all([loadQueue(), loadDetail(action.id as number)]);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) setBlocked(err.message);
      else setBlocked(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  const selected = queue?.actions.find((a) => a.id === selectedId) ?? null;
  const selSensitive = !!(selected?.sensitive);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      {/* Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">Review queue</CardTitle>
          <Badge variant="outline" className="text-muted-foreground font-mono">
            rules {queue?.ruleVersion ? String(queue.ruleVersion) : "—"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {(queue?.actions ?? []).map((a) => {
            const t = a.type as string;
            const sens = !!a.sensitive;
            return (
              <button
                key={a.id as number}
                onClick={() => {
                  setSelectedId(a.id as number);
                  setBlocked(null);
                }}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selectedId === a.id ? "border-primary/50 bg-primary/5" : "border-border/60 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{actionTypeLabel(t)}</span>
                  <Badge variant="outline" className={statusStyle(a.status as string)}>
                    {a.status as string}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span>by {nameOf(a.requested_by as number)}</span>
                  <span>·</span>
                  <span>{fmtTime(a.created_at as number)}</span>
                  {sens ? (
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                      needs 2nd approver
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      single approval
                    </Badge>
                  )}
                  <span className="text-muted-foreground">min role: {a.min_role as string}</span>
                </div>
              </button>
            );
          })}
          {queue && queue.actions.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">The queue is empty.</p>
          )}
        </CardContent>
      </Card>

      {/* Detail + governed outcome */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">
            {selected ? actionTypeLabel(selected.type as string) : "Select an action"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected && detail && (
            <>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Status</span>
                <span>
                  <Badge variant="outline" className={statusStyle(selected.status as string)}>
                    {selected.status as string}
                  </Badge>
                </span>
                <span className="text-muted-foreground">Requested by</span>
                <span className="flex items-center gap-1.5">
                  {(detail.requester?.name as string) ?? "—"}
                  {detail.requester && (
                    <Badge variant="outline" className={roleStyle(detail.requester.role as string)}>
                      {detail.requester.role as string}
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground">Target</span>
                <span>
                  {detail.targetBoard
                    ? (detail.targetBoard.name as string)
                    : detail.targetEntry
                      ? `${detail.targetEntry.player_handle as string} (#${detail.targetEntry.rank as number})`
                      : "—"}
                </span>
                <span className="text-muted-foreground">Sensitivity</span>
                <span>{selSensitive ? "Distinct 2nd approver required" : "Single approval"}</span>
              </div>

              {selected.reason && (
                <p className="text-muted-foreground bg-muted/40 rounded-md p-2 text-sm">
                  {selected.reason as string}
                </p>
              )}

              {blocked && (
                <Alert variant="destructive">
                  <Ban className="size-4" />
                  <AlertTitle>Blocked at the API layer</AlertTitle>
                  <AlertDescription>{blocked}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || selected.status !== "pending"}
                  onClick={() => void decide(selected, "approve")}
                >
                  <Check className="size-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || selected.status !== "pending"}
                  onClick={() => void decide(selected, "reject")}
                >
                  <X className="size-4" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || selected.status !== "approved"}
                  onClick={() => void execute(selected)}
                >
                  <Play className="size-4" /> Execute
                </Button>
              </div>
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <ShieldAlert className="size-3.5" /> You are {me.name} ({me.role}). Guards run on the server
                whatever these buttons allow.
              </p>

              {detail.approvals.length > 0 && (
                <div>
                  <Separator className="my-2" />
                  <p className="mb-1.5 text-xs font-medium">Decisions</p>
                  {detail.approvals.map((ap) => (
                    <div key={ap.id as number} className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className={
                          (ap.decision as string) === "approve"
                            ? "border-emerald-500/30 text-emerald-300"
                            : "border-rose-500/30 text-rose-300"
                        }
                      >
                        {ap.decision as string}
                      </Badge>
                      <span>by {nameOf(ap.decided_by as number)}</span>
                      {ap.note ? <span>· {ap.note as string}</span> : null}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Separator className="my-2" />
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <ScrollText className="size-3.5" /> Audit trail for this action
                </p>
                <div className="space-y-1.5">
                  {trail.map((r) => (
                    <div key={r.id as number} className="flex items-start gap-2 text-xs">
                      <Clock className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                      <span className={`font-mono ${auditStyle(r.action as string)}`}>{r.action as string}</span>
                      <span className="text-muted-foreground ml-auto shrink-0 font-mono">
                        {String(r.rule_version)}
                      </span>
                    </div>
                  ))}
                  {trail.length === 0 && <p className="text-muted-foreground text-xs">No entries yet.</p>}
                </div>
              </div>
            </>
          )}
          {!selected && <p className="text-muted-foreground text-sm">Pick an action to review it.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
