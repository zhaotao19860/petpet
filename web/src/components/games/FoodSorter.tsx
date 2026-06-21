import { useMemo, useState } from 'react';
import type { AnimalType } from '../../models/animal';

export function FoodSorter({ animal, onComplete }: { animal: AnimalType; onComplete: () => void }) {
  const foods = useMemo(() => [
    ...animal.safeFood.slice(0, 2).map((item) => ({ name: item.name, safe: true })),
    ...animal.unsafeFood.slice(0, 2).map((item) => ({ name: item.name, safe: false })),
  ], [animal]);
  const [sorted, setSorted] = useState<Record<string, boolean>>({});
  const complete = foods.length > 0 && foods.every((food) => sorted[food.name] === food.safe);

  function sortFood(name: string, safe: boolean) {
    const next = { ...sorted, [name]: safe };
    setSorted(next);
    if (foods.every((food) => next[food.name] === food.safe)) onComplete();
  }

  return (
    <section className="mini-game-panel">
      <h2>食物分类</h2>
      <p>点一个食物，再放进合适的篮子。</p>
      <div className="food-token-grid">
        {foods.map((food) => (
          <div className="food-token" key={food.name}>
            <strong>{food.name}</strong>
            <div>
              <button className={sorted[food.name] === true ? 'selected' : ''} type="button" onClick={() => sortFood(food.name, true)}>适合</button>
              <button className={sorted[food.name] === false ? 'selected avoid' : ''} type="button" onClick={() => sortFood(food.name, false)}>避免</button>
            </div>
          </div>
        ))}
      </div>
      <p className="mini-feedback">{complete ? '分类完成，食物小帮手上线！' : '慢慢来，想一想真实动物吃什么。'}</p>
    </section>
  );
}

