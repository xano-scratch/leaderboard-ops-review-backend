import { useCallback, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { api, type AuditRow, type OperatorSummary } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditStyle, fmtTime } from "@/lib/format";

const ACTIONS = ["action.requested", "approval.recorded", "action.executed", "guard.denied"];

export function AuditTrail({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [operators, setOperators] = useState<OperatorSummary[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    const [a, q] = await Promise.all([
      api.audit(filter === "all" ? undefined : { action: filter }),
      api.queue(),
    ]);
    setRows(a.rows);
    setOperators(q.operators);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const nameOf = (id: number) =>
    id === 0 ? "system" : ((operators.find((o) => o.id === id)?.name as string | undefined) ?? `#${id}`);

  function detailText(v: unknown): string {
    if (v == null) return "";
    try {
      const obj = typeof v === "string" ? JSON.parse(v) : v;
      return Object.entries(obj as Record<string, unknown>)
        .map(([k, val]) => `${k}=${val}`)
        .join(", ");
    } catch {
      return String(v);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="size-4" /> Audit trail
          </CardTitle>
          <CardDescription>
            Append-only. Every request, denial, approval, and execution, each stamped with the rule
            version that applied.
          </CardDescription>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Time</TableHead>
              <TableHead className="w-32">Actor</TableHead>
              <TableHead className="w-44">Event</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="w-20 text-right">Rule</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id as number}>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {fmtTime(r.created_at as number)}
                </TableCell>
                <TableCell className="text-sm">{nameOf(r.actor_id as number)}</TableCell>
                <TableCell>
                  <span className={`font-mono text-xs ${auditStyle(r.action as string)}`}>
                    {r.action as string}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {detailText(r.detail_json)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">
                    {String(r.rule_version)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No audit rows.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
