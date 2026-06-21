import type { SpeechToTextProvider, StarAiProvider } from '../types.js';
import { getStarBuddyAnimal } from '../../animalFacts.js';
import { createAnimalFactQuiz, createSafeGeneralChatResponse } from '../safety.js';

export class MockStarAiProvider implements StarAiProvider {
  async complete({ mode, user }: Parameters<StarAiProvider['complete']>[0]) {
    const match = user.match(/动物：([^\n]+)/);
    const animalName = match?.[1]?.trim() || '动物伙伴';
    const animalId = user.match(/动物ID：([^\n]+)/)?.[1]?.trim();
    const childMessage = user.match(/孩子的问题：([^\n]+)/)?.[1]?.trim() ?? '';
    const animal = getStarBuddyAnimal(animalId || '');

    if (mode === 'care-plan') {
      return JSON.stringify({
        message: `星宝看了看状态，建议先温柔观察${animalName}，再补充需要的照顾。`,
        suggestedActions: ['observe', 'water'],
        emotion: 'encourage',
      });
    }
    if (mode === 'story') {
      return JSON.stringify({
        title: `${animalName}和星星口袋`,
        paragraphs: [
          `${animalName}在宠宠星球发现了一颗小星星。小星星没有掉在天上，而是藏在一片柔软的叶子旁边。`,
          `星宝蹲下来轻轻看，说：“我们不打扰它，只陪它等一等。”${animalName}也把脚步放轻，耳朵认真听风的声音。`,
          '过了一会儿，小星星慢慢亮起来，照出一条细细的小路。路边有会摇头的花、有会唱歌的草，还有一颗像月亮一样圆的小石头。',
          `${animalName}把今天看到的颜色、听到的声音，都放进星星口袋。它知道，温柔观察就是送给动物和大自然的礼物。`,
        ],
        choices: [{ label: '继续冒险', prompt: `继续讲${animalName}的安全冒险` }],
        emotion: 'gentle',
      });
    }
    if (mode === 'quiz') {
      return JSON.stringify(createAnimalFactQuiz(animal, user));
    }
    const safeGeneralChat = createSafeGeneralChatResponse(childMessage);
    if (safeGeneralChat) {
      return JSON.stringify(safeGeneralChat);
    }
    return JSON.stringify({
      message: `星宝在这里。我们可以一起认识${animalName}，也可以讲一个温柔故事。`,
      quickPrompts: ['问一个动物问题', '讲个故事'],
      emotion: 'encourage',
    });
  }
}

export class MockSpeechToTextProvider implements SpeechToTextProvider {
  async transcribe({ audio }: Parameters<SpeechToTextProvider['transcribe']>[0]) {
    if (!audio.byteLength) throw new Error('MOCK_STT_EMPTY_AUDIO');
    return '我想问一个动物问题';
  }
}
