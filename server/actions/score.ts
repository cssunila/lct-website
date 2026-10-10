"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastGameEvent } from "@/lib/game-state";


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

  const change = Math.abs(history.scoreChange);
  await prisma.gameTeam.update({
    where: { id: history.gameTeamId },
    data: {
      score:
        history.result === "CORRECT"
          ? { decrement: change }
          : { increment: change },
    },
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

  const gameId = history.gameTeam.gameId;
  const tournamentId = history.gameTeam.game.group.round.tournamentId;

  broadcastGameEvent(gameId, "GAME_DATA_CHANGED");

  revalidatePath(`/tournament/${tournamentId}/history`);
  revalidatePath(`/tournament/${tournamentId}/game/${gameId}`);
  revalidatePath(`/tournament/${tournamentId}/game/${gameId}/live`);
}
