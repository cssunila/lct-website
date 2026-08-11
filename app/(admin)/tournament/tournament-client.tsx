"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trophy, Users, BookOpen, Layers, Trash2, CheckCircle, FileEdit, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import TournamentForm from "@/components/features/tournament/tournament-form";
import { deleteTournament, updateTournament } from "@/server/actions/tournament";

interface TournamentItem {
  id: string;
  name: string;
  year: number;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  _count: { teams: number; questions: number; rounds: number };
}

interface TournamentListClientProps {
  tournaments: TournamentItem[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileEdit },
  ACTIVE: { label: "Aktif", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: CheckCircle },
  FINISHED: { label: "Selesai", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400", icon: Archive },
};

export default function TournamentListClient({ tournaments }: TournamentListClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin hapus tournament "${name}"? Semua data terkait akan ikut terhapus.`)) return;
    setDeletingId(id);
    try {
      await deleteTournament(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleActivate = async (id: string) => {
    await updateTournament(id, { status: "ACTIVE" });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Manajemen</p>
          <h1 className="mt-1 text-2xl font-extrabold">Tournament</h1>
        </div>
        <Button size="lg" onClick={() => setFormOpen(true)}>
          <Plus />
          Buat Tournament
        </Button>
      </header>

      {/* List tournament */}
      {tournaments.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Belum Ada Tournament</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat tournament.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            const status = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.DRAFT;
            const StatusIcon = status.icon;
            return (
              <div
                key={t.id}
                className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${status.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{t.year}</span>
                </div>

                {/* Nama tournament */}
                <h3 className="mt-3 text-lg font-bold leading-tight">{t.name}</h3>

                {/* Jumlah tim, soal, dan babak */}
                <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {t._count.teams} Tim
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {t._count.questions} Soal
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    {t._count.rounds} Babak
                  </span>
                </div>

                {/* Aksi tournament */}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <Link
                    href={`/tournament/${t.id}/settings`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Kelola
                  </Link>
                  {t.status === "DRAFT" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivate(t.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Aktivasi
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    disabled={deletingId === t.id}
                    onClick={() => handleDelete(t.id, t.name)}
                    className="ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TournamentForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
