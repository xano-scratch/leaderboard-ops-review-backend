import { useEffect, useState } from "react";
import { AlertTriangle, Trophy, ChevronRight } from "lucide-react";
import { api, ApiError, type Board, type Entry } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusStyle } from "@/lib/format";

export function Leaderboards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .boards()
      .then((r) => {
        setBoards(r.boards);
        if (r.boards.length && selected === null) setSelected(r.boards[0].id as number);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load boards."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected === null) return;
    api
      .entries(selected)
      .then((r) => setEntries(r.entries))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load entries."));
  }, [selected]);

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4" /> Leaderboards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {boards.map((b) => (
            <button
              key={b.id as number}
              onClick={() => setSelected(b.id as number)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                selected === b.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{b.name}</span>
                <ChevronRight className="text-muted-foreground size-4" />
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                <Badge variant="outline" className={statusStyle(b.status as string)}>
                  {b.status as string}
                </Badge>
                <span>
                  {b.game_mode as string} · S{b.season as number} · {b.entry_count as number} entries
                </span>
              </div>
            </button>
          ))}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id as number} className={e.flagged_cheat ? "bg-rose-500/5" : ""}>
                  <TableCell className="text-muted-foreground font-mono">
                    #{e.rank as number}
                  </TableCell>
                  <TableCell className="font-medium">{e.player_handle as string}</TableCell>
                  <TableCell className="text-right font-mono">
                    {(e.score as number).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.flagged_cheat ? (
                      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/15 text-rose-300">
                        <AlertTriangle className="mr-1 size-3" /> Suspected cheat
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">clean</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    No entries on this board.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
