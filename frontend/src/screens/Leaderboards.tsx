import { useEffect, useState } from "react";
import { AlertTriangle, Trophy } from "lucide-react";
import { api, ApiError, type Leaderboard, type Entry } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/lib/ui";

export function Leaderboards() {
  const [boards, setBoards] = useState<Leaderboard[]>([]);
  const [selected, setSelected] = useState<Leaderboard | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .leaderboards()
      .then((b) => {
        setBoards(b);
        if (b[0]) void pick(b[0]);
      })
      .catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(b: Leaderboard) {
    setSelected(b);
    try {
      setEntries(await api.entries(b.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Boards</h2>
        {boards.map((b) => (
          <button key={b.id} onClick={() => void pick(b)} className="w-full text-left">
            <Card className={selected?.id === b.id ? "border-primary" : "hover:border-muted-foreground/40"}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" /> {b.name}
                  </span>
                  <StatusBadge status={b.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {b.game_mode} · Season {b.season} · {b.entry_count} entries
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {selected ? `${selected.name} — standings` : "Standings"}
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">#{e.rank}</TableCell>
                    <TableCell className="font-medium">{e.player_handle}</TableCell>
                    <TableCell className="text-right font-mono">{e.score.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {e.flagged_cheat ? (
                        <Badge variant="outline" className="border-destructive/40 bg-destructive/15 text-destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" /> suspected cheat
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
