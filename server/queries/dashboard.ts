import "server-only";

import { prisma } from "@/lib/prisma";

export async function getDashboardStats(tournamentId: string) {
  const [tournament, teamCount, roundCount, groupCount, questionCount, gameCount] =
    await Promise.all([
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { settings: true },
      }),
      prisma.team.count({ where: { tournamentId } }),
      prisma.round.count({ where: { tournamentId } }),
      prisma.group.count({
        where: { round: { tournamentId } },
      }),
      prisma.question.count({ where: { tournamentId } }),
      prisma.game.count({
        where: { group: { round: { tournamentId } } },
      }),
    ]);

  return {
    tournament,
    teamCount,
    roundCount,
    groupCount,
    questionCount,
    gameCount,
  };
}

export async function getActiveTournamentWithStats() {
  const active = await prisma.tournament.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!active) {
    const latest = await prisma.tournament.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!latest) return null;

    return getDashboardStats(latest.id);
  }

  return getDashboardStats(active.id);
}

export async function getRecentGames(tournamentId: string, limit = 5) {
  return prisma.game.findMany({
    where: {
      group: { round: { tournamentId } },
    },
    orderBy: [
      { startedAt: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ],
    take: limit,
    include: {
      group: { include: { round: true } },
      teams: {
        include: { team: true },
        orderBy: { score: "desc" },
      },
    },
  });
}

export async function getRecentScoreActivity(tournamentId: string, limit = 8) {
  return prisma.scoreHistory.findMany({
    where: {
      gameTeam: {
        game: {
          group: { round: { tournamentId } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      gameTeam: {
        include: {
          team: true,
          game: {
            include: { group: { include: { round: true } } },
          },
        },
      },
      gameQuestion: {
        include: { question: true },
      },
    },
  });
}
