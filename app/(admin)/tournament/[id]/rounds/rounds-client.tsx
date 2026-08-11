"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Layers,
  Pencil,
  Trash2,
  ChevronLeft,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRound } from "@/server/actions/round";
import RoundForm from "@/components/features/round/round-form";

interface RoundItem {
  id: string;
  name: string;
  order: number;
  groups: { id: string; name: string; order: number; games: { id: string }[] }[];
}

interface RoundListClientProps {
  tournamentId: string;
  tournamentName: string;
  rounds: RoundItem[];
}

export default function RoundListClient({
  tournamentId,
  tournamentName,
  rounds,
}: RoundListClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<{ id: string; name: string; order: number } | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nextOrder = rounds.length > 0 ? Math.max(...rounds.map((r) => r.order)) + 1 : 1;

  const openCreate = () => {
    setEditData(undefined);
    setFormOpen(true);
  };

  const openEdit = (round: RoundItem) => {
    setEditData({ id: round.id, name: round.name, order: round.order });
    setFormOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin hapus babak "${name}"? Semua kloter dan game di babak ini akan ikut terhapus.`)) return;
    setDeletingId(id);
    try {
      await deleteRound(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
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
          <h1 className="mt-0.5 text-2xl font-extrabold">Babak</h1>
        </div>
        <Button size="lg" onClick={openCreate}>
          <Plus />
          Tambah Babak
        </Button>
      </div>

      {/* Babak List */}
      {rounds.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Belum Ada Babak</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambah babak pertama untuk tournament ini.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rounds.map((round) => {
            const totalGroups = round.groups.length;

            return (
              <div
                key={round.id}
                className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">
                    {round.order}
                  </span>
                </div>

                {/* Nama Babak */}
                <h3 className="mt-3 text-lg font-bold leading-tight">{round.name}</h3>

                {/* Jumlah Kloter */}
                <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Grid3X3 className="h-3.5 w-3.5" />
                    {totalGroups} Kloter
                  </span>
                </div>

                {/* Aksi */}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <Link
                    href={`/tournament/${tournamentId}/rounds/${round.id}/groups`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Kelola Kloter
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(round)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    disabled={deletingId === round.id}
                    onClick={() => handleDelete(round.id, round.name)}
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

      {/* Babak Form */}
      <RoundForm
        key={editData?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        tournamentId={tournamentId}
        nextOrder={nextOrder}
        editData={editData}
      />
    </div>
  );
}
