import { useState } from 'react';
import type { CareAction } from '../models/interaction';
import type { PetMood } from '../models/pet';
import { playPetSound } from '../utils/petSounds';
import { SoundToggle } from './SoundToggle';

const actions: Array<{ id: CareAction; label: string; spokenLabel: string; hint: string; icon: string }> = [
  { id: 'feed', label: '吃饭', spokenLabel: '给小动物吃饭', hint: '补能量', icon: '🥗' },
  { id: 'water', label: '喝水', spokenLabel: '给小动物喝水', hint: '喝清水', icon: '💧' },
  { id: 'play', label: '玩球', spokenLabel: '陪小动物玩球', hint: '开心玩', icon: '🎾' },
  { id: 'heal', label: '看医生', spokenLabel: '带小动物看医生', hint: '不舒服时', icon: '🩺' },
];

export function CareActions({ onCare, onCareFeedback, disabledHeal, mood, animalId, petId }: { onCare: (action: CareAction) => void; onCareFeedback?: (action: CareAction) => void; disabledHeal: boolean; mood: PetMood; animalId: string; petId: string }) {
  const [activeAction, setActiveAction] = useState<CareAction | undefined>();

  function playCareSoundSafely(action: CareAction) {
    try {
      playPetSound({ petId, animalId, mood, action });
    } catch {
      // Sound is a bonus feedback layer; care state changes must never depend on it.
    }
  }

  function clickAction(action: CareAction) {
    setActiveAction(action);
    onCareFeedback?.(action);
    onCare(action);
    playCareSoundSafely(action);
    window.setTimeout(() => setActiveAction(undefined), 520);
  }

  return (
    <>
      <div className="care-sound-row">
        <SoundToggle compact />
      </div>
      <div className="action-grid care-action-grid">
        {actions.map((action) => {
          const active = activeAction === action.id;
          return (
            <button key={action.id} className={active ? 'care-action active' : 'care-action'} type="button" aria-label={action.spokenLabel} onClick={() => clickAction(action.id)} disabled={action.id === 'heal' && disabledHeal}>
              <span>{action.icon}</span>
              <strong>{action.label}</strong>
              <small>{action.hint}</small>
              {active && <i className="care-burst" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </>
  );
}
