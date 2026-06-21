-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "selectedPetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animalTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "speedMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "mood" TEXT NOT NULL,
    "hunger" DOUBLE PRECISION NOT NULL,
    "thirst" DOUBLE PRECISION NOT NULL,
    "energy" DOUBLE PRECISION NOT NULL,
    "happiness" DOUBLE PRECISION NOT NULL,
    "health" DOUBLE PRECISION NOT NULL,
    "hygiene" DOUBLE PRECISION NOT NULL,
    "stress" DOUBLE PRECISION NOT NULL,
    "isSick" BOOLEAN NOT NULL DEFAULT false,
    "outfitIds" JSONB NOT NULL DEFAULT '[]',
    "friendIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "stepsJson" JSONB NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetVisit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetInteraction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Pet_userId_idx" ON "Pet"("userId");

-- CreateIndex
CREATE INDEX "Achievement_userId_idx" ON "Achievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_userId_achievementId_key" ON "Achievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "DailyQuest_userId_idx" ON "DailyQuest"("userId");

-- CreateIndex
CREATE INDEX "DailyQuest_petId_idx" ON "DailyQuest"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuest_petId_dateKey_key" ON "DailyQuest"("petId", "dateKey");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_idx" ON "Friendship"("requesterId");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_idx" ON "Friendship"("addresseeId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "PetVisit_visitorId_idx" ON "PetVisit"("visitorId");

-- CreateIndex
CREATE INDEX "PetVisit_ownerId_idx" ON "PetVisit"("ownerId");

-- CreateIndex
CREATE INDEX "PetVisit_petId_idx" ON "PetVisit"("petId");

-- CreateIndex
CREATE INDEX "PetInteraction_actorId_idx" ON "PetInteraction"("actorId");

-- CreateIndex
CREATE INDEX "PetInteraction_ownerId_idx" ON "PetInteraction"("ownerId");

-- CreateIndex
CREATE INDEX "PetInteraction_petId_idx" ON "PetInteraction"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "PetInteraction_actorId_petId_kind_dayKey_key" ON "PetInteraction"("actorId", "petId", "kind", "dayKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQuest" ADD CONSTRAINT "DailyQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQuest" ADD CONSTRAINT "DailyQuest_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetVisit" ADD CONSTRAINT "PetVisit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetVisit" ADD CONSTRAINT "PetVisit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetVisit" ADD CONSTRAINT "PetVisit_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetInteraction" ADD CONSTRAINT "PetInteraction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetInteraction" ADD CONSTRAINT "PetInteraction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetInteraction" ADD CONSTRAINT "PetInteraction_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
