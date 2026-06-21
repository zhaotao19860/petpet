import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const helperSource = () => readFileSync(resolve(import.meta.dirname, '../src/utils/starBuddyPlay.ts'), 'utf8');
const speechSourcePath = () => resolve(import.meta.dirname, '../src/utils/browserSpeech.ts');
const speechSource = () => readFileSync(speechSourcePath(), 'utf8');
const panelSource = () => readFileSync(resolve(import.meta.dirname, '../src/components/StarBuddyPanel.tsx'), 'utf8');
const styleSource = () => readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8');
const appSource = () => readFileSync(resolve(import.meta.dirname, '../src/App.tsx'), 'utf8');
const homeSource = () => readFileSync(resolve(import.meta.dirname, '../src/pages/HomePage.tsx'), 'utf8');

test('star buddy play helper exports stable contracts', () => {
  const source = helperSource();

  assert.match(source, /export type StarBuddyActionName = /);
  assert.match(source, /export interface StarBuddyReaction/);
  assert.match(source, /export function getStarBuddyReaction/);
  assert.doesNotMatch(source, /StarBuddyMissionCard|getStarBuddyMissionCards|getStarBuddyRewardCopy/);
});

test('tap reactions define five child-friendly action names', () => {
  const source = helperSource();
  const actions = ['bounce', 'spin', 'wink', 'sparkle', 'tilt'];

  for (const action of actions) {
    assert.match(source, new RegExp(`action: '${action}'`));
  }
});

test('tap reactions invite questions and stories instead of hidden care or game tasks', () => {
  const source = helperSource();

  assert.doesNotMatch(source, /照顾小动物|出题|游戏/);
  assert.match(source, /故事|小秘密|问题/);
});

test('star buddy is mounted once at app level instead of home-only', () => {
  const app = appSource();
  const home = homeSource();

  assert.match(app, /<StarBuddyPanel/);
  assert.match(app, /store\.activePet/);
  assert.doesNotMatch(home, /<StarBuddyPanel/);
});

test('star buddy panel keeps only question and story entry points while supporting quiz replies', () => {
  const source = panelSource();

  assert.match(source, /'chat'/);
  assert.match(source, /'story'/);
  assert.doesNotMatch(source, /mode:\s*'care-plan'/);
  assert.doesNotMatch(source, /star-buddy-mission-strip/);
  assert.doesNotMatch(source, /onOpenLearn|onOpenChallenge|onCare|onQuizCorrect/);
});

test('star buddy panel uses a simple input and output layout without mode cards', () => {
  const source = panelSource();

  assert.match(source, /star-buddy-conversation-shell/);
  assert.match(source, /star-buddy-input-card/);
  assert.match(source, /star-buddy-output-card/);
  assert.match(source, /inferModeFromPrompt/);
  assert.match(source, /童話/);
  assert.match(source, /講/);
  assert.match(source, /同話/);
  assert.match(source, /ask\(inferModeFromPrompt\(message\), message, true\)/);
  assert.doesNotMatch(source, /star-buddy-voice-row/);
  assert.doesNotMatch(source, /voice-button/);
  assert.doesNotMatch(source, /star-buddy-mode-pair/);
  assert.doesNotMatch(source, /role="tablist"/);
});

test('star buddy routes quiz-like prompts to a multiple-choice answer inside question flow', () => {
  const source = panelSource();

  assert.match(source, /type CompanionMode = Extract<StarBuddyMode, 'chat' \| 'story' \| 'quiz'>/);
  assert.match(source, /function inferModeFromPrompt/);
  assert.match(source, /出题|出題|考考|选择题|選擇題|小测验|小測驗/);
  assert.match(source, /问一个动物问题/);
  assert.match(source, /ask\(inferModeFromPrompt\(message\), message, true\)/);
  assert.match(source, /onPrompt\(inferModeFromPrompt\(prompt\), prompt\)/);
  assert.doesNotMatch(source, /star-buddy-mode-pair/);
});

test('star buddy story continuation sends the current story context', () => {
  const source = panelSource();

  assert.match(source, /function buildStoryContinuationPrompt/);
  assert.match(source, /上一段/);
  assert.match(source, /response\.title/);
  assert.match(source, /response\.paragraphs/);
  assert.match(source, /choice\.prompt/);
  assert.match(source, /onPrompt\('story', buildStoryContinuationPrompt\(response, choice\.prompt\)\)/);
});

test('star buddy renders quiz options and explains wrong answers', () => {
  const source = panelSource();

  assert.match(source, /response\.kind === 'quiz'/);
  assert.match(source, /function StarBuddyQuizCard/);
  assert.match(source, /selectedQuizIndex/);
  assert.match(source, /response\.correctIndex/);
  assert.match(source, /response\.hint/);
  assert.match(source, /答对啦/);
  assert.match(source, /再想想/);
  assert.match(source, /star-buddy-quiz-feedback/);
});

