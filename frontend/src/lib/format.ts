// Small display helpers shared across screens.

export function fmtTime(epochms: number | null | undefined): string {
  if (!epochms) return "";
  const d = new Date(epochms);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_LABELS: Record<string, string> = {
  reset_leaderboard: "Reset leaderboard",
  wipe_entry: "Wipe entry",
  grant_reward: "Grant reward",
};
export function actionTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  executed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};
export function statusStyle(status: string): string {
  return STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
}

const ROLE_STYLES: Record<string, string> = {
  ops: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  lead: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  admin: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
};
export function roleStyle(role: string): string {
  return ROLE_STYLES[role] ?? "bg-muted text-muted-foreground border-border";
}

const AUDIT_STYLES: Record<string, string> = {
  "action.requested": "text-sky-300",
  "approval.recorded": "text-indigo-300",
  "action.executed": "text-emerald-300",
  "guard.denied": "text-rose-300",
};
export function auditStyle(action: string): string {
  return AUDIT_STYLES[action] ?? "text-muted-foreground";
}
