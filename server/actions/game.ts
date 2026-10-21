"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  broadcastGameEvent,
  getGameLiveState,
  updateGameLiveState,
} from "@/lib/game-state";

export async function createGame(data: { groupId: string }) {
  const game = await prisma.game.create({ data });
  const group = await prisma.group.findUnique({
    where: { id: data.groupId },
    include: { round: { select: { tournamentId: true } } },
  });
  if (group) {
    revalidatePath(`/tournament/${group.round.tournamentId}/game`);
  }
  return game;
}

export async function deleteGame(id: string) {
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      group: { include: { round: { select: { tournamentId: true } } } },
    },
  });
  await prisma.game.delete({ where: { id } });
  if (game) {
    revalidatePath(`/tournament/${game.group.round.tournamentId}/game`);
  }
}

export async function assignTeamToGame(gameId: string, teamId: string) {
  const gameTeam = await prisma.gameTeam.create({ data: { gameId, teamId } });
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      group: { include: { round: { select: { tournamentId: true } } } },
    },
  });
  if (game) {
    revalidatePath(`/tournament/${game.group.round.tournamentId}/game`);
    revalidatePath(
      `/tournament/${game.group.round.tournamentId}/game/${gameId}`,
    );
  }
  broadcastGameEvent(gameId, "GAME_DATA_CHANGED");
  return gameTeam;
}

export async function removeTeamFromGame(gameTeamId: string) {
  const gt = await prisma.gameTeam.findUnique({
    where: { id: gameTeamId },
    include: {
      game: {
        include: {
          group: { include: { round: { select: { tournamentId: true } } } },
        },
      },
    },
  });
  await prisma.gameTeam.delete({ where: { id: gameTeamId } });
  if (gt) {
    revalidatePath(`/tournament/${gt.game.group.round.tournamentId}/game`);
    revalidatePath(
      `/tournament/${gt.game.group.round.tournamentId}/game/${gt.gameId}`,
    );
    broadcastGameEvent(gt.gameId, "GAME_DATA_CHANGED");
  }
}

