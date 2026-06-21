import { useMemo, useState } from 'react';
import type { AnimalType } from '../models/animal';
import type { Achievement } from '../models/pet';

export function GamePanel({ animal, achievements, onUnlock }: { animal: AnimalType; achievements: Achievement[]; onUnlock: (id?: string) => void }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('选择一个答案，完成真实观察问答。');
  const question = useMemo(() => {
    const safe = animal.safeFood[0]?.name ?? '合适食物';
    const unsafe = animal.unsafeFood[0]?.name ?? '危险食物';
    return {
      title: `${animal.name}更适合哪一种？`,
      options: [safe, unsafe, animal.restPattern.dailyRestHours],
      correct: safe,
    };
  }, [animal]);

  function submit(value: string) {
    setAnswer(value);
    if (value === question.correct) {
      setFeedback('回答正确。你把游戏选择和真实饮食知识联系起来了。');
      onUnlock('first_observe');
    } else {
      setFeedback('这个选项不合适。请再看看饮食和安全提示。');
    }
  }

  return (
    <section className="panel game-panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">小游戏与成就</p>
          <h2>自然观察挑战</h2>
        </div>
      </div>
      <div className="quiz-card">
        <h3>{question.title}</h3>
        <div className="quiz-options">
          {question.options.map((option) => (
            <button key={option} className={answer === option ? 'active' : ''} type="button" onClick={() => submit(option)}>{option}</button>
          ))}
        </div>
        <p>{feedback}</p>
      </div>
      <div className="achievement-grid">
        {achievements.map((item) => (
          <article key={item.id} className={item.unlockedAt ? 'achievement unlocked' : 'achievement'}>
            <strong>{item.unlockedAt ? '已解锁' : '待完成'} · {item.title}</strong>
            <span>{item.description}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
