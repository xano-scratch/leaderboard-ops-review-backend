// Small presentational helpers shared across screens: consistent badges for
// roles, statuses, action types, and audit events, plus a time formatter.
import { Badge } from "@/components/ui/badge";

export function fmtTime(ms: number | undefined | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const TYPE_LABEL: Record<string, string> = {
  reset_leaderboard: "Reset leaderboard",
  wipe_entry: "Wipe entry",
  grant_reward: "Grant reward",
};

export const ROLE_HINT: Record<string, string> = {
  ops: "Can request actions. Cannot approve sensitive ones.",
  lead: "Can approve wipes and rewards. Cannot approve a board reset.",
  admin: "Can approve every action type, including a board reset.",
};

export function RoleBadge({ role }: { role: string }) {
  const variant = role === "admin" ? "default" : role === "lead" ? "secondary" : "outline";
  return (
    <Badge variant={variant as "default" | "secondary" | "outline"} className="uppercase tracking-wide">
      {role}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    approved: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    executed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/40",
  };
  return (
    <Badge variant="outline" className={cls[status] ?? ""}>
      {status}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{TYPE_LABEL[type] ?? type}</Badge>;
}

export function ActionBadge({ action }: { action: string }) {
  const cls: Record<string, string> = {
    "guard.denied": "bg-destructive/15 text-destructive border-destructive/40",
    "action.executed": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "approval.recorded": "bg-sky-500/15 text-sky-400 border-sky-500/30",
    "action.requested": "text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`font-mono text-xs ${cls[action] ?? ""}`}>
      {action}
    </Badge>
  );
}

export function SensitivityBadge({ sensitive, minRole }: { sensitive: boolean; minRole?: string }) {
  if (!sensitive) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        standard
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/15 text-amber-400">
      2nd approver{minRole ? ` · ${minRole}+` : ""}
    </Badge>
  );
}
