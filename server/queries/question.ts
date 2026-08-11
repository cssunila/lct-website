import "server-only";

import { prisma } from "@/lib/prisma";
import type { QuestionDifficulty, QuestionSession, QuestionKind } from "@/lib/generated/prisma/client";


export interface QuestionFilter {
  tournamentId: string;
  search?: string;
  difficulty?: QuestionDifficulty;
  session?: QuestionSession;
  kind?: QuestionKind;
}

export async function getQuestions(filter: QuestionFilter) {
  const where: Record<string, unknown> = {
    tournamentId: filter.tournamentId,
  };

  if (filter.search) {
    where.OR = [
      { question: { contains: filter.search } },
      { answer: { contains: filter.search } },
    ];
  }

  if (filter.difficulty) {
    where.difficulty = filter.difficulty;
  }

  if (filter.session) {
    where.session = filter.session;
  }

  if (filter.kind) {
    where.kind = filter.kind;
  }

  return prisma.question.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { games: true } },
    },
  });
}

export async function getQuestionById(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      _count: { select: { games: true } },
    },
  });
}

export async function getQuestionCount(tournamentId: string) {
  return prisma.question.count({ where: { tournamentId } });
}
