import "server-only";

import { prisma } from "@/lib/prisma";

export async function getScoreHistoryByGame(gameId: string) {
  return prisma.scoreHistory.findMany({
    where: { gameTeam: { gameId } },
    include: {
      gameTeam: { include: { team: true } },
      gameQuestion: { include: { question: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getScoreHistoryByGameTeam(gameTeamId: string) {
  return prisma.scoreHistory.findMany({
    where: { gameTeamId },
    include: {
      gameQuestion: { include: { question: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getScoreHistoryByTournament(tournamentId: string) {
  return prisma.scoreHistory.findMany({
    where: {
      gameTeam: {
        game: {
          group: {
            round: { tournamentId },
          },
        },
      },
    },
    include: {
      gameTeam: {
        include: {
          team: true,
          game: {
            include: {
              group: {
                include: { round: true },
              },
            },
          },
        },
      },
      gameQuestion: { include: { question: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTournamentScoreboard(tournamentId: string) {
  return prisma.game.findMany({
    where: {
      group: { round: { tournamentId } },
    },
    include: {
      group: { include: { round: true } },
      teams: {
        include: { team: true },
        orderBy: { score: "desc" },
      },
    },
    orderBy: {
      group: { round: { order: "asc" } },
    },
  });
}
