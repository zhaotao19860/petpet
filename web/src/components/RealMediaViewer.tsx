import { useEffect, useState } from 'react';
import type { CareAction } from '../models/interaction';
import type { AgeImage, AnimalMedia } from '../models/animal';
import type { PetMood } from '../models/pet';
import { SafeImage } from './SafeImage';

type CareSignal = {
  action: CareAction;
  id: number;
};

const moodMessages: Record<PetMood, string> = {
  happy: '今天心情亮晶晶！',
  calm: '安静陪你观察。',
  hungry: '肚子在提醒我啦。',
  tired: '想慢慢休息一下。',
  upset: '需要温柔一点点。',
  sick: '需要照顾和休息。',
};

const careMessages: Partial<Record<CareAction, string>> = {
  feed: '谢谢你的食物！',
  water: '喝到清水啦。',
  play: '一起玩真开心！',
  heal: '感觉被好好照顾了。',
  rest: '准备睡个好觉。',
  clean: '变得清爽啦。',
  observe: '你发现了新细节。',
};

const decorItems = [
  { id: 'nest', icon: '🧺', label: '小窝' },
  { id: 'snack', icon: '🍓', label: '点心' },
  { id: 'toy', icon: '🧸', label: '玩具' },
];

function getWeatherTone() {
  const hour = new Date().getHours();
  if (hour >= 18 || hour < 6) {
    return { className: 'night', icon: '🌙', label: '夜晚安静时间' };
  }
  if (hour >= 12 && hour < 16) {
    return { className: 'sunny', icon: '☀️', label: '阳光观察时间' };
  }
  return { className: 'breezy', icon: '🌤️', label: '微风陪伴时间' };
}

export function RealMediaViewer({ media, activeAgeImage, petName, animalName, animalTagline, habitCandidates, mood, careSignal }: { media: AnimalMedia; activeAgeImage?: AgeImage; petName: string; animalName: string; animalTagline: string; habitCandidates: string[]; mood: PetMood; careSignal?: CareSignal }) {
  const galleryImage = activeAgeImage ?? media.ageImages[0];
  const [hoverFact, setHoverFact] = useState('');
  const [reaction, setReaction] = useState(moodMessages[mood]);
  const [tapping, setTapping] = useState(false);
  const weatherTone = getWeatherTone();

  useEffect(() => {
    setReaction(careSignal ? careMessages[careSignal.action] ?? moodMessages[mood] : moodMessages[mood]);
  }, [careSignal, mood]);

  function showRandomFact() {
    const source = habitCandidates.length > 0 ? habitCandidates : [animalTagline];
    const next = source[Math.floor(Math.random() * source.length)];
    setHoverFact(next);
  }

  function handlePetTap() {
    setTapping(true);
    setReaction(moodMessages[mood]);
    showRandomFact();
    window.setTimeout(() => setTapping(false), 520);
  }

  function handleDecorTap(label: string) {
    setTapping(true);
    setReaction(`${petName} 看到了${label}。`);
    window.setTimeout(() => setTapping(false), 520);
  }

  return (
    <section className="panel single-stage-viewer">
      <div
        className={`single-stage-hero playground-stage ${weatherTone.className}`}
        tabIndex={0}
        aria-label={`${petName} · ${animalName} 当前阶段图`}
        onMouseEnter={showRandomFact}
        onMouseLeave={() => setHoverFact('')}
        onFocus={showRandomFact}
        onBlur={() => setHoverFact('')}
      >
        <div className="playground-weather" aria-label={weatherTone.label}>
          <span>{weatherTone.icon}</span>
          <strong>{weatherTone.label}</strong>
        </div>
        <div className="garden-depth-frame" aria-hidden="true" />
        <div className="photo-soft-vignette" aria-hidden="true" />
        <div className="pet-spotlight" aria-hidden="true" />
        <div className="playground-floor" aria-hidden="true" />
        <div className="garden-glow-path" aria-hidden="true" />
        <div className="sticker-shadow-wash" aria-hidden="true" />
        <i className="garden-ribbon" aria-hidden="true" />
        <i className="garden-sticker flower-one" aria-hidden="true" />
        <i className="garden-sticker flower-two" aria-hidden="true" />
        <i className="tap-hint-ring" aria-hidden="true" />
        <i className="stage-sparkle sparkle-one" aria-hidden="true" />
        <i className="stage-sparkle sparkle-two" aria-hidden="true" />
        <i className="stage-sparkle sparkle-three" aria-hidden="true" />
        {galleryImage && (
          <button className={tapping ? 'pet-stage-button tapping' : 'pet-stage-button'} type="button" onClick={handlePetTap} aria-label={`轻轻拍拍${petName}`}>
            <SafeImage src={galleryImage.url} alt={galleryImage.title} className="age-hero-image" loading="eager" />
          </button>
        )}
        <div className="playground-decor decor-shelf" aria-label="小窝装饰">
          {decorItems.map((item) => (
            <button key={item.id} type="button" onClick={() => handleDecorTap(item.label)}>
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
        <div className="stage-foreground" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="pet-reaction-bubble" aria-live="polite">
          {reaction}
        </div>
        <div className={`stage-hover-tip${hoverFact ? ' visible' : ''}`} aria-hidden={!hoverFact}>
          {hoverFact || animalTagline}
        </div>
      </div>
    </section>
  );
}
