import type { AnimalType } from '../models/animal';
import type { PetInstance } from '../models/pet';
import { SafeImage } from './SafeImage';

interface Zone {
  id: string;
  title: string;
  hint: string;
  icon: string;
  className: string;
  onClick: () => void;
}

export function PlanetMap({ animal, pet, onOpenLearn, onOpenChallenge, onOpenAchievements }: { animal: AnimalType; pet: PetInstance; onOpenLearn: () => void; onOpenChallenge: () => void; onOpenAchievements: () => void }) {
  const zones: Zone[] = [
    { id: 'learn', title: '百科小屋', hint: '翻开今天的小知识', icon: '📘', className: 'zone-learn', onClick: onOpenLearn },
    { id: 'games', title: '游戏岛', hint: '听声音玩游戏', icon: '🎮', className: 'zone-games', onClick: onOpenChallenge },
    { id: 'stickers', title: '成就树', hint: '看看收集到的星星', icon: '🌳', className: 'zone-stickers', onClick: onOpenAchievements },
  ];

  return (
    <section className="planet-map" aria-label="动物星球地图">
      <div className="planet-sky">
        <span className="planet-cloud cloud-one">☁️</span>
        <span className="planet-cloud cloud-two">☁️</span>
        <div className="planet-sun">☀️</div>
      </div>
      <div className="planet-animal-card">
        <SafeImage src={animal.media.coverThumbnail} alt={animal.name} />
        <div>
          <p className="eyebrow">当前伙伴</p>
          <h1>{pet.name}</h1>
          <span>{animal.name} · {animal.tagline}</span>
        </div>
      </div>
      <div className="planet-zones">
        {zones.map((zone) => (
          <button className={`planet-zone ${zone.className}`} key={zone.id} type="button" onClick={zone.onClick}>
            <span>{zone.icon}</span>
            <strong>{zone.title}</strong>
            <small>{zone.hint}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
