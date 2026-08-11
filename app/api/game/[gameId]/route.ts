import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGameLiveState, sanitizeGameDataForDisplay } from "@/lib/game-state";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const isDisplay = request.nextUrl.searchParams.get("forDisplay") === "true";

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      group: {
        include: {
          round: {
            include: {
              tournament: {
                include: { settings: true },
              },
            },
          },
        },
      },
      teams: {
        include: { team: true },
        orderBy: { score: "desc" },
      },
      questions: {
        include: { question: true, answeredBy: { include: { team: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const liveState = getGameLiveState(gameId);

  const payloadGame = isDisplay
    ? sanitizeGameDataForDisplay(game, liveState)
    : game;

  return NextResponse.json({
    game: payloadGame,
    liveState,
  });
}
