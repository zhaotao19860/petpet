import { outfits } from '../data/outfits';
import type { AnimalType } from '../models/animal';
import type { PetInstance } from '../models/pet';
import { SafeImage } from './SafeImage';

export function DressUpPanel({ animal, pet, onToggle }: { animal: AnimalType; pet: PetInstance; onToggle: (outfitId: string) => void }) {
  const available = outfits.filter((item) => !item.allowedCategoryIds || item.allowedCategoryIds.includes(animal.category));
  return (
    <section className="panel dress-panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">装扮与栖息地</p>
          <h2>不打扰动物的可爱布置</h2>
        </div>
      </div>
      <p>{animal.dressUpRules.safetyNote}</p>
      <div className="outfit-grid">
        {available.map((item) => {
          const active = pet.outfitIds.includes(item.id);
          return (
            <button key={item.id} className={active ? 'outfit active' : 'outfit'} type="button" onClick={() => onToggle(item.id)}>
              {item.imageUrl ? <SafeImage src={item.imageUrl} alt={item.name} /> : <span>{item.icon}</span>}
              <strong>{item.name}</strong>
              <small>{item.note}</small>
            </button>
          );
        })}
      </div>
      {pet.outfitIds.length > 0 && <p className="info-pill">已选择：{pet.outfitIds.map((id) => outfits.find((item) => item.id === id)?.name).filter(Boolean).join('、')}</p>}
    </section>
  );
}
