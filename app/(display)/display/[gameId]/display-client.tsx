"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Zap, ShieldAlert, Trophy, Sparkles } from "lucide-react";
import Image from "next/image";

interface QuestionData {
  id: string;
  question?: string;
  answer?: string;
  explanation?: string | null;
  difficulty: string;
  session: string;
  timeLimit: number;
  image: string | null;
}

interface GameQuestionData {
  id: string;
  order: number;
  status: string;
  isCorrect: boolean | null;
  question: QuestionData | null;
}

interface TeamData {
  id: string;
  score: number;
  team: { id: string; name: string; school: string };
}

interface SettingsData {
  mandatoryCorrectPoint: number;
  mandatoryWrongPoint: number;
  buzzerCorrectPoint: number;
  buzzerWrongPoint: number;
}

interface GameDisplayClientProps {
  gameId: string;
  game: {
    id: string;
    status: string;
    currentPhase: string;
    currentQuestionId: string | null;
    questions: GameQuestionData[];
    teams: TeamData[];
    group: {
      name: string;
      round: {
        name: string;
        tournament: {
          name: string;
          settings: SettingsData | null;
        };
      };
    };
  } | null;
}

function useSoundSystem() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current && ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playBeep = useCallback((frequency = 880, duration = 0.15) => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { console.error(e); }
  }, [getCtx]);

  const playWarning = useCallback(() => playBeep(1200, 0.2), [playBeep]);
  const playEnd = useCallback(() => {
    playBeep(600, 0.5);
    setTimeout(() => playBeep(400, 0.6), 300);
  }, [playBeep]);

  const playCountdownBeep = useCallback((n: number) => {
    if (n > 0) playBeep(880, 0.12);
    else playBeep(1320, 0.4);
  }, [playBeep]);

  const playPhaseFanfare = useCallback((phase: string) => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const freqs = phase === "REBUTAN"
        ? [440, 554.37, 659.25, 880, 1108.73]
        : phase === "WAJIB"
          ? [523.25, 659.25, 783.99, 1046.5]
          : [392, 493.88, 587.33, 783.99, 987.77];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.01, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.9);
      });
    } catch (err) { console.error(err); }
  }, [getCtx]);

  return { playWarning, playEnd, playCountdownBeep, playPhaseFanfare };
}

interface EventScoreUpdate {
  teamId: string;
  scoreChange: number;
  type: "CORRECT" | "WRONG" | "CHANGE";
}