export async function updateGameStatus(
  id: string,
  status: "SETUP" | "IN_PROGRESS" | "FINISHED",
) {
  const game = await prisma.game.update({
    where: { id },
    data: {
      status,
      ...(status === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
      ...(status === "FINISHED" ? { endedAt: new Date() } : {}),
    },
    include: {
      group: { include: { round: { select: { tournamentId: true } } } },
    },
  });
  if (game) {
    revalidatePath(`/tournament/${game.group.round.tournamentId}/game`);
  }
  broadcastGameEvent(id, "GAME_DATA_CHANGED");
  return game;
}

export async function updateGamePhase(
  id: string,
  phase: "SETUP" | "WAJIB" | "REBUTAN" | "HASIL",
) {
  const game = await prisma.game.update({
    where: { id },
    data: {
      currentPhase: phase,
      currentQuestionId: null,
    },
    include: {
      group: { include: { round: { select: { tournamentId: true } } } },
    },
  });

  updateGameLiveState(id, (prev) => ({
    ...prev,
    currentQuestionId: null,
    showAnswer: false,
    questionVisible: false,
    timer: {
      timeLimit: 30,
      remaining: 30,
      status: "STOPPED",
      endsAt: null,
      countdownEndsAt: null,
    },
  }));

  if (game) {
    revalidatePath(
      `/tournament/${game.group.round.tournamentId}/game/${game.id}`,
    );
  }
  broadcastGameEvent(id, "PHASE_CHANGED", { phase });
  return game;
}

export async function updateCurrentQuestion(id: string, idQs: string) {
  const game = await prisma.game.update({
    where: { id },
    data: { currentQuestionId: idQs },
  });

  const gq = await prisma.gameQuestion.findUnique({
    where: { id: idQs },
    include: { question: true },
  });

  const timeLimit = gq?.question?.timeLimit ?? 30;

  updateGameLiveState(id, (prev) => ({
    ...prev,
    currentQuestionId: idQs,
    showAnswer: false,
    questionVisible: false,
    timer: {
      timeLimit,
      remaining: timeLimit,
      status: "STOPPED",
      endsAt: null,
      countdownEndsAt: null,
    },
  }));

  broadcastGameEvent(id, "GAME_DATA_CHANGED");
  return game;
}

export async function assignQuestionToGame(data: {
  gameId: string;
  questionId: string;
  order: number;
}) {
  const targetGame = await prisma.game.findUnique({
    where: { id: data.gameId },
    include: { group: { include: { round: true } } },
  });
  if (!targetGame) throw new Error("Game tidak ditemukan");

  const tournamentId = targetGame.group.round.tournamentId;

  const existingUse = await prisma.gameQuestion.findFirst({
    where: {
      questionId: data.questionId,
      gameId: { not: data.gameId },
      game: { group: { round: { tournamentId } } },
    },
  });

  if (existingUse) {
    throw new Error(
      "Soal ini sudah digunakan pada game/babak lain dalam turnamen.",
    );
  }

  const gq = await prisma.gameQuestion.create({ data });
  revalidatePath(`/tournament/${tournamentId}/game/${data.gameId}`);
  broadcastGameEvent(data.gameId, "GAME_DATA_CHANGED");
  return gq;
}

export async function removeQuestionFromGame(gameQuestionId: string) {
  const gq = await prisma.gameQuestion.findUnique({
    where: { id: gameQuestionId },
    include: {
      game: {
        include: {
          group: { include: { round: { select: { tournamentId: true } } } },
        },
      },
    },
  });
  await prisma.gameQuestion.delete({ where: { id: gameQuestionId } });
  if (gq) {
    revalidatePath(
      `/tournament/${gq.game.group.round.tournamentId}/game/${gq.gameId}`,
    );
    broadcastGameEvent(gq.gameId, "GAME_DATA_CHANGED");
  }
}

export async function changeScoreTim({
  gameTeamId,
  score,
}: {
  gameTeamId: string;
  score: number;
}) {
  const gameTeam = await prisma.gameTeam.update({
    where: { id: gameTeamId },
    data: {
      score,
      lastScoreAt: new Date(),
    },
    include: { game: true },
  });

  const game = await prisma.game.findUnique({
    where: { id: gameTeam.gameId },
    include: {
      group: { include: { round: { select: { tournamentId: true } } } },
    },
  });

  if (game) {
    revalidatePath(
      `/tournament/${game.group.round.tournamentId}/game/${game.id}`,
    );
  }

  const team = {
    teamId: gameTeamId,
    scoreChange: score,
    type: "CHANGE"
  }

  broadcastGameEvent(gameTeam.gameId, "SCORE_UPDATED", { team });
  return gameTeam;
}

export async function markQuestionAnswered(data: {
  gameQuestionId: string;
  gameTeamId: string;
  isCorrect: boolean;
  scoreChange: number;
}) {
  const gq = await prisma.gameQuestion.update({
    where: { id: data.gameQuestionId },
    data: {
      status: "ANSWERED",
      answeredByGameTeamId: data.gameTeamId,
      isCorrect: data.isCorrect,
    },
    include: { game: true },
  });

  await prisma.gameTeam.update({
    where: { id: data.gameTeamId },
    data: {
      score: {
        increment: data.isCorrect ? data.scoreChange : -data.scoreChange,
      },
      lastScoreAt: new Date(),
    },
  });

  const gameTeam = await prisma.gameTeam.findUnique({
    where: { id: data.gameTeamId },
  });

  if (gameTeam) {
    await prisma.scoreHistory.create({
      data: {
        gameTeamId: data.gameTeamId,
        gameQuestionId: data.gameQuestionId,
        result: data.isCorrect ? "CORRECT" : "WRONG",
        scoreChange: data.scoreChange,
        totalScore: gameTeam.score,
      },
    });
  }

  const game = await prisma.game.findUnique({
    where: { id: gq.gameId },
    include: {
      group: { include: { round: { select: { tournamentId: true } } } },
    },
  });

  if (game) {
    revalidatePath(
      `/tournament/${game.group.round.tournamentId}/game/${game.id}`,
    );
  }

  const team = {
    teamId: data.gameTeamId,
    scoreChange: data.scoreChange,
    type: data.isCorrect ? "CORRECT" : "WRONG",
  }

  broadcastGameEvent(gq.gameId, "SCORE_UPDATED", { team });
  return gq;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function randomizeQuestionsForGame(
  gameId: string,
  wajibCount: number,
  rebutanCount: number,
) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      group: {
        include: {
          round: { include: { tournament: { include: { settings: true } } } },
        },
      },
      questions: { select: { questionId: true, order: true } },
    },
  });

  if (!game) throw new Error("Game tidak ditemukan");

  const tournamentId = game.group.round.tournament.id;

  // Kumpulkan semua questionId yang sudah terpakai di turnamen ini (lintas game)
  const usedQuestionIds = await prisma.gameQuestion.findMany({
    where: {
      game: { group: { round: { tournamentId } } },
      questionId: { not: null },
    },
    select: { questionId: true },
  });

  const usedSet = new Set(
    usedQuestionIds.map((gq) => gq.questionId).filter(Boolean),
  );
  // Soal yang sudah ada di game ini sendiri juga masuk usedSet agar tidak double
  for (const gq of game.questions) {
    if (gq.questionId) usedSet.add(gq.questionId);
  }

  // Ambil semua soal tournament dengan field session & difficulty
  const allQuestions = await prisma.question.findMany({
    where: { tournamentId },
    select: { id: true, difficulty: true, session: true },
  });

  // Pool soal yang belum dipakai, dikelompokkan per session
  const availableWajib = allQuestions.filter(
    (q) => !usedSet.has(q.id) && q.session === "WAJIB",
  );
  const availableRebutan = allQuestions.filter(
    (q) => !usedSet.has(q.id) && q.session === "REBUTAN",
  );

  // ambil N soal secara acak dengan distribusi difficulty seimbang
  function pickWithDifficulty(pool: typeof allQuestions, n: number) {
    if (n <= 0 || pool.length === 0) return [];

    const byDiff: Record<string, typeof allQuestions> = {};
    for (const q of pool) {
      const d = q.difficulty ?? "SEDANG";
      if (!byDiff[d]) byDiff[d] = [];
      byDiff[d].push(q);
    }

    const difficulties = Object.keys(byDiff);
    const result: typeof allQuestions = [];

    // Distribusikan slot ke tiap difficulty serata mungkin
    const base = Math.floor(n / difficulties.length);
    let remainder = n % difficulties.length;

    for (const diff of difficulties) {
      const want = base + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      const picked = shuffle(byDiff[diff]).slice(0, want);
      result.push(...picked);
    }

    if (result.length < n) {
      const pickedIds = new Set(result.map((q) => q.id));
      const remaining = shuffle(pool.filter((q) => !pickedIds.has(q.id)));
      result.push(...remaining.slice(0, n - result.length));
    }

    return shuffle(result).slice(0, n);
  }

  const wajibPicked = pickWithDifficulty(availableWajib, wajibCount);
  const rebutanPicked = pickWithDifficulty(availableRebutan, rebutanCount);

  const toAssign = [...wajibPicked, ...rebutanPicked];

  const currentMaxOrder =
    game.questions.length > 0
      ? Math.max(...game.questions.map((q) => q.order))
      : 0;

  let assigned = 0;
  for (let i = 0; i < toAssign.length; i++) {
    await prisma.gameQuestion.create({
      data: {
        gameId,
        questionId: toAssign[i].id,
        order: currentMaxOrder + i + 1,
      },
    });
    assigned++;
  }

  revalidatePath(`/tournament/${tournamentId}/game/${gameId}`);
  broadcastGameEvent(gameId, "GAME_DATA_CHANGED");
  return {
    assigned,
    wajibAssigned: wajibPicked.length,
    rebutanAssigned: rebutanPicked.length,
    wajibAvailable: availableWajib.length,
    rebutanAvailable: availableRebutan.length,
  };
}

