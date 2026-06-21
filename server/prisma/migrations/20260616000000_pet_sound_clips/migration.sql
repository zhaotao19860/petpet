-- CreateTable
CREATE TABLE "PetSoundClip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "animalTypeId" TEXT NOT NULL,
    "soundType" TEXT NOT NULL,
    "label" TEXT,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetSoundClip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PetSoundClip_userId_idx" ON "PetSoundClip"("userId");

-- CreateIndex
CREATE INDEX "PetSoundClip_petId_idx" ON "PetSoundClip"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "PetSoundClip_petId_soundType_key" ON "PetSoundClip"("petId", "soundType");

-- AddForeignKey
ALTER TABLE "PetSoundClip" ADD CONSTRAINT "PetSoundClip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetSoundClip" ADD CONSTRAINT "PetSoundClip_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
