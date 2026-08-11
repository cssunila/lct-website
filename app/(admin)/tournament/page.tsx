import { getAllTournaments } from "@/server/queries/tournament";
import TournamentListClient from "./tournament-client";

export const dynamic = "force-dynamic";

interface TournamentItem {
  id: string;
  name: string;
  year: number;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  _count: { teams: number; questions: number; rounds: number };
}

export default async function TournamentPage() {
  const tournaments = await getAllTournaments();

  return <TournamentListClient tournaments={tournaments as TournamentItem[]} />;
}
