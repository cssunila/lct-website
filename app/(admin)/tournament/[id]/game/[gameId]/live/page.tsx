/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { getGameById } from "@/server/queries/game";
import { getTournamentById } from "@/server/queries/tournament";
import GameControlClient from "./control-client";

export const dynamic = "force-dynamic";

export default async function LiveGamePage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;

  const [tournament, game] = await Promise.all([
    getTournamentById(id),
    getGameById(gameId),
  ]);

  if (!tournament || !game) notFound();

  const settings = (tournament as any).settings ?? {
    mandatoryCorrectPoint: 100,
    mandatoryWrongPoint: 0,
    buzzerCorrectPoint: 100,
    buzzerWrongPoint: -50,
  };

  return (
    <GameControlClient
      gameId={gameId}
      tournamentId={id}
      tournamentName={tournament.name}
      settings={settings}
      game={game}
      questions={game.questions}
      teams={game.teams}
    />
  );
}
