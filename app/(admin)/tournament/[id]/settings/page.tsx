import { notFound } from "next/navigation";
import { getTournamentWithSetting } from "@/server/queries/tournament";
import TournamentSettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

interface TournamentSettings {
  id: string;
  name: string;
  year: number;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  settings: {
    mandatoryCorrectPoint: number;
    mandatoryWrongPoint: number;
    buzzerCorrectPoint: number;
    buzzerWrongPoint: number;
  };
}

export default async function TournamentSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await getTournamentWithSetting(id);
  if (!tournament || !tournament.settings) notFound();

  return <TournamentSettingsClient tournament={tournament as TournamentSettings} />;
}