export async function setAnswerVisibility(gameId: string, showAnswer: boolean) {
  return updateGameLiveState(gameId, (prev) => ({ ...prev, showAnswer }));
}

export async function setFullScreenDisplay(gameId: string, fullScreen: boolean) {
  return updateGameLiveState(gameId, (prev) => ({ ...prev, fullScreen }));
}

const COUNTDOWN_SECONDS = 3;

export async function startLiveTimer(gameId: string, duration?: number) {
  const currentState = getGameLiveState(gameId);
  const timeLimit =
    duration ??
    currentState.timer.remaining ??
    currentState.timer.timeLimit ??
    30;
  const remaining = duration ?? currentState.timer.remaining ?? timeLimit;

  const countdownEndsAt = Date.now() + COUNTDOWN_SECONDS * 1000;
  const endsAt = countdownEndsAt + remaining * 1000;

  const updated = updateGameLiveState(gameId, (prev) => ({
    ...prev,
    questionVisible: false,
    timer: {
      timeLimit: prev.timer.timeLimit || timeLimit,
      remaining,
      status: "COUNTDOWN",
      endsAt,
      countdownEndsAt,
    },
  }));
  return updated;
}

export async function pauseLiveTimer(gameId: string, remainingSeconds: number) {
  return updateGameLiveState(gameId, (prev) => ({
    ...prev,
    timer: {
      ...prev.timer,
      remaining: Math.max(0, remainingSeconds),
      status: "PAUSED",
      endsAt: null,
      countdownEndsAt: null,
    },
  }));
}

