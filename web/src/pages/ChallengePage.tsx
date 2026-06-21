import type { AnimalType } from '../models/animal';
import type { Achievement, PetInstance } from '../models/pet';
import { MiniGameHub } from '../components/MiniGameHub';

export function ChallengePage({ animal, pet, achievements, onUnlock, onCompleteGame, onOpenFriends }: { animal: AnimalType; pet: PetInstance; achievements: Achievement[]; onUnlock: (id?: string) => void; onBack: () => void; onCompleteGame: () => void; onOpenFriends: () => void }) {
  const unlockedCount = achievements.filter((item) => item.unlockedAt).length;

  return (
    <section className="game-space-page playground-game-page">
      <div className="game-score-row playground-score-row" aria-label="游戏分数">
        <span>已收集 <strong>{unlockedCount}</strong></span>
        <span>总成就 <strong>{achievements.length}</strong></span>
        <span>今日目标 <strong>4</strong></span>
      </div>
      <MiniGameHub animal={animal} pet={pet} onCompleteGame={onCompleteGame} onUnlock={onUnlock} onOpenFriends={onOpenFriends} />
    </section>
  );
}
