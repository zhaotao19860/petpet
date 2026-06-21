import { useState } from 'react';
import type { AnimalType } from '../models/animal';
import { TOTAL_GROWTH_DAYS } from '../models/growth';
import { playStarBuddySound } from '../utils/petSounds';

const RECENT_GROWTH_DAYS = 10;

export function GrowthStarChain({ animal, currentDay }: { animal: AnimalType; currentDay: number }) {
  const [expandedDay, setExpandedDay] = useState<number | undefined>();
  const [showAllDays, setShowAllDays] = useState<boolean>(false);
  const safeCurrentDay = Math.min(TOTAL_GROWTH_DAYS, Math.max(1, Math.floor(currentDay)));
  const days = Array.from({ length: TOTAL_GROWTH_DAYS }, (_, index) => index + 1);
  const recentStartDay = Math.min(
    Math.max(1, safeCurrentDay - RECENT_GROWTH_DAYS + 1),
    Math.max(1, TOTAL_GROWTH_DAYS - RECENT_GROWTH_DAYS + 1),
  );
  const recentDays = days.slice(recentStartDay - 1, recentStartDay - 1 + RECENT_GROWTH_DAYS);
  const recentDaySet = new Set(recentDays);
  const hiddenDays = days.filter((day) => !recentDaySet.has(day));
  const expandedImage = expandedDay
    ? animal.media.ageImages.find((item) => item.age === expandedDay) ?? animal.media.ageImages[expandedDay - 1]
    : undefined;
  const expandedStage = expandedDay ? animal.growthStages[expandedDay - 1] : undefined;
  const expandedRevealed = Boolean(expandedDay && expandedDay <= safeCurrentDay);

  function handleDayClick(day: number) {
    setExpandedDay(expandedDay === day ? undefined : day);
    playStarBuddySound(expandedDay === day ? 'gentle' : 'open');
  }

  function handleToggleAllDays() {
    const nextShowAllDays = !showAllDays;
    setShowAllDays(nextShowAllDays);
    if (!nextShowAllDays && expandedDay && !recentDaySet.has(expandedDay)) {
      setExpandedDay(undefined);
    }
    playStarBuddySound(nextShowAllDays ? 'open' : 'gentle');
  }

  function renderDayNode(day: number, compact = false) {
    const ageImage = animal.media.ageImages.find((item) => item.age === day) ?? animal.media.ageImages[day - 1];
    const stage = animal.growthStages[day - 1];
    const isRevealed = day <= safeCurrentDay;
    const isCurrent = day === safeCurrentDay;
    const isExpanded = expandedDay === day;
    const nodeClassName = isRevealed
      ? `growth-star-node revealed ${isCurrent ? 'current' : ''} ${isExpanded ? 'expanded' : ''} ${compact ? 'compact' : ''}`
      : `growth-star-node locked ${isExpanded ? 'expanded' : ''} ${compact ? 'compact' : ''}`;
    return (
      <button
        key={day}
        className={nodeClassName}
        type="button"
        onClick={() => handleDayClick(day)}
        aria-label={`第 ${day} 天，${isRevealed ? stage?.name ?? '已翻开' : '还没长成的小星星'}`}
        aria-expanded={isExpanded}
        title={`第 ${day} 天 · ${stage?.name ?? animal.name}`}
      >
        <span className="growth-star-face">
          {isRevealed && ageImage ? (
            <img src={ageImage.thumbnailUrl || ageImage.url} alt="" loading="lazy" />
          ) : (
            <span className="growth-star-symbol" aria-hidden="true">★</span>
          )}
        </span>
        <span className="growth-star-day">第 {day} 天</span>
      </button>
    );
  }

  return (
    <section className={`panel growth-star-chain ${expandedDay ? 'expanded' : ''} ${showAllDays ? 'box-open' : ''}`} aria-label={`${animal.name}成长星星链条`}>
      <div className="growth-star-header">
        <div>
          <span>成长星星链</span>
          <strong>第 {safeCurrentDay} 天亮起来啦</strong>
        </div>
        <p>先看最近 10 天，点一颗星会变大。</p>
      </div>

      <div className="growth-star-track recent" role="list" aria-label="最近10天成长记录">
        <span className="growth-star-light-path" aria-hidden="true" />
        <span className="growth-star-sparkles" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        {recentDays.map((day) => renderDayNode(day))}
      </div>

      <button
        className="growth-star-more-toggle"
        type="button"
        onClick={handleToggleAllDays}
        aria-expanded={showAllDays}
        aria-controls="growth-star-hidden-days"
      >
        <span className="growth-star-more-icon" aria-hidden="true">★</span>
        <strong>{showAllDays ? '收起星光宝盒' : '打开星光宝盒'}</strong>
        <small>{showAllDays ? '先看最近 10 天' : `还有 ${hiddenDays.length} 颗星星`}</small>
      </button>

      {showAllDays && (
        <div id="growth-star-hidden-days" className="growth-star-hidden-track" role="list" aria-label="星光宝盒里的其他成长记录">
          {hiddenDays.map((day) => renderDayNode(day, true))}
        </div>
      )}

      {expandedDay && (
        <div className={`growth-star-preview ${expandedRevealed ? 'revealed' : 'locked'}`} aria-live="polite">
          <div className="growth-star-preview-art">
            {expandedRevealed && expandedImage ? (
              <img src={expandedImage.url} alt={`${animal.name}第${expandedDay}天`} />
            ) : (
              <span aria-hidden="true">★</span>
            )}
          </div>
          <div className="growth-star-preview-copy">
            <span>{expandedRevealed ? '已经翻开' : '还在星星里'}</span>
            <strong>第 {expandedDay} 天 · {expandedStage?.name ?? animal.name}</strong>
            <p>{expandedRevealed ? expandedStage?.description ?? `${animal.name}今天又长大一点点。` : `长到第 ${expandedDay} 天，这颗星星就会翻成 ${animal.name} 的新样子。`}</p>
          </div>
        </div>
      )}
    </section>
  );
}
