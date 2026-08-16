"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Flag,
  Trophy,
  Eye,
  EyeOff,
  Monitor,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Clock,
  ChevronRight,
  Sparkles,
  Lock,
  AlertCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateCurrentQuestion,
  updateGamePhase,
  updateGameStatus,
  markQuestionAnswered,
  setAnswerVisibility,
  startLiveTimer,
  pauseLiveTimer,
  resetLiveTimer,
  // adjustLiveTimer,
  transitionTimerToRunning,
  changeScoreTim,
} from "@/server/actions/game";
import { toggleTeamQualification } from "@/server/actions/team";
import { TimerState } from "@/lib/game-state";

interface GameQuestionItem {
  id: string;
  order: number;
  status: string;
  isCorrect: boolean | null;
  question: {
    id: string;
    question: string;
    answer: string;
    explanation: string | null;
    difficulty: string;
    session: string;
    timeLimit: number;
    image: string | null;
  } | null;
  answeredBy: { team: { name: string } } | null;
}

interface GameTeamItem {
  id: string;
  score: number;
  team: { id: string; name: string; school: string; qualified: boolean };
}

interface SettingsData {
  mandatoryCorrectPoint: number;
  mandatoryWrongPoint: number;
  buzzerCorrectPoint: number;
  buzzerWrongPoint: number;
}

