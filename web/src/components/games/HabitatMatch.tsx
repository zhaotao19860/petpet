import { useMemo, useState } from 'react';
import type { AnimalType } from '../../models/animal';
import { playQuizFeedbackSound } from '../../utils/petSounds';

const distractors = ['嘈杂马路', '塑料袋堆', '很小的盒子', '没有水的水池'];

export function HabitatMatch({ animal, onComplete }: { animal: AnimalType; onComplete: () => void }) {
  const options = useMemo(() => [animal.habitat[0] ?? '安全栖息地', ...distractors].slice(0, 4), [animal]);
  const [answer, setAnswer] = useState<string>();
  const reactionClass = answer === options[0] ? 'quiz-reaction-correct' : answer ? 'quiz-reaction-wrong' : '';

  function choose(option: string) {
    setAnswer(option);
    const success = option === options[0];
    playQuizFeedbackSound(success ? 'correct' : 'wrong');
    if (success) onComplete();
  }

  return (
    <section className={`mini-game-panel habitat-match ${reactionClass}`}>
      <h2>栖息地配对</h2>
      <p>{animal.name} 更适合住在哪里？</p>
      <div className="habitat-options">
        {options.map((option) => (
          <button className={answer === option ? (option === options[0] ? 'correct' : 'wrong') : ''} disabled={Boolean(answer)} key={option} type="button" onClick={() => choose(option)}>
            <span>{option === options[0] ? '🏞️' : '⚠️'}</span>
            {option}
          </button>
        ))}
      </div>
      {answer === options[0] && <div className="quiz-star-burst" aria-hidden="true"><span>★</span><span>★</span><span>★</span></div>}
      {answer && <p className="mini-feedback">{answer === options[0] ? '找对家啦！' : `${animal.name}更需要：${animal.habitat.join('、')}。`}</p>}
    </section>
  );
}
