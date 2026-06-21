import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createStarBuddyReply } from '../ai/starBuddy.js';
import { createSpeechToTextProvider, createStarAiProvider } from '../ai/providers/index.js';
import { synthesizeTextToSpeech } from '../ai/providers/textToSpeechProvider.js';
import type { StarBuddyMode, TextToSpeechMode } from '../ai/types.js';

const modes = new Set<StarBuddyMode>(['chat', 'care-plan', 'story', 'quiz']);
const ttsModes = new Set<TextToSpeechMode>(['chat', 'story', 'quiz']);

function readBody(requestBody: unknown) {
  return (requestBody && typeof requestBody === 'object' ? requestBody : {}) as Record<string, unknown>;
}

async function handleStarBuddy(app: FastifyInstance, mode: StarBuddyMode, request: FastifyRequest, reply: FastifyReply) {
  const body = readBody(request.body);
  const petId = String(body.petId ?? '').trim();
  if (!petId) {
    return reply.code(400).send({ error: 'INVALID_AI_INPUT' });
  }
  const pet = await app.repository.findPetById(petId);
  if (!pet || pet.userId !== request.currentUser!.id) {
    return reply.code(404).send({ error: 'PET_NOT_FOUND' });
  }
  const response = await createStarBuddyReply({
    mode,
    message: body.message,
    pet,
    provider: createStarAiProvider(),
  });
  return { response };
}

function getAudioFileExtension(mimeType: string) {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

async function handleSpeechToText(request: FastifyRequest, reply: FastifyReply) {
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
  const text = await createSpeechToTextProvider().transcribe({
    audio: buffer,
    filename: file.filename || `voice.${getAudioFileExtension(mimeType)}`,
    mimeType,
    timeoutMs: Number(process.env.AI_STT_TIMEOUT_MS || process.env.AI_TIMEOUT_MS || 10000),
  });
  return { text };
}

async function handleTextToSpeech(request: FastifyRequest, reply: FastifyReply) {
  const body = readBody(request.body);
  const text = String(body.text ?? '').trim();
  const requestedMode = String(body.mode ?? 'chat') as TextToSpeechMode;
  const mode = ttsModes.has(requestedMode) ? requestedMode : 'chat';
  const voice = typeof body.voice === 'string' ? body.voice.trim() : undefined;

  if (!text) {
    return reply.code(400).send({ error: 'TTS_TEXT_REQUIRED' });
  }

  const { result: audio, cacheStatus } = await synthesizeTextToSpeech({
    text,
    mode,
    voice,
    timeoutMs: Number(process.env.TTS_TIMEOUT_MS || 15000),
  });

  reply
    .type(audio.mimeType)
    .header('cache-control', 'private, max-age=86400')
    .header('x-petpet-tts-provider', audio.provider)
    .header('x-petpet-tts-cache', cacheStatus)
    .header('x-petpet-tts-voice', audio.voice);
  return reply.send(Buffer.from(audio.audio));
}

export async function registerAiRoutes(app: FastifyInstance) {
  app.post('/api/ai/star-buddy/:mode', { preHandler: app.requireAuth }, async (request, reply) => {
    const mode = String((request.params as { mode?: string }).mode ?? '') as StarBuddyMode;
    if (!modes.has(mode)) {
      return reply.code(404).send({ error: 'AI_MODE_NOT_FOUND' });
    }
    return handleStarBuddy(app, mode, request, reply);
  });

  app.post('/api/ai/speech-to-text', { preHandler: app.requireAuth }, async (request, reply) => {
    return handleSpeechToText(request, reply);
  });

  app.post('/api/ai/text-to-speech', { preHandler: app.requireAuth }, async (request, reply) => {
    return handleTextToSpeech(request, reply);
  });
}
