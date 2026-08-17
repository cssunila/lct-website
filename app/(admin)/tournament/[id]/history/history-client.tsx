"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  History,
  Trophy,
  Undo2,
  CheckCircle,
  XCircle,
  Clock,
  Gamepad2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { undoScoreHistory } from "@/server/actions/score";

interface HistoryItem {
  id: string;
  result: "CORRECT" | "WRONG";
  scoreChange: number;
  totalScore: number;
  createdAt: string;
  gameTeam: {
    id: string;
    team: { name: string; school: string; qualified: boolean };
    game: {
      id: string;
      group: { name: string; round: { name: string } };
    };
  };
  gameQuestion: {
    question: { question: string } | null;
  } | null;
}

interface ScoreboardGame {
  id: string;
  status: string;
  group: { name: string; round: { name: string; order: number } };
  teams: {
    id: string;
    score: number;
    team: { name: string; school: string; qualified: boolean };
  }[];
}

interface HistoryClientProps {
  tournamentId: string;
  tournamentName: string;
  histories: HistoryItem[];
  scoreboard: ScoreboardGame[];
}

export default function HistoryClient({
  tournamentId,
  tournamentName,
  histories,
  scoreboard,
}: HistoryClientProps) {
  const [tab, setTab] = useState<"history" | "scoreboard">("history");
  const [filterGame, setFilterGame] = useState<string>("all");
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const gameOptions = useMemo(() => {
    const map = new Map<string, string>();
    histories.forEach((h) => {
      const gameId = h.gameTeam.game.id;
      if (!map.has(gameId)) {
        map.set(gameId, `${h.gameTeam.game.group.round.name} / ${h.gameTeam.game.group.name}`);
      }
    });
    return Array.from(map.entries());
  }, [histories]);

  // Filter histories
  const filteredHistories = useMemo(() => {
    if (filterGame === "all") return histories;
    return histories.filter((h) => h.gameTeam.game.id === filterGame);
  }, [histories, filterGame]);

  const handleUndo = async (id: string) => {
    if (!confirm("Batalkan skor ini? Poin akan dikembalikan dan soal direset.")) return;
    setUndoingId(id);
    try {
      await undoScoreHistory(id);
    } finally {
      setUndoingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/tournament/${tournamentId}/settings`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {tournamentName}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold">History & Skor</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("history")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === "history"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          Riwayat Skor ({histories.length})
        </button>
        <button
          onClick={() => setTab("scoreboard")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === "scoreboard"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trophy className="h-4 w-4" />
          Papan Skor
        </button>
      </div>

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div className="mt-6">
          {/* Filter */}
          {gameOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterGame} onValueChange={(v) => v && setFilterGame(v)}>
                <SelectTrigger className="h-9 w-64">
                  <SelectValue placeholder="Filter berdasarkan game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Game</SelectItem>
                  {gameOptions.map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {filteredHistories.length} entri
              </span>
            </div>
          )}

          {filteredHistories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">
                {histories.length === 0
                  ? "Belum ada riwayat skor."
                  : "Tidak ada data untuk game ini."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-x-auto">
              {filteredHistories.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20"
                >
                  {/* Result icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      h.result === "CORRECT"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-red-500/15 text-red-600"
                    }`}
                  >
                    {h.result === "CORRECT" ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{h.gameTeam.team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {h.gameTeam.game.group.round.name} / {h.gameTeam.game.group.name}
                      </span>
                    </div>
                    {h.gameQuestion?.question && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {h.gameQuestion.question.question}
                      </p>
                    )}
                  </div>

                  {/* Score change */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-lg font-black tabular-nums ${
                        h.result === "CORRECT" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {h.result === "CORRECT" ? "+" : "-"}
                      {h.scoreChange}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Total: {h.totalScore}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="text-right shrink-0 w-32">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(h.createdAt)}
                    </span>
                  </div>

                  {/* Undo */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={undoingId === h.id}
                    onClick={() => handleUndo(h.id)}
                    className="shrink-0 text-amber-600 hover:text-amber-700"
                    title="Batalkan skor ini"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCOREBOARD TAB */}
      {tab === "scoreboard" && (
        <div className="mt-6">
          {scoreboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Gamepad2 className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">
                Belum ada game yang dimainkan.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {scoreboard.map((game) => (
                <div
                  key={game.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  {/* Game header */}
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold">
                        {game.group.round.name} / {game.group.name}
                      </span>
                    </div>
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                        game.status === "FINISHED"
                          ? "bg-blue-500/15 text-blue-600"
                          : game.status === "IN_PROGRESS"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {game.status === "FINISHED" ? "Selesai" : game.status === "IN_PROGRESS" ? "Berlangsung" : "Persiapan"}
                    </span>
                  </div>

                  {/* Team rankings */}
                  <div className="divide-y divide-border">
                    {game.teams.map((gt, rank) => (
                      <div
                        key={gt.id}
                        className="flex items-center gap-4 px-5 py-3"
                      >
                        {/* Rank */}
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                            rank === 0
                              ? "bg-amber-500/20 text-amber-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rank === 0 ? (
                            <Trophy className="h-4 w-4" />
                          ) : (
                            rank + 1
                          )}
                        </span>

                        {/* Team info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{gt.team.name}</p>
                          <p className="text-xs text-muted-foreground">{gt.team.school}</p>
                        </div>

                        {/* Score */}
                        <span className="text-2xl font-black tabular-nums">
                          {gt.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
