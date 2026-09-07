import { useEffect, useState } from "react";
import { api, type AuditRow } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionBadge, fmtTime } from "@/lib/ui";

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "action.requested", label: "Requested" },
  { key: "guard.denied", label: "Denied" },
  { key: "approval.recorded", label: "Decisions" },
  { key: "action.executed", label: "Executed" },
];

export function AuditTrail() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [action, setAction] = useState("");

  useEffect(() => {
    api
      .audit(action ? { action } : {})
      .then(setRows)
      .catch(() => setRows([]));
  }, [action]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={action === f.key ? "default" : "outline"} onClick={() => setAction(f.key)}>
            {f.label}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{rows.length} rows</span>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead className="w-20">Action #</TableHead>
                <TableHead className="w-20">Rule</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{fmtTime(r.created_at)}</TableCell>
                  <TableCell>
                    <ActionBadge action={String(r.action)} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.actor_name ? String(r.actor_name) : <span className="text-muted-foreground">system</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.ops_action_id || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {String(r.rule_version) || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate font-mono text-xs text-muted-foreground">
                    {r.detail_json ? JSON.stringify(r.detail_json) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
