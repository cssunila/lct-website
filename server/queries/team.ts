import "server-only";

import { prisma } from "@/lib/prisma";

export async function getTeamsByTournament(tournamentId: string) {
  return prisma.team.findMany({
    where: { tournamentId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { games: true },
      },
    },
  });
}

export async function getTeamById(id: string) {
  return prisma.team.findUnique({
    where: { id },
    include: {
      _count: {
        select: { games: true },
      },
    },
  });
}
