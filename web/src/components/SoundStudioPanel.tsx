import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { deletePetSoundClip, listPetSoundClips, uploadPetSoundClip, type PetSoundType, type UserPetSoundClip } from '../utils/petSoundApi';
import { playStarBuddySound, preloadUserPetSounds } from '../utils/petSounds';

const soundCards: Array<{ type: PetSoundType; title: string; hint: string; mark: string; label: string }> = [
  { type: 'joy', title: '开心泡泡', hint: '高兴时播放', mark: 'JOY', label: '开心' },
  { type: 'eat', title: '咕噜吃饭', hint: '吃饭时播放', mark: 'EAT', label: '吃饭' },
  { type: 'drink', title: '清水叮咚', hint: '喝水时播放', mark: 'H2O', label: '喝水' },
  { type: 'happy', title: '温柔问好', hint: '舒服时播放', mark: 'HI', label: '舒服' },
  { type: 'sad', title: '小小难过', hint: '需要安慰时播放', mark: 'LOW', label: '难过' },
  { type: 'sleep', title: '睡觉云朵', hint: '休息时播放', mark: 'ZZZ', label: '睡觉' },
  { type: 'angry', title: '不开心警报', hint: '闹脾气时播放', mark: 'NO', label: '生气' },
];

type RecordingState = 'idle' | 'recording' | 'ready' | 'uploading';

function getClipByType(clips: UserPetSoundClip[], soundType: PetSoundType) {
  return clips.find((clip) => clip.soundType === soundType);
}

