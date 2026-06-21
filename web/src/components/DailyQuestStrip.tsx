import type { CSSProperties } from 'react';
import { dailyQuestStepOrder, getDailyQuestSummary, type DailyQuestProgress } from '../utils/dailyTasks';

export function DailyQuestStrip({ progress, onClaimReward }: { progress?: DailyQuestProgress; onClaimReward: () => void }) {
  const summary = getDailyQuestSummary(progress);
  const rewardReady = summary.completedCount >= 3 && !progress?.steps.reward.done;
  const pathProgress = `${Math.max(0, Math.min(100, (summary.completedCount / summary.totalCount) * 100))}%`;

  return (
    <section className="daily-quest-strip" aria-label="今日任务">
      <div className="daily-quest-title">
        <div>
          <p className="eyebrow">今日星球任务</p>
          <h2>{summary.complete ? '今日探索完成啦' : `完成 ${summary.completedCount}/${summary.totalCount} 个小任务`}</h2>
        </div>
        <strong>{progress?.stars ?? summary.completedCount} ⭐</strong>
      </div>
      <div className="daily-quest-steps sticker-path star-collect-path" style={{ '--quest-progress': pathProgress } as CSSProperties}>
        {dailyQuestStepOrder.map((id, index) => {
          const step = progress?.steps[id];
          const done = Boolean(step?.done);
          return (
            <div className={done ? 'daily-step done' : 'daily-step'} key={id}>
              <span>{step?.icon ?? ['🫶', '📘', '🎮', '⭐'][index]}</span>
              <small>{step?.label ?? ['照顾动物', '发现知识', '完成游戏', '领取贴纸'][index]}</small>
            </div>
          );
        })}
      </div>
      {rewardReady && <button className="quest-reward-button" type="button" onClick={onClaimReward}>领取今日贴纸</button>}
    </section>
  );
}
