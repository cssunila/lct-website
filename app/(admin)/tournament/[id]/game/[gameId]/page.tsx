/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGameById } from "@/server/queries/game";
import { getTournamentById } from "@/server/queries/tournament";
import { getTeamsByTournament } from "@/server/queries/team";
import { getQuestions } from "@/server/queries/question";
import GameSetupClient from "./setup-client";

export const dynamic = "force-dynamic";

export default async function GameSetupPage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;

  const [tournament, game, teams, questions, usedGameQuestions] = await Promise.all([
    getTournamentById(id),
    getGameById(gameId),
    getTeamsByTournament(id),
    getQuestions({ tournamentId: id }),
    prisma.gameQuestion.findMany({
      where: {
        game: { group: { round: { tournamentId: id } } },
        questionId: { not: null },
      },
      select: { questionId: true, gameId: true },
    }),
  ]);

  if (!tournament || !game) notFound();

  const usedInOtherGameIds = new Set(
    usedGameQuestions
      .filter((gq) => gq.gameId !== gameId && gq.questionId)
      .map((gq) => gq.questionId)
  );

  const availableQuestions = questions.map((q) => ({
    ...q,
    usedInOtherGame: usedInOtherGameIds.has(q.id),
  }));

  return (
    <GameSetupClient
      gameId={gameId}
      tournamentId={id}
      tournamentName={tournament.name}
      game={game as any}
      gameTeams={game.teams as any}
      gameQuestions={game.questions as any}
      availableTeams={teams as any}
      availableQuestions={availableQuestions as any}
    />
  );
}
