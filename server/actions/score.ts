"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";


export async function undoScoreHistory(historyId: string) {
  const history = await prisma.scoreHistory.findUnique({
    where: { id: historyId },
    include: {
      gameTeam: {
        include: {
          game: {
            include: {
              group: {
                include: { round: { select: { tournamentId: true } } },
              },
            },
          },
        },
      },
      gameQuestion: true,
    },
  });

  if (!history) throw new Error("Score history tidak ditemukan");

  await prisma.gameTeam.update({
    where: { id: history.gameTeamId },
    data: { score: { decrement: history.scoreChange } },
  });

  if (history.gameQuestion) {
    await prisma.gameQuestion.update({
      where: { id: history.gameQuestion.id },
      data: {
        status: "UNANSWERED",
        answeredByGameTeamId: null,
        isCorrect: null,
      },
    });
  }

  await prisma.scoreHistory.delete({ where: { id: historyId } });

  const tournamentId = history.gameTeam.game.group.round.tournamentId;
  revalidatePath(`/tournament/${tournamentId}/history`);
  revalidatePath(`/tournament/${tournamentId}/game/${history.gameTeam.gameId}`);
  revalidatePath(`/tournament/${tournamentId}/game/${history.gameTeam.gameId}/live`);
}
