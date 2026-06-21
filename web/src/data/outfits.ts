import type { OutfitItem } from '../models/pet';

export const outfits: OutfitItem[] = [
  { id: 'soft_scarf', name: '柔软围巾', slot: 'scarf', icon: '🧣', imageUrl: '/assets/outfits/soft-scarf.png', allowedCategoryIds: ['domestic_pet', 'small_mammal'], note: '只适合可安全接触的家庭宠物。' },
  { id: 'safe_collar', name: '安全项圈', slot: 'collar', icon: '🏷️', imageUrl: '/assets/outfits/safe-collar.png', allowedCategoryIds: ['domestic_pet'], note: '不能过紧，现实中需成年人检查。' },
  { id: 'forest_frame', name: '森林相框', slot: 'photo_frame', icon: '🌲', imageUrl: '/assets/outfits/forest-frame.png', note: '适合所有动物的非接触式装扮。' },
  { id: 'wetland_home', name: '湿地小屋', slot: 'habitat_item', icon: '💧', imageUrl: '/assets/outfits/wetland-home.png', allowedCategoryIds: ['amphibian', 'aquatic'], note: '用于布置栖息地，不接触动物身体。' },
  { id: 'observer_badge', name: '小小观察员徽章', slot: 'observer_badge', icon: '🔭', imageUrl: '/assets/outfits/observer-badge.png', note: '代表观察记录成就。' },
  { id: 'savanna_bg', name: '草原背景', slot: 'background', icon: '🌾', imageUrl: '/assets/outfits/savanna-bg.png', allowedCategoryIds: ['wildlife', 'large_animal'], note: '用背景表达陪伴，不给野生动物穿戴。' },
];
