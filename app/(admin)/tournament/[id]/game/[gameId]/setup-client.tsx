"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Users,
  BookOpen,
  Play,
  ExternalLink,
  UsersRound,
  FileQuestion,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignTeamToGame,
  removeTeamFromGame,
  assignQuestionToGame,
  removeQuestionFromGame,
  updateGameStatus,
  randomizeQuestionsForGame,
} from "@/server/actions/game";

interface GameTeamItem {
  id: string;
  score: number;
  team: { id: string; name: string; school: string; qualified: boolean };
}

interface GameItem {
  id: string;
  status: "SETUP" | "IN_PROGRESS" | "FINISHED";
  currentPhase: string;
  currentQuestionId: string;
  group: { id: string; name: string; order: number; round: { id: string; name: string; order: number } };
  teams: { id: string; team: { name: string; school: string; qualified: boolean } }[];
  _count: { questions: number };
}

interface GameQuestionItem {
  id: string;
  order: number;
  status: string;
  question: { id: string; question: string; answer: string; difficulty: string; session: string } | null;
}

interface AvailableTeam {
  id: string;
  name: string;
  school: string;
  qualified: boolean;
}

interface AvailableQuestion {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  session: string;
  usedInOtherGame?: boolean;
}

interface GameSetupClientProps {
  gameId: string;
  tournamentId: string;
  tournamentName: string;
  game: GameItem;
  gameTeams: GameTeamItem[];
  gameQuestions: GameQuestionItem[];
  availableTeams: AvailableTeam[];
  availableQuestions: AvailableQuestion[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  MUDAH: "bg-emerald-500/15 text-emerald-600",
  SEDANG: "bg-amber-500/15 text-amber-600",
  SUSAH: "bg-red-500/15 text-red-600",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  MUDAH: "Mudah",
  SEDANG: "Sedang",
  SUSAH: "Sulit",
};

const SESSION_LABELS: Record<string, string> = {
  WAJIB: "Wajib",
  REBUTAN: "Rebutan",
};

export default function GameSetupClient({
  gameId,
  tournamentId,
  tournamentName,
  game,
  gameTeams,
  gameQuestions,
  availableTeams,
  availableQuestions,
}: GameSetupClientProps) {
  const [tab, setTab] = useState<"teams" | "questions">("teams");
  const [wajibCount, setWajibCount] = useState(5);
  const [rebutanCount, setRebutanCount] = useState(10);
  const [randomizing, setRandomizing] = useState(false);
  const [randomizeResult, setRandomizeResult] = useState<string | null>(null);

  const assignedTeamIds = new Set(gameTeams.map((gt) => gt.team.id));
  const unassignedTeams = availableTeams.filter((t) => !assignedTeamIds.has(t.id));

  const assignedQuestionIds = new Set(gameQuestions.map((gq) => gq.question?.id).filter(Boolean));
  const unassignedQuestions = availableQuestions.filter((q) => !assignedQuestionIds.has(q.id));

  const nextQuestionOrder = gameQuestions.length > 0
    ? Math.max(...gameQuestions.map((gq) => gq.order)) + 1
    : 1;

  const handleAddTeam = async (teamId: string) => {
    await assignTeamToGame(gameId, teamId);
  };

  const handleRemoveTeam = async (gameTeamId: string) => {
    if (!confirm("Hapus tim dari game ini?")) return;
    await removeTeamFromGame(gameTeamId);
  };

  const handleAddQuestion = async (questionId: string) => {
    try {
      await assignQuestionToGame({ gameId, questionId, order: nextQuestionOrder });
    } catch (err) {
      alert((err as Error).message || "Gagal menambahkan soal.");
    }
  };

  const handleRemoveQuestion = async (gameQuestionId: string) => {
    if (!confirm("Hapus soal dari game ini?")) return;
    await removeQuestionFromGame(gameQuestionId);
  };

  const handleRandomizeQuestions = async () => {
    if (wajibCount <= 0 && rebutanCount <= 0) {
      alert("Masukkan jumlah soal wajib atau rebutan minimal 1.");
      return;
    }
    setRandomizing(true);
    setRandomizeResult(null);
    try {
      const result = await randomizeQuestionsForGame(gameId, wajibCount, rebutanCount);
      if (result.assigned === 0) {
        setRandomizeResult(
          `Tidak ada soal tersedia. (Wajib tersisa: ${result.wajibAvailable}, Rebutan tersisa: ${result.rebutanAvailable})`
        );
      } else {
        setRandomizeResult(
          `Berhasil menambahkan ${result.assigned} soal — ${result.wajibAssigned} Wajib, ${result.rebutanAssigned} Rebutan.`
        );
      }
    } catch (err) {
      setRandomizeResult("Gagal: " + (err as Error).message);
    } finally {
      setRandomizing(false);
    }
  };

  const handleStartGame = async () => {
    if (gameTeams.length < 2) {
      alert("Minimal 2 tim harus ditambahkan ke game.");
      return;
    }
    if (gameQuestions.length === 0) {
      alert("Minimal 1 soal harus ditambahkan ke game.");
      return;
    }
    await updateGameStatus(gameId, "IN_PROGRESS");
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/tournament/${tournamentId}/game`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {tournamentName} &middot; {game.group.round.name} / {game.group.name}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold">Setup Game</h1>
        </div>
        <Link
          href={`/display/${gameId}`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold transition-colors hover:bg-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Buka Display
        </Link>
        {game.status === "SETUP" && (
          <Button size="lg" onClick={handleStartGame}>
            <Play className="h-4 w-4" />
            Mulai Game
          </Button>
        )}
        {game.status === "IN_PROGRESS" && (
          <Link
            href={`/tournament/${tournamentId}/game/${gameId}/live`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
          >
            <Play className="h-4 w-4" />
            Kontrol Live
          </Link>
        )}
      </div>

      {/* Status */}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ${game.status === "SETUP" ? "bg-muted text-muted-foreground" :
          game.status === "IN_PROGRESS" ? "bg-emerald-500/15 text-emerald-600" :
            "bg-blue-500/15 text-blue-600"
          }`}>
          {game.status === "SETUP" ? "Persiapan" : game.status === "IN_PROGRESS" ? "Berlangsung" : "Selesai"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          <Users className="h-3 w-3" />
          {gameTeams.length} Tim
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          {gameQuestions.length} Soal
        </span>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("teams")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === "teams"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          <UsersRound className="h-4 w-4" />
          Tim ({gameTeams.length})
        </button>
        <button
          onClick={() => setTab("questions")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === "questions"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          <FileQuestion className="h-4 w-4" />
          Soal ({gameQuestions.length})
        </button>
      </div>

      {/* Tab Content */}
      {tab === "teams" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2 overflow-x-auto">
          {/* Tambahkan tim */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Tim di Game Ini
            </h2>
            {gameTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada tim. Tambahkan dari daftar di samping.</p>
            ) : (
              <div className="space-y-2">
                {gameTeams.map((gt) => (
                  <div
                    key={gt.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                  >
                    <div>
                      <p className="text-sm font-bold">{gt.team.name}</p>
                      <p className="text-xs text-muted-foreground">{gt.team.school}</p>
                    </div>
                    {game.status === "SETUP" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveTeam(gt.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Tersedia */}
          {game.status === "SETUP" && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Tim Tersedia
              </h2>
              {unassignedTeams.length === 0 ? (
                <p className="text-sm text-muted-foreground">Semua tim sudah ditambahkan.</p>
              ) : (
                <div className="space-y-2">
                  {unassignedTeams.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                    >
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.school}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!t.qualified &&
                          <span className="inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold bg-red-500/15 text-red-600">
                            Tidak Lolos
                          </span>
                        }
                        <Button
                          variant="outline"
                          size="icon-sm"
                          disabled={!t.qualified}
                          onClick={() => handleAddTeam(t.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {tab === "questions" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2 overflow-x-auto">
          {game.status === "SETUP" && (
            <div className="col-span-full rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shuffle className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold">Acak Soal dari Bank Soal</p>
                  <p className="text-xs text-muted-foreground">
                    Pilih jumlah soal per sesi. Kesulitan diacak secara merata (Mudah, Sedang, Sulit). Soal terpakai di game lain tidak akan dipilih.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-4">
                {/* Soal Wajib */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">Soal Wajib</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={wajibCount}
                    onChange={(e) => setWajibCount(Math.max(0, Number(e.target.value)))}
                    className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-center text-sm font-bold"
                  />
                </div>
                {/* Soal Rebutan */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">Soal Rebutan</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={rebutanCount}
                    onChange={(e) => setRebutanCount(Math.max(0, Number(e.target.value)))}
                    className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-center text-sm font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    Total: {wajibCount + rebutanCount} soal
                  </label>
                  <Button
                    
                    onClick={handleRandomizeQuestions}
                    disabled={randomizing || (wajibCount <= 0 && rebutanCount <= 0)}
                  >
                    <Shuffle className="h-4 w-4" />
                    {randomizing ? "Mengacak..." : "Acak Soal"}
                  </Button>
                </div>
              </div>
              {randomizeResult && (
                <p className={`text-xs font-medium px-1 ${
                  randomizeResult.startsWith("Gagal") || randomizeResult.startsWith("Tidak")
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {randomizeResult}
                </p>
              )}
            </div>
          )}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Soal di Game Ini
            </h2>
            {gameQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada soal. Tambahkan dari daftar di samping.</p>
            ) : (
              <div className="space-y-2">
                {gameQuestions
                  .sort((a, b) => a.order - b.order)
                  .map((gq) => (
                    <div
                      key={gq.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-extrabold text-primary">
                            {gq.order}
                          </span>
                          {gq.question && (
                            <>
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFFICULTY_COLORS[gq.question.difficulty] ?? ""}`}>
                                {DIFFICULTY_LABELS[gq.question.difficulty] ?? gq.question.difficulty}
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                                {SESSION_LABELS[gq.question.session] ?? gq.question.session}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium leading-snug truncate">
                          {gq.question?.question ?? "Soal dihapus"}
                        </p>
                      </div>
                      {game.status === "SETUP" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveQuestion(gq.id)}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </section>

          {(game.status === "SETUP" || game.status === "IN_PROGRESS") && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Bank Soal Tersedia
              </h2>
              {unassignedQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Semua soal sudah ditambahkan.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {unassignedQuestions.map((q) => (
                    <div
                      key={q.id}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                        q.usedInOtherGame
                          ? "border-amber-500/30 bg-amber-500/5 opacity-70"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFFICULTY_COLORS[q.difficulty] ?? ""}`}>
                            {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {SESSION_LABELS[q.session] ?? q.session}
                          </span>
                          {q.usedInOtherGame && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                              Sudah Terpakai
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium leading-snug line-clamp-2">
                          {q.question}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={q.usedInOtherGame}
                        onClick={() => handleAddQuestion(q.id)}
                        className="shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
