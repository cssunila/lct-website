"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createTournament(data: { name: string; year: number }) {
  const tournament = await prisma.tournament.create({
    data: {
      ...data,
      settings: {
        create: {},
      },
    },
  });

  revalidatePath("/tournament");
  revalidatePath("/admin");
  return tournament;
}

export async function updateTournament(
  id: string,
  data: { name?: string; status?: "DRAFT" | "ACTIVE" | "FINISHED" }
) {
  const tournament = await prisma.tournament.update({
    where: { id },
    data,
  });

  revalidatePath("/tournament");
  revalidatePath(`/tournament/${id}/settings`);
  revalidatePath("/admin");
  return tournament;
}

export async function deleteTournament(id: string) {
  await prisma.tournament.delete({ where: { id } });
  revalidatePath("/tournament");
  revalidatePath("/admin");
}

export interface UpdateSettingInput {
  mandatoryCorrectPoint?: number;
  mandatoryWrongPoint?: number;
  buzzerCorrectPoint?: number;
  buzzerWrongPoint?: number;
}

export async function updateTournamentSetting(
  tournamentId: string,
  data: UpdateSettingInput
) {
  const setting = await prisma.tournamentSetting.update({
    where: { tournamentId },
    data,
  });

  revalidatePath(`/tournament/${tournamentId}/settings`);
  revalidatePath("/admin");
  return setting;
}