export function SoundStudioPanel({ petId, petName }: { petId: string; petName: string }) {
  const [open, setOpen] = useState(false);
  const [clips, setClips] = useState<UserPetSoundClip[]>([]);
  const [selectedType, setSelectedType] = useState<PetSoundType>('joy');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [previewBlob, setPreviewBlob] = useState<Blob>();
  const [message, setMessage] = useState('选一张声音卡片，给宠物贴上你的声音。');
  const mediaRecorderRef = useRef<MediaRecorder | undefined>(undefined);
  const mediaStreamRef = useRef<MediaStream | undefined>(undefined);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<number | undefined>(undefined);

  const selectedCard = soundCards.find((card) => card.type === selectedType)!;
  const selectedClip = getClipByType(clips, selectedType);
  const canRecord = typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

  useEffect(() => {
    if (!open) return;
    void refreshClips();
  }, [open, petId]);

  useEffect(() => () => {
    cleanupRecorder();
    clearPreview();
  }, []);

  async function refreshClips() {
    try {
      const result = await listPetSoundClips(petId);
      setClips(result.clips);
      await preloadUserPetSounds(petId);
    } catch {
      setMessage('声音小屋暂时打不开，等一下再试。');
    }
  }

  function clearPreview() {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
    setPreviewBlob(undefined);
    setRecordingState('idle');
  }

  function cleanupRecorder() {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = undefined;
    mediaRecorderRef.current = undefined;
    chunksRef.current = [];
  }

  async function startRecording() {
    if (!canRecord || recordingState === 'recording') return;
    clearPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupRecorder();
        if (!blob.size) {
          setMessage('没有录到声音，再试一次。');
          setRecordingState('idle');
          return;
        }
        const url = URL.createObjectURL(blob);
        setPreviewBlob(blob);
        setPreviewUrl(url);
        setRecordingState('ready');
        setMessage('听一听，满意就保存给宠物。');
      };
      recorder.start();
      setRecordingState('recording');
      setMessage(`正在给 ${petName} 录制「${selectedCard.label}」声音，最多 8 秒。`);
      stopTimerRef.current = window.setTimeout(stopRecording, 8000);
    } catch {
      setMessage('没有拿到麦克风权限，可以从声音背包选择一个音频。');
      setRecordingState('idle');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  function chooseFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setMessage('这个不是声音文件，请选择 audio 音频。');
      return;
    }
    clearPreview();
    setPreviewBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRecordingState('ready');
    setMessage('自然声音已经放进预览区，可以试听。');
  }

  function playPreview() {
    const url = previewUrl || selectedClip?.url;
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = 0.82;
    void audio.play().catch(() => setMessage('声音暂时播不出来，可以再试一次。'));
  }

  async function saveClip() {
    if (!previewBlob || recordingState === 'uploading') return;
    setRecordingState('uploading');
    setMessage('正在把声音贴到宠物身上。');
    try {
      const clip = await uploadPetSoundClip(petId, selectedType, previewBlob, selectedCard.title);
      setClips((current) => [clip, ...current.filter((item) => item.soundType !== selectedType)]);
      clearPreview();
      await preloadUserPetSounds(petId);
      playStarBuddySound('reward');
      setMessage('声音贴纸已保存，下一次照顾宠物就会听到它。');
    } catch {
      setRecordingState('ready');
      setMessage('保存失败了，检查网络后再试一次。');
    }
  }

  async function removeClip() {
    if (!selectedClip) return;
    setMessage('正在取下这张声音贴纸。');
    try {
      await deletePetSoundClip(petId, selectedType);
      setClips((current) => current.filter((clip) => clip.soundType !== selectedType));
      await preloadUserPetSounds(petId);
      setMessage('已经恢复成系统自带声音。');
    } catch {
      setMessage('删除失败了，等一下再试。');
    }
  }

  const dialog = open ? (
    <div className="sound-studio-backdrop" role="presentation">
      <section className="sound-studio-panel" role="dialog" aria-modal="true" aria-label="声音魔法屋">
        <header className="sound-studio-header">
          <div>
            <span>声音魔法屋</span>
            <h2>给 {petName} 贴声音贴纸</h2>
            <p>录自己的声音，也可以采集风声、鸟声、水声。</p>
          </div>
          <button type="button" onClick={() => { clearPreview(); setOpen(false); }}>关闭</button>
        </header>

        <div className="sound-studio-scroll-area">
          <div className="sound-card-grid">
            {soundCards.map((card) => {
              const recorded = Boolean(getClipByType(clips, card.type));
              return (
                <button key={card.type} className={card.type === selectedType ? 'sound-card active' : recorded ? 'sound-card recorded' : 'sound-card'} type="button" onClick={() => { clearPreview(); setSelectedType(card.type); setMessage(`准备制作「${card.title}」。`); }}>
                  <span className="sound-card-mark">{card.mark}</span>
                  <strong>{card.title}</strong>
                  <small>{card.hint}</small>
                  {recorded && <em>我的声音</em>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sound-studio-action-tray">
          <div className="sound-recorder-card">
            <div className={recordingState === 'recording' ? 'record-orb recording' : 'record-orb'} aria-hidden="true">
              <span>{selectedCard.mark}</span>
              <i />
              <i />
            </div>
            <div className="sound-recorder-copy">
              <strong>{selectedCard.title}</strong>
              <p>{message}</p>
            </div>
          </div>

          <div className="sound-studio-controls">
            {recordingState === 'recording' ? (
              <button className="primary-button" type="button" onClick={stopRecording}>停止录音</button>
            ) : (
              <button className="primary-button" type="button" onClick={startRecording} disabled={!canRecord || recordingState === 'uploading'}>开始录音</button>
            )}
            <label className="sound-file-picker">
              <span>选自然声音</span>
              <input type="file" accept="audio/*" onChange={(event) => chooseFile(event.currentTarget.files?.[0])} />
            </label>
            <button type="button" onClick={playPreview} disabled={!previewUrl && !selectedClip}>试听</button>
            <button type="button" onClick={saveClip} disabled={!previewBlob || recordingState === 'uploading'}>{recordingState === 'uploading' ? '保存中' : '保存给宠物'}</button>
            <button type="button" onClick={clearPreview} disabled={!previewBlob}>再来一次</button>
            <button type="button" onClick={removeClip} disabled={!selectedClip}>恢复系统声音</button>
          </div>
        </div>
      </section>
    </div>
  ) : undefined;

  return (
    <section className="sound-studio-shell" aria-label="声音魔法屋">
      <button className="sound-studio-entry" type="button" onClick={() => setOpen(true)}>
        <span className="sound-studio-entry-mark">REC</span>
        <strong>声音魔法屋</strong>
        <small>录下你的宠物声音</small>
      </button>
      {dialog && createPortal(dialog, document.body)}
    </section>
  );
}
