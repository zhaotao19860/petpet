import type { Achievement } from '../models/pet';

function formatDate(value?: string) {
  if (!value) return '已获得';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '已获得';
  return `${date.getMonth() + 1}月${date.getDate()}日获得`;
}

export function AchievementsPage({ achievements }: { achievements: Achievement[] }) {
  const unlockedCount = achievements.filter((item) => item.unlockedAt).length;
  const total = achievements.length;
  const remaining = Math.max(0, total - unlockedCount);
  const progress = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <section className="achievements-page">
      <header className="achievements-header">
        <h1>我的成就</h1>
        <p>{unlockedCount}/{total} 个成就已解锁</p>
      </header>

      <section className="achievement-progress-card">
        <h2>🏆 成就收集</h2>
        <p>解锁了 {unlockedCount} 个，还剩 {remaining} 个等你收集！</p>
        <div className="meter large"><i style={{ width: `${progress}%` }} /></div>
        <strong>{progress}%</strong>
      </section>

      <div className="achievement-list">
        {achievements.map((item) => {
          const unlocked = Boolean(item.unlockedAt);
          return (
            <article className={unlocked ? 'achievement-row unlocked' : 'achievement-row'} key={item.id}>
              <div className="achievement-icon">{unlocked ? '🐾' : '🔒'}</div>
              <div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <small>{unlocked ? `✅ ${formatDate(item.unlockedAt)}` : `🎯 ${item.description}`}</small>
              </div>
              {unlocked && <strong className="achievement-state-pill">已获得</strong>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
