import { notFound } from "next/navigation";
import { getTournamentById } from "@/server/queries/tournament";
import { getRoundById } from "@/server/queries/round";
import GroupsClient from "./groups-client";

export const dynamic = "force-dynamic";

interface GroupItem {
  id: string;
  name: string;
  order: number;
  games: { id: string; status: string; teams: { team: { name: string; school: string; qualified: boolean } }[] }[];
}

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ id: string; roundId: string }>;
}) {
  const { id, roundId } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const round = await getRoundById(roundId);
  if (!round) notFound();

  return (
    <GroupsClient
      tournamentId={id}
      roundId={roundId}
      roundName={round.name}
      roundOrder={round.order}
      tournamentName={tournament.name}
      groups={round.groups as GroupItem[]}
    />
  );
}
