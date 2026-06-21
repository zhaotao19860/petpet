export type StarBuddyActionName = 'bounce' | 'spin' | 'wink' | 'sparkle' | 'tilt';
export type StarBuddySoundKind = 'tap' | 'open' | 'reward' | 'correct' | 'gentle';

export interface StarBuddyReaction {
  action: StarBuddyActionName;
  message: string;
  sound: StarBuddySoundKind;
}

const reactions: StarBuddyReaction[] = [
  { action: 'bounce', message: '我在这里呢！', sound: 'tap' },
  { action: 'spin', message: '要不要问一个动物问题？', sound: 'tap' },
  { action: 'wink', message: '我发现了一个小秘密。', sound: 'tap' },
  { action: 'sparkle', message: '我可以讲一个温柔故事。', sound: 'tap' },
  { action: 'tilt', message: '想听星宝慢慢讲吗？', sound: 'tap' },
];

export function getStarBuddyReaction(seed = Date.now()): StarBuddyReaction {
  const index = Math.abs(Math.floor(seed)) % reactions.length;
  return reactions[index];
}
