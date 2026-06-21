import { useState } from 'react';
import { friendPets } from '../data/friends';
import { getAnimalById } from '../data/animals';
import type { AnimalType } from '../models/animal';
import type { PetInstance } from '../models/pet';
import { SafeImage } from './SafeImage';

export function FriendPlayground({ animal, pet, onUnlock }: { animal: AnimalType; pet: PetInstance; onUnlock: (id?: string) => void }) {
  const [message, setMessage] = useState('选择好友进行拜访，或发起非暴力知识挑战。');

  function visit(name: string) {
    setMessage(`你和 ${pet.name} 拜访了 ${name}，一起完成了安静观察。`);
    onUnlock('friend_visit');
  }

  function challenge(friendAnimalId: string) {
    const friendAnimal = getAnimalById(friendAnimalId);
    const scoreA = animal.habits.length + animal.growthStages.length;
    const scoreB = (friendAnimal?.habits.length ?? 0) + (friendAnimal?.growthStages.length ?? 0);
    setMessage(`${animal.name} 和 ${friendAnimal?.name ?? '好友动物'}完成了知识挑战：不是打斗，而是比较栖息地、成长和观察能力。比分 ${scoreA}:${scoreB}。`);
  }

  return (
    <section className="panel friend-panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">好友互动</p>
          <h2>拜访与友好挑战</h2>
        </div>
      </div>
      <SafeImage className="friend-scene" src="/assets/scenes/friend-playground.png" alt="好友观察营地" />
      <p>{message}</p>
      <div className="friend-grid">
        {friendPets.map((friend) => {
          const friendAnimal = getAnimalById(friend.animalTypeId);
          return (
            <article className="friend-card" key={friend.id}>
              <SafeImage src={friendAnimal?.media.coverThumbnail} alt={friend.name} />
              <strong>{friend.ownerName} 的 {friend.name}</strong>
              <span>{friendAnimal?.name} · {friend.mood}</span>
              <div>
                <button type="button" onClick={() => visit(friend.name)}>拜访</button>
                <button type="button" onClick={() => challenge(friend.animalTypeId)}>知识挑战</button>
              </div>
            </article>
          );
        })}
      </div>
      <small>后续服务端可将好友列表、拜访记录、挑战结果替换为 REST/WebSocket 同步。</small>
    </section>
  );
}
