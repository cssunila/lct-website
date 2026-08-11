import "server-only";

import { prisma } from "@/lib/prisma";

export async function getAllTournaments() {
  return prisma.tournament.findMany({
    orderBy: { year: "desc" },
    include: {
      settings: true,
      _count: {
        select: {
          teams: true,
          questions: true,
          rounds: true,
        },
      },
    },
  });
}

export async function getTournamentById(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: { settings: true },
  });
}

export async function getTournamentWithSetting(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      settings: true,
      _count: {
        select: {
          teams: true,
          questions: true,
          rounds: true,
        },
      },
    },
  });
}

export async function getActiveTournament() {
  return prisma.tournament.findFirst({
    where: { status: "ACTIVE" },
    include: { settings: true },
  });
}
