"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Gamepad2,
  Trash2,
  ExternalLink,
  Users,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createGame,
  deleteGame,
  resetGameProgress,
  resetAllGamesInTournament,
} from "@/server/actions/game";

interface GameItem {
  id: string;
  status: "SETUP" | "IN_PROGRESS" | "FINISHED";
  currentPhase: string;
  currentQuestionId: string;
  group: { id: string; name: string; order: number; round: { id: string; name: string; order: number } };
  teams: { id: string; team: { name: string; school: string } }[];
  _count: { questions: number };
}

interface GameListClientProps {
  tournamentId: string;
  tournamentName: string;
  games: GameItem[];
  availableGroups: { id: string; name: string; roundName: string }[];
}

const STATUS_STYLES: Record<string, string> = {
  SETUP: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  FINISHED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const STATUS_LABELS: Record<string, string> = {
  SETUP: "Persiapan",
  IN_PROGRESS: "Berlangsung",
  FINISHED: "Selesai",
};

export default function GameListClient({
  tournamentId,
  tournamentName,
  games,
  availableGroups,
}: GameListClientProps) {
  const handleCreateGame = async (groupId: string) => {
    await createGame({ groupId });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus game ini?")) return;
    await deleteGame(id);
  };

  const handleReset = async (id: string) => {
    if (
      !confirm(
        "Yakin ingin mereset game ini?"
      )
    )
      return;
    try {
      await resetGameProgress(id);
    } catch (err) {
      alert((err as Error).message || "Gagal mereset game.");
    }
  };

  const handleResetAll = async () => {
    if (
      !confirm(
        "PERINGATAN: Yakin ingin mereset SEMUA game dalam turnamen ini?"
      )
    )
      return;
    try {
      await resetAllGamesInTournament(tournamentId);
    } catch (err) {
      alert((err as Error).message || "Gagal mereset semua game.");
    }
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
          <h1 className="mt-0.5 text-2xl font-extrabold">Game</h1>
        </div>
        {games.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="h-8 text-xs font-bold border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Semua Game
          </Button>
        )}
      </div>

      {availableGroups.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Buat Game Baru
          </p>
          <div className="flex flex-wrap gap-2">
            {availableGroups.map((g) => (
              <Button
                key={g.id}
                variant="default"
                onClick={() => handleCreateGame(g.id)}
              >
                <Plus className="h-3.5 w-3.5" />
                {g.roundName} - {g.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Game list */}
      {games.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Belum Ada Game</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat game pertama dari kloter yang tersedia.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game, i) => (
            <div
              key={game.id}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[game.status] ?? ""}`}
                >
                  {STATUS_LABELS[game.status] ?? game.status}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {game.group.round.name} - {game.group.name}
                </span>
              </div>

              {/* GAME */}
              <h3 className="mt-3 text-lg font-bold">Game #{i + 1}</h3>

              {/* STATUS */}
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {game.teams.length} Tim
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {game._count.questions} Soal
                </span>
              </div>

              {/* Nama Tim */}
              {game.teams.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {game.teams.map((gt) => (
                    <span
                      key={gt.id}
                      className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium"
                    >
                      {gt.team.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Aksi */}
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <Link
                  href={`/tournament/${tournamentId}/game/${game.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Setup
                </Link>
                <Link
                  href={`/display/${game.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:bg-accent"
                >
                  <ExternalLink className="h-3 w-3" />
                  Display
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Reset soal dan skor game ini ke awal"
                  onClick={() => handleReset(game.id)}
                  className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-500"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(game.id)}
                  className="ml-auto text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