interface GameControlClientProps {
  gameId: string;
  tournamentId: string;
  tournamentName: string;
  settings: SettingsData;
  game: {
    id: string;
    status: "SETUP" | "IN_PROGRESS" | "FINISHED";
    currentPhase: string;
    currentQuestionId: string | null;
    group: { name: string; round: { name: string } };
  };
  questions: GameQuestionItem[];
  teams: GameTeamItem[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  MUDAH: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  SEDANG: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  SUSAH: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const InputLiveScoreChange = ({ gameTeamId, score, broadcastLocal }: { gameTeamId: string, score: number, broadcastLocal: (type: string, payload?: unknown) => void }) => {
  const [scoreTim, setScoreTim] = useState(score);
  const [changeInput, setChangeInput] = useState(false);

  const handleScoreChange = async () => {
    await changeScoreTim({ gameTeamId, score: scoreTim })
    broadcastLocal("SCORE_UPDATED");
  };

  useEffect(() => {
    (async () => {
      if (score !== scoreTim) {
        setChangeInput(true);
      } else {
        setChangeInput(false);
      }
    })();
  }, [score, scoreTim]);

  useEffect(() => {
    (async () => {
      setScoreTim(score);
    })();
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1">
      <input type="text" value={scoreTim} onChange={(e) => setScoreTim(Number(e.target.value.replace(/[^0-9]/g, "")))} className="text-xl text-end w-full border-0 outline-0 font-black tabular-nums" />
      {changeInput && <Button size="sm" className="h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs" onClick={() => handleScoreChange()}>
        Submit
      </Button>}
    </div>
  )

}

const InputScoreChange = ({ gameTeamId, currentGQId, wrongScore, correctScore, broadcastLocal }: { gameTeamId: string, currentGQId: string, wrongScore: number, correctScore: number, broadcastLocal: (type: string, payload?: unknown) => void }) => {
  const [wrongScoreTim, setWrongScoreTim] = useState(wrongScore);
  const [correctScoreTim, setCorrectScoreTim] = useState(correctScore);

  const handleScoreChange = async (isCorrect: boolean) => {
    const scoreChange = isCorrect ? correctScoreTim : Math.abs(wrongScoreTim);
    await markQuestionAnswered({ gameQuestionId: currentGQId, gameTeamId, isCorrect, scoreChange });
    broadcastLocal("SCORE_UPDATED");
  }

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <input type="number" value={correctScoreTim} onChange={(e) => setCorrectScoreTim(Number(e.target.value))} min={0} className="w-full border rounded-lg py-1 text-center font-semibold" />
        <Button size="sm" className="h-8 w-full rounded-lg bg-green-600 text-primary-foreground hover:bg-green-600/80 font-bold text-xs flex items-center gap-2" onClick={() => handleScoreChange(true)}>
          <CheckCircle className="w-4 h-4" />
          Benar
        </Button>
      </div>
      <div className="flex flex-col items-center gap-1">
        <input type="number" value={wrongScoreTim} onChange={(e) => setWrongScoreTim(Number(e.target.value))} className="w-full border rounded-lg py-1 text-center font-semibold" />
        <Button size="sm" className="h-8 w-full text-white rounded-lg bg-destructive hover:bg-destructive/80 font-bold text-xs flex items-center gap-2" onClick={() => handleScoreChange(false)}>
          <XCircle className="w-4 h-4" />
          Salah
        </Button>
      </div>
    </>
  )
}

export default function GameControlClient({
  gameId,
  tournamentId,
  tournamentName,
  settings,
  game: initialGame,
  questions: initialQuestions,
  teams: initialTeams,
}: GameControlClientProps) {
  const [game, setGame] = useState(initialGame);
  const [questions, setQuestions] = useState(initialQuestions);
  const [teams, setTeams] = useState(initialTeams);

  const [currentIdx, setCurrentIdx] = useState<string | null>(
    initialGame.currentQuestionId ?? null
  );

  const [showAnswer, setShowAnswerState] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>({
    timeLimit: 30,
    remaining: 30,
    status: "STOPPED",
    endsAt: null,
    countdownEndsAt: null,
  });

  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [displayTimer, setDisplayTimer] = useState(30);

  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const bcRef = useRef<BroadcastChannel | null>(null);

  const broadcastLocal = useCallback((type: string, payload?: unknown) => {
    if (bcRef.current) {
      bcRef.current.postMessage({ type, gameId, payload, timestamp: Date.now() });
    }
  }, [gameId]);

  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bcRef.current = new BroadcastChannel(`lct-game-${gameId}`);
      (async () => {
        setIsConnected(true);
      })();
    }
    return () => bcRef.current?.close();
  }, [gameId]);

  useEffect(() => {
    const es = new EventSource(`/api/game/${gameId}/stream`);
    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.liveState) {
          setShowAnswerState(msg.liveState.showAnswer);
          setTimerState(msg.liveState.timer);
          if (msg.liveState.currentQuestionId !== undefined) {
            setCurrentIdx(msg.liveState.currentQuestionId);
          }
        }
        if (msg.game) {
          setGame((prev) => ({
            ...prev,
            status: msg.game.status,
            currentPhase: msg.eventType === "PHASE_CHANGED"
              ? msg.game.currentPhase
              : prev.currentPhase,
            currentQuestionId: msg.game.currentQuestionId,
          }));
          if (msg.game.questions) setQuestions(msg.game.questions);
          if (msg.game.teams) setTeams(msg.game.teams);
        }
      } catch (err) {
        console.error("SSE JSON parse error", err);
      }
    };

    return () => es.close();
  }, [gameId]);

  useEffect(() => {
    if (timerState.status === "COUNTDOWN" && timerState.countdownEndsAt) {
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((timerState.countdownEndsAt! - now) / 1000);
        if (diff > 0) {
          setCountdownNum(diff);
        } else {
          clearInterval(interval);
          setCountdownNum(null);
          transitionTimerToRunning(gameId).catch(console.error);
        }
      }, 200);
      return () => clearInterval(interval);
    }

    if (timerState.status === "RUNNING" && timerState.endsAt) {
      (async () => {
        setCountdownNum(null);
      })();
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((timerState.endsAt! - now) / 1000));
        setDisplayTimer(diff);
        if (diff <= 0) {
          clearInterval(interval);
          setTimerState((prev) => ({ ...prev, status: "EXPIRED", remaining: 0 }));
        }
      }, 200);
      return () => clearInterval(interval);
    }

    (async () => {
      setCountdownNum(null);
      setDisplayTimer(timerState.remaining);
    })();
  }, [timerState.status, timerState.endsAt, timerState.countdownEndsAt, timerState.remaining, gameId]);

  const currentGQ = questions.find((q) => q.id === currentIdx) ?? null;
  const currentQuestion = currentGQ?.question ?? null;

  const isMandatory = currentQuestion?.session === "WAJIB";
  const correctPoints = isMandatory ? settings.mandatoryCorrectPoint : settings.buzzerCorrectPoint;
  const wrongPoints = isMandatory ? settings.mandatoryWrongPoint : settings.buzzerWrongPoint;

  const filteredQuestionsForCurrentPhase = questions.filter(
    (q) => q.question?.session === game.currentPhase
  );

  const goToQuestion = useCallback(
    async (gqItem: GameQuestionItem) => {
      if (game.currentPhase !== "WAJIB" && game.currentPhase !== "REBUTAN") {
        alert("Pilih Fase Pertandingan (Wajib / Rebutan) terlebih dahulu.");
        return;
      }
      if (gqItem.question?.session !== game.currentPhase) {
        alert(
          `Soal ini adalah sesi ${gqItem.question?.session}, sedangkan game sedang dalam Fase ${game.currentPhase}.`
        );
        return;
      }

      setLoadingQuestion(true);
      try {
        await updateCurrentQuestion(gameId, gqItem.id);
        setCurrentIdx(gqItem.id);
        setShowAnswerState(false);
        setDisplayTimer(gqItem.question?.timeLimit ?? 30);
        setCountdownNum(null);
        broadcastLocal("QUESTION_CHANGED", { questionId: gqItem.id });
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingQuestion(false);
      }
    },
    [gameId, game.currentPhase, broadcastLocal]
  );

  const currentIndexInFilteredList = filteredQuestionsForCurrentPhase.findIndex(
    (q) => q.id === currentIdx
  );

  const handlePrevQuestion = () => {
    if (currentIndexInFilteredList > 0) {
      goToQuestion(filteredQuestionsForCurrentPhase[currentIndexInFilteredList - 1]);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndexInFilteredList >= 0 && currentIndexInFilteredList < filteredQuestionsForCurrentPhase.length - 1) {
      goToQuestion(filteredQuestionsForCurrentPhase[currentIndexInFilteredList + 1]);
    }
  };

  const handleStartTimer = async () => {
    if (!currentQuestion) return;
    const duration = timerState.remaining > 0 && timerState.status !== "EXPIRED"
      ? timerState.remaining
      : currentQuestion.timeLimit;

    try {
      await startLiveTimer(gameId, duration);
      broadcastLocal("TIMER_COUNTDOWN_START", { duration });
    } catch (err) {
      console.error(err);
    } 
  };

  const handlePauseTimer = async () => {
    await pauseLiveTimer(gameId, displayTimer);
    broadcastLocal("TIMER_PAUSE", { remaining: displayTimer });
  };

  const handleResetTimer = async () => {
    const duration = currentQuestion?.timeLimit ?? 30;
    await resetLiveTimer(gameId, duration);
    setCountdownNum(null);
    broadcastLocal("TIMER_RESET", { duration });
  };

  // const handleAdjustTimer = async (seconds: number) => {
  //   await adjustLiveTimer(gameId, seconds);
  //   broadcastLocal("TIMER_ADJUST", { seconds });
  // };

  const handleToggleAnswer = async () => {
    const nextVal = !showAnswer;
    setShowAnswerState(nextVal);
    await setAnswerVisibility(gameId, nextVal);
    broadcastLocal("ANSWER_VISIBILITY_CHANGED", { showAnswer: nextVal });
  };

  const handleScore = async (gameTeamId: string, gameQuestionId: string, isCorrect: boolean) => {
    const scoreChange = isCorrect ? correctPoints : wrongPoints;
    await markQuestionAnswered({ gameQuestionId, gameTeamId, isCorrect, scoreChange });
    broadcastLocal("SCORE_UPDATED");
  };

  const handleToggleQualification = async (teamId: string, currentQualified: boolean) => {
    const nextStatus = !currentQualified;
    setTeams((prev) =>
      prev.map((gt) =>
        gt.team.id === teamId
          ? { ...gt, team: { ...gt.team, qualified: nextStatus } }
          : gt
      )
    );
    await toggleTeamQualification(teamId, nextStatus, gameId);
    broadcastLocal("SCORE_UPDATED");
  };

  const handlePhaseChange = async (phase: "SETUP" | "WAJIB" | "REBUTAN" | "HASIL") => {
    setGame((prev) => ({ ...prev, currentPhase: phase, currentQuestionId: null }));
    setCurrentIdx(null);
    setShowAnswerState(false);
    setCountdownNum(null);
    setDisplayTimer(30);
    await updateGamePhase(gameId, phase);
    broadcastLocal("PHASE_CHANGED", { phase });
  };

  const handleFinish = async () => {
    if (!confirm("Yakin selesaikan game ini?")) return;
    await updateGameStatus(gameId, "FINISHED");
    broadcastLocal("GAME_FINISHED");
  };

  const questionWajib = questions.filter((q) => q.question?.session === "WAJIB");
  const questionRebutan = questions.filter((q) => q.question?.session === "REBUTAN");

  const timerIsActive = timerState.status === "RUNNING" || timerState.status === "COUNTDOWN";
  const questionSelected = !!currentQuestion;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/tournament/${tournamentId}/game/${gameId}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-primary">{tournamentName}</span>
              <span className="text-xs text-muted-foreground">&bull;</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {game.group.round.name} - {game.group.name}
              </span>
            </div>
            <h1 className="text-xl font-extrabold flex items-center gap-3">
              Kontrol Live Operator
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isConnected ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600"}`}>
                {isConnected ? "Realtime Active" : "Connecting..."}
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/display/${gameId}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95">
            <Monitor className="h-4 w-4" />
            Buka Display
          </Link>
          {game.status === "IN_PROGRESS" && (
            <Button variant="destructive" className="rounded-xl p-4! font-bold" onClick={handleFinish}>
              <Flag className="h-4 w-4 mr-1" />
              Selesai Game
            </Button>
          )}
        </div>
      </div>

      {/* PHASE CONTROL BAR */}
      <div className="rounded-2xl border-2 border-primary/30 bg-linear-to-r from-primary/10 via-card to-card p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-extrabold uppercase tracking-wider">
              Fase Pertandingan (Wajib dipilih sebelum memilih soal)
            </span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            Fase Aktif:{" "}
            <span className="text-primary font-black uppercase underline">
              {game.currentPhase || "Belum Dipilih"}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handlePhaseChange("WAJIB")}
            className={`flex items-center justify-center gap-2 rounded-xl p-3.5 text-sm font-extrabold transition-all border ${game.currentPhase === "WAJIB" ? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400 scale-[1.02]" : "bg-card border-border hover:bg-amber-500/10 hover:text-amber-500"}`}
          >
            Sesi Soal WAJIB
          </button>
          <button
            onClick={() => handlePhaseChange("REBUTAN")}
            className={`flex items-center justify-center gap-2 rounded-xl p-3.5 text-sm font-extrabold transition-all border ${game.currentPhase === "REBUTAN" ? "bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400 scale-[1.02]" : "bg-card border-border hover:bg-red-500/10 hover:text-red-500"}`}
          >
            Sesi Soal REBUTAN
          </button>
          <button
            onClick={() => handlePhaseChange("HASIL")}
            className={`flex items-center justify-center gap-2 rounded-xl p-3.5 text-sm font-extrabold transition-all border ${game.currentPhase === "HASIL" ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400 scale-[1.02]" : "bg-card border-border hover:bg-blue-500/10 hover:text-blue-500"}`}
          >
            Pengumuman HASIL
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {questionSelected && (
            <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-card via-card to-primary/5 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Kontrol Timer Live
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${countdownNum !== null ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 animate-pulse"
                  : timerState.status === "RUNNING" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-pulse"
                    : timerState.status === "PAUSED" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : timerState.status === "EXPIRED" ? "bg-red-500/20 text-red-600 dark:text-red-400"
                        : "bg-muted text-muted-foreground"}`}>
                  {countdownNum !== null ? `Aba-aba: ${countdownNum}`
                    : timerState.status === "RUNNING" ? "Berjalan"
                      : timerState.status === "PAUSED" ? "Dijeda"
                        : timerState.status === "EXPIRED" ? "Waktu Habis"
                          : "Siap"}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  {countdownNum !== null ? (
                    <span className="font-mono text-7xl font-black tabular-nums text-blue-500 animate-pulse tracking-tight">
                      {countdownNum}
                    </span>
                  ) : (
                    <span className={`font-mono text-6xl font-black tabular-nums tracking-tight ${displayTimer <= 5 && displayTimer > 0 ? "text-red-500 animate-pulse"
                      : displayTimer === 0 ? "text-red-500/60"
                        : "text-foreground"}`}>
                      {String(displayTimer).padStart(2, "0")}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-muted-foreground">
                    {countdownNum !== null ? "" : "detik"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {timerIsActive ? (
                    timerState.status === "RUNNING" && (
                      <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-5" onClick={handlePauseTimer}>
                        <Pause className="h-5 w-5 mr-1.5" />
                        Jeda Timer
                      </Button>
                    )
                  ) : (
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5" onClick={handleStartTimer}
                      disabled={!currentQuestion || currentGQ?.status === "ANSWERED"}>
                      <Play className="h-5 w-5 mr-1.5" />
                      {timerState.status === "PAUSED" ? "Lanjutkan Timer" : "Mulai Timer"}
                    </Button>
                  )}
                  <Button disabled={!currentQuestion || currentGQ?.status === "ANSWERED"} variant="outline" size="lg" className="rounded-xl font-bold" onClick={handleResetTimer}>
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          )}

          {game.currentPhase !== "HASIL" && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Navigasi Soal Pertandingan
                  </p>
                  {game.currentPhase !== "WAJIB" && game.currentPhase !== "REBUTAN" && (
                    <p className="text-xs text-amber-500 font-semibold flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Pilih Fase WAJIB atau REBUTAN terlebih dahulu.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentIndexInFilteredList <= 0} onClick={handlePrevQuestion} className="rounded-lg text-xs">
                    <ChevronLeft className="h-4 w-4 mr-1" />Sebelum
                  </Button>
                  <Button variant="outline" size="sm"
                    disabled={currentIndexInFilteredList < 0 || currentIndexInFilteredList >= filteredQuestionsForCurrentPhase.length - 1}
                    onClick={handleNextQuestion} className="rounded-lg text-xs">
                    Berikutnya<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="space-y-5">
                {/* WAJIB */}
                <div className={`p-4 rounded-xl transition-all border ${game.currentPhase === "WAJIB" ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/30 border-transparent opacity-60"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                      {game.currentPhase !== "WAJIB" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      Soal Wajib Jawab ({questionWajib.length})
                    </h3>
                    <span className={`text-[11px] font-bold ${game.currentPhase === "WAJIB" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {game.currentPhase === "WAJIB" ? "FASE AKTIF" : "Terkunci"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {questionWajib.map((gq, i) => (
                      <button key={gq.id} disabled={game.currentPhase !== "WAJIB"} onClick={() => goToQuestion(gq)}
                        className={`inline-flex h-10 min-w-10 px-3 items-center justify-center rounded-xl text-xs font-black transition-all ${gq.id === currentIdx ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-400 scale-105"
                          : gq.status === "ANSWERED" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : game.currentPhase === "WAJIB" ? "bg-card text-foreground hover:bg-amber-500/20 hover:text-amber-600 border border-border"
                              : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* REBUTAN */}
                <div className={`p-4 rounded-xl transition-all border ${game.currentPhase === "REBUTAN" ? "bg-red-500/10 border-red-500/30" : "bg-muted/30 border-transparent opacity-60"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                      {game.currentPhase !== "REBUTAN" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      Soal Rebutan ({questionRebutan.length})
                    </h3>
                    <span className={`text-[11px] font-bold ${game.currentPhase === "REBUTAN" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                      {game.currentPhase === "REBUTAN" ? "FASE AKTIF" : "Terkunci"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {questionRebutan.map((gq, i) => (
                      <button key={gq.id} disabled={game.currentPhase !== "REBUTAN"} onClick={() => goToQuestion(gq)}
                        className={`inline-flex h-10 min-w-10 px-3 items-center justify-center rounded-xl text-xs font-black transition-all ${gq.id === currentIdx ? "bg-red-600 text-white shadow-md ring-2 ring-red-400 scale-105"
                          : gq.status === "ANSWERED" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : game.currentPhase === "REBUTAN" ? "bg-card text-foreground hover:bg-red-500/20 hover:text-red-600 border border-border"
                              : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingQuestion ? (
            <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin h-7 w-7 text-primary" />
              <p className="text-sm font-semibold text-muted-foreground">Memuat soal live...</p>
            </div>
          ) : currentQuestion ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${DIFFICULTY_COLORS[currentQuestion.difficulty] ?? ""}`}>
                    {currentQuestion.difficulty}
                  </span>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${isMandatory ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>
                    {isMandatory ? "Wajib Jawab" : "Rebutan"}
                  </span>
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                    Limit: {currentQuestion.timeLimit}s
                  </span>
                </div>

                <Button
                  variant={showAnswer ? "default" : "outline"}
                  size="sm"
                  disabled={countdownNum !== null || timerIsActive}
                  onClick={handleToggleAnswer}
                  className={`rounded-xl font-bold transition-all ${showAnswer ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-primary/50 text-primary hover:bg-primary/10"}`}
                >
                  {showAnswer ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
                  {showAnswer ? "Sembunyikan Jawaban" : "Tampilkan Jawaban"}
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-xl font-extrabold leading-relaxed text-foreground">
                  {currentQuestion.question}
                </p>
                {showAnswer && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      Jawaban:
                    </p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{currentQuestion.answer}</p>
                    {currentQuestion.explanation && (
                      <p className="text-xs text-muted-foreground pt-1 border-t border-emerald-500/20">
                        {currentQuestion.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {timerState.status !== "STOPPED" && timerState.status !== "COUNTDOWN" && currentGQ && currentGQ.status === "UNANSWERED" && !timerIsActive && (
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Penilaian Jawaban ({isMandatory ? `Benar +${correctPoints}` : `Benar +${correctPoints} / Salah ${wrongPoints}`})
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {teams.map((gt) => (
                      <div key={gt.id} className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="text-sm font-bold truncate max-w-30">{gt.team.name}</p>
                        <span className="text-xs text-muted-foreground truncate max-w-30">{gt.team.school}</span>
                        <div className="w-full flex items-center gap-3 mt-2">
                          <InputScoreChange gameTeamId={gt.id} currentGQId={currentGQ.id} broadcastLocal={broadcastLocal} correctScore={correctPoints} wrongScore={wrongPoints} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentGQ && currentGQ.status === "ANSWERED" && (
                <div className="border-t border-border pt-4">
                  <p className={`text-sm font-bold ${currentGQ.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    Dijawab: {currentGQ.isCorrect ? "BENAR" : "SALAH"}
                    {currentGQ.answeredBy && ` oleh ${currentGQ.answeredBy.team.name}`}
                  </p>
                </div>
              )}
            </div>
          ) : game.currentPhase === "HASIL" ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-extrabold flex items-center gap-2 text-foreground">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Penetapan Kelolosan Tim ke Babak Selanjutnya
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tentukan tim yang Lolos atau tidak lolos (Diskualifikasi/Gugur) untuk babak selanjutnya. Tim yang &quot;Tidak Lolos&quot; tidak dapat dimasukkan ke kloter berikutnya.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[...teams]
                  .sort((a, b) => b.score - a.score)
                  .map((gt, i) => (
                    <div
                      key={gt.id}
                      className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all ${!gt.team.qualified
                        ? "border-red-500/40 bg-red-500/5 opacity-80"
                        : i === 0
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-border bg-card"
                        }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-50">
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${i === 0
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                            }`}
                        >
                          #{i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-foreground flex items-center gap-2">
                            {gt.team.name}
                            {gt.team.qualified ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3 w-3" />
                                Lolos
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400">
                                <XCircle className="h-3 w-3" />
                                Tidak Lolos / Diskualifikasi
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{gt.team.school}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xl font-black text-foreground tabular-nums">
                            {gt.score}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                            Poin Akhir
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant={gt.team.qualified ? "destructive" : "outline"}
                          className={`rounded-xl text-xs font-bold transition-all ${!gt.team.qualified
                            ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            : ""
                            }`}
                          onClick={() => handleToggleQualification(gt.team.id, gt.team.qualified)}
                        >
                          {gt.team.qualified ? (
                            <>
                              <XCircle className="h-4 w-4 mr-1.5" />
                              Gugurkan
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1.5" />
                              Loloskan Kembali
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-2">
              <Sparkles className="h-8 w-8 text-primary mx-auto opacity-50" />
              <p className="text-base font-extrabold text-foreground">Belum Ada Soal Dipilih</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Pilih nomor soal pada Fase <strong className="uppercase">{game.currentPhase}</strong> di atas.
              </p>
            </div>
          )}
        </div>

        {/* Live Leaderboard */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                Papan Skor Live
              </p>
            </div>
            <div className="space-y-2.5">
              {[...teams].sort((a, b) => b.score - a.score).map((gt, i) => (
                <div key={gt.id} className={`grid grid-cols-[32px_minmax(0,1fr)_72px] gap-3 rounded-xl border p-3.5 ${!gt.team.qualified ? "border-red-500/30 bg-red-500/5 opacity-70" : i === 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card"
                  }`}>
                  <span className={`inline-flex h-8 items-center justify-center rounded-lg text-xs font-black ${i === 0 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold truncate flex items-center gap-1.5">
                      {gt.team.name}
                      {!gt.team.qualified && (
                        <span className="text-[10px] text-red-500 font-extrabold uppercase">(Gugur)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{gt.team.school}</p>
                  </div>
                  <InputLiveScoreChange gameTeamId={gt.id} score={gt.score} broadcastLocal={broadcastLocal} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