export async function resetLiveTimer(gameId: string, customDuration?: number) {
  const currentState = getGameLiveState(gameId);
  const duration = customDuration ?? currentState.timer.timeLimit ?? 30;

  return updateGameLiveState(gameId, (prev) => ({
    ...prev,
    questionVisible: false,
    timer: {
      timeLimit: duration,
      remaining: duration,
      status: "STOPPED",
      endsAt: null,
      countdownEndsAt: null,
    },
  }));
}

export async function adjustLiveTimer(gameId: string, secondsToAdd: number) {
  const currentState = getGameLiveState(gameId);
  const now = Date.now();

  let newRemaining = currentState.timer.remaining;
  let newEndsAt = currentState.timer.endsAt;
  let newCountdownEndsAt = currentState.timer.countdownEndsAt;

  if (
    (currentState.timer.status === "RUNNING" ||
      currentState.timer.status === "COUNTDOWN") &&
    currentState.timer.endsAt
  ) {
    newRemaining = Math.max(
      0,
      Math.ceil((currentState.timer.endsAt - now) / 1000) + secondsToAdd,
    );
    newEndsAt = now + newRemaining * 1000;
    if (currentState.timer.countdownEndsAt) {
      newCountdownEndsAt = currentState.timer.countdownEndsAt;
    }
  } else {
    newRemaining = Math.max(0, currentState.timer.remaining + secondsToAdd);
  }

  return updateGameLiveState(gameId, (prev) => ({
    ...prev,
    timer: {
      ...prev.timer,
      remaining: newRemaining,
      endsAt: newEndsAt,
      countdownEndsAt: newCountdownEndsAt,
      status: newRemaining === 0 ? "EXPIRED" : prev.timer.status,
    },
  }));
}

export async function transitionTimerToRunning(gameId: string) {
  const current = getGameLiveState(gameId);
  if (current.timer.status !== "COUNTDOWN") return current;

  return updateGameLiveState(gameId, (prev) => ({
    ...prev,
    questionVisible: true,
    timer: {
      ...prev.timer,
      status: "RUNNING",
      countdownEndsAt: null,
    },
  }));
}

