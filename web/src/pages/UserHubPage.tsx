import { useMemo } from 'react';
import { getAnimalById } from '../data/animals';
import type { PetInstance, PetUserProfile } from '../models/pet';
import { getAgeImage, getCurrentGrowthStage, getEffectiveAgeDays } from '../models/growth';
import { SafeImage } from '../components/SafeImage';

export function UserHubPage({ user, pets, activePetId, onSelectPet, onAddPet }: { user?: PetUserProfile; pets: PetInstance[]; activePetId?: string; onSelectPet: (petId: string) => void; onAddPet: () => void }) {
  const userPets = useMemo(() => pets.filter((pet) => pet.userId === user?.id), [user?.id, pets]);
  const unlockedCount = user?.achievements.filter((item) => item.unlockedAt).length ?? 0;

  return (
    <section className="hub-layout kid-hub-layout">
      <div className="panel hub-hero">
        <div>
          <p className="eyebrow">今日动物乐园</p>
          <h1>{user?.name ?? '观察员'}，出发啦</h1>
          <p>选择动物伙伴，照顾它、听声音、玩游戏、收集小成就。</p>
        </div>
        <div className="hub-adventure-actions">
          <button className="primary-button" type="button" onClick={onAddPet}>选择动物伙伴</button>
        </div>
        <div className="hub-stats" aria-label="乐园进度">
          <span><strong>{userPets.length}</strong>动物伙伴</span>
          <span><strong>{unlockedCount}</strong>枚成就</span>
          <span><strong>4</strong>今日任务</span>
        </div>
      </div>

      <section className="panel full-row">
        <div className="section-title">
          <div>
            <p className="eyebrow">我的动物伙伴</p>
            <h2>{user?.name ?? '观察员'} 的宠物小队</h2>
          </div>
          <button className="primary-button" type="button" onClick={onAddPet}>添加新动物</button>
        </div>
        {userPets.length === 0 ? (
          <div className="empty-pet-adventure">
            <div>
              <span className="empty-pet-icon">🐾</span>
              <strong>还没有动物伙伴</strong>
              <p>先选择一位真实动物朋友，答对入门小题后就能进入照护和游戏空间。</p>
            </div>
            <button className="primary-button" type="button" onClick={onAddPet}>开始选择</button>
          </div>
        ) : (
          <div className="pet-card-grid">
            {userPets.map((pet) => {
              const animal = getAnimalById(pet.animalTypeId);
              if (!animal) return null;
              const age = getEffectiveAgeDays(pet.birthday, pet.speedMultiplier);
              const image = getAgeImage(animal, age);
              const stage = getCurrentGrowthStage(animal, pet.birthday, pet.speedMultiplier);
              return (
                <button className={pet.id === activePetId ? 'pet-roster-card active' : 'pet-roster-card'} key={pet.id} type="button" onClick={() => onSelectPet(pet.id)}>
                  <SafeImage src={image.thumbnailUrl} alt={pet.name} />
                  <strong>{pet.name}</strong>
                  <span>{animal.name} · {stage.name} · {pet.mood}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
