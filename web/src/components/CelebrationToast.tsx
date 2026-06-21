export interface CelebrationToastData {
  id: number;
  kind: 'new-achievement' | 'daily-sticker' | 'star-buddy-sticker';
  title: string;
  detail: string;
}

export function CelebrationToast({ toast }: { toast?: CelebrationToastData }) {
  if (!toast) return null;

  const icon = toast.kind === 'new-achievement' ? '🏆' : toast.kind === 'star-buddy-sticker' ? '✦' : '⭐';
  const label = toast.kind === 'new-achievement' ? '获得新成就' : toast.kind === 'star-buddy-sticker' ? '星宝贴纸' : '今日贴纸';

  return (
    <aside className={`celebration-toast ${toast.kind}`} aria-live="polite" aria-label={label}>
      <span>{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{toast.title}</p>
        <small>{toast.detail}</small>
      </div>
    </aside>
  );
}