export default function GameDisplayClient({ gameId, game: initialGame }: GameDisplayClientProps) {
  const [game, setGame] = useState(initialGame);
  const [eventScoreUpdated, setEventScoreUpdated] = useState<EventScoreUpdate | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [questionVisible, setQuestionVisible] = useState(false);

  const [phaseAnnouncement, setPhaseAnnouncement] = useState<string | null>(null);
  const prevPhaseRef = useRef<string | null>(initialGame?.currentPhase ?? null);

  const [timerStatus, setTimerStatus] = useState<string>("STOPPED");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState(30);

  const [displayTimer, setDisplayTimer] = useState(30);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const lastWarningBeep = useRef<number | null>(null);
  const prevCountdownNum = useRef<number | null>(null);
  const hasPlayedEndBeepRef = useRef<boolean>(false);

  const { playWarning, playEnd, playCountdownBeep, playPhaseFanfare } = useSoundSystem();

  const triggerPhaseAnimation = useCallback((newPhase: string) => {
    setPhaseAnnouncement(newPhase);
    playPhaseFanfare(newPhase);
    const t = setTimeout(() => setPhaseAnnouncement(null), 3800);
    return () => clearTimeout(t);
  }, [playPhaseFanfare]);

  useEffect(() => {
    const es = new EventSource(`/api/game/${gameId}/stream?forDisplay=true`);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.liveState) {
          setShowAnswer(msg.liveState.showAnswer);
          setQuestionVisible(msg.liveState.questionVisible);
          setTimerStatus(msg.liveState.timer.status);
          setEndsAt(msg.liveState.timer.endsAt);
          setCountdownEndsAt(msg.liveState.timer.countdownEndsAt);
          setTimerRemaining(msg.liveState.timer.remaining);

          if (
            msg.liveState.timer.status === "COUNTDOWN" ||
            (msg.liveState.timer.status === "RUNNING" &&
              msg.liveState.timer.endsAt &&
              msg.liveState.timer.endsAt > Date.now() + 1000)
          ) {
            hasPlayedEndBeepRef.current = false;
          }
        }

        if (msg.game) {
          setGame(msg.game);
          if (msg.eventType === "SCORE_UPDATED") {
            setEventScoreUpdated(msg.team as EventScoreUpdate);
            const timeout = setTimeout(() => {
              setEventScoreUpdated(null);
              clearTimeout(timeout);
            }, 2000);
          }

          if (msg.eventType === "PHASE_CHANGED" && msg.game.currentPhase && msg.game.currentPhase !== prevPhaseRef.current) {
            prevPhaseRef.current = msg.game.currentPhase;
            triggerPhaseAnimation(msg.game.currentPhase);
          }
        }
      } catch (err) {
        console.error("Display SSE parse error", err);
      }
    };

    return () => es.close();
  }, [gameId, triggerPhaseAnimation]);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const bc = new BroadcastChannel(`lct-game-${gameId}`);
    bc.onmessage = async (e) => {
      if (!e.data || e.data.gameId !== gameId) return;

      if (e.data.type === "PHASE_CHANGED" && e.data.payload?.phase) {
        const phase = e.data.payload.phase;
        if (phase !== prevPhaseRef.current) {
          prevPhaseRef.current = phase;
          triggerPhaseAnimation(phase);
        }
      }

      try {
        const res = await fetch(`/api/game/${gameId}?forDisplay=true`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.game) setGame(data.game);
        if (data.liveState) {
          setShowAnswer(data.liveState.showAnswer);
          setQuestionVisible(data.liveState.questionVisible);
          setTimerStatus(data.liveState.timer.status);
          setEndsAt(data.liveState.timer.endsAt);
          setCountdownEndsAt(data.liveState.timer.countdownEndsAt);
          setTimerRemaining(data.liveState.timer.remaining);

          if (
            data.liveState.timer.status === "COUNTDOWN" ||
            (data.liveState.timer.status === "RUNNING" &&
              data.liveState.timer.endsAt &&
              data.liveState.timer.endsAt > Date.now() + 1000)
          ) {
            hasPlayedEndBeepRef.current = false;
          }
        }
      } catch { /* ignore */ }
    };

    return () => bc.close();
  }, [gameId, triggerPhaseAnimation]);

  useEffect(() => {
    if (timerStatus === "COUNTDOWN" && countdownEndsAt) {
      const countdownTarget = countdownEndsAt;
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((countdownTarget - now) / 1000);
        const displayDiff = diff > 0 ? diff : 0;
        setCountdownNum(displayDiff);

        if (displayDiff !== prevCountdownNum.current) {
          prevCountdownNum.current = displayDiff;
          playCountdownBeep(displayDiff);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    if (timerStatus === "RUNNING" && endsAt) {
      (async () => {
        setCountdownNum(null);
      })();
      prevCountdownNum.current = null;
      lastWarningBeep.current = null;

      const endTarget = endsAt;
      const maxDisplay = timerRemaining;
      const initialDiff = Math.min(maxDisplay, Math.max(0, Math.ceil((endTarget - Date.now()) / 1000)));
      (async () => {
        setDisplayTimer(initialDiff);
      })();

      if (initialDiff === 0) {
        if (!hasPlayedEndBeepRef.current) {
          hasPlayedEndBeepRef.current = true;
          playEnd();
        }
        (async () => {
          setTimerRemaining(0);
          setDisplayTimer(0);
          setTimerStatus("EXPIRED");
        })();
        return;
      }

      const interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.min(maxDisplay, Math.max(0, Math.ceil((endTarget - now) / 1000)));
        setDisplayTimer(diff);

        if (diff <= 5 && diff > 0 && lastWarningBeep.current !== diff) {
          lastWarningBeep.current = diff;
          playWarning();
        }

        if (diff === 0) {
          clearInterval(interval);
          if (!hasPlayedEndBeepRef.current) {
            hasPlayedEndBeepRef.current = true;
            playEnd();
          }
          (async () => {
            setTimerRemaining(0);
            setDisplayTimer(0);
            setTimerStatus("EXPIRED");
          })();
        }
      }, 200);
      return () => clearInterval(interval);
    }

    if (timerStatus === "EXPIRED") {
      (async () => {
        setCountdownNum(null);
        setDisplayTimer(0);
      })();
      
      return;
    }

    (async () => {
      setCountdownNum(null);
      setDisplayTimer(timerRemaining);
    })();
  }, [timerStatus, endsAt, countdownEndsAt, timerRemaining, playWarning, playEnd, playCountdownBeep]);


  const currentQ = game?.questions.find((q) => q.id === game.currentQuestionId) ?? null;
  const questionData = currentQ?.question ?? null;

  const showQuestionText = questionVisible && !!questionData?.question;

  if (!game) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#070709]">
        <p className="text-2xl font-bold text-white/50 animate-pulse">Memuat game LCT...</p>
      </div>
    );
  }

  const isWarning = displayTimer <= 5 && displayTimer > 0 && timerStatus === "RUNNING";
  const isExpired = timerStatus === "EXPIRED";

  const sortedTeams = [...game.teams].sort((a, b) => b.score - a.score);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#070709] text-white select-none">
      {phaseAnnouncement && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in-90 duration-500">
          <div className="relative flex flex-col items-center text-center space-y-6 px-8 max-w-4xl">
            <div className={`absolute -inset-10 rounded-full blur-3xl opacity-40 animate-pulse ${phaseAnnouncement === "REBUTAN" ? "bg-red-600"
              : phaseAnnouncement === "WAJIB" ? "bg-amber-500"
                : "bg-blue-600"}`}
            />
            <div className="relative inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-2 border border-white/20 shadow-2xl backdrop-blur-md">
              {phaseAnnouncement === "REBUTAN" ? (
                <Zap className="h-6 w-6 text-red-500 animate-bounce" />
              ) : phaseAnnouncement === "WAJIB" ? (
                <ShieldAlert className="h-6 w-6 text-amber-400 animate-bounce" />
              ) : (
                <Trophy className="h-6 w-6 text-blue-400 animate-bounce" />
              )}
              <span className="text-sm font-black uppercase tracking-widest text-white">
                Fase Pertandingan Dimulai
              </span>
            </div>
            <h2 className="relative text-6xl lg:text-7xl font-black tracking-tight text-white uppercase drop-shadow-2xl">
              {phaseAnnouncement === "WAJIB" ? "SESI SOAL WAJIB"
                : phaseAnnouncement === "REBUTAN" ? "SESI SOAL REBUTAN"
                  : phaseAnnouncement === "HASIL" ? "PENGUMUMAN HASIL AKHIR"
                    : `FASE: ${phaseAnnouncement}`}
            </h2>
            <p className="relative text-xl lg:text-2xl font-bold text-white/80 max-w-2xl leading-relaxed">
              {phaseAnnouncement === "WAJIB" ? "Setiap tim akan menjawab soal yang telah disiapkan. Bersiaplah!"
                : phaseAnnouncement === "REBUTAN" ? "Tekan tombol secepat mungkin! Jawaban benar mendapatkan point jika salah point akan berkurang."
                  : "Pertandingan telah selesai. Mari lihat hasil akhir dan pemenang!"}
            </p>
          </div>
        </div>
      )}

      {countdownNum !== null && countdownNum > 0 && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <p className="text-lg font-black uppercase tracking-widest text-white/70 mb-4">Bersiap...</p>
          <span className="font-black text-[14rem] leading-none text-white drop-shadow-2xl tabular-nums" style={{
            textShadow: "0 0 60px rgba(255,255,255,0.5), 0 0 120px rgba(255,200,0,0.4)",
          }}>
            {countdownNum}
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 bg-white/2 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black tracking-wider text-amber-400 uppercase">
            {game.group.round.tournament.name}
          </span>
          <span className="rounded-xl bg-white/10 px-3.5 py-1 text-sm font-extrabold text-white/90">
            {game.group.round.name}
          </span>
          <span className="rounded-xl bg-white/10 px-3.5 py-1 text-sm font-extrabold text-white/70">
            {game.group.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {game.currentPhase && (
            <span className={`rounded-xl px-4 py-1 text-xs font-black uppercase tracking-widest border ${game.currentPhase === "WAJIB" ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : game.currentPhase === "REBUTAN" ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>
              Fase: {game.currentPhase}
            </span>
          )}
        </div>
      </div>

      <div className={`relative flex flex-1 flex-col items-center px-8 py-6 gap-6 ${game.currentPhase === "HASIL" ? "overflow-y-auto justify-start" : "overflow-hidden justify-center"}`}>
        {game.currentPhase === "HASIL" ? (
          <div className="w-full max-w-6xl flex flex-col items-center justify-center space-y-8 px-4 animate-in fade-in zoom-in-95 duration-700">
            {/* Header / Title */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-amber-500/10 px-6 py-2 border border-amber-500/30 shadow-2xl backdrop-blur-md">
                <Trophy className="h-6 w-6 text-amber-400 animate-bounce" />
                <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                  Pengumuman Pemenang & Hasil Akhir
                </span>
              </div>

              <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-tight text-white drop-shadow-2xl">
                Hasil Akhir Pertandingan
              </h1>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-5xl">
              {sortedTeams[1] ? (
                <div className="order-2 md:order-1 flex flex-col items-center rounded-3xl border border-slate-300/30 bg-linear-to-b from-slate-400/20 via-slate-500/10 to-transparent p-6 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105 animate-in slide-in-from-bottom-8 duration-700">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-300/20 text-slate-200 font-black text-xl border border-slate-300/40 mb-4 shadow-lg">
                    2
                  </div>
                  <p className="text-xl font-extrabold text-white text-center truncate w-full">
                    {sortedTeams[1].team.name}
                  </p>
                  <p className="text-xs font-bold text-white/50 text-center truncate w-full mb-6">
                    {sortedTeams[1].team.school}
                  </p>
                  <div className="w-full rounded-2xl bg-slate-400/15 border border-slate-400/30 py-3 text-center">
                    <span className="text-4xl font-black text-slate-200 tabular-nums">
                      {sortedTeams[1].score}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mt-0.5">Poin</span>
                  </div>
                </div>
              ) : <div className="order-2 md:order-1" />}

              {sortedTeams[0] && (
                <div className="order-1 md:order-2 flex flex-col items-center rounded-3xl border-2 border-amber-400/60 bg-linear-to-b from-amber-500/30 via-yellow-500/15 to-amber-500/5 p-8 shadow-[0_0_60px_rgba(245,158,11,0.3)] backdrop-blur-xl transition-transform hover:scale-105 animate-in zoom-in-90 duration-700 relative">
                  <div className="absolute -top-7 rounded-full bg-linear-to-r from-amber-400 to-yellow-500 p-3 shadow-xl ring-4 ring-[#070709]">
                    <Trophy className="h-8 w-8 text-black fill-black" />
                  </div>

                  <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300 font-black text-2xl border border-amber-400/40 mb-4 shadow-xl">
                    1
                  </div>
                  <p className="text-2xl lg:text-3xl font-black text-amber-300 text-center truncate w-full drop-shadow-md">
                    {sortedTeams[0].team.name}
                  </p>
                  <p className="text-xs font-bold text-amber-200/60 text-center truncate w-full mb-6">
                    {sortedTeams[0].team.school}
                  </p>
                  <div className="w-full rounded-2xl bg-amber-400/20 border border-amber-400/40 py-4 text-center shadow-inner">
                    <span className="text-5xl lg:text-6xl font-black text-amber-300 tabular-nums">
                      {sortedTeams[0].score}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/80 block mt-1">Poin Utama</span>
                  </div>
                </div>
              )}

              {sortedTeams[2] ? (
                <div className="order-3 flex flex-col items-center rounded-3xl border border-amber-700/40 bg-linear-to-b from-amber-800/20 via-amber-900/10 to-transparent p-6 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105 animate-in slide-in-from-bottom-6 duration-700">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-800/30 text-amber-400 font-black text-xl border border-amber-700/40 mb-4 shadow-lg">
                    3
                  </div>
                  <p className="text-xl font-extrabold text-white text-center truncate w-full">
                    {sortedTeams[2].team.name}
                  </p>
                  <p className="text-xs font-bold text-white/50 text-center truncate w-full mb-6">
                    {sortedTeams[2].team.school}
                  </p>
                  <div className="w-full rounded-2xl bg-amber-800/20 border border-amber-700/30 py-3 text-center">
                    <span className="text-4xl font-black text-amber-400 tabular-nums">
                      {sortedTeams[2].score}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block mt-0.5">Poin</span>
                  </div>
                </div>
              ) : <div className="order-3" />}
            </div>

            {sortedTeams.length > 3 && (
              <div className="w-full max-w-3xl space-y-2 pt-2">
                {sortedTeams.slice(3).map((gt, idx) => (
                  <div
                    key={gt.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-3 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-white/70">
                        {idx + 4}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{gt.team.name}</p>
                        <p className="text-xs text-white/40 truncate">{gt.team.school}</p>
                      </div>
                    </div>
                    <span className="text-xl font-black text-amber-400 tabular-nums shrink-0">
                      {gt.score} <span className="text-xs font-semibold text-white/40">Poin</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : showQuestionText ? (
          <div className="w-full max-w-6xl text-center space-y-6 flex flex-col items-center animate-in fade-in duration-300">
            {questionData!.image && (
              <div className="flex justify-center">
                <Image
                  src={questionData!.image}
                  alt="Gambar soal"
                  width={500}
                  height={500}
                  className="max-h-[25vh] w-auto rounded-2xl border border-white/20 object-contain shadow-2xl"
                />
              </div>
            )}

            <p className="w-full text-3xl max-h-[38vh] overflow-y-auto px-8 py-6 rounded-3xl bg-white/4 border border-white/10 font-black leading-snug tracking-wide text-white lg:text-4xl shadow-xl">
              {questionData!.question}
            </p>

            <div className="flex items-center justify-center gap-3 py-2">
              <Clock className={`h-8 w-8 ${isWarning ? "text-red-500 animate-bounce" : isExpired ? "text-red-500/60" : "text-amber-400"}`} />
              <span className={`font-mono font-black text-6xl lg:text-7xl tabular-nums leading-none transition-all ${isWarning ? "text-red-500 scale-110 animate-pulse"
                : isExpired ? "text-red-500/60"
                  : "text-white"}`}>
                {isExpired ? "00" : String(displayTimer).padStart(2, "0")}
              </span>
            </div>

            {showAnswer && questionData!.answer && (
              <div className="w-full max-w-4xl space-y-2 rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/15 p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
                <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Jawaban Benar:</p>
                <p className="text-4xl font-black text-emerald-300 lg:text-5xl">{questionData!.answer}</p>
                {questionData!.explanation && (
                  <p className="text-lg text-white/70 pt-2 border-t border-emerald-500/20">{questionData!.explanation}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-6 max-w-4xl px-6 animate-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2 border border-white/10 shadow-xl">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-widest text-white/80">
                Lomba Cepat Tepat Komputer (LCT-K)
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-5xl lg:text-6xl font-black tracking-tight text-white uppercase drop-shadow-lg">
                {game.currentPhase === "WAJIB" ? "SESI SOAL WAJIB"
                  : game.currentPhase === "REBUTAN" ? "SESI SOAL REBUTAN"
                    : "PERSIAPAN PERTANDINGAN"}
              </h2>
              <p className="text-xl font-bold text-white/50">
                {currentQ
                  ? "Soal dipilih — tunggu operator mulai timer..."
                  : game.currentPhase === "WAJIB" || game.currentPhase === "REBUTAN"
                    ? "Menunggu Operator Memilih Soal..."
                    : "Menunggu Pertandingan Dimulai"}
              </p>
            </div>
          </div>
        )}
      </div>

      {game.currentPhase !== "HASIL" && (
        <div className="flex flex-wrap items-stretch border-t border-white/10 bg-white/2 backdrop-blur-lg">
          {game.teams.map((gt, i) => (
            <div key={gt.id} className={`relative flex flex-1 max-w-96 items-center justify-between px-5 py-4 ${i > 0 ? "border-l border-white/10" : ""}`}>
              {eventScoreUpdated && eventScoreUpdated.teamId === gt.id && (eventScoreUpdated.scoreChange > 0 || eventScoreUpdated.type === "CHANGE") && <div className={`absolute left-1/2 transition-all duration-500 -translate-x-1/2 ${eventScoreUpdated.teamId === gt.id ? "-top-13 opacity-100" : "opacity-0 top-0"} border ${eventScoreUpdated.type === "CORRECT" ? "border-green-500/10 bg-green-500/15" : eventScoreUpdated.type === "WRONG" ? "border-red-500/10 bg-red-500/15" : "border-yellow-500/10 bg-yellow-500/15"} px-3 py-2 rounded-2xl`}>
                <span className={`font-black text-xl ${eventScoreUpdated.type === "CORRECT" ? "text-green-500" : eventScoreUpdated.type === "WRONG" ? "text-red-500" : "text-yellow-500"}`}>{eventScoreUpdated.type === "CORRECT" ? `+${eventScoreUpdated.scoreChange}` : eventScoreUpdated.type === "WRONG" ? `-${eventScoreUpdated.scoreChange}` : `${eventScoreUpdated.scoreChange}`}</span>
              </div>}
              <div className="flex flex-col items-center gap-3 justify-center w-full">
                <span className="text-lg text-center font-extrabold leading-tight lg:text-xl text-white truncate max-w-53">
                  {gt.team.name}
                </span>
                {/* <span className="text-xs font-semibold text-white/40 truncate max-w-40">{gt.team.school}</span> */}
                <div className="flex flex-col items-center rounded-2xl bg-linear-to-b from-white/15 to-white/5 border border-white/10 px-6 py-2 min-w-27.5 shadow-lg">
                  <span className="text-4xl font-black tabular-nums text-amber-400">{gt.score}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Poin</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
