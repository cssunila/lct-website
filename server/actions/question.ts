"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { QuestionDifficulty, QuestionSession, QuestionKind } from "@/lib/generated/prisma/client";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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

export async function uploadQuestionImage(formData: FormData): Promise<{ url: string }> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new Error("File gambar tidak ditemukan");
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Format file harus berupa gambar (JPG, PNG, WebP, GIF, SVG)");
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("Ukuran gambar maksimal 5MB");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name) || ".png";
  const uniqueName = `question-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "questions");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, uniqueName), buffer);

  return { url: `/uploads/questions/${uniqueName}` };
}

export async function createQuestion(data: CreateQuestionInput) {
  const cleanImage = data.image && data.image.trim() !== "" ? data.image.trim() : null;
  const question = await prisma.question.create({
    data: {
      ...data,
      image: cleanImage,
    },
  });
  revalidatePath(`/tournament/${data.tournamentId}/bank-soal`);
  return question;
}

export async function updateQuestion(id: string, data: Partial<CreateQuestionInput>) {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) throw new Error("Soal tidak ditemukan");

  const updateData: Partial<CreateQuestionInput> = { ...data };
  if (data.image !== undefined) {
    updateData.image = data.image && data.image.trim() !== "" ? data.image.trim() : undefined;
  }

  const question = await prisma.question.update({
    where: { id },
    data: {
      ...updateData,
      image: data.image && data.image.trim() !== "" ? data.image.trim() : null,
    },
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

export async function deleteAllQuestions(tournamentId: string) {
  const result = await prisma.question.deleteMany({ where: { tournamentId } });
  revalidatePath(`/tournament/${tournamentId}/bank-soal`);
  return { count: result.count };
}

export interface ImportQuestionRow {
  question: string;
  answer: string;
  explanation?: string;
  difficulty: "MUDAH" | "SEDANG" | "SUSAH";
  session: "WAJIB" | "REBUTAN";
  kind: "BIASA" | "HITUNGAN";
  timeLimit: number;
  image?: string;
  imageUrl?: string;
}

export async function importQuestions(tournamentId: string, rows: ImportQuestionRow[]) {
  const validDifficulties = ["MUDAH", "SEDANG", "SUSAH"] as const;
  const validSessions = ["WAJIB", "REBUTAN"] as const;
  const validKinds = ["BIASA", "HITUNGAN"] as const;

  const data = rows
    .map((row) => {
      const diff = validDifficulties.includes(row.difficulty) ? row.difficulty : "MUDAH";
      const sess = validSessions.includes(row.session) ? row.session : "WAJIB";
      const knd = validKinds.includes(row.kind) ? row.kind : "BIASA";

      const rawImage = row.image || row.imageUrl;
      let cleanImage: string | null = null;
      if (typeof rawImage === "string" && rawImage.trim() !== "") {
        const trimmed = rawImage.trim();
        if (
          trimmed.startsWith("http://") ||
          trimmed.startsWith("https://") ||
          trimmed.startsWith("/")
        ) {
          cleanImage = trimmed;
        }
      }

      return {
        tournamentId,
        question: String(row.question || "").trim(),
        answer: String(row.answer || "").trim(),
        explanation: row.explanation ? String(row.explanation).trim() : "",
        difficulty: diff,
        session: sess,
        kind: knd,
        timeLimit: Number(row.timeLimit) || 30,
        image: cleanImage,
      };
    })
    .filter((q) => q.question !== "" && q.answer !== "");

  if (data.length === 0) {
    throw new Error("Tidak ada data soal yang valid dalam file JSON.");
  }

  const result = await prisma.question.createMany({ data });
  revalidatePath(`/tournament/${tournamentId}/bank-soal`);
  return { count: result.count };
}
