import { useEffect, useState } from 'react';
import { isPetSoundEnabled, setPetSoundEnabled, subscribePetSoundPreference } from '../utils/petSounds';

export function SoundToggle({ compact = false }: { compact?: boolean }) {
  const [enabled, setEnabled] = useState(() => isPetSoundEnabled());

  useEffect(() => subscribePetSoundPreference(setEnabled), []);

  function toggle() {
    setPetSoundEnabled(!enabled);
  }

  return (
    <button className={compact ? 'sound-toggle compact' : 'sound-toggle'} type="button" aria-pressed={enabled} onClick={toggle}>
      <span>{enabled ? '🔊' : '🔇'}</span>
      <strong>{enabled ? '有声' : '静音'}</strong>
    </button>
  );
}
