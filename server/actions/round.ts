"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createRound(data: {
  tournamentId: string;
  name: string;
  order: number;
}) {
  const round = await prisma.round.create({ data });
  revalidatePath(`/tournament/${data.tournamentId}/rounds`);
  return round;
}

export async function updateRound(
  id: string,
  data: { name?: string; order?: number },
) {
  const round = await prisma.round.update({ where: { id }, data });
  const updated = await prisma.round.findUnique({
    where: { id },
    select: { tournamentId: true },
  });
  if (updated) {
    revalidatePath(`/tournament/${updated.tournamentId}/rounds`);
    revalidatePath(`/tournament/${updated.tournamentId}/rounds/${id}/groups`);
  }
  return round;
}

export async function deleteRound(id: string) {
  const round = await prisma.round.findUnique({
    where: { id },
    select: { tournamentId: true },
  });
  await prisma.round.delete({ where: { id } });
  if (round) {
    revalidatePath(`/tournament/${round.tournamentId}/rounds`);
  }
}

export async function createGroup(data: {
  roundId: string;
  name: string;
  order: number;
}) {
  const group = await prisma.group.create({ data });

  const round = await prisma.round.findUnique({
    where: { id: data.roundId },
    select: { tournamentId: true },
  });
  if (round) {
    revalidatePath(
      `/tournament/${round.tournamentId}/rounds/${data.roundId}/groups`,
    );
  }
  return group;
}

export async function updateGroup(
  id: string,
  data: { name?: string; order?: number },
) {
  const group = await prisma.group.update({ where: { id }, data });

  const updated = await prisma.group.findUnique({
    where: { id },
    include: { round: { select: { tournamentId: true } } },
  });
  if (updated) {
    revalidatePath(
      `/tournament/${updated.round.tournamentId}/rounds/${updated.roundId}/groups`,
    );
  }
  return group;
}

export async function deleteGroup(id: string) {
  const group = await prisma.group.findUnique({
    where: { id },
    include: { round: { select: { tournamentId: true } } },
  });
  await prisma.group.delete({ where: { id } });
  if (group) {
    revalidatePath(
      `/tournament/${group.round.tournamentId}/rounds/${group.roundId}/groups`,
    );
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function randomizeTeamsToRound(
  roundId: string,
  teamsPerKloter: number,
) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { tournament: true },
  });
  if (!round) throw new Error("Babak tidak ditemukan");

  const tournamentId = round.tournamentId;

  const allTeams = await prisma.team.findMany({
    where: { tournamentId, qualified: true },
    select: { id: true, school: true },
  });

  if (allTeams.length === 0) {
    return { message: "Belum ada tim di tournament ini.", kloterCount: 0 };
  }

  await prisma.group.deleteMany({ where: { roundId } });

  const kloterCount = Math.ceil(allTeams.length / teamsPerKloter);
  const kloter: { id: string; school: string }[][] = Array.from(
    { length: kloterCount },
    () => [],
  );

  const buckets = new Map<string, { id: string; school: string }[]>();

  for (const team of allTeams) {
    if (!buckets.has(team.school)) {
      buckets.set(team.school, []);
    }

    buckets.get(team.school)!.push(team);
  }

  const bucketList = Array.from(buckets.values()).map(shuffle);
  shuffle(bucketList);

  let pointer = Math.floor(Math.random() * kloterCount);
  for (const bucket of bucketList) {
    for (const team of bucket) {
      let attempts = 0;

      while (attempts < kloterCount) {
        const group = kloter[pointer];

        const hasSameSchool = group.some((t) => t.school === team.school);

        if (group.length < teamsPerKloter && !hasSameSchool) {
          group.push(team);
          pointer = (pointer + 1) % kloterCount;
          break;
        }

        pointer = (pointer + 1) % kloterCount;
        attempts++;
      }

      const alreadyPlaced = kloter.some((g) => g.some((t) => t.id === team.id));

      if (!alreadyPlaced) {
        for (const group of kloter) {
          if (group.length < teamsPerKloter) {
            group.push(team);
            break;
          }
        }
      }
    }
  }

  for (let i = 0; i < kloterCount; i++) {
    const group = await prisma.group.create({
      data: {
        roundId,
        name: `Kloter ${i + 1}`,
        order: i + 1,
      },
    });

    const game = await prisma.game.create({
      data: { groupId: group.id },
    });

    for (const { id } of kloter[i]) {
      await prisma.gameTeam.create({
        data: { gameId: game.id, teamId: id },
      });
    }
  }

  revalidatePath(`/tournament/${tournamentId}/rounds`);
  revalidatePath(`/tournament/${tournamentId}/rounds/${roundId}/groups`);
  revalidatePath(`/tournament/${tournamentId}/game`);

  return {
    message: `Berhasil membuat ${kloterCount} kloter dengan ${allTeams.length} tim.`,
    kloterCount,
  };
}
