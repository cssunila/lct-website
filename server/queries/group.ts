import "server-only";

import { prisma } from "@/lib/prisma";

export async function getGroupsByRound(roundId: string) {
  return prisma.group.findMany({
    where: { roundId },
    orderBy: { order: "asc" },
    include: {
      games: {
        include: {
          teams: { include: { team: true } },
          questions: true,
        },
      },
    },
  });
}

export async function getGroupById(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      games: {
        include: {
          teams: { include: { team: true } },
          questions: { include: { question: true } },
        },
      },
    },
  });
}
