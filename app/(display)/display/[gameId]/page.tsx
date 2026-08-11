/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { getGameForDisplay } from "@/server/queries/game";
import GameDisplayClient from "./display-client";

export const dynamic = "force-dynamic";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = await getGameForDisplay(gameId);

  if (!game) notFound();

  return <GameDisplayClient gameId={gameId} game={game} />;
}
