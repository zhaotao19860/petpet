import { apiRequest } from './apiClient';

export type PetSoundType = 'joy' | 'angry' | 'sad' | 'happy' | 'eat' | 'drink' | 'sleep';

export type UserPetSoundClip = {
  id: string;
  petId: string;
  animalTypeId: string;
  soundType: PetSoundType;
  label?: string;
  url: string;
  mimeType: string;
  fileSize: number;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
};

export function listPetSoundClips(petId: string) {
  return apiRequest<{ clips: UserPetSoundClip[] }>(`/api/pets/${petId}/sounds`);
}

export async function uploadPetSoundClip(petId: string, soundType: PetSoundType, file: Blob, label?: string) {
  const formData = new FormData();
  formData.append('file', file, `${soundType}.webm`);
  if (label) formData.append('label', label);
  const response = await apiRequest<{ clip: UserPetSoundClip }>(`/api/pets/${petId}/sounds/${soundType}`, {
    method: 'POST',
    body: formData,
  });
  return response.clip;
}

export function deletePetSoundClip(petId: string, soundType: PetSoundType) {
  return apiRequest<{ ok: true }>(`/api/pets/${petId}/sounds/${soundType}`, { method: 'DELETE' });
}
