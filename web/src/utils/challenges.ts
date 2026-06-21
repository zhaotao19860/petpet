import type { AnimalType } from '../models/animal';

export interface ChallengeQuestion {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  correct: string;
  hint: string;
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options.filter(Boolean))).slice(0, 4);
}

function fourOptions(correct: string, options: string[]) {
  return uniqueOptions([correct, ...options, '请大人帮忙', '安静看一看']);
}

function canCareDirectly(animal: AnimalType) {
  return animal.interactionRules.canFeedDirectly;
}

export function getAdoptionQuestion(animal: AnimalType): ChallengeQuestion {
  const safe = animal.safeFood[0]?.name ?? '合适食物';
  const unsafe = animal.unsafeFood[0]?.name ?? '危险食物';
  const habitat = animal.habitat[0] ?? '安全栖息地';
  return {
    id: `${animal.id}-adoption-food`,
    title: `${animal.name}入门挑战`,
    prompt: `想和${animal.name}做朋友，先判断哪一项更适合它？`,
    options: uniqueOptions([safe, unsafe, habitat, animal.restPattern.dailyRestHours]),
    correct: safe,
    hint: `${animal.name}适合了解的食物包括：${animal.safeFood.map((item) => item.name).join('、')}。现实投喂需要成年人或专业人员指导。`,
  };
}

export function getChallengeSet(animal: AnimalType): ChallengeQuestion[] {
  const safe = animal.safeFood[0]?.name ?? '合适食物';
  const unsafe = animal.unsafeFood[0]?.name ?? '不合适食物';
  const habitat = animal.habitat[0] ?? '安全的家';
  const habit = animal.habits[0] ?? animal.tagline;
  const growthStage = animal.growthStages[Math.min(6, animal.growthStages.length - 1)] ?? animal.growthStages[0];
  const disease = animal.diseases[0];
  const directCare = canCareDirectly(animal);
  const foodPrompt = directCare ? `${animal.name}肚子饿了，哪一种食物更安全？` : `${animal.name}在自然里通常会吃什么？`;
  const foodHint = directCare ? `${animal.name}可以吃${safe}，但要让大人一起照顾。` : `${animal.name}会寻找${safe}这类食物；小朋友不要直接投喂。`;
  const safetyCorrect = directCare ? '请大人一起照顾' : '远远观察，不喂不摸';
  const safetyPrompt = directCare ? `想照顾${animal.name}，哪种做法更好？` : `看到${animal.name}，哪种做法最安全？`;
  const protectionCorrect = animal.conservationStatus ? '保护它生活的地方' : '保持安静和干净';

  return [
    {
      id: `${animal.id}-food-safe`,
      title: '吃什么才安全',
      prompt: foodPrompt,
      options: fourOptions(safe, [unsafe, '巧克力', '塑料垃圾']),
      correct: safe,
      hint: foodHint,
    },
    {
      id: `${animal.id}-unsafe-food`,
      title: '危险食物侦探',
      prompt: `哪一项不适合${animal.name}？`,
      options: fourOptions(unsafe, [safe, animal.safeFood[1]?.name ?? '清水', '安全观察']),
      correct: unsafe,
      hint: `${animal.name}需要避免：${animal.unsafeFood.map((item) => item.name).join('、')}。`,
    },
    {
      id: `${animal.id}-home-place`,
      title: '它住在哪里',
      prompt: `${animal.name}最可能住在哪里？`,
      options: fourOptions(habitat, ['嘈杂马路', '塑料袋堆', '很小的盒子']),
      correct: habitat,
      hint: `${animal.name}常见的家包括：${animal.habitat.join('、')}。`,
    },
    {
      id: `${animal.id}-real-action`,
      title: '它会做什么',
      prompt: `哪件事是${animal.name}真的会做的？`,
      options: fourOptions(habit, ['用杯子喝可乐', '每天都不睡觉', '喜欢被追着跑']),
      correct: habit,
      hint: `可以观察：${animal.habits.join('、')}。`,
    },
    {
      id: `${animal.id}-growth-stage`,
      title: '成长小发现',
      prompt: `${animal.name}在“${growthStage.name}”阶段，哪件事最值得观察？`,
      options: fourOptions(growthStage.observableFeatures[0] ?? growthStage.name, ['每天都不变化', '不用休息', '吃塑料也没关系']),
      correct: growthStage.observableFeatures[0] ?? growthStage.name,
      hint: growthStage.description,
    },
    {
      id: `${animal.id}-quiet-rest`,
      title: '休息小守护',
      prompt: `${animal.name}正在休息，我们应该怎么做？`,
      options: fourOptions('安静看一看', ['大声叫醒它', '一直摇晃它', '追着它跑']),
      correct: '安静看一看',
      hint: animal.restPattern.childFriendlyNote,
    },
    {
      id: `${animal.id}-safe-helper`,
      title: '小小保护员',
      prompt: safetyPrompt,
      options: fourOptions(safetyCorrect, ['随便投喂零食', '突然抓住它', '用力拍打笼子']),
      correct: safetyCorrect,
      hint: animal.interactionRules.safetyNote,
    },
    {
      id: `${animal.id}-health-helper`,
      title: '健康小助手',
      prompt: `${animal.name}精神变差时，小朋友应该怎么做？`,
      options: fourOptions('请大人或专业人员帮忙', ['自己乱喂药', '一直逗它玩', '把它藏起来']),
      correct: '请大人或专业人员帮忙',
      hint: disease ? `${disease.name}可能会让动物${disease.symptoms}${disease.advice}` : '动物不舒服时，要请大人和专业人员帮忙。',
    },
    {
      id: `${animal.id}-protection`,
      title: '自然保护员',
      prompt: `想帮助${animal.name}，哪种做法更好？`,
      options: fourOptions(protectionCorrect, ['乱丢垃圾', '追赶动物', '破坏栖息地']),
      correct: protectionCorrect,
      hint: animal.conservationStatus ? `${animal.name}的保护状态是${animal.conservationStatus}，保护栖息地很重要。` : `${animal.name}也需要安静、干净和安全的环境。`,
    },
  ];
}
