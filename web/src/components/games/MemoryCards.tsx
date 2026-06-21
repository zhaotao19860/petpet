import { useMemo, useState } from 'react';
import type { AnimalType } from '../../models/animal';

interface MemoryCard {
  id: string;
  pair: string;
  label: string;
}

export function MemoryCards({ animal, onComplete }: { animal: AnimalType; onComplete: () => void }) {
  const cards = useMemo<MemoryCard[]>(() => {
    const pairs = [
      ['食物', animal.safeFood[0]?.name ?? '合适食物'],
      ['家园', animal.habitat[0] ?? '安全栖息地'],
      ['行为', animal.habits[0] ?? animal.tagline],
    ];
    return pairs.flatMap(([title, value]) => [
      { id: `${title}-a`, pair: title, label: title },
      { id: `${title}-b`, pair: title, label: value },
    ]);
  }, [animal]);
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);

  function flip(card: MemoryCard) {
    if (open.includes(card.id) || matched.includes(card.pair)) return;
    const nextOpen = [...open, card.id].slice(-2);
    setOpen(nextOpen);
    if (nextOpen.length === 2) {
      const pairCards = cards.filter((item) => nextOpen.includes(item.id));
      if (pairCards[0]?.pair === pairCards[1]?.pair) {
        const nextMatched = [...matched, card.pair];
        setMatched(nextMatched);
        setOpen([]);
        if (nextMatched.length === 3) onComplete();
      } else {
        window.setTimeout(() => setOpen([]), 700);
      }
    }
  }

  return (
    <section className="mini-game-panel">
      <h2>记忆翻牌</h2>
      <p>翻开两张，找到知识和答案。</p>
      <div className="memory-grid">
        {cards.map((card) => {
          const visible = open.includes(card.id) || matched.includes(card.pair);
          return (
            <button className={visible ? 'memory-card open' : 'memory-card'} key={card.id} type="button" onClick={() => flip(card)}>
              {visible ? card.label : '？'}
            </button>
          );
        })}
      </div>
      <p className="mini-feedback">{matched.length === 3 ? '三组都找到了！' : `已找到 ${matched.length}/3 组。`}</p>
    </section>
  );
}