test('star buddy supports spoken answers without voice input', () => {
  const source = panelSource();

  assert.match(source, /speechSynthesis/);
  assert.match(source, /speakStarBuddyResponse/);
  assert.doesNotMatch(source, /SpeechRecognition/);
  assert.doesNotMatch(source, /webkitSpeechRecognition/);
  assert.doesNotMatch(source, /startServerListening/);
});

test('star buddy keeps text question input without microphone controls', () => {
  const source = panelSource();
  const api = readFileSync(resolve(import.meta.dirname, '../src/utils/starBuddyApi.ts'), 'utf8');

  assert.match(source, /star-buddy-question-row/);
  assert.match(source, /<input/);
  assert.match(source, /onClick=\{\(\) => void ask\(inferModeFromPrompt\(message\), message, true\)\}/);
  assert.doesNotMatch(source, /star-buddy-voice-row/);
  assert.doesNotMatch(source, /star-buddy-voice-hint/);
  assert.doesNotMatch(source, /voice-button/);
  assert.doesNotMatch(source, /listening/);
  assert.doesNotMatch(source, /speechMessage/);
  assert.doesNotMatch(source, /toggleListening/);
  assert.doesNotMatch(source, /stopListening/);
  assert.doesNotMatch(source, /SpeechRecognition/);
  assert.doesNotMatch(source, /webkitSpeechRecognition/);
  assert.doesNotMatch(source, /MediaRecorder/);
  assert.doesNotMatch(source, /navigator\.mediaDevices/);
  assert.doesNotMatch(source, /getUserMedia/);
  assert.doesNotMatch(source, /requestSpeechToText/);
  assert.doesNotMatch(api, /requestSpeechToText/);
  assert.doesNotMatch(api, /\/api\/ai\/speech-to-text/);
});

test('star buddy launcher toggles the panel closed when tapped again', () => {
  const source = panelSource();

  assert.match(source, /function handleLauncherClick/);
  assert.match(source, /if \(open\)/);
  assert.match(source, /stopSpeaking\(\)/);
  assert.match(source, /setOpen\(false\)/);
  assert.match(source, /aria-expanded=\{open\}/);
});

test('star buddy mobile launcher stays compact in WeChat-sized webviews', () => {
  const source = styleSource();

  assert.match(source, /@media \(max-width: 680px\)/);
  assert.match(source, /\.star-buddy:not\(\.open\)/);
  assert.match(source, /width: fit-content/);
  assert.match(source, /max-width: calc\(100vw - 24px\)/);
  assert.match(source, /\.star-buddy:not\(\.open\) \.star-buddy-launcher/);
  assert.match(source, /\.star-buddy\.open \.star-buddy-launcher/);
  assert.match(source, /align-self: flex-end/);
  assert.match(source, /max-width: min\(72vw, 260px\)/);
  assert.doesNotMatch(source, /\.star-buddy-launcher\s*\{[^}]*width:\s*100%/);
});

test('star buddy message edits stay text-only and do not manage voice hints', () => {
  const source = panelSource();

  assert.match(source, /handleMessageChange/);
  assert.match(source, /onChange=\{handleMessageChange\}/);
  assert.doesNotMatch(source, /setSpeechMessage/);
  assert.doesNotMatch(source, /star-buddy-voice-hint/);
});

test('star buddy story mode asks for longer fairy tales and read-aloud controls', () => {
  const source = panelSource();

  assert.match(source, /讲一个长一点的动物童话故事/);
  assert.match(source, /帮我读/);
  assert.match(source, /暂停|继续/);
});

test('browser speech helper splits long stories into speakable Chinese chunks', () => {
  assert.equal(existsSync(speechSourcePath()), true);
  const source = speechSource();

  assert.match(source, /export function splitSpeechText/);
  assert.match(source, /maxChunkLength/);
  assert.match(source, /。|！|？|；/);
  assert.match(source, /paragraphs?/);
});

test('browser speech helper prefers natural Mandarin voices and mode-specific rhythm', () => {
  assert.equal(existsSync(speechSourcePath()), true);
  const source = speechSource();

  assert.match(source, /export function chooseBestChineseVoice/);
  assert.match(source, /Natural|Premium|Xiaoxiao|Yunxi|Tingting|Mei-Jia/);
  assert.match(source, /zh-CN/);
  assert.match(source, /export function getSpeechSettings/);
  assert.match(source, /mode === 'story'/);
});

test('browser speech helper separates mobile and desktop speech profiles', () => {
  assert.equal(existsSync(speechSourcePath()), true);
  const source = speechSource();

  assert.match(source, /export type SpeechPlatform = 'ios' \| 'android' \| 'desktop' \| 'unknown'/);
  assert.match(source, /export function detectSpeechPlatform/);
  assert.match(source, /export function getSpeechProfile/);
  assert.match(source, /maxTouchPoints/);
  assert.match(source, /IOS_SYSTEM_VOICE_HINTS/);
  assert.match(source, /ANDROID_SYSTEM_VOICE_HINTS/);
  assert.match(source, /ROBOTIC_VOICE_HINTS/);
  assert.match(source, /profile\.isMobile/);
});

