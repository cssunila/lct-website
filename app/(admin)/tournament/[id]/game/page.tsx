import { notFound } from "next/navigation";
import { getTournamentById } from "@/server/queries/tournament";
import { getGamesByTournament } from "@/server/queries/game";
import { getRoundsByTournament } from "@/server/queries/round";
import GameListClient from "./game-client";

export const dynamic = "force-dynamic";

interface GameItem {
  id: string;
  status: "SETUP" | "IN_PROGRESS" | "FINISHED";
  currentPhase: string;
  currentQuestionId: string;
  group: { id: string; name: string; order: number; round: { id: string; name: string; order: number } };
  teams: { id: string; team: { name: string; school: string; qualified: boolean } }[];
  _count: { questions: number };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const [games, rounds] = await Promise.all([
    getGamesByTournament(id),
    getRoundsByTournament(id),
  ]);

  const availableGroups = rounds.flatMap((r) =>
    r.groups.map((g) => ({
      id: g.id,
      name: g.name,
      roundName: r.name,
    }))
  );

  return (
    <GameListClient
      tournamentId={id}
      tournamentName={tournament.name}
      games={games as GameItem[]}
      availableGroups={availableGroups}
    />
  );
}
