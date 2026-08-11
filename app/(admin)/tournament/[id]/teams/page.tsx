import { notFound } from "next/navigation";
import { getTournamentById } from "@/server/queries/tournament";
import { getTeamsByTournament } from "@/server/queries/team";
import TeamsClient from "./teams-client";

export const dynamic = "force-dynamic";

interface TeamItem {
  id: string;
  name: string;
  school: string;
  qualified: boolean;
  _count: { games: number };
}

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const teams = await getTeamsByTournament(id);

  return (
    <TeamsClient
      tournamentId={id}
      tournamentName={tournament.name}
      teams={teams as TeamItem[]}
    />
  );
}
