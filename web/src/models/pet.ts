export type PetMood = 'happy' | 'calm' | 'hungry' | 'tired' | 'upset' | 'sick';

export interface PetUserProfile {
  id: string;
  name: string;
  petIds: string[];
  achievements: Achievement[];
  createdAt: string;
}

export interface PetInstance {
  id: string;
  userId: string;
  animalTypeId: string;
  name: string;
  birthday: string;
  lastUpdatedAt: string;
  speedMultiplier: number;
  mood: PetMood;
  hunger: number;
  thirst: number;
  energy: number;
  happiness: number;
  health: number;
  hygiene: number;
  stress: number;
  isSick: boolean;
  outfitIds: string[];
  friendIds: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string;
}

export interface OutfitItem {
  id: string;
  name: string;
  slot: string;
  icon: string;
  imageUrl?: string;
  allowedCategoryIds?: string[];
  note: string;
}

export interface FriendPet {
  id: string;
  name: string;
  animalTypeId: string;
  ownerName: string;
  mood: string;
  visitCount: number;
}
