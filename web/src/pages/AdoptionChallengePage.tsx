import { useState } from 'react';
import type { AnimalType } from '../models/animal';
import { getAdoptionQuestion } from '../utils/challenges';
import { SafeImage } from '../components/SafeImage';
import { playQuizFeedbackSound } from '../utils/petSounds';

export function AdoptionChallengePage({ animal, petName, onPass, onBack }: { animal: AnimalType; petName: string; onPass: () => void; onBack: () => void }) {
  const question = getAdoptionQuestion(animal);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const reactionClass = status === 'correct' ? 'quiz-reaction-correct' : status === 'wrong' ? 'quiz-reaction-wrong' : '';

  function choose(option: string) {
    setAnswer(option);
    const correct = option === question.correct;
    setStatus(correct ? 'correct' : 'wrong');
    playQuizFeedbackSound(correct ? 'correct' : 'wrong');
    if (correct) {
      window.setTimeout(onPass, 650);
    }
  }

  return (
    <section className="challenge-gate">
      <div className="panel gate-card">
        <div className="gate-art">
          <SafeImage src={animal.media.coverImage} alt={animal.name} />
          <div className="gate-badge">答对才能进入星球</div>
        </div>
        <div className="gate-content">
          <p className="eyebrow">入门挑战</p>
          <h1>{question.title}</h1>
          <p>{petName || animal.name} 正在等你。先答一道和它有关的题，证明你会温柔、科学地照顾它。</p>
          <div className={`quiz-card gate-quiz ${status} ${reactionClass}`}>
            <h3>{question.prompt}</h3>
            <div className="quiz-options">
              {question.options.map((option) => (
                <button key={option} className={answer === option ? (option === question.correct ? 'active correct' : 'active wrong') : ''} type="button" onClick={() => choose(option)}>{option}</button>
              ))}
            </div>
            {status === 'correct' && <div className="quiz-star-burst" aria-hidden="true"><span>★</span><span>★</span><span>★</span></div>}
            {status === 'wrong' && <p className="feedback wrong">还差一点：{question.hint}</p>}
            {status === 'correct' && <p className="feedback correct">答对了！星门打开，准备迎接新伙伴。</p>}
          </div>
          <button className="ghost-button" type="button" onClick={onBack}>返回重新选择</button>
        </div>
      </div>
    </section>
  );
}
