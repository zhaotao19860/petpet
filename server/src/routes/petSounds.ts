import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import type { StoredPetSoundClip } from '../auth.js';

const soundTypes = new Set(['joy', 'angry', 'sad', 'happy', 'eat', 'drink', 'sleep']);
const defaultMaxBytes = 2_500_000;

function getUploadRoot() {
  return resolve(process.cwd(), process.env.PET_SOUND_UPLOAD_DIR || 'uploads/pet-sounds');
}

function getMaxBytes() {
  const configured = Number(process.env.PET_SOUND_MAX_BYTES || defaultMaxBytes);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultMaxBytes;
}

function getAudioFileExtension(mimeType: string, filename: string) {
  const existing = extname(filename).replace('.', '').toLowerCase();
  if (existing && /^[a-z0-9]+$/.test(existing)) return existing;
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

function clipUrl(clip: StoredPetSoundClip) {
  return `/api/pets/${clip.petId}/sounds/${clip.soundType}/file?v=${encodeURIComponent(clip.updatedAt)}`;
}

function toSoundClipView(clip: StoredPetSoundClip) {
  return {
    id: clip.id,
    petId: clip.petId,
    animalTypeId: clip.animalTypeId,
    soundType: clip.soundType,
    label: clip.label,
    url: clipUrl(clip),
    mimeType: clip.mimeType,
    fileSize: clip.fileSize,
    durationMs: clip.durationMs,
    createdAt: clip.createdAt,
    updatedAt: clip.updatedAt,
  };
}

function getTextFieldValue(field: unknown) {
  if (!field || typeof field !== 'object') return undefined;
  const value = (field as { value?: unknown }).value;
  return typeof value === 'string' ? value.trim() : undefined;
}

async function deleteFileQuietly(filePath: string | undefined) {
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    // File cleanup should not block the user from replacing or deleting a clip.
  }
}

async function requireOwnedPet(app: FastifyInstance, userId: string, petId: string) {
  const pet = await app.repository.findPetById(petId);
  return pet && pet.userId === userId ? pet : undefined;
}

export async function registerPetSoundRoutes(app: FastifyInstance) {
  app.get('/api/pets/:petId/sounds', { preHandler: app.requireAuth }, async (request, reply) => {
    const { petId } = request.params as { petId: string };
    const pet = await requireOwnedPet(app, request.currentUser!.id, petId);
    if (!pet) return reply.code(404).send({ error: 'PET_NOT_FOUND' });

    const clips = await app.repository.listPetSoundClips(request.currentUser!.id, pet.id);
    return { clips: clips.map(toSoundClipView) };
  });

  app.post('/api/pets/:petId/sounds/:soundType', { preHandler: app.requireAuth }, async (request, reply) => {
    const { petId, soundType } = request.params as { petId: string; soundType: string };
    if (!soundTypes.has(soundType)) {
      return reply.code(400).send({ error: 'INVALID_SOUND_TYPE' });
    }

    const pet = await requireOwnedPet(app, request.currentUser!.id, petId);
    if (!pet) return reply.code(404).send({ error: 'PET_NOT_FOUND' });

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: 'AUDIO_FILE_REQUIRED' });
    }

    const mimeType = file.mimetype || 'audio/webm';
    if (!mimeType.startsWith('audio/')) {
      return reply.code(400).send({ error: 'AUDIO_FILE_REQUIRED' });
    }

    const buffer = await file.toBuffer();
    if (!buffer.byteLength) {
      return reply.code(400).send({ error: 'AUDIO_FILE_EMPTY' });
    }
    if (buffer.byteLength > getMaxBytes()) {
      return reply.code(413).send({ error: 'AUDIO_FILE_TOO_LARGE' });
    }

    const clipId = randomUUID();
    const extension = getAudioFileExtension(mimeType, file.filename || 'voice.webm');
    const uploadDir = resolve(getUploadRoot(), request.currentUser!.id, pet.id);
    await mkdir(uploadDir, { recursive: true });
    const filePath = resolve(uploadDir, `${soundType}-${clipId}.${extension}`);

    const label = getTextFieldValue(file.fields.label) || basename(file.filename || '').slice(0, 40) || undefined;
    const oldClip = await app.repository.findPetSoundClip(request.currentUser!.id, pet.id, soundType);
    await import('node:fs/promises').then(({ writeFile }) => writeFile(filePath, buffer));

    const clip = await app.repository.upsertPetSoundClip({
      userId: request.currentUser!.id,
      petId: pet.id,
      animalTypeId: pet.animalTypeId,
      soundType,
      label,
      mimeType,
      filePath,
      fileSize: buffer.byteLength,
    });

    if (oldClip?.filePath && oldClip.filePath !== filePath) {
      await deleteFileQuietly(oldClip.filePath);
    }

    return reply.code(oldClip ? 200 : 201).send({ clip: toSoundClipView(clip) });
  });

  app.get('/api/pets/:petId/sounds/:soundType/file', { preHandler: app.requireAuth }, async (request, reply) => {
    const { petId, soundType } = request.params as { petId: string; soundType: string };
    if (!soundTypes.has(soundType)) {
      return reply.code(400).send({ error: 'INVALID_SOUND_TYPE' });
    }

    const pet = await requireOwnedPet(app, request.currentUser!.id, petId);
    if (!pet) return reply.code(404).send({ error: 'PET_NOT_FOUND' });

    const clip = await app.repository.findPetSoundClip(request.currentUser!.id, pet.id, soundType);
    if (!clip) return reply.code(404).send({ error: 'SOUND_CLIP_NOT_FOUND' });

    return reply
      .type(clip.mimeType)
      .header('cache-control', 'private, max-age=3600')
      .send(createReadStream(clip.filePath));
  });

  app.delete('/api/pets/:petId/sounds/:soundType', { preHandler: app.requireAuth }, async (request, reply) => {
    const { petId, soundType } = request.params as { petId: string; soundType: string };
    if (!soundTypes.has(soundType)) {
      return reply.code(400).send({ error: 'INVALID_SOUND_TYPE' });
    }

    const pet = await requireOwnedPet(app, request.currentUser!.id, petId);
    if (!pet) return reply.code(404).send({ error: 'PET_NOT_FOUND' });

    const clip = await app.repository.deletePetSoundClip(request.currentUser!.id, pet.id, soundType);
    await deleteFileQuietly(clip?.filePath);
    return { ok: true };
  });
}
