"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  ChevronLeft,
  Search,
  Upload,
  Download,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAllTeams, deleteTeam } from "@/server/actions/team";
import TeamForm from "@/components/features/team/team-form";
import TeamImport from "@/components/features/team/team-import";

interface TeamItem {
  id: string;
  name: string;
  school: string;
  qualified: boolean;
  _count: { games: number };
}

interface TeamsClientProps {
  tournamentId: string;
  tournamentName: string;
  teams: TeamItem[];
}

export default function TeamsClient({
  tournamentId,
  tournamentName,
  teams,
}: TeamsClientProps) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<{ id: string; name: string; school: string } | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter(
      (t) => t.name.toLowerCase().includes(q) || t.school.toLowerCase().includes(q)
    );
  }, [teams, search]);

  const openCreate = () => {
    setEditData(undefined);
    setFormOpen(true);
  };

  const openEdit = (team: TeamItem) => {
    setEditData({ id: team.id, name: team.name, school: team.school });
    setFormOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin hapus tim "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deleteTeam(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    const data = teams.map((t) => ({ name: t.name, school: t.school }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teams-${tournamentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAllTeams = async () => {
    if (!confirm("Yakin hapus semua tim?")) return;
    setDeletingId(tournamentId);
    try {
      await deleteAllTeams(tournamentId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
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
          <h1 className="mt-0.5 text-2xl font-extrabold">Tim Peserta</h1>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama tim atau sekolah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-muted-foreground">
            {filtered.length} dari {teams.length} tim
          </span>
          <Button variant="outline" onClick={handleExport} disabled={teams.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button disabled={importing} variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button onClick={openCreate}>
            <Plus />
            Tambah Tim
          </Button>
          <Button disabled={deletingId === tournamentId || teams.length === 0} className={"bg-destructive/10 border border-destructive text-destructive hover:bg-destructive/20 hover:text-destructive"} onClick={handleDeleteAllTeams}>
            <Trash />
            Hapus Semua
          </Button>
        </div>
      </div>

      {/* Team List */}
      {teams.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Belum Ada Tim</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftarkan tim sekarang.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 text-center text-sm text-muted-foreground">
          Tidak ada tim yang cocok dengan pencarian.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((team) => (
            <div
              key={team.id}
              className={`group flex flex-col rounded-2xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-sm ${team.qualified ? "bg-card" : "bg-black/5"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold leading-tight truncate">{team.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{team.school}</p>
                </div>
                {!team.qualified &&
                  <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold ${team.qualified ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
                    }`}>
                    Tidak Lolos
                  </span>
                }
              </div>

              {/* Aksi */}
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <Button variant="ghost" size="sm" onClick={() => openEdit(team)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === team.id}
                  onClick={() => handleDelete(team.id, team.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Form */}
      <TeamImport
        tournamentId={tournamentId}
        open={importOpen}
        onOpenChange={setImportOpen}
        setImporting={setImporting}
        importing={importing}
      />

      {/* Team Form */}
      <TeamForm
        key={editData?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        tournamentId={tournamentId}
        editData={editData}
      />
    </div>
  );
}
