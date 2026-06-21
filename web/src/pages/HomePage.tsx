import type { CareAction } from '../models/interaction';
import type { AnimalType } from '../models/animal';
import type { PetInstance } from '../models/pet';
import { useEffect, useState } from 'react';
import { getAgeImage, getCurrentGrowthStage, getEffectiveAgeDays } from '../models/growth';
import { CareActions } from '../components/CareActions';
import { SoundStudioPanel } from '../components/SoundStudioPanel';
import { GrowthStarChain } from '../components/GrowthStarChain';
import { StatusBars } from '../components/StatusBars';
import { RealMediaViewer } from '../components/RealMediaViewer';
import { getStageHabitCandidates } from '../utils/stageHabits';
import { preloadPetSounds, preloadUserPetSounds } from '../utils/petSounds';

export function HomePage({ animal, pet, pets, onCare, onAddPet, onSelectPet }: { animal: AnimalType; pet: PetInstance; pets: PetInstance[]; onCare: (action: CareAction) => void; onAddPet: () => void; onSelectPet: (petId: string) => void }) {
  const age = getEffectiveAgeDays(pet.birthday, 1);
  const ageImage = getAgeImage(animal, age);
  const habitCandidates = getStageHabitCandidates(animal, getCurrentGrowthStage(animal, pet.birthday, 1));
  const [careSignal, setCareSignal] = useState<{ action: CareAction; id: number }>();

  useEffect(() => {
    void preloadPetSounds(animal.id);
  }, [animal.id]);

  useEffect(() => {
    void preloadUserPetSounds(pet.id);
  }, [pet.id]);

  return (
    <div className="home-layout layered-home kid-home one-screen-home garden-dream-home">
      <section className="mobile-pet-heading panel merged-pet-card compact-pet-card">
        <div className="merged-pet-top compact-pet-row">
          <div>
            <h1>我的{animal.name}</h1>
            <p>{animal.name} · 成长第 {Math.min(30, Math.floor(age) + 1)} 天</p>
          </div>
          <div className="pet-switcher kid-pet-switcher merged-pet-switcher compact-pet-switcher">
            {pets.map((item) => <button key={item.id} className={item.id === pet.id ? 'active' : ''} type="button" onClick={() => onSelectPet(item.id)}>{item.name}</button>)}
            <button type="button" onClick={onAddPet}>+ 新动物</button>
          </div>
        </div>
      </section>

      <section className="kid-play-deck">
        <RealMediaViewer
          media={animal.media}
          activeAgeImage={ageImage}
          petName={pet.name}
          animalName={animal.name}
          animalTagline={animal.tagline}
          habitCandidates={habitCandidates}
          mood={pet.mood}
          careSignal={careSignal}
        />

        <GrowthStarChain animal={animal} currentDay={Math.min(30, Math.floor(age) + 1)} />

        <aside className="panel side-panel kid-status-panel mobile-status-card compact-status-card">
          <StatusBars pet={pet} />
        </aside>

        <section className="panel care-stage-panel kid-care-panel kid-care-dock mobile-care-card compact-care-card">
          <SoundStudioPanel petId={pet.id} petName={pet.name} />
          <CareActions
            onCare={onCare}
            onCareFeedback={(action) => setCareSignal({ action, id: Date.now() })}
            disabledHeal={!pet.isSick}
            mood={pet.mood}
            animalId={animal.id}
            petId={pet.id}
          />
        </section>
      </section>

    </div>
  );
}
