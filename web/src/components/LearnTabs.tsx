import { useState } from 'react';
import type { AnimalType } from '../models/animal';
import type { PetInstance } from '../models/pet';
import { getCurrentGrowthStage } from '../models/growth';

const tabs = ['习性', '饮食', '休息', '成长', '健康', '安全'] as const;

export function LearnTabs({ animal, pet }: { animal: AnimalType; pet?: PetInstance }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('习性');
  const currentStage = pet ? getCurrentGrowthStage(animal, pet.birthday, pet.speedMultiplier) : undefined;
  return (
    <section className="panel">
      <div className="tabs">
        {tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} type="button" onClick={() => setTab(item)}>{item}</button>)}
      </div>
      <div className="learn-content">
        {tab === '习性' && animal.habits.map((habit) => <p className="info-pill" key={habit}>{habit}</p>)}
        {tab === '饮食' && <><h3>适合了解的食物</h3>{animal.safeFood.map((food) => <p className="info-pill" key={food.name}>✅ {food.name}：{food.note}</p>)}<h3>风险提示</h3>{animal.unsafeFood.map((food) => <p className="info-pill warning" key={food.name}>⚠️ {food.name}：{food.note}</p>)}</>}
        {tab === '休息' && <p className="info-pill">{animal.restPattern.dailyRestHours}。{animal.restPattern.childFriendlyNote}</p>}
        {tab === '成长' && animal.growthStages.map((stage) => <article className={currentStage?.id === stage.id ? 'stage-card active-stage' : 'stage-card'} key={stage.name}><h3>{stage.name}{currentStage?.id === stage.id ? ' · 当前' : ''}</h3><p>{stage.description}</p><small>真实阶段约 {stage.realDurationDays} 天；观察重点：{stage.observableFeatures.join('、')}</small></article>)}
        {tab === '健康' && animal.diseases.map((item) => <article className="stage-card" key={item.name}><h3>{item.name}</h3><p>{item.symptoms}</p><small>{item.advice}</small></article>)}
        {tab === '安全' && <p className="info-pill warning">{animal.interactionRules.safetyNote} {animal.dressUpRules.safetyNote}</p>}
      </div>
    </section>
  );
}
