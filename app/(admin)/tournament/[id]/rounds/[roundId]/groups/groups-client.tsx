"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Grid3X3,
  Pencil,
  Trash2,
  ChevronLeft,
  Users,
  Shuffle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteGroup, randomizeTeamsToRound } from "@/server/actions/round";
import GroupForm from "@/components/features/round/group-form";

interface GroupItem {
  id: string;
  name: string;
  order: number;
  games: { id: string; status: string; teams: { team: { name: string; school: string; qualified: boolean } }[] }[];
}

interface GroupsClientProps {
  tournamentId: string;
  roundId: string;
  roundName: string;
  roundOrder: number;
  tournamentName: string;
  groups: GroupItem[];
}

type AnimPhase = "idle" | "shuffling" | "success" | "error";

const TEAM_CARD_COLORS = [
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-indigo-600",
  "from-sky-500 to-cyan-600",
  "from-lime-500 to-green-600",
];

function RandomizeOverlay({
  phase,
  message,
  teamsPerKloter,
  onDone,
}: {
  phase: AnimPhase;
  message: string;
  teamsPerKloter: number;
  onDone: () => void;
}) {
  const [tick, setTick] = useState(0);
  const [dots, setDots] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "shuffling") {
      intervalRef.current = setInterval(() => {
        setTick((t) => t + 1);
        setDots((d) => (d + 1) % 4);
      }, 120);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  if (phase === "idle") return null;

  const dummyCards = Array.from({ length: teamsPerKloter }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background/90 backdrop-blur-xl">

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/10"
            style={{
              width: `${8 + (i % 4) * 6}px`,
              height: `${8 + (i % 4) * 6}px`,
              left: `${(i * 17 + 5) % 94}%`,
              top: `${(i * 13 + 7) % 92}%`,
              animation: `rnd-float ${3 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.4) % 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center rounded-2xl border border-border bg-card px-10 py-10 shadow-2xl">

        {phase === "shuffling" && (
          <>
            <div className="relative mb-7 h-24 w-24">
              <div className="h-24 w-24 rounded-full border-4 border-primary/15" />
              <div
                className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary/40 border-b-transparent border-l-transparent"
                style={{ animation: "rnd-spin 0.75s linear infinite" }}
              />
              <div
                className="absolute inset-3 rounded-full border-[3px] border-t-transparent border-r-transparent border-b-primary/60 border-l-primary/30"
                style={{ animation: "rnd-spin-rev 1.1s linear infinite" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shuffle
                  className="h-7 w-7 text-primary"
                  style={{ animation: "rnd-pulse 0.65s ease-in-out infinite" }}
                />
              </div>
            </div>

            <div className="mb-7 flex gap-2">
              {dummyCards.map((_, i) => (
                <div
                  key={i}
                  className={`h-12 w-8 rounded-md bg-linear-to-br ${TEAM_CARD_COLORS[i % TEAM_CARD_COLORS.length]} opacity-90 shadow-md`}
                  style={{
                    transform: `translateY(${Math.sin(tick * 0.25 + i * 1.1) * 12}px) rotate(${Math.cos(tick * 0.2 + i) * 4}deg)`,
                    transition: "transform 0.1s ease-out",
                  }}
                />
              ))}
            </div>

            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Mengacak Tim{".".repeat(dots + 1)}
            </h2>
            <p className="mt-1.5 max-w-xs text-center text-sm text-muted-foreground">
              Memastikan tim dari sekolah yang sama tidak bertemu dalam satu kloter
            </p>
          </>
        )}

        {(phase === "success" || phase === "error") && (
          <>
            <div
              className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${
                phase === "success"
                  ? "bg-emerald-500/15 ring-4 ring-emerald-400/30"
                  : "bg-destructive/15 ring-4 ring-destructive/30"
              }`}
              style={{ animation: "rnd-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
            >
              {phase === "success" ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-destructive" />
              )}
            </div>
            <h2
              className={`text-xl font-extrabold ${
                phase === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}
            >
              {phase === "success" ? "Pengacakan Selesai!" : "Pengacakan Gagal"}
            </h2>
            <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">{message}</p>
            <Button
              onClick={onDone}
              className="mt-6"
              variant={phase === "success" ? "default" : "destructive"}
            >
              {phase === "success" ? "Lihat Kloter" : "Tutup"}
            </Button>
          </>
        )}
      </div>

      <style>{`
        @keyframes rnd-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes rnd-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rnd-spin-rev {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes rnd-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.82); }
        }
        @keyframes rnd-pop {
          from { transform: scale(0.3); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function GroupsClient({
  tournamentId,
  roundId,
  roundName,
  tournamentName,
  groups,
}: GroupsClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<{ id: string; name: string; order: number } | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [teamsPerKloter, setTeamsPerKloter] = useState(5);
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [animMessage, setAnimMessage] = useState("");

  const nextOrder = groups.length > 0 ? Math.max(...groups.map((g) => g.order)) + 1 : 1;

  const openCreate = () => {
    setEditData(undefined);
    setFormOpen(true);
  };

  const openEdit = (group: GroupItem) => {
    setEditData({ id: group.id, name: group.name, order: group.order });
    setFormOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin hapus kloter "${name}"? Semua game di kloter ini akan ikut terhapus.`)) return;
    setDeletingId(id);
    try {
      await deleteGroup(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRandomize = async () => {
    const existingGroups = groups.length;
    const msg =
      existingGroups > 0
        ? `Ada ${existingGroups} kloter di babak ini. Semua kloter & game akan DIHAPUS dan diganti dengan kloter baru.\n\nLanjutkan?`
        : `Acak ${teamsPerKloter} tim per kloter untuk babak ini?`;

    if (!confirm(msg)) return;

    setAnimPhase("shuffling");
    setAnimMessage("");

    try {
      const result = await randomizeTeamsToRound(roundId, teamsPerKloter);
      setAnimMessage(result.message);
      setAnimPhase("success");
    } catch (err) {
      setAnimMessage("Gagal mengacak tim: " + (err as Error).message);
      setAnimPhase("error");
    }
  };

  const handleAnimDone = () => {
    setAnimPhase("idle");
    setAnimMessage("");
  };

  return (
    <div className="p-8">
      <RandomizeOverlay
        phase={animPhase}
        message={animMessage}
        teamsPerKloter={teamsPerKloter}
        onDone={handleAnimDone}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tournament/${tournamentId}/rounds`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {tournamentName} &middot; {roundName}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold">Pembuatan Kloter</h1>
        </div>
        <Button size="lg" onClick={openCreate}>
          <Plus />
          Tambah Kloter
        </Button>
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-2 py-1">
          <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">
            Tim/Kloter:
          </label>
          <input
            type="number"
            min={2}
            max={20}
            value={teamsPerKloter}
            onChange={(e) => setTeamsPerKloter(Math.max(2, Number(e.target.value)))}
            className="h-8 w-14 rounded-lg border border-border bg-background px-2 text-center text-sm font-bold"
          />
          <Button
            onClick={handleRandomize}
            disabled={animPhase === "shuffling"}
            size="sm"
            title="Acak Tim ke Kloter"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* List kloter */}
      {groups.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Grid3X3 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Belum Ada Kloter</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambah kloter pertama untuk babak ini, atau gunakan fitur Acak Tim.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {groups.map((group) => {
            const totalTeams = new Set(
              group.games.flatMap((g) => g.teams.map((t) => t.team.name))
            ).size;

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">
                        {group.order}
                      </span>
                      <h3 className="text-lg font-bold">{group.name}</h3>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {totalTeams} Tim
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(group)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      disabled={deletingId === group.id}
                      onClick={() => handleDelete(group.id, group.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 rounded-md bg-muted p-3">
                  {group.games.map((game) => (
                    <div key={game.id} className="space-y-3">
                      {game.teams.map((t, i) => (
                        <div key={i}>
                          <h3 className="text-lg font-bold">{t.team.name}</h3>
                          <p className="text-sm text-muted-foreground">{t.team.school}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kloter Form */}
      <GroupForm
        key={editData?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        roundId={roundId}
        nextOrder={nextOrder}
        editData={editData}
      />
    </div>
  );
}
