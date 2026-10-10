"use client";

import { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Pencil, Trash2, Clock, Image as ImageIcon } from "lucide-react";
import IconBtn from "@/components/ui/iconButton";
import { deleteQuestion } from "@/server/actions/question";
import type { CreateQuestionInput } from "@/server/actions/question";

export interface QuestionRow extends CreateQuestionInput {
  id: string;
  _count?: { games: number };
}

interface QuestionTableProps {
  questions: QuestionRow[];
  onEdit: (question: QuestionRow) => void;
}

const DIFFICULTY_LABEL: Record<string, { label: string; className: string }> = {
  MUDAH: { label: "Mudah", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0" },
  SEDANG: { label: "Sedang", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0" },
  SUSAH: { label: "Susah", className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-0" },
};

const SESSION_LABEL: Record<string, string> = {
  WAJIB: "Wajib",
  REBUTAN: "Rebutan",
};

const KIND_LABEL: Record<string, string> = {
  BIASA: "Biasa",
  HITUNGAN: "Hitungan",
};

export default function QuestionTable({ questions, onEdit }: QuestionTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus soal ini?")) return;
    setDeletingId(id);
    try {
      await deleteQuestion(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Belum ada soal. Tambah soal pertama Anda.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-center">No</TableHead>
          <TableHead className="min-w-70">Pertanyaan</TableHead>
          <TableHead>Jawaban</TableHead>
          <TableHead>Kesulitan</TableHead>
          <TableHead>Sesi</TableHead>
          <TableHead>Jenis</TableHead>
          <TableHead className="text-center">Waktu</TableHead>
          <TableHead className="w-22 text-center">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {questions.map((q, i) => {
          const diff = DIFFICULTY_LABEL[q.difficulty] ?? DIFFICULTY_LABEL.MEDIUM;
          return (
            <TableRow key={q.id}>
              <TableCell className="text-center text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell className="max-w-[320px] font-medium">
                <div className="flex items-center gap-2 min-w-0">
                  {q.image && (
                    <span title="Soal memiliki gambar" className="inline-flex items-center justify-center rounded p-1 bg-primary/10 text-primary shrink-0">
                      <ImageIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate">{q.question}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-44">
                {q.answerImage ? (
                  <div className="flex items-center gap-1.5" title="Jawaban berupa gambar">
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      <ImageIcon className="h-3 w-3" />
                      Gambar
                    </span>
                  </div>
                ) : (
                  <span className="truncate block">{q.answer}</span>
                )}
              </TableCell>
              <TableCell>
                <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${diff.className}`}>
                  {diff.label}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium">
                  {SESSION_LABEL[q.session] ?? q.session}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {KIND_LABEL[q.kind] ?? q.kind}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1 text-xs tabular text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {q.timeLimit}s
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <IconBtn
                    aria-label="Edit soal"
                    onClick={() => onEdit(q)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn
                    aria-label="Hapus soal"
                    danger
                    disabled={deletingId === q.id}
                    onClick={() => handleDelete(q.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
