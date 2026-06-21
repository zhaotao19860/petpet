import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { PetInstance } from '../models/pet';
import type { StarBuddyEmotion, StarBuddyMode, StarBuddyResponse } from '../models/starBuddy';
import { chooseBestChineseVoice, getSpeechProfile, getSpeechSettings, getSpeechVoiceLabel, splitSpeechText } from '../utils/browserSpeech';
import { playStarBuddySound } from '../utils/petSounds';
import { getStarBuddyReaction, type StarBuddyActionName } from '../utils/starBuddyPlay';
import { requestStarBuddy, requestStarBuddySpeech } from '../utils/starBuddyApi';

type CompanionMode = Extract<StarBuddyMode, 'chat' | 'story' | 'quiz'>;
type ReadState = 'idle' | 'playing' | 'paused';

function getStarterForMode(mode: CompanionMode) {
  if (mode === 'quiz') return '出一个关于这个动物的选择题';
  return mode === 'story' ? '讲一个长一点的动物童话故事' : '这个动物有什么小秘密？';
}

function inferModeFromPrompt(prompt: string): CompanionMode {
  if (/出题|出題|考考|选择题|選擇題|小测验|小測驗|quiz|问一个动物问题|問一個動物問題|出一个.*问题|出一個.*問題|来一题|來一題/.test(prompt)) {
    return 'quiz';
  }
  return /故事|童话|童話|同话|同話|讲一个|講一個|讲个|講個|睡前|冒险|冒險/.test(prompt) ? 'story' : 'chat';
}

function getResponseText(response?: StarBuddyResponse) {
  if (!response) return '';
  if (response.kind === 'story') {
    return [response.title, ...response.paragraphs].join('。');
  }
  if (response.kind === 'chat') {
    return response.message;
  }
  if (response.kind === 'quiz') {
    const labels = ['A', 'B', 'C', 'D'];
    const optionsText = response.options.map((option, index) => `${labels[index]}. ${option}`).join('。');
    return `${response.question}。${optionsText}。${response.hint}`;
  }
  return '';
}

function buildStoryContinuationPrompt(response: Extract<StarBuddyResponse, { kind: 'story' }>, choicePrompt: string) {
  const lastParagraph = response.paragraphs.at(-1) ?? response.paragraphs.join('。').slice(-120);
  return [
    choicePrompt,
    `请继续这个故事，不要从头重讲，也不要重复标题。故事标题：${response.title}`,
    `上一段：${lastParagraph}`,
  ].join('。');
}

function getServerSpeechChunkLength(mode: CompanionMode) {
  if (mode === 'story') return 620;
  if (mode === 'quiz') return 520;
  return 560;
}

