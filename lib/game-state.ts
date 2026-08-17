/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from "events";

export interface TimerState {
  timeLimit: number;
  remaining: number;
  status: "STOPPED" | "RUNNING" | "PAUSED" | "EXPIRED" | "COUNTDOWN";
  endsAt: number | null;
  countdownEndsAt: number | null;
}

export interface GameLiveState {
  gameId: string;
  currentQuestionId: string | null;
  showAnswer: boolean;
  questionVisible: boolean;
  fullScreen: boolean;
  timer: TimerState;
}

declare global {
  var __gameLiveStates: Map<string, GameLiveState> | undefined;
  var __gameEventEmitter: EventEmitter | undefined;
}

const liveStates = (globalThis.__gameLiveStates ??= new Map<string, GameLiveState>());

const emitter = (globalThis.__gameEventEmitter ??= new EventEmitter());
emitter.setMaxListeners(100);

export function getGameLiveState(
  gameId: string,
  defaultTimeLimit = 30,
): GameLiveState {
  let state = liveStates.get(gameId);
  if (!state) {
    state = {
      gameId,
      currentQuestionId: null,
      showAnswer: false,
      questionVisible: false,
      fullScreen: false,
      timer: {
        timeLimit: defaultTimeLimit,
        remaining: defaultTimeLimit,
        status: "STOPPED",
        endsAt: null,
        countdownEndsAt: null,
      },
    };
    liveStates.set(gameId, state);
  } else {
    if (
      state.timer.status === "RUNNING" &&
      state.timer.endsAt &&
      state.timer.endsAt <= Date.now()
    ) {
      state.timer.status = "EXPIRED";
      state.timer.remaining = 0;
    }
  }
  return state;
}

export function updateGameLiveState(
  gameId: string,
  updater: (prev: GameLiveState) => GameLiveState,
): GameLiveState {
  const prev = getGameLiveState(gameId);
  const next = updater(prev);

  if (
    next.timer.status === "RUNNING" &&
    next.timer.endsAt &&
    next.timer.endsAt <= Date.now()
  ) {
    next.timer.status = "EXPIRED";
    next.timer.remaining = 0;
  }

  liveStates.set(gameId, next);
  broadcastGameEvent(gameId, "STATE_UPDATE", next);
  return next;
}

export function broadcastGameEvent(
  gameId: string,
  eventType: string,
  data?: unknown,
) {
  emitter.emit(`game:${gameId}`, {
    type: eventType,
    data,
    timestamp: Date.now(),
  });
}

export function subscribeGameEvent(
  gameId: string,
  callback: (event: {
    type: string;
    data?: any;
    timestamp: number;
  }) => void,
): () => void {
  const channel = `game:${gameId}`;
  emitter.on(channel, callback);
  return () => {
    emitter.off(channel, callback);
  };
}

export function sanitizeGameDataForDisplay(
  gameData: any,
  liveState: GameLiveState,
) {
  if (!gameData) return null;

  const sanitizedQuestions = gameData.questions?.map((gq: any) => {
    if (!gq.question) return gq;

    const isCurrentQuestion = gq.id === liveState.currentQuestionId;

    return {
      ...gq,
      question: {
        ...gq.question,
        answer: liveState.showAnswer ? gq.question.answer : undefined,
        explanation: liveState.showAnswer ? gq.question.explanation : undefined,
        question:
          isCurrentQuestion && !liveState.questionVisible
            ? undefined
            : gq.question.question,
      },
    };
  });

  return {
    ...gameData,
    questions: sanitizedQuestions,
  };
}
