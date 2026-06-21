import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

export function getPrisma() {
  prisma ??= new PrismaClient();
  return prisma;
}
