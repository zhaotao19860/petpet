import type { AnimalType } from '../models/animal';
import type { GrowthStageDefinition } from '../models/animal';
import { buildFactCards } from '../utils/factCards';

export function FactCards({ animal, stage }: { animal: AnimalType; stage: GrowthStageDefinition }) {
  const cards = buildFactCards(animal, stage);

  return (
    <section className="fact-card-section" aria-label={`${animal.name}百科卡片`}>
      <div className="section-title compact-section-title">
        <div>
          <p className="eyebrow">翻一翻</p>
          <h2>今天的小发现</h2>
        </div>
      </div>
      <div className="fact-card-rail">
        {cards.map((card) => (
          <article className="fact-card" key={card.id}>
            <span>{card.icon}</span>
            <strong>{card.title}</strong>
            <p>{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
