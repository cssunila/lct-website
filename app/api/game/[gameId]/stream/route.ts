import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getGameLiveState,
  subscribeGameEvent,
  sanitizeGameDataForDisplay,
} from "@/lib/game-state";

export const dynamic = "force-dynamic";

async function fetchGameData(gameId: string) {
  return await prisma.game.findUnique({
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
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;
  const isDisplay = request.nextUrl.searchParams.get("forDisplay") === "true";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const send = (data: unknown) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          isClosed = true;
        }
      };

      const sendPing = () => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          isClosed = true;
        }
      };

      const liveState = getGameLiveState(gameId);
      let rawGame = await fetchGameData(gameId);
      const gameData = isDisplay
        ? sanitizeGameDataForDisplay(rawGame, liveState)
        : rawGame;

      send({
        type: "SYNC_FULL",
        liveState,
        game: gameData,
        timestamp: Date.now(),
      });

      const unsubscribe = subscribeGameEvent(gameId, async (event) => {
        if (isClosed) return;
        const currentLiveState = getGameLiveState(gameId);

        if (
          event.type === "GAME_DATA_CHANGED" ||
          event.type === "PHASE_CHANGED" ||
          event.type === "SCORE_UPDATED"
        ) {
          const updatedRawGame = await fetchGameData(gameId);
          if (updatedRawGame) {
            rawGame = updatedRawGame;
          }
          const updatedGameData = isDisplay
            ? sanitizeGameDataForDisplay(rawGame, currentLiveState)
            : rawGame;

          if (event.type === "SCORE_UPDATED") {
            send({
              type: "SYNC_FULL",
              liveState: currentLiveState,
              game: updatedGameData,
              eventType: event.type,
              timestamp: Date.now(),
              team: event.data?.team,
            });
          } else {
            send({
              type: "SYNC_FULL",
              liveState: currentLiveState,
              game: updatedGameData,
              eventType: event.type,
              timestamp: Date.now(),
            });
          }
        } else {
          const stateGameData = isDisplay
            ? sanitizeGameDataForDisplay(rawGame, currentLiveState)
            : rawGame;

          send({
            type: "STATE_UPDATE",
            liveState: currentLiveState,
            game: stateGameData,
            eventType: event.type,
            timestamp: Date.now(),
          });
        }
      });

      const pingInterval = setInterval(sendPing, 15000);

      request.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(pingInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
