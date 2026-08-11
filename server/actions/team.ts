"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastGameEvent } from "@/lib/game-state";

export interface CreateTeamInput {
  tournamentId: string;
  name: string;
  school: string;
}

export interface ImportTeamRow {
  name: string;
  school: string;
}

export async function createTeam(data: CreateTeamInput) {
  const team = await prisma.team.create({ data });
  revalidatePath(`/tournament/${data.tournamentId}/teams`);
  return team;
}

export async function updateTeam(id: string, data: { name?: string; school?: string }) {
  const team = await prisma.team.update({ where: { id }, data });
  const updated = await prisma.team.findUnique({
    where: { id },
    select: { tournamentId: true },
  });
  if (updated) {
    revalidatePath(`/tournament/${updated.tournamentId}/teams`);
  }
  return team;
}

export async function toggleTeamQualification(
  teamId: string,
  qualified: boolean,
  gameId?: string
) {
  const team = await prisma.team.update({
    where: { id: teamId },
    data: { qualified },
  });

  if (gameId) {
    broadcastGameEvent(gameId, "GAME_DATA_CHANGED");
  }

  revalidatePath(`/tournament/${team.tournamentId}/teams`);
  return team;
}

export async function deleteTeam(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    select: { tournamentId: true },
  });
  await prisma.team.delete({ where: { id } });
  if (team) {
    revalidatePath(`/tournament/${team.tournamentId}/teams`);
  }
}

export async function importTeams(tournamentId: string, rows: ImportTeamRow[]) {
  const data = rows.map((r) => ({
    tournamentId,
    name: r.name,
    school: r.school,
  }));

  const result = await prisma.team.createMany({ data });
  revalidatePath(`/tournament/${tournamentId}/teams`);
  return { count: result.count };
}

export async function deleteAllTeams(tournamentId: string) {
  const result = await prisma.team.deleteMany({ where: { tournamentId } });
  revalidatePath(`/tournament/${tournamentId}/teams`);
  return { count: result.count };
}