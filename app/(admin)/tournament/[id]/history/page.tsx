/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { getTournamentById } from "@/server/queries/tournament";
import { getScoreHistoryByTournament, getTournamentScoreboard } from "@/server/queries/score";
import HistoryClient from "./history-client";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const [histories, scoreboard] = await Promise.all([
    getScoreHistoryByTournament(id),
    getTournamentScoreboard(id),
  ]);

  return (
    <HistoryClient
      tournamentId={id}
      tournamentName={tournament.name}
      histories={histories as any}
      scoreboard={scoreboard as any}
    />
  );
}
