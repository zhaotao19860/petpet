import type { PetInstance } from '../models/pet';

const bars = [
  ['hunger', '饱腹', '🍃'],
  ['thirst', '饮水', '💧'],
  ['happiness', '快乐', '⭐'],
  ['health', '健康', '❤️'],
] as const;

function getStatusLevel(value: number) {
  if (value >= 0.72) return { className: 'status-good', label: '很好' };
  if (value >= 0.42) return { className: 'status-ok', label: '还行' };
  return { className: 'status-low', label: '快照顾' };
}

export function StatusBars({ pet }: { pet: PetInstance }) {
  return (
    <div className="status-grid">
      {bars.map(([key, label, icon]) => {
        const raw = pet[key];
        const value = raw;
        const level = getStatusLevel(value);
        return (
          <div className={`status-card ${level.className}`} key={key}>
            <span>{icon} {label}</span>
            <strong>{Math.round(raw * 100)}%</strong>
            <small>{level.label}</small>
            <div className="meter"><i style={{ width: `${Math.round(value * 100)}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