test('browser speech helper cleans child read-aloud text before chunking', () => {
  assert.equal(existsSync(speechSourcePath()), true);
  const source = speechSource();

  assert.match(source, /export function prepareSpeechText/);
  assert.match(source, /A 选项/);
  assert.match(source, /B 选项/);
  assert.match(source, /replace\(\/\\\*\\\*\(\.\*\?\)\\\*\\\*\/g/);
  assert.match(source, /normalizeText\(prepareSpeechText\(text\)\)/);
});

test('star buddy read aloud passes speech profile into voice and rhythm helpers', () => {
  const source = panelSource();

  assert.match(source, /getSpeechProfile/);
  assert.match(source, /const speechProfile = useMemo/);
  assert.match(source, /getSpeechSettings\(readModeRef\.current, speechProfile\)/);
  assert.match(source, /chooseBestChineseVoice\(voices, speechProfile\)/);
  assert.match(source, /getSpeechVoiceLabel/);
  assert.match(source, /readVoiceLabel/);
});

test('star buddy read aloud prefers server generated mp3 and falls back to browser speech', () => {
  const source = panelSource();
  const api = readFileSync(resolve(import.meta.dirname, '../src/utils/starBuddyApi.ts'), 'utf8');

  assert.match(api, /export async function requestStarBuddySpeech/);
  assert.match(api, /\/api\/ai\/text-to-speech/);
  assert.match(api, /response\.blob\(\)/);
  assert.match(source, /requestStarBuddySpeech/);
  assert.match(source, /Audio/);
  assert.match(source, /audioElementRef/);
  assert.match(source, /serverSpeechUrlRef/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /revokeObjectURL/);
  assert.match(source, /useServerSpeech/);
  assert.match(source, /fallbackToBrowserSpeech/);
  assert.match(source, /神经配音/);
});

test('star buddy unlocks server audio before async mp3 fetch for mobile browsers', () => {
  const source = panelSource();

  assert.match(source, /primeServerAudioForMobile/);
  assert.match(source, /audioElementRef\.current = new Audio\(\)/);
  assert.match(source, /audioElementRef\.current\.src = objectUrl/);
  assert.doesNotMatch(source, /const audio = new Audio\(objectUrl\)/);
});

test('star buddy server read aloud splits long answers into mp3 chunks', () => {
  const source = panelSource();

  assert.match(source, /serverSpeechChunksRef/);
  assert.match(source, /serverSpeechChunkIndexRef/);
  assert.match(source, /getServerSpeechChunkLength/);
  assert.match(source, /splitSpeechText\(text, getServerSpeechChunkLength\(mode\)\)/);
  assert.match(source, /requestStarBuddySpeech\(chunks\[index\], mode\)/);
  assert.match(source, /playServerSpeechChunk\(index \+ 1, token, mode\)/);
  assert.match(source, /setReadChunkCount\(chunks\.length\)/);
});

test('star buddy browser speech fallback advances when mobile speech end event is missed', () => {
  const source = panelSource();

  assert.match(source, /readSafetyTimerRef/);
  assert.match(source, /estimateSpeechDurationMs/);
  assert.match(source, /scheduleSpeechSafetyAdvance/);
  assert.match(source, /clearReadSafetyTimer/);
  assert.match(source, /speakChunkAt\(nextIndex, token\)/);
});

test('star buddy read aloud button cannot restart the first chunk while already playing', () => {
  const source = panelSource();

  assert.match(source, /readState === 'playing' \? '朗读中'/);
  assert.match(source, /disabled=\{readState === 'playing' \|\| !responseText\}/);
});

test('star buddy read aloud uses browser speech helper and chunk progress', () => {
  const source = panelSource();

  assert.match(source, /browserSpeech/);
  assert.match(source, /splitSpeechText/);
  assert.match(source, /chooseBestChineseVoice/);
  assert.match(source, /getSpeechSettings/);
  assert.match(source, /speechSynthesis\.getVoices/);
  assert.match(source, /voiceschanged/);
  assert.match(source, /readChunksRef/);
  assert.match(source, /readChunkIndex/);
  assert.match(source, /第 \{readChunkIndex \+ 1\} 段/);
  assert.match(source, /继续/);
});

test('star buddy resume restarts from the current chunk instead of relying only on browser resume', () => {
  const source = panelSource();

  assert.match(source, /pausedReadIndexRef/);
  assert.match(source, /pausedReadIndexRef\.current = nextReadIndexRef\.current/);
  assert.match(source, /window\.speechSynthesis\.cancel\(\)/);
  assert.match(source, /const resumeIndex = pausedReadIndexRef\.current/);
  assert.match(source, /window\.setTimeout\(\(\) => speakChunkAt\(resumeIndex, token\), 30\)/);
  assert.doesNotMatch(source, /window\.speechSynthesis\.resume\(\);\s*return;/);
});