export async function resetGameProgress(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      group: {
        include: {
          round: { select: { tournamentId: true } },
        },
      },
    },
  });

  if (!game) throw new Error("Game tidak ditemukan");

  const tournamentId = game.group.round.tournamentId;

  await prisma.scoreHistory.deleteMany({
    where: {
      gameTeam: { gameId },
    },
  });


  await prisma.gameQuestion.updateMany({
    where: { gameId },
    data: {
      status: "UNANSWERED",
      answeredByGameTeamId: null,
      isCorrect: null,
    },
  });

  await prisma.gameTeam.updateMany({
    where: { gameId },
    data: {
      score: 0,
      rank: null,
      lastScoreAt: null,
    },
  });

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "SETUP",
      currentPhase: "SETUP",
      currentQuestionId: null,
      startedAt: null,
      endedAt: null,
    },
  });

  updateGameLiveState(gameId, (prev) => ({
    ...prev,
    currentQuestionId: null,
    showAnswer: false,
    questionVisible: false,
    timer: {
      timeLimit: 30,
      remaining: 30,
      status: "STOPPED",
      endsAt: null,
      countdownEndsAt: null,
    },
  }));

  broadcastGameEvent(gameId, "GAME_DATA_CHANGED");
  broadcastGameEvent(gameId, "PHASE_CHANGED", { phase: "SETUP" });

  revalidatePath(`/tournament/${tournamentId}/game`);
  revalidatePath(`/tournament/${tournamentId}/game/${gameId}`);
  revalidatePath(`/tournament/${tournamentId}/game/${gameId}/live`);
  revalidatePath(`/tournament/${tournamentId}/history`);
  revalidatePath(`/display/${gameId}`);

  return { success: true };
}

export async function resetSingleGameQuestion(gameQuestionId: string) {
  const gq = await prisma.gameQuestion.findUnique({
    where: { id: gameQuestionId },
    include: {
      game: {
        include: {
          group: { include: { round: { select: { tournamentId: true } } } },
        },
      },
      histories: true,
    },
  });

  if (!gq) throw new Error("Soal game tidak ditemukan");

  await prisma.scoreHistory.deleteMany({
    where: { gameQuestionId },
  });

  for (const hist of gq.histories) {
    const change = Math.abs(hist.scoreChange);
    const lastHist = await prisma.scoreHistory.findFirst({
      where: { gameTeamId: hist.gameTeamId },
      orderBy: { createdAt: "desc" },
    });
    await prisma.gameTeam.update({
      where: { id: hist.gameTeamId },
      data: {
        score:
          hist.result === "CORRECT"
            ? { decrement: change }
            : { increment: change },
        lastScoreAt: lastHist ? lastHist.createdAt : null,
      },
    });
  }

  await prisma.gameQuestion.update({
    where: { id: gameQuestionId },
    data: {
      status: "UNANSWERED",
      answeredByGameTeamId: null,
      isCorrect: null,
    },
  });

  const gameId = gq.gameId;
  const tournamentId = gq.game.group.round.tournamentId;

  const currentLive = getGameLiveState(gameId);
  if (currentLive.currentQuestionId === gameQuestionId) {
    updateGameLiveState(gameId, (prev) => ({
      ...prev,
      showAnswer: false,
    }));
  }

  broadcastGameEvent(gameId, "GAME_DATA_CHANGED");

  revalidatePath(`/tournament/${tournamentId}/game`);
  revalidatePath(`/tournament/${tournamentId}/game/${gameId}`);
  revalidatePath(`/tournament/${tournamentId}/game/${gameId}/live`);
  revalidatePath(`/tournament/${tournamentId}/history`);
  revalidatePath(`/display/${gameId}`);

  return { success: true };
}

export async function resetAllGamesInTournament(tournamentId: string) {
  const games = await prisma.game.findMany({
    where: {
      group: { round: { tournamentId } },
    },
    select: { id: true },
  });

  for (const g of games) {
    await resetGameProgress(g.id);
  }

  revalidatePath(`/tournament/${tournamentId}/game`);
  revalidatePath(`/tournament/${tournamentId}/history`);

  return { count: games.length };
}
