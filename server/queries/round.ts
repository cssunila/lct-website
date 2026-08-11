import "server-only";

import { prisma } from "@/lib/prisma";

export async function getRoundsByTournament(tournamentId: string) {
  return prisma.round.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
    include: {
      groups: {
        orderBy: { order: "asc" },
        include: {
          games: true,
        },
      },
    },
  });
}

export async function getRoundById(id: string) {
  return prisma.round.findUnique({
    where: { id },
    include: {
      groups: {
        orderBy: { order: "asc" },
        include: {
          games: {
            include: {
              teams: { include: { team: true } },
            },
          },
        },
      },
    },
  });
}
