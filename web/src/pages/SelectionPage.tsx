import { useMemo, useState } from 'react';
import { animals } from '../data/animals';
import { categoryLabels, type AnimalCategory } from '../models/animal';
import { SafeImage } from '../components/SafeImage';

export function SelectionPage({ onStartChallenge, onBack }: { onStartChallenge: (animalId: string, name: string) => void; onBack: () => void }) {
  const [category, setCategory] = useState<AnimalCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState(animals[0]?.id ?? '');
  const [name, setName] = useState('星星');
  const categories = useMemo(() => Array.from(new Set(animals.map((animal) => animal.category))), []);
  const shown = category === 'all' ? animals : animals.filter((animal) => animal.category === category);
  const selected = shown.find((animal) => animal.id === selectedId) ?? shown[0] ?? animals[0];

  function changeCategory(next: AnimalCategory | 'all') {
    setCategory(next);
    const nextShown = next === 'all' ? animals : animals.filter((animal) => animal.category === next);
    setSelectedId(nextShown[0]?.id ?? '');
  }

  return (
    <section className="selection-mobile-page">
      <header className="selection-mobile-header">
        <div>
          <p className="eyebrow">选择真实动物伙伴</p>
          <h1>今天想观察谁？</h1>
          <p>选好动物后，需要先完成一题专属入门挑战，答对才能进入 petpet宠宠星球。</p>
        </div>
        <button className="ghost-button selection-user-button" type="button" onClick={onBack}>用户中心</button>
      </header>

      <section className="selection-mobile-card">
        <div className="category-row">
          <button className={category === 'all' ? 'active' : ''} type="button" onClick={() => changeCategory('all')}>全部</button>
          {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} type="button" onClick={() => changeCategory(item)}>{categoryLabels[item]}</button>)}
        </div>
        <div className="animal-grid selection-mobile-grid">
          {shown.map((animal) => (
            <button key={animal.id} className={selected.id === animal.id ? 'selection-animal-card selected' : 'selection-animal-card'} type="button" onClick={() => setSelectedId(animal.id)}>
              <SafeImage src={animal.media.coverThumbnail} alt={animal.name} />
              <strong>{animal.name}</strong>
              <span>{categoryLabels[animal.category]}</span>
            </button>
          ))}
        </div>
      </section>

      {selected && <aside className="selection-detail-card">
        <SafeImage src={selected.media.coverImage} alt={selected.name} />
        <p className="eyebrow">{categoryLabels[selected.category]}</p>
        <h2>{selected.name}</h2>
        <p>{selected.childFriendlySummary}</p>
        <label>给伙伴起名<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <button className="primary-button wide" type="button" onClick={() => onStartChallenge(selected.id, name)}>开始入门挑战</button>
      </aside>}
    </section>
  );
}
