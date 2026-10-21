import "server-only";

import { prisma } from "@/lib/prisma";

export async function getGameById(id: string) {
  return prisma.game.findUnique({
    where: { id },
    include: {
      group: { include: { round: true } },
      teams: {
        include: { team: true },
        orderBy: [{ score: "desc" }, { lastScoreAt: "asc" }],
      },
      questions: {
        include: { question: true, answeredBy: { include: { team: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function getGamesByGroup(groupId: string) {
  return prisma.game.findMany({
    where: { groupId },
    include: {
      teams: { include: { team: true } },
    },
  });
}

export async function getGamesByTournament(tournamentId: string) {
  return prisma.game.findMany({
    where: { group: { round: { tournamentId } } },
    include: {
      group: { include: { round: true } },
      teams: {
        include: { team: true },
        orderBy: [{ score: "desc" }, { lastScoreAt: "asc" }],
      },
      _count: {
        select: { questions: true },
      },
    },
    orderBy: {
      group: { round: { order: "asc" } },
    },
  });
}

export async function getGameForDisplay(id: string) {
  return prisma.game.findUnique({
    where: { id },
    include: {
      group: {
        include: {
          round: {
            include: {
              tournament: {
                include: { settings: true },
              },
            },
          },
        },
      },
      teams: {
        include: { team: true },
        orderBy: [{ score: "desc" }, { lastScoreAt: "asc" }],
      },
      questions: {
        include: { question: true },
        orderBy: { order: "asc" },
      },
    },
  });
}
