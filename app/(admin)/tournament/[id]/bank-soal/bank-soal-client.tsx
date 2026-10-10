"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Download, Upload, X, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import QuestionTable from "@/components/features/question/question-table";
import type { QuestionRow } from "@/components/features/question/question-table";
import QuestionForm from "@/components/features/question/question-form";
import QuestionImport from "@/components/features/question/question-import";
import { deleteAllQuestions } from "@/server/actions/question";

interface BankSoalClientProps {
  tournamentId: string;
  tournamentName: string;
  initialQuestions: QuestionRow[];
}

const ALL = "ALL";

export default function BankSoalClient({
  tournamentId,
  tournamentName,
  initialQuestions: questions,
}: BankSoalClientProps) {
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState(ALL);
  const [filterSession, setFilterSession] = useState(ALL);
  const [filterKind, setFilterKind] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<QuestionRow | null>(null);
  const [importing, setImporting] = useState(false);
  const [formOpenImport, setFormOpenImport] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        !search ||
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        q.answer.toLowerCase().includes(search.toLowerCase());
      const matchDifficulty = filterDifficulty === ALL || q.difficulty === filterDifficulty;
      const matchSession = filterSession === ALL || q.session === filterSession;
      const matchKind = filterKind === ALL || q.kind === filterKind;
      return matchSearch && matchDifficulty && matchSession && matchKind;
    });
  }, [questions, search, filterDifficulty, filterSession, filterKind]);

  const handleEdit = (q: QuestionRow) => {
    setEditData(q);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditData(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditData(null);
  };

  const handleExport = () => {
    const data = questions.map((q) => ({
      question: q.question,
      answer: q.answer,
      explanation: q.explanation ?? "",
      difficulty: q.difficulty,
      session: q.session,
      kind: q.kind,
      timeLimit: q.timeLimit,
      image: q.image || "",
      answerImage: q.answerImage || "",
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bank-soal-${tournamentName.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    if (!confirm("Yakin ingin menghapus SEMUA soal dalam turnamen ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setDeletingAll(true);
    try {
      await deleteAllQuestions(tournamentId);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus semua soal.");
    } finally {
      setDeletingAll(false);
    }
  };

  const hasActiveFilter =
    filterDifficulty !== ALL || filterSession !== ALL || filterKind !== ALL || search !== "";

  const clearFilters = () => {
    setFilterDifficulty(ALL);
    setFilterSession(ALL);
    setFilterKind(ALL);
    setSearch("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 md:px-8 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {tournamentName}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold">Bank Soal</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={handleExport}
            disabled={questions.length === 0}
          >
            <Download />
            Export
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setFormOpenImport(true)}
            disabled={importing}
          >
            <Upload />
            {importing ? "Mengimpor..." : "Import"}
          </Button>
          <Button size="lg" onClick={handleAdd}>
            <Plus />
            Tambah Soal
          </Button>
          <Button
            size="lg"
            disabled={deletingAll || questions.length === 0}
            className="bg-destructive/10 border border-destructive text-destructive hover:bg-destructive/20 hover:text-destructive"
            onClick={handleDeleteAll}
          >
            <Trash />
            {deletingAll ? "Menghapus..." : "Hapus Semua"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-8 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari soal..."
            className="h-8 w-64 pl-8"
          />
        </div>

        <Select value={filterDifficulty} onValueChange={(v) => v && setFilterDifficulty(v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Kesulitan</SelectItem>
            <SelectItem value="MUDAH">Mudah</SelectItem>
            <SelectItem value="SEDANG">Sedang</SelectItem>
            <SelectItem value="SUSAH">Susah</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSession} onValueChange={(v) => v && setFilterSession(v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Sesi</SelectItem>
            <SelectItem value="WAJIB">Wajib Jawab</SelectItem>
            <SelectItem value="REBUTAN">Rebutan</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterKind} onValueChange={(v) => v && setFilterKind(v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Jenis</SelectItem>
            <SelectItem value="BIASA">Biasa</SelectItem>
            <SelectItem value="HITUNGAN">Hitungan</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"
          >
            <X size={12} />
            Reset
          </button>
        )}

        <span className="ml-auto text-xs font-medium text-muted-foreground">
          {filtered.length} dari {questions.length} soal
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <QuestionTable questions={filtered} onEdit={handleEdit} />
      </div>

      {/* Form Dialog Import */}
      <QuestionImport
        tournamentId={tournamentId}
        open={formOpenImport}
        onOpenChange={setFormOpenImport}
        setImporting={setImporting}
        importing={importing}
      />

      {/* Form Dialog */}
      <QuestionForm
        key={editData?.id ?? "new"}
        open={formOpen}
        onOpenChange={handleFormClose}
        tournamentId={tournamentId}
        editData={editData}
      />
    </div>
  );
}
