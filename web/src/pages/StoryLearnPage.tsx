import { useEffect, useMemo, useRef, useState } from 'react';
import { categoryLabels, type AnimalType } from '../models/animal';
import type { PetInstance } from '../models/pet';
import { getAgeImage, getCurrentGrowthStage, getEffectiveAgeDays } from '../models/growth';
import { FactCards } from '../components/FactCards';
import { getChallengeSet } from '../utils/challenges';
import { playQuizFeedbackSound } from '../utils/petSounds';

type EncyclopediaTab = 'habits' | 'food' | 'health';

const tabLabels: Record<EncyclopediaTab, string> = {
  habits: '生活习性',
  food: '饮食指南',
  health: '健康护理',
};

const activityLabels = {
  day_active: '白天活跃',
  night_active: '夜间活跃',
  crepuscular: '晨昏活跃',
  mixed: '活动时间较灵活',
};

export function StoryLearnPage({ animal, pet, onLearn }: { animal: AnimalType; pet: PetInstance; onLearn?: () => void }) {
  const [tab, setTab] = useState<EncyclopediaTab>('habits');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string>();
  const age = getEffectiveAgeDays(pet.birthday, 1);
  const currentDay = Math.min(30, Math.floor(age) + 1);
  const stage = getCurrentGrowthStage(animal, pet.birthday, 1);
  const ageImage = getAgeImage(animal, age);
  const previewImages = useMemo(() => {
    const candidates = [ageImage, ...[0, 7, 14, 21, 29].map((index) => animal.media.ageImages[index]).filter(Boolean)];
    return candidates.filter((item, index, list) => list.findIndex((candidate) => candidate.url === item.url) === index).slice(0, 5);
  }, [ageImage, animal.media.ageImages]);
  const milestones = [
    { day: 1, label: '初期' },
    { day: 15, label: '成长期' },
    { day: 30, label: '成熟期' },
  ];
  const activeMilestone = currentDay <= 10 ? 1 : currentDay <= 22 ? 15 : 30;
  const socialTrait = animal.habits.some((item) => item.includes('群居')) ? '群居' : animal.habits.some((item) => item.includes('独居')) ? '独居' : '适合安静观察';
  const heroImage = ageImage.url || animal.media.coverImage;
  const quizQuestions = useMemo(() => getChallengeSet(animal).slice(0, 4), [animal]);
  const quizQuestion = quizQuestions[quizIndex % quizQuestions.length];
  const quizReactionClass = quizAnswer === quizQuestion.correct ? 'quiz-reaction-correct' : quizAnswer ? 'quiz-reaction-wrong' : '';
  const onLearnRef = useRef(onLearn);

  useEffect(() => {
    onLearnRef.current = onLearn;
  }, [onLearn]);

  useEffect(() => {
    onLearnRef.current?.();
  }, [animal.id]);

  function chooseQuizAnswer(option: string) {
    setQuizAnswer(option);
    playQuizFeedbackSound(option === quizQuestion.correct ? 'correct' : 'wrong');
  }

  return (
    <section className="encyclopedia-page">
      <header className="encyclopedia-header">
        <h1>宠物百科</h1>
        <p>探索真实动物的习性与奥秘</p>
      </header>

      <div className="encyclopedia-stage-strip" aria-label="当前动物阶段图片">
        {previewImages.map((image) => (
          <button className={image.url === ageImage.url ? 'active' : ''} key={image.url} type="button" aria-label={image.title}>
            <img src={image.thumbnailUrl} alt={image.title} />
          </button>
        ))}
      </div>

      <article className="encyclopedia-card">
        <img className="encyclopedia-hero-image" src={heroImage} alt={`${animal.name}${stage.name}`} />
        <div className="encyclopedia-body">
          <div className="encyclopedia-title-row">
            <h2>{animal.name} <span>/ {animal.scientificName ?? animal.id}</span></h2>
            <strong>{categoryLabels[animal.category]}</strong>
          </div>
          <p className="encyclopedia-summary">{animal.childFriendlySummary} {animal.tagline}，当前处于“{stage.name}”。</p>

          <FactCards animal={animal} stage={stage} />

          <section className="growth-section" aria-label="成长历程">
            <h3>成长历程</h3>
            <div className="growth-milestones">
              {milestones.map((item, index) => (
                <div className={item.day === activeMilestone ? 'growth-node active' : 'growth-node'} key={item.day}>
                  <span>{index + 1}</span>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
          </section>

          <div className="encyclopedia-tabs" role="tablist" aria-label="百科信息分类">
            {(Object.keys(tabLabels) as EncyclopediaTab[]).map((item) => (
              <button className={tab === item ? 'active' : ''} key={item} type="button" onClick={() => setTab(item)}>
                {tabLabels[item]}
              </button>
            ))}
          </div>

          {tab === 'habits' && (
            <div className="encyclopedia-info-list">
              <InfoCard title="睡眠时间" value={animal.restPattern.dailyRestHours} />
              <InfoCard title="活跃时段" value={activityLabels[animal.restPattern.pattern]} />
              <InfoCard title="社交特点" value={socialTrait} />
              <InfoCard title="栖息环境" value={animal.habitat.slice(0, 3).join('、')} />
              <InfoList title="特殊行为" items={animal.habits} />
            </div>
          )}

          {tab === 'food' && (
            <div className="encyclopedia-info-list">
              <InfoList title="适合了解" items={animal.safeFood.map((item) => `${item.name}：${item.note}`)} />
              <InfoList title="需要避免" items={animal.unsafeFood.map((item) => `${item.name}：${item.note}`)} />
              <InfoCard title="饮食安全" value={animal.interactionRules.canFeedDirectly ? '可在成人指导下学习科学喂养。' : '以观察和保护为主，不建议直接投喂。'} />
            </div>
          )}

          {tab === 'health' && (
            <div className="encyclopedia-info-list">
              <InfoList title="健康风险" items={animal.diseases.map((item) => `${item.name}：${item.symptoms}。${item.advice}`)} />
              <InfoCard title="安全提醒" value={animal.interactionRules.safetyNote} />
              <InfoCard title="装扮原则" value={animal.dressUpRules.safetyNote} />
            </div>
          )}

          <section className={`learn-mini-quiz ${quizReactionClass}`} aria-label="百科小测">
            <p className="eyebrow">小小问答</p>
            <h3>{quizQuestion.title}</h3>
            <p>{quizQuestion.prompt}</p>
            <div className="learn-quiz-options">
              {quizQuestion.options.map((option) => (
                <button
                  className={quizAnswer === option ? (option === quizQuestion.correct ? 'correct' : 'wrong') : ''}
                  disabled={Boolean(quizAnswer)}
                  key={option}
                  type="button"
                  onClick={() => chooseQuizAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {quizAnswer === quizQuestion.correct && <div className="quiz-star-burst" aria-hidden="true"><span>★</span><span>★</span><span>★</span></div>}
            {quizAnswer && (
              <div className="learn-quiz-feedback">
                <strong>{quizAnswer === quizQuestion.correct ? '答对啦' : '再观察一下也没关系'}</strong>
                <span>{quizQuestion.hint}</span>
                <button type="button" onClick={() => { setQuizAnswer(undefined); setQuizIndex((value) => value + 1); }}>下一张题卡</button>
              </div>
            )}
          </section>
        </div>
      </article>
    </section>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <section className="encyclopedia-info-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="encyclopedia-info-card list-card">
      <span>{title}</span>
      <ul>
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>暂无记录，继续观察。</li>}
      </ul>
    </section>
  );
}
