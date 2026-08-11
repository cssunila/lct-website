import { notFound } from "next/navigation";
import { getQuestions } from "@/server/queries/question";
import { getTournamentById } from "@/server/queries/tournament";
import BankSoalClient from "./bank-soal-client";
import type { QuestionRow } from "@/components/features/question/question-table";

export const dynamic = "force-dynamic";

export default async function BankSoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const questions = await getQuestions({ tournamentId: id });

  return (
    <BankSoalClient
      tournamentId={id}
      tournamentName={tournament.name}
      initialQuestions={questions as QuestionRow[]}
    />
  );
}