export function StarBuddyPanel({ pet }: { pet: PetInstance }) {
  const [open, setOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<CompanionMode>('chat');
  const [message, setMessage] = useState(getStarterForMode('chat'));
  const [response, setResponse] = useState<StarBuddyResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reaction, setReaction] = useState<{ action: StarBuddyActionName; message: string; id: number }>();
  const [tapCount, setTapCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [readState, setReadState] = useState<ReadState>('idle');
  const [readChunkIndex, setReadChunkIndex] = useState(0);
  const [readChunkCount, setReadChunkCount] = useState(0);
  const [readVoiceLabel, setReadVoiceLabel] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const readChunksRef = useRef<string[]>([]);
  const readModeRef = useRef<CompanionMode>('chat');
  const readTokenRef = useRef(0);
  const readPauseTimerRef = useRef<number | undefined>(undefined);
  const readSafetyTimerRef = useRef<number | undefined>(undefined);
  const nextReadIndexRef = useRef(0);
  const pausedReadIndexRef = useRef(0);
  const serverSpeechChunksRef = useRef<string[]>([]);
  const serverSpeechChunkIndexRef = useRef(0);
  const audioElementRef = useRef<HTMLAudioElement | undefined>(undefined);
  const serverSpeechUrlRef = useRef<string | undefined>(undefined);
  const useServerSpeech = true;
  const expression = loading ? 'thinking' : response?.emotion ?? (open ? 'curious' : 'encourage');
  const actionClass = reaction ? ` action-${reaction.action}` : '';
  const readAloudSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const speechProfile = useMemo(() => getSpeechProfile(), []);
  const responseText = useMemo(() => getResponseText(response), [response]);

  useEffect(() => {
    if (!readAloudSupported) return undefined;
    const refreshVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
  }, [readAloudSupported]);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      readTokenRef.current += 1;
      clearReadPauseTimer();
      clearReadSafetyTimer();
      window.speechSynthesis.cancel();
    }
  }, []);

  function releaseServerSpeech(options: { keepElement?: boolean } = {}) {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.onended = null;
      audioElementRef.current.onerror = null;
      audioElementRef.current.src = '';
      if (!options.keepElement) audioElementRef.current = undefined;
    }
    if (serverSpeechUrlRef.current) {
      URL.revokeObjectURL(serverSpeechUrlRef.current);
      serverSpeechUrlRef.current = undefined;
    }
  }

  function clearReadPauseTimer() {
    if (readPauseTimerRef.current) {
      window.clearTimeout(readPauseTimerRef.current);
      readPauseTimerRef.current = undefined;
    }
  }

  function clearReadSafetyTimer() {
    if (readSafetyTimerRef.current) {
      window.clearTimeout(readSafetyTimerRef.current);
      readSafetyTimerRef.current = undefined;
    }
  }

  function primeServerAudioForMobile() {
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
      audioElementRef.current.preload = 'auto';
    }
    return audioElementRef.current;
  }

  function estimateSpeechDurationMs(text: string, mode: CompanionMode) {
    const settings = getSpeechSettings(mode, speechProfile);
    const compactText = text.replace(/\s/g, '');
    const punctuationCount = (compactText.match(/[，。！？；、,.!?;]/g) ?? []).length;
    const perCharMs = speechProfile.isMobile ? 260 : 220;
    const baseMs = mode === 'story' ? 1800 : 1400;
    const rate = Math.max(settings.rate, 0.55);
    return Math.min(70000, Math.max(3600, baseMs + (compactText.length * perCharMs + punctuationCount * 220) / rate));
  }

  function completeBrowserSpeechChunk(index: number, token: number, delayMs?: number) {
    clearReadSafetyTimer();
    if (token !== readTokenRef.current) return;
    const chunks = readChunksRef.current;
    const nextIndex = index + 1;
    if (nextIndex >= chunks.length) {
      readChunksRef.current = [];
      nextReadIndexRef.current = 0;
      setReadState('idle');
      setSpeaking(false);
      setReadVoiceLabel('');
      return;
    }
    nextReadIndexRef.current = nextIndex;
    readPauseTimerRef.current = window.setTimeout(() => {
      readPauseTimerRef.current = undefined;
      if (token === readTokenRef.current) speakChunkAt(nextIndex, token);
    }, delayMs ?? getSpeechSettings(readModeRef.current, speechProfile).pauseMs);
  }

  function scheduleSpeechSafetyAdvance(index: number, token: number, text: string, mode: CompanionMode) {
    clearReadSafetyTimer();
    readSafetyTimerRef.current = window.setTimeout(() => {
      readSafetyTimerRef.current = undefined;
      if (token === readTokenRef.current) completeBrowserSpeechChunk(index, token, 0);
    }, estimateSpeechDurationMs(text, mode));
  }

  function stopSpeaking() {
    readTokenRef.current += 1;
    clearReadPauseTimer();
    clearReadSafetyTimer();
    releaseServerSpeech();
    if (readAloudSupported) window.speechSynthesis.cancel();
    readChunksRef.current = [];
    serverSpeechChunksRef.current = [];
    serverSpeechChunkIndexRef.current = 0;
    nextReadIndexRef.current = 0;
    pausedReadIndexRef.current = 0;
    setReadState('idle');
    setSpeaking(false);
    setReadChunkIndex(0);
    setReadChunkCount(0);
    setReadVoiceLabel('');
  }

  function pauseSpeaking() {
    if (readState !== 'playing') return;
    clearReadPauseTimer();
    clearReadSafetyTimer();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      pausedReadIndexRef.current = serverSpeechChunkIndexRef.current;
      setReadState('paused');
      setSpeaking(false);
      return;
    }
    if (!readAloudSupported) return;
    pausedReadIndexRef.current = nextReadIndexRef.current;
    readTokenRef.current += 1;
    window.speechSynthesis.cancel();
    setReadState('paused');
    setSpeaking(false);
  }

  function resumeSpeaking() {
    if (readState !== 'paused') return;
    clearReadPauseTimer();
    clearReadSafetyTimer();
    if (audioElementRef.current) {
      void audioElementRef.current.play().then(() => {
        setReadState('playing');
        setSpeaking(true);
      }).catch(() => fallbackToBrowserSpeech(responseText, readModeRef.current));
      return;
    }
    if (serverSpeechChunksRef.current.length) {
      readTokenRef.current += 1;
      const token = readTokenRef.current;
      const resumeIndex = pausedReadIndexRef.current;
      setReadState('playing');
      setSpeaking(true);
      window.setTimeout(() => void playServerSpeechChunk(resumeIndex, token, readModeRef.current), 30);
      return;
    }
    if (!readAloudSupported) return;
    readTokenRef.current += 1;
    const token = readTokenRef.current;
    const resumeIndex = pausedReadIndexRef.current;
    setReadState('playing');
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.setTimeout(() => speakChunkAt(resumeIndex, token), 30);
  }

  function speakChunkAt(index: number, token: number) {
    const chunks = readChunksRef.current;
    if (!readAloudSupported || token !== readTokenRef.current) return;
    if (index >= chunks.length) {
      readChunksRef.current = [];
      nextReadIndexRef.current = 0;
      setReadState('idle');
      setSpeaking(false);
      return;
    }

    const settings = getSpeechSettings(readModeRef.current, speechProfile);
    const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();
    const voice = chooseBestChineseVoice(voices, speechProfile);
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    nextReadIndexRef.current = index;
    pausedReadIndexRef.current = index;
    setReadChunkIndex(index);
    setReadVoiceLabel(getSpeechVoiceLabel(voice, speechProfile));
    utterance.lang = voice?.lang || 'zh-CN';
    utterance.voice = voice;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    utterance.onend = () => {
      completeBrowserSpeechChunk(index, token);
    };
    utterance.onerror = () => {
      if (token !== readTokenRef.current) return;
      clearReadSafetyTimer();
      readChunksRef.current = [];
      setReadState('idle');
      setSpeaking(false);
      setReadVoiceLabel('');
    };
    window.speechSynthesis.speak(utterance);
    scheduleSpeechSafetyAdvance(index, token, chunks[index], readModeRef.current);
  }

  function speakText(text: string, mode: CompanionMode) {
    if (!readAloudSupported || !text.trim()) return;
    const settings = getSpeechSettings(mode, speechProfile);
    const chunks = splitSpeechText(text, settings.maxChunkLength);
    if (!chunks.length) return;
    readTokenRef.current += 1;
    const token = readTokenRef.current;
    clearReadPauseTimer();
    clearReadSafetyTimer();
    window.speechSynthesis.cancel();
    readChunksRef.current = chunks;
    readModeRef.current = mode;
    nextReadIndexRef.current = 0;
    pausedReadIndexRef.current = 0;
    setReadState('playing');
    setSpeaking(true);
    setReadChunkIndex(0);
    setReadChunkCount(chunks.length);
    setReadVoiceLabel('');
    window.setTimeout(() => speakChunkAt(0, token), 30);
  }

  function fallbackToBrowserSpeech(text: string, mode: CompanionMode) {
    releaseServerSpeech();
    serverSpeechChunksRef.current = [];
    serverSpeechChunkIndexRef.current = 0;
    speakText(text, mode);
  }

  async function playServerSpeechChunk(index: number, token: number, mode: CompanionMode) {
    const chunks = serverSpeechChunksRef.current;
    if (token !== readTokenRef.current) return;
    if (index >= chunks.length) {
      releaseServerSpeech();
      serverSpeechChunksRef.current = [];
      serverSpeechChunkIndexRef.current = 0;
      setReadState('idle');
      setSpeaking(false);
      setReadVoiceLabel('');
      return;
    }

    serverSpeechChunkIndexRef.current = index;
    pausedReadIndexRef.current = index;
    setReadChunkIndex(index);
    setReadVoiceLabel(index === 0 ? '正在准备神经配音' : '正在准备下一段');

    try {
      const speech = await requestStarBuddySpeech(chunks[index], mode);
      if (token !== readTokenRef.current) return;
      releaseServerSpeech({ keepElement: true });
      const objectUrl = URL.createObjectURL(speech.blob);
      const audio = audioElementRef.current ?? primeServerAudioForMobile();
      audioElementRef.current = audio;
      audioElementRef.current.src = objectUrl;
      serverSpeechUrlRef.current = objectUrl;
      setReadVoiceLabel('神经配音');
      audioElementRef.current.onended = () => {
        if (token !== readTokenRef.current) return;
        releaseServerSpeech({ keepElement: true });
        void playServerSpeechChunk(index + 1, token, mode);
      };
      audioElementRef.current.onerror = () => {
        if (token !== readTokenRef.current) return;
        fallbackToBrowserSpeech(chunks.slice(index).join('。'), mode);
      };
      await audioElementRef.current.play();
    } catch {
      if (token !== readTokenRef.current) return;
      fallbackToBrowserSpeech(chunks.slice(index).join('。'), mode);
    }
  }

  async function speakTextWithServerSpeech(text: string, mode: CompanionMode) {
    if (!text.trim()) return;
    if (!useServerSpeech) {
      fallbackToBrowserSpeech(text, mode);
      return;
    }
    const chunks = splitSpeechText(text, getServerSpeechChunkLength(mode));
    if (!chunks.length) return;

    readTokenRef.current += 1;
    const token = readTokenRef.current;
    clearReadPauseTimer();
    clearReadSafetyTimer();
    releaseServerSpeech();
    primeServerAudioForMobile();
    if (readAloudSupported) window.speechSynthesis.cancel();
    readChunksRef.current = [];
    serverSpeechChunksRef.current = chunks;
    serverSpeechChunkIndexRef.current = 0;
    readModeRef.current = mode;
    setReadState('playing');
    setSpeaking(true);
    setReadChunkIndex(0);
    setReadChunkCount(chunks.length);
    setReadVoiceLabel('正在准备神经配音');

    await playServerSpeechChunk(0, token, mode);
  }

  function speakStarBuddyResponse() {
    const mode = response?.kind === 'story' ? 'story' : response?.kind === 'quiz' ? 'quiz' : 'chat';
    if (readState === 'playing') return;
    if (readState === 'paused') {
      resumeSpeaking();
      return;
    }
    void speakTextWithServerSpeech(responseText, mode);
  }

  async function ask(mode = activeMode, nextMessage = message, speakAfter = false) {
    const prompt = nextMessage.trim() || getStarterForMode(mode);
    setActiveMode(mode);
    setMessage(prompt);
    setLoading(true);
    setError('');
    stopSpeaking();
    try {
      const result = await requestStarBuddy(mode, pet.id, prompt);
      setResponse(result);
      if (speakAfter) {
        const speechMode = result.kind === 'story' ? 'story' : result.kind === 'quiz' ? 'quiz' : 'chat';
        window.setTimeout(() => void speakTextWithServerSpeech(getResponseText(result), speechMode), 120);
      }
    } catch {
      setError('星宝现在有点忙。你可以再问一次，或者先听一个温柔故事。');
    } finally {
      setLoading(false);
    }
  }

  function handleMessageChange(event: ChangeEvent<HTMLInputElement>) {
    setMessage(event.target.value);
  }

  function handleLauncherClick() {
    if (open) {
      stopSpeaking();
      setOpen(false);
      setReaction(undefined);
      return;
    }
    const nextTapCount = tapCount + 1;
    const nextReaction = getStarBuddyReaction(nextTapCount);
    const id = Date.now();
    setTapCount(nextTapCount);
    setReaction({ action: nextReaction.action, message: nextReaction.message, id });
    setOpen(true);
    playStarBuddySound(nextTapCount % 3 === 0 ? 'open' : nextReaction.sound);
    window.setTimeout(() => {
      setReaction((current) => (current?.id === id ? undefined : current));
    }, 1800);
  }

  return (
    <section className={`star-buddy star-buddy-simple ${open ? 'open' : ''} expression-${expression}${actionClass}`} aria-label="宠宠星宝">
      <button className="star-buddy-launcher" type="button" onClick={handleLauncherClick} aria-expanded={open}>
        <StarBuddyAvatar expression={expression} />
        <strong>宠宠星宝</strong>
      </button>

      {reaction && <div className="star-buddy-tap-toast" role="status">{reaction.message}</div>}

      {open && (
        <div className="star-buddy-panel star-buddy-simple-panel">
          <header className="star-buddy-header">
            <button type="button" onClick={() => { stopSpeaking(); setOpen(false); }} aria-label="关闭宠宠星宝">×</button>
          </header>

          <div className="star-buddy-conversation-shell">
            <div className="star-buddy-input-card">
              <label htmlFor="star-buddy-message">问星宝</label>
              <div className="star-buddy-question-row">
                <input
                  id="star-buddy-message"
                  value={message}
                  onChange={handleMessageChange}
                  maxLength={160}
                  placeholder={`问${pet.name}吃什么，或输入“讲个故事”`}
                />
                <button type="button" onClick={() => void ask(inferModeFromPrompt(message), message, true)}>问</button>
              </div>
            </div>

            <div className="star-buddy-output-card" aria-live="polite">
              <div className="star-buddy-output-title">
                <span>星宝回答</span>
                <div className="star-buddy-read-controls">
                  <button type="button" onClick={speakStarBuddyResponse} disabled={readState === 'playing' || !responseText}>
                    {readState === 'playing' ? '朗读中' : readState === 'paused' ? '继续' : '帮我读'}
                  </button>
                  <button type="button" onClick={pauseSpeaking} disabled={readState !== 'playing'}>
                    暂停
                  </button>
                  <button type="button" onClick={stopSpeaking} disabled={readState === 'idle'}>
                    停止
                  </button>
                </div>
              </div>
              {readState !== 'idle' && (
                <div className="star-buddy-read-meta">
                  {readChunkCount > 1 && <span className="star-buddy-read-progress">第 {readChunkIndex + 1} 段 / 共 {readChunkCount} 段</span>}
                  {readVoiceLabel && <span className="star-buddy-read-voice">{readVoiceLabel}</span>}
                </div>
              )}
              <div className="star-buddy-response">
                {loading && <p className="star-buddy-loading">星宝正在想一想...</p>}
                {error && <p className="star-buddy-error">{error}</p>}
                {!loading && !error && response && <StarBuddyResponseView response={response} onPrompt={(mode, prompt) => { setMessage(prompt); void ask(mode, prompt, true); }} />}
                {!loading && !error && !response && <p className="star-buddy-empty">在上面问一个问题，星宝会用小朋友听得懂的话回答。</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StarBuddyAvatar({ expression }: { expression: StarBuddyEmotion }) {
  return (
    <span className={`star-buddy-avatar face-${expression}`} aria-hidden="true">
      <span className="star-buddy-sparkle one">✦</span>
      <span className="star-buddy-sparkle two">✧</span>
      <span className="star-buddy-face">
        <span className="star-buddy-eye left" />
        <span className="star-buddy-eye right" />
        <span className="star-buddy-mouth" />
      </span>
    </span>
  );
}

function StarBuddyResponseView({ response, onPrompt }: { response: StarBuddyResponse; onPrompt: (mode: CompanionMode, prompt: string) => void }) {
  if (response.kind === 'story') {
    return (
      <article className="star-buddy-card star-buddy-story-card">
        <h3>{response.title}</h3>
        {response.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="star-buddy-actions">
          {response.choices.map((choice) => (
            <button key={choice.label} type="button" onClick={() => onPrompt('story', buildStoryContinuationPrompt(response, choice.prompt))}>
              {choice.label}
            </button>
          ))}
        </div>
      </article>
    );
  }

  if (response.kind === 'quiz') {
    return <StarBuddyQuizCard response={response} />;
  }

  if (response.kind === 'chat') {
    return (
      <div className="star-buddy-card star-buddy-chat-card">
        <p>{response.message}</p>
        <div className="star-buddy-actions">
          {response.quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => onPrompt(inferModeFromPrompt(prompt), prompt)}>{prompt}</button>)}
        </div>
      </div>
    );
  }

  return null;
}

function StarBuddyQuizCard({ response }: { response: Extract<StarBuddyResponse, { kind: 'quiz' }> }) {
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number>();
  const answered = selectedQuizIndex !== undefined;
  const isCorrect = selectedQuizIndex === response.correctIndex;
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <article className={`star-buddy-card star-buddy-quiz-card ${isCorrect ? 'reward-ready' : ''}`}>
      <h3>小小问答</h3>
      <p>{response.question}</p>
      <div className="star-buddy-quiz-options">
        {response.options.map((option, index) => {
          const selected = selectedQuizIndex === index;
          const shouldRevealCorrect = answered && index === response.correctIndex;
          const shouldRevealWrong = selected && !isCorrect;
          return (
            <button
              key={option}
              className={shouldRevealCorrect ? 'correct' : shouldRevealWrong ? 'wrong' : ''}
              type="button"
              onClick={() => setSelectedQuizIndex(index)}
              disabled={answered}
            >
              <span>{labels[index] ?? index + 1}.</span> {option}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`star-buddy-quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`} role="status">
          <strong>{isCorrect ? '答对啦' : '再想想'}</strong>
          <span>{response.hint}</span>
        </div>
      )}
      {isCorrect && <div className="quiz-star-burst" aria-hidden="true"><span>★</span><span>★</span><span>★</span></div>}
    </article>
  );
}
