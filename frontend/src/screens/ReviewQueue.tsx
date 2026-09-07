import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Play, ShieldX, X } from "lucide-react";
import {
  api,
  ApiError,
  type QueueItem,
  type ActionDetail,
  type AuditRow,
  type Operator,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ActionBadge, RoleBadge, SensitivityBadge, StatusBadge, TypeBadge, fmtTime } from "@/lib/ui";

const STATUS_FILTERS = ["", "pending", "approved", "executed", "rejected"];

export function ReviewQueue({ operator, initialSelect }: { operator: Operator; initialSelect?: number }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<number | null>(initialSelect ?? null);
  const [detail, setDetail] = useState<ActionDetail | null>(null);
  const [trail, setTrail] = useState<AuditRow[]>([]);
  const [blocked, setBlocked] = useState("");
  const [busy, setBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      setItems(await api.queue(filter));
    } catch {
      /* ignore */
    }
  }, [filter]);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const [d, t] = await Promise.all([api.detail(id), api.audit({ ops_action_id: id })]);
      setDetail(d);
      setTrail(t);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (selected != null) {
      setBlocked("");
      void loadDetail(selected);
    }
  }, [selected, loadDetail]);

  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setBlocked("");
    try {
      await run();
      await loadQueue();
      if (selected != null) await loadDetail(selected);
    } catch (e) {
      setBlocked(e instanceof ApiError ? e.detail : String(e));
      if (selected != null) {
        try {
          setTrail(await api.audit({ ops_action_id: selected }));
        } catch {
          /* ignore */
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const a = detail?.action;
  const target = a?.type === "reset_leaderboard" ? String(detail?.board?.name ?? "—") : String(detail?.entry?.player_handle ?? "—");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
      {/* Queue */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Review queue</h2>
          {STATUS_FILTERS.map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
              {s === "" ? "All" : s}
            </Button>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Sensitivity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow
                    key={it.id}
                    onClick={() => setSelected(it.id)}
                    className={`cursor-pointer ${selected === it.id ? "bg-muted/60" : ""}`}
                  >
                    <TableCell className="font-mono text-muted-foreground">{it.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <TypeBadge type={it.type} />
                        <span className="text-xs text-muted-foreground">
                          {String(it.board_name ?? "")}
                          {it.entry_handle ? ` · ${String(it.entry_handle)}` : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {String(it.requester_name ?? "")}
                      <span className="ml-1 text-xs uppercase text-muted-foreground">{String(it.requester_role ?? "")}</span>
                    </TableCell>
                    <TableCell>
                      <SensitivityBadge sensitive={Boolean(it.sensitive)} minRole={String(it.min_approver_role)} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={it.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail pane */}
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Acting as</span>
          <span className="flex items-center gap-2 font-medium">
            {operator.name} <RoleBadge role={String(operator.role)} />
          </span>
        </div>

        {blocked && (
          <Alert variant="destructive">
            <ShieldX className="h-4 w-4" />
            <AlertTitle>Blocked at the API layer</AlertTitle>
            <AlertDescription>{blocked}</AlertDescription>
          </Alert>
        )}

        {!a && <p className="text-sm text-muted-foreground">Select an action to review it.</p>}

        {a && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <TypeBadge type={a.type} /> #{a.id}
                </span>
                <StatusBadge status={a.status} />
              </CardTitle>
              <CardDescription>{a.reason}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">Requester</span>
                <span className="text-right">
                  {detail?.requester?.name} <span className="text-xs uppercase text-muted-foreground">{String(detail?.requester?.role)}</span>
                </span>
                <span className="text-muted-foreground">Target</span>
                <span className="text-right">{target}</span>
                <span className="text-muted-foreground">Sensitivity</span>
                <span className="flex justify-end">
                  <SensitivityBadge sensitive={Boolean(a.sensitive)} minRole={String(a.min_approver_role)} />
                </span>
                <span className="text-muted-foreground">Rule version</span>
                <span className="text-right font-mono">{String(a.rule_version)}</span>
              </div>

              <div className="flex gap-2">
                {a.status === "pending" && (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => void act(() => api.approve({ ops_action_id: a.id, decision: "approve" }))}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => api.approve({ ops_action_id: a.id, decision: "reject" }))}>
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </>
                )}
                {a.status === "approved" && (
                  <Button size="sm" disabled={busy} onClick={() => void act(() => api.execute(a.id))}>
                    <Play className="mr-1 h-4 w-4" /> Execute
                  </Button>
                )}
                {(a.status === "executed" || a.status === "rejected") && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Ban className="h-3 w-3" /> No further action
                  </span>
                )}
              </div>

              <Separator />
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Approvals ({detail?.approvals?.length ?? 0})
                </p>
                {detail?.approvals?.length ? (
                  detail.approvals.map((ap) => (
                    <div key={ap.id} className="flex items-center justify-between py-1 text-sm">
                      <span>
                        <Badge variant="outline" className={ap.decision === "approve" ? "border-emerald-500/30 text-emerald-400" : "border-destructive/40 text-destructive"}>
                          {ap.decision}
                        </Badge>{" "}
                        by operator #{ap.decided_by}
                      </span>
                      <span className="text-xs text-muted-foreground">{ap.note}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No decisions yet.</p>
                )}
              </div>

              <Separator />
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Audit trail for this action
                </p>
                <div className="space-y-1">
                  {trail.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                      <ActionBadge action={String(r.action)} />
                      <span className="flex-1 truncate font-mono text-muted-foreground">
                        {r.detail_json ? JSON.stringify(r.detail_json) : ""}
                      </span>
                      <Badge variant="outline" className="font-mono">
                        {String(r.rule_version)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
