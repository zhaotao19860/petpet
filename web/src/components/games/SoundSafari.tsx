import { useEffect, useMemo, useState } from 'react';
import { animals } from '../../data/animals';
import type { AnimalType } from '../../models/animal';
import { playAnimalVoice, playQuizFeedbackSound, preloadPetSounds } from '../../utils/petSounds';
import { SafeImage } from '../SafeImage';
import { SoundToggle } from '../SoundToggle';

export function SoundSafari({ animal, onComplete }: { animal: AnimalType; onComplete: () => void }) {
  const choices = useMemo(() => [animal, ...animals.filter((item) => item.id !== animal.id).slice(0, 3)], [animal]);
  const [answer, setAnswer] = useState<string>();
  const correct = answer === animal.id;
  const reactionClass = correct ? 'quiz-reaction-correct' : answer ? 'quiz-reaction-wrong' : '';

  useEffect(() => {
    void preloadPetSounds(animal.id);
  }, [animal.id]);

  function choose(id: string) {
    setAnswer(id);
    const success = id === animal.id;
    playQuizFeedbackSound(success ? 'correct' : 'wrong');
    if (success) onComplete();
  }

  return (
    <section className={`mini-game-panel sound-safari ${reactionClass}`}>
      <h2>听声识动物</h2>
      <p>先听一听，再找出今天的动物伙伴。</p>
      <div className="sound-play-row">
        <button className="big-sound-button" type="button" onClick={() => playAnimalVoice(animal.id)}>播放声音</button>
        <SoundToggle compact />
      </div>
      <div className="mini-choice-grid">
        {choices.map((item) => (
          <button className={answer === item.id ? (item.id === animal.id ? 'correct' : 'wrong') : ''} disabled={Boolean(answer)} key={item.id} type="button" onClick={() => choose(item.id)}>
            <SafeImage src={item.media.coverThumbnail} alt={item.name} />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      {correct && <div className="quiz-star-burst" aria-hidden="true"><span>★</span><span>★</span><span>★</span></div>}
      {answer && <p className="mini-feedback">{correct ? `答对啦，是${animal.name}！` : `再听听看，正确答案是${animal.name}。`}</p>}
    </section>
  );
}
