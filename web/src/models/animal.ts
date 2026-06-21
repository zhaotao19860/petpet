export type AnimalCategory =
  | 'domestic_pet'
  | 'small_mammal'
  | 'insect'
  | 'arthropod'
  | 'large_animal'
  | 'wildlife'
  | 'flying_animal'
  | 'amphibian'
  | 'reptile'
  | 'aquatic'
  | 'farm_animal';

export const categoryLabels: Record<AnimalCategory, string> = {
  domestic_pet: '家庭宠物',
  small_mammal: '小型哺乳动物',
  insect: '昆虫',
  arthropod: '节肢动物',
  large_animal: '大型动物',
  wildlife: '野生动物',
  flying_animal: '飞行动物',
  amphibian: '两栖动物',
  reptile: '爬行动物',
  aquatic: '水生动物',
  farm_animal: '农场动物',
};

export type ActivityPattern = 'day_active' | 'night_active' | 'crepuscular' | 'mixed';
export type GrowthStageId = 'egg' | 'larva' | 'pupa' | 'baby' | 'juvenile' | 'adult' | 'elder' | `day_${number}`;
export type MediaKind = 'image' | 'video' | 'audio';
export type DressUpSlot = 'hat' | 'collar' | 'scarf' | 'toy' | 'background' | 'habitat_item' | 'photo_frame' | 'observer_badge';

export interface FoodItem {
  name: string;
  note: string;
}

export interface Disease {
  name: string;
  symptoms: string;
  advice: string;
}

export interface RestPattern {
  pattern: ActivityPattern;
  dailyRestHours: string;
  childFriendlyNote: string;
}

export interface GrowthStageDefinition {
  id: GrowthStageId;
  name: string;
  realDurationDays: number;
  description: string;
  observableFeatures: string[];
  careFocus: string[];
}

export interface AnimalMediaItem {
  kind: MediaKind;
  url: string;
  title: string;
  credit: string;
  kidSafeNote: string;
}

export interface AgeImage {
  age: number;
  url: string;
  thumbnailUrl: string;
  fallbackUrl: string;
  title: string;
  description: string;
}

export interface AnimalMedia {
  coverImage: string;
  coverThumbnail: string;
  ageImages: AgeImage[];
  ageImageNote?: string;
  items: AnimalMediaItem[];
  contentRating: 'kid_safe' | 'parent_guidance';
}

export interface InteractionRules {
  careMode: 'hands_on' | 'observe_and_protect' | 'habitat_care';
  canFeedDirectly: boolean;
  safetyNote: string;
  playIdeas: string[];
}

export interface DressUpRules {
  allowedSlots: DressUpSlot[];
  safetyNote: string;
}

export interface AnimalType {
  id: string;
  name: string;
  scientificName?: string;
  category: AnimalCategory;
  conservationStatus?: string;
  tagline: string;
  childFriendlySummary: string;
  habitat: string[];
  habits: string[];
  safeFood: FoodItem[];
  unsafeFood: FoodItem[];
  restPattern: RestPattern;
  diseases: Disease[];
  growthStages: GrowthStageDefinition[];
  media: AnimalMedia;
  interactionRules: InteractionRules;
  dressUpRules: DressUpRules;
}
