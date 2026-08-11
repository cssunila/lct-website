import { notFound } from "next/navigation";
import { getTournamentById } from "@/server/queries/tournament";
import { getRoundsByTournament } from "@/server/queries/round";
import RoundListClient from "./rounds-client";

export const dynamic = "force-dynamic";

interface RoundItem {
  id: string;
  name: string;
  order: number;
  groups: { id: string; name: string; order: number; games: { id: string }[] }[];
}

export default async function RoundsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const rounds = await getRoundsByTournament(id);

  return (
    <RoundListClient
      tournamentId={id}
      tournamentName={tournament.name}
      rounds={rounds as RoundItem[]}
    />
  );
}
