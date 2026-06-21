import { useState } from 'react';
import type { AnimalType } from '../models/animal';
import type { PetInstance } from '../models/pet';
import { FoodSorter } from './games/FoodSorter';
import { HabitatMatch } from './games/HabitatMatch';
import { MemoryCards } from './games/MemoryCards';
import { SoundSafari } from './games/SoundSafari';

type MiniGameId = 'sound' | 'food' | 'habitat' | 'memory';
type GameSpaceEntryId = MiniGameId | 'friends';

const games: Array<{ id: MiniGameId; title: string; icon: string; hint: string; achievementId: string }> = [
  { id: 'sound', title: '听声识动物', icon: '🎧', hint: '听一听，找朋友', achievementId: 'sound_safari' },
  { id: 'food', title: '食物分类', icon: '🥗', hint: '分清适合和避免', achievementId: 'food_helper' },
  { id: 'habitat', title: '栖息地配对', icon: '🏞️', hint: '帮动物找到家', achievementId: 'habitat_finder' },
  { id: 'memory', title: '记忆翻牌', icon: '🧩', hint: '翻开知识卡', achievementId: 'memory_master' },
];

const gameSpaceEntries: Array<{ id: GameSpaceEntryId; title: string; icon: string; hint: string; achievementId?: string }> = [
  ...games,
  { id: 'friends', title: '好友草地', icon: '🤝', hint: '去朋友家看看' },
];

export function MiniGameHub({ animal, pet, onCompleteGame, onUnlock, onOpenFriends }: { animal: AnimalType; pet: PetInstance; onCompleteGame: () => void; onUnlock: (id?: string) => void; onOpenFriends: () => void }) {
  const [activeGame, setActiveGame] = useState<MiniGameId>('sound');
  const [completedGames, setCompletedGames] = useState<MiniGameId[]>([]);
  const activeMeta = games.find((game) => game.id === activeGame) ?? games[0];

  function complete() {
    if (completedGames.includes(activeGame)) return;
    setCompletedGames((current) => [...current, activeGame]);
    onUnlock(activeMeta.achievementId);
    onCompleteGame();
  }

  function selectEntry(entryId: GameSpaceEntryId) {
    if (entryId === 'friends') {
      onOpenFriends();
      return;
    }
    setActiveGame(entryId);
  }

  return (
    <section className="mini-game-hub">
      <header className="mini-game-hero">
        <p className="eyebrow">游戏岛</p>
        <h1>{pet.name} 的动物小游戏</h1>
        <p>不是考试，是用耳朵、眼睛和小手认识真实动物。</p>
      </header>

      <div className="mini-game-tabs" role="tablist" aria-label="小游戏列表">
        {gameSpaceEntries.map((game) => (
          <button className={activeGame === game.id ? 'active' : ''} key={game.id} type="button" onClick={() => selectEntry(game.id)}>
            <span>{game.icon}</span>
            <strong>{game.title}</strong>
            <small>{game.id !== 'friends' && completedGames.includes(game.id) ? '已完成' : game.hint}</small>
          </button>
        ))}
      </div>

      {activeGame === 'sound' && <SoundSafari animal={animal} onComplete={complete} />}
      {activeGame === 'food' && <FoodSorter animal={animal} onComplete={complete} />}
      {activeGame === 'habitat' && <HabitatMatch animal={animal} onComplete={complete} />}
      {activeGame === 'memory' && <MemoryCards animal={animal} onComplete={complete} />}
    </section>
  );
}
