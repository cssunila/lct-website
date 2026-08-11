"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { QuestionDifficulty, QuestionSession, QuestionKind } from "@/lib/generated/prisma/client";

export interface CreateQuestionInput {
  tournamentId: string;
  question: string;
  answer: string;
  explanation?: string;
  difficulty: QuestionDifficulty;
  session: QuestionSession;
  kind: QuestionKind;
  timeLimit: number;
  image?: string;
}

export async function createQuestion(data: CreateQuestionInput) {
  const question = await prisma.question.create({ data });
  revalidatePath(`/tournament/${data.tournamentId}/bank-soal`);
  return question;
}

export async function updateQuestion(id: string, data: Partial<CreateQuestionInput>) {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) throw new Error("Soal tidak ditemukan");

  const question = await prisma.question.update({
    where: { id },
    data,
  });

  revalidatePath(`/tournament/${existing.tournamentId}/bank-soal`);
  return question;
}

export async function deleteQuestion(id: string) {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) throw new Error("Soal tidak ditemukan");

  await prisma.question.delete({ where: { id } });
  revalidatePath(`/tournament/${existing.tournamentId}/bank-soal`);
}

export async function deleteManyQuestions(ids: string[]) {
  if (ids.length === 0) return;

  const first = await prisma.question.findFirst({ where: { id: { in: ids } } });
  if (!first) return;

  await prisma.question.deleteMany({ where: { id: { in: ids } } });
  revalidatePath(`/tournament/${first.tournamentId}/bank-soal`);
}

export interface ImportQuestionRow {
  question: string;
  answer: string;
  explanation?: string;
  difficulty: "MUDAH" | "SEDANG" | "SUSAH";
  session: "WAJIB" | "REBUTAN";
  kind: "BIASA" | "HITUNGAN";
  timeLimit: number;
}

export async function importQuestions(tournamentId: string, rows: ImportQuestionRow[]) {
  const data = rows.map((row) => ({
    tournamentId,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation ?? "",
    difficulty: row.difficulty,
    session: row.session,
    kind: row.kind,
    timeLimit: row.timeLimit,
  }));

  const result = await prisma.question.createMany({ data });
  revalidatePath(`/tournament/${tournamentId}/bank-soal`);
  return { count: result.count };
}
