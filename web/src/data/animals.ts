import type { AgeImage, AnimalCategory, AnimalType, GrowthStageId } from '../models/animal';

const animalAssetName = (age: number) => `age-${String(age).padStart(2, '0')}`;

const animalAsset = (id: string, age: number) => {
  const name = animalAssetName(age);
  return {
    url: `/assets/animals/${id}/${name}.webp`,
    thumbnailUrl: `/assets/animals/${id}/thumbs/${name}.webp`,
    fallbackUrl: `/assets/animals/${id}/${name}.png`,
  };
};

const categoryCareMode: Record<AnimalCategory, 'hands_on' | 'observe_and_protect' | 'habitat_care'> = {
  domestic_pet: 'hands_on',
  small_mammal: 'hands_on',
  insect: 'habitat_care',
  arthropod: 'habitat_care',
  large_animal: 'habitat_care',
  wildlife: 'observe_and_protect',
  flying_animal: 'observe_and_protect',
  amphibian: 'habitat_care',
  reptile: 'habitat_care',
  aquatic: 'habitat_care',
  farm_animal: 'habitat_care',
};

const categorySafety: Record<AnimalCategory, string> = {
  domestic_pet: '现实中接触宠物要先征得成年人同意，并尊重动物休息。',
  small_mammal: '小型哺乳动物身体脆弱，现实接触需成年人陪同。',
  insect: '昆虫适合观察栖息地，不要挤压身体或破坏翅膀。',
  arthropod: '节肢动物适合安静观察栖息地，不要挤压身体或把它带离潮湿角落。',
  large_animal: '大型动物需要专业场地和照护，儿童只能在成年人陪同下远距离观察。',
  wildlife: '野生动物不适合作为家庭宠物，应以远距离观察和保护为主。',
  flying_animal: '飞行动物不适合随意触摸，保护巢穴和安静环境更重要。',
  amphibian: '两栖动物皮肤敏感，不要徒手抓握，重点保护湿地和水质。',
  reptile: '爬行动物需要稳定温湿度，现实接触需专业指导。',
  aquatic: '水生动物依赖洁净水体，应以观察水环境为主。',
  farm_animal: '农场动物也需要温和对待和安全距离。',
};

const categoryDress: Record<AnimalCategory, string[]> = {
  domestic_pet: ['collar', 'scarf', 'toy', 'background', 'photo_frame'],
  small_mammal: ['scarf', 'toy', 'background', 'photo_frame'],
  insect: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
  arthropod: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
  large_animal: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
  wildlife: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
  flying_animal: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
  amphibian: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
  reptile: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
  aquatic: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
  farm_animal: ['background', 'habitat_item', 'photo_frame', 'observer_badge'],
};

const shortLifeCategories = new Set<AnimalCategory>(['insect', 'arthropod', 'amphibian', 'aquatic']);
const totalGrowthStages = 30;

const stageFeatureByPeriod = [
  ['身体最脆弱', '依赖安全环境', '需要稳定温度'],
  ['感官逐渐开启', '开始轻微活动', '对环境变化敏感'],
  ['活动范围扩大', '学习基础行为', '体型增长明显'],
  ['探索欲增强', '行为技能成熟', '社交或觅食能力提升'],
  ['接近成年体型', '特征更加明显', '作息逐渐稳定'],
  ['成年特征稳定', '活动节奏规律', '繁殖或社群行为成熟'],
  ['经验更丰富', '活动略有放缓', '需要持续健康观察'],
  ['老年特征出现', '体力下降', '更需要安静照护'],
];

function periodIndex(index: number) {
  return Math.min(stageFeatureByPeriod.length - 1, Math.floor((index / totalGrowthStages) * stageFeatureByPeriod.length));
}

function buildStageDescription(seed: AnimalSeed, stageName: string, index: number) {
  const day = index + 1;
  const period = periodIndex(index);
  if (seed.category === 'insect') {
    return `${seed.name}压缩成长第 ${day} 天：${stageName}。这一阶段对应昆虫从卵、幼虫、蛹到成虫老化的真实发育过程。`;
  }
  if (seed.category === 'arthropod') {
    return `${seed.name}压缩成长第 ${day} 天：${stageName}。这一阶段对应陆生甲壳动物从育幼袋中的幼体、离开母体、连续蜕皮到成熟个体的真实成长过程。`;
  }
  if (seed.category === 'amphibian') {
    return `${seed.name}压缩成长第 ${day} 天：${stageName}。这一阶段对应两栖动物从水中卵团、幼体变态到陆水两栖生活的真实过程。`;
  }
  if (seed.category === 'flying_animal') {
    return `${seed.name}压缩成长第 ${day} 天：${stageName}。这一阶段对应鸟类从蛋内发育、雏鸟成长到成鸟衰老的真实过程。`;
  }
  if (seed.id === 'clownfish') {
    return `${seed.name}压缩成长第 ${day} 天：${stageName}。这一阶段对应鱼类从卵、仔鱼、稚鱼到成熟个体的真实过程。`;
  }
  if (seed.id === 'turtle_green_sea') {
    return `${seed.name}压缩成长第 ${day} 天：${stageName}。这一阶段对应海龟从破壳入海、幼龟成长到年长个体的真实过程。`;
  }
  if (seed.id === 'dolphin_bottlenose') {
    return `${seed.name}压缩成长第 ${day} 天：${stageName}。这一阶段对应海豚从依赖母豚到成年社群生活和老年的真实过程。`;
  }
  return `${seed.name}压缩成长第 ${day} 天：${stageName}。这一阶段对应哺乳动物从出生依赖、幼年学习、成年稳定到老年的真实过程，${stageFeatureByPeriod[period][0]}。`;
}

function buildStageFeatures(seed: AnimalSeed, index: number) {
  const period = periodIndex(index);
  const base = stageFeatureByPeriod[period];
  if (seed.category === 'insect') {
    return [...base, index < 4 ? '卵内发育' : index < 16 ? '幼虫取食或蜕皮' : index < 21 ? '蛹内重组' : '成虫活动'];
  }
  if (seed.category === 'arthropod') {
    return [...base, index < 5 ? '育幼袋内发育' : index < 14 ? '离开母体后觅食' : index < 23 ? '连续蜕皮长大' : '成熟后夜间活动'];
  }
  if (seed.category === 'amphibian') {
    return [...base, index < 5 ? '卵内发育' : index < 14 ? '水生幼体变化' : index < 17 ? '变态完成' : '陆水两栖活动'];
  }
  if (seed.category === 'flying_animal') {
    return [...base, index < 3 ? '蛋内发育' : index < 13 ? '雏鸟长羽' : index < 19 ? '离巢练飞' : '成鸟活动'];
  }
  if (seed.id === 'clownfish') {
    return [...base, index < 5 ? '卵与仔鱼发育' : index < 15 ? '稚鱼成长' : '成鱼稳定活动'];
  }
  if (seed.id === 'turtle_green_sea') {
    return [...base, index < 5 ? '卵内和破壳' : index < 17 ? '幼龟成长' : '成年迁徙或繁殖'];
  }
  return [...base, index < 8 ? '依赖照护者' : index < 18 ? '学习探索' : index < 25 ? '成年稳定' : '年长变化'];
}

function buildCareFocus(seed: AnimalSeed, index: number) {
  const shared = index < 10 ? ['保温和安全', '减少惊扰'] : index < 22 ? ['观察行为', '提供合适空间'] : ['健康观察', '安静环境'];
  if (categoryCareMode[seed.category] === 'observe_and_protect') {
    return ['远距离观察', ...shared];
  }
  if (categoryCareMode[seed.category] === 'habitat_care') {
    return ['维护栖息地', ...shared];
  }
  return ['温柔互动', ...shared];
}


interface AnimalSeed {
  id: string;
  name: string;
  scientificName: string;
  category: AnimalCategory;
  tagline: string;
  summary: string;
  habitat: string[];
  habits: string[];
  safeFood: string[];
  unsafeFood: string[];
  rest: string;
  disease: string;
  conservationStatus?: string;
}

const seeds: AnimalSeed[] = [
  { id: 'cat_orange', name: '橘猫', scientificName: 'Felis catus', category: 'domestic_pet', tagline: '爱晒太阳的家庭伙伴', summary: '橘猫是常见家庭宠物，喜欢安静、安全和规律照护。', habitat: ['家庭室内', '安全阳台', '温暖休息角'], habits: ['每天睡眠 12-16 小时', '用舌头梳理毛发', '通过呼噜声表达放松'], safeFood: ['猫粮', '熟鸡胸肉', '清水'], unsafeFood: ['巧克力', '洋葱', '葡萄'], rest: '12-16 小时', disease: '猫鼻支' },
  { id: 'dog_shiba', name: '柴犬', scientificName: 'Canis lupus familiaris', category: 'domestic_pet', tagline: '独立又忠诚的小伙伴', summary: '柴犬性格独立，喜欢散步和清晰的生活规则。', habitat: ['家庭', '公园步道', '安全院落'], habits: ['爱清洁', '需要散步', '通过尾巴和耳朵表达情绪'], safeFood: ['狗粮', '熟鸡肉', '胡萝卜'], unsafeFood: ['巧克力', '葡萄', '洋葱'], rest: '12-14 小时', disease: '皮肤过敏' },
  { id: 'rabbit_holland', name: '荷兰兔', scientificName: 'Oryctolagus cuniculus domesticus', category: 'domestic_pet', tagline: '安静敏感的长耳伙伴', summary: '兔子需要干草、安静环境和温柔接触。', habitat: ['室内兔舍', '安静角落', '草垫区域'], habits: ['牙齿持续生长', '黄昏活跃', '受惊会跺脚'], safeFood: ['提摩西草', '兔粮', '少量生菜'], unsafeFood: ['巧克力', '面包', '大量坚果'], rest: '8-12 小时', disease: '毛球症' },
  { id: 'hamster_golden', name: '金丝熊仓鼠', scientificName: 'Mesocricetus auratus', category: 'small_mammal', tagline: '夜行囤粮小专家', summary: '仓鼠体型小，喜欢夜间活动和安全的躲藏空间。', habitat: ['仓鼠笼', '木屑底材', '跑轮'], habits: ['夜行', '腮囊储存食物', '喜欢打洞'], safeFood: ['仓鼠粮', '少量葵花籽', '西兰花'], unsafeFood: ['糖果', '洋葱', '柑橘'], rest: '白天多休息', disease: '湿尾病' },
  { id: 'guinea_pig', name: '豚鼠', scientificName: 'Cavia porcellus', category: 'small_mammal', tagline: '会咕咕叫的草食伙伴', summary: '豚鼠需要维生素 C、干草和同伴陪伴。', habitat: ['宽敞围栏', '干草区', '安静室内'], habits: ['群居', '用叫声交流', '持续啃咬磨牙'], safeFood: ['干草', '豚鼠粮', '甜椒'], unsafeFood: ['巧克力', '洋葱', '冰山生菜过量'], rest: '短睡多次', disease: '维生素 C 缺乏' },
  { id: 'hedgehog_african', name: '非洲迷你刺猬', scientificName: 'Atelerix albiventris', category: 'small_mammal', tagline: '卷成小球的夜行朋友', summary: '刺猬夜间活动，需要温暖环境和安静观察。', habitat: ['恒温饲养箱', '躲藏屋', '跑轮'], habits: ['夜行', '受惊会蜷缩', '嗅觉灵敏'], safeFood: ['刺猬粮', '昆虫', '少量熟肉'], unsafeFood: ['牛奶', '葡萄', '高盐食物'], rest: '白天多休息', disease: '皮肤螨虫' },
  { id: 'butterfly_swallowtail', name: '凤蝶', scientificName: 'Papilio', category: 'insect', tagline: '从毛毛虫到传粉者', summary: '凤蝶经历卵、幼虫、蛹、成虫的完全变态。', habitat: ['花园', '林缘', '寄主植物'], habits: ['吸食花蜜', '幼虫吃叶', '白天活动'], safeFood: ['花蜜', '寄主植物叶片', '糖水辅助'], unsafeFood: ['杀虫剂', '污染水源', '破损叶片'], rest: '夜间停栖', disease: '病毒感染' },
  { id: 'beetle_hercules', name: '独角仙', scientificName: 'Dynastinae', category: 'insect', tagline: '力气很大的甲虫', summary: '独角仙幼虫生活在腐殖土中，成虫喜欢树液和水果。', habitat: ['腐殖土', '朽木', '树林'], habits: ['夜行', '完全变态', '雄虫有角'], safeFood: ['昆虫果冻', '香蕉', '苹果'], unsafeFood: ['农药水果', '含盐食物', '干燥环境'], rest: '白天躲藏', disease: '脱水' },
  { id: 'bee_honey', name: '蜜蜂', scientificName: 'Apis mellifera', category: 'insect', tagline: '勤劳的传粉小队', summary: '蜜蜂帮助植物传粉，群体分工明确。', habitat: ['蜂巢', '花田', '果园'], habits: ['采蜜', '跳舞传递信息', '群体合作'], safeFood: ['花蜜', '花粉', '清水'], unsafeFood: ['杀虫剂', '污染花源', '烟雾惊扰'], rest: '夜间减少活动', disease: '蜂螨危害' },
  { id: 'woodlouse_pillbug', name: '西瓜虫', scientificName: 'Armadillidium vulgare', category: 'arthropod', tagline: '会卷成小球的落叶清洁员', summary: '西瓜虫是陆生甲壳动物，喜欢潮湿阴暗的落叶层，会把腐叶变回土壤养分。', habitat: ['潮湿落叶层', '石头下方', '腐木旁边'], habits: ['受惊会卷成小球', '夜间出来觅食', '通过蜕皮长大'], safeFood: ['腐叶', '软木碎屑', '潮湿苔藓'], unsafeFood: ['干燥高温', '杀虫剂', '盐和清洁剂'], rest: '白天躲在潮湿阴影里', disease: '脱水' },
  { id: 'horse_thoroughbred', name: '纯血马', scientificName: 'Equus ferus caballus', category: 'large_animal', tagline: '草原上的速度与力量', summary: '马是大型草食动物，群居、敏感，需要足够空间。', habitat: ['草场', '马厩', '牧场'], habits: ['需要走动', '站立浅睡', '耳朵表达情绪'], safeFood: ['干草', '燕麦', '胡萝卜'], unsafeFood: ['巧克力', '发霉草料', '大量高糖饲料'], rest: '3-5 小时深浅睡组合', disease: '疝痛' },
  { id: 'elephant_asian', name: '亚洲象', scientificName: 'Elephas maximus', category: 'large_animal', conservationStatus: '濒危', tagline: '聪明温和的森林巨人', summary: '亚洲象记忆力强，群居，需要广阔森林和水源。', habitat: ['热带森林', '草地', '河边'], habits: ['群居', '用鼻子取食', '喜欢洗澡'], safeFood: ['草', '树叶', '水果'], unsafeFood: ['塑料垃圾', '投喂零食', '污染水源'], rest: '约 4 小时', disease: '足部感染' },
  { id: 'giraffe_reticulated', name: '长颈鹿', scientificName: 'Giraffa camelopardalis', category: 'large_animal', tagline: '高高的树叶观察家', summary: '长颈鹿用长脖子取食高处树叶，生活在非洲草原。', habitat: ['稀树草原', '开放林地', '灌木地'], habits: ['吃高处叶片', '站立休息', '视野开阔'], safeFood: ['金合欢叶', '嫩枝', '清水'], unsafeFood: ['人类零食', '塑料', '污染植物'], rest: '短时多次休息', disease: '蹄部问题' },
  { id: 'lion_african', name: '非洲狮', scientificName: 'Panthera leo', category: 'wildlife', conservationStatus: '易危', tagline: '草原上的群居大猫', summary: '狮子是野生动物，只适合远距离观察和保护学习。', habitat: ['稀树草原', '开放林地', '保护区'], habits: ['群居', '长时间休息', '吼声很远'], safeFood: ['自然猎物', '专业饲养肉类', '清水'], unsafeFood: ['人类零食', '投喂行为', '加工食品'], rest: '16-20 小时', disease: '传染病' },
  { id: 'panda_giant', name: '大熊猫', scientificName: 'Ailuropoda melanoleuca', category: 'wildlife', conservationStatus: '易危', tagline: '爱吃竹子的黑白伙伴', summary: '大熊猫主要吃竹子，需要山地森林栖息地。', habitat: ['山地竹林', '森林', '保护区'], habits: ['吃竹子', '独居', '善于攀爬'], safeFood: ['竹子', '竹笋', '清水'], unsafeFood: ['人类零食', '污染竹林', '惊扰接触'], rest: '10 小时以上', disease: '肠胃问题' },
  { id: 'fox_arctic', name: '北极狐', scientificName: 'Vulpes lagopus', category: 'wildlife', tagline: '会换季节外套的小狐狸', summary: '北极狐适应寒冷环境，冬夏毛色会变化。', habitat: ['苔原', '雪地', '海岸'], habits: ['换毛', '挖洞', '嗅觉灵敏'], safeFood: ['自然小动物', '浆果', '清水'], unsafeFood: ['投喂零食', '塑料垃圾', '污染猎物'], rest: '洞穴中休息', disease: '寄生虫感染' },
  { id: 'owl_barn', name: '仓鸮', scientificName: 'Tyto alba', category: 'flying_animal', tagline: '安静飞行的夜间猎手', summary: '仓鸮依靠灵敏听觉在夜晚寻找食物。', habitat: ['农田边缘', '谷仓', '林地'], habits: ['夜行', '静音飞行', '高处停栖'], safeFood: ['自然小型啮齿动物', '清洁水源', '安全巢箱'], unsafeFood: ['含鼠药猎物', '人类食物', '强光惊扰'], rest: '白天多休息', disease: '翅膀受伤' },
  { id: 'parrot_macaw', name: '金刚鹦鹉', scientificName: 'Ara', category: 'flying_animal', tagline: '色彩鲜艳的森林飞行者', summary: '金刚鹦鹉聪明、社会性强，需要森林和同伴。', habitat: ['热带雨林', '树冠层', '河边森林'], habits: ['群居', '会模仿声音', '强力喙啃坚果'], safeFood: ['坚果', '水果', '种子'], unsafeFood: ['巧克力', '牛油果', '高盐食物'], rest: '夜间栖息', disease: '羽毛损伤' },
  { id: 'swift_common', name: '雨燕', scientificName: 'Apus apus', category: 'flying_animal', tagline: '几乎一直在空中的飞行家', summary: '雨燕擅长长时间飞行，捕食空中小昆虫。', habitat: ['城市屋檐', '悬崖', '空旷天空'], habits: ['高速飞行', '空中取食', '迁徙'], safeFood: ['飞行昆虫', '自然水汽', '安全巢位'], unsafeFood: ['封堵巢穴', '农药昆虫', '玻璃撞击'], rest: '飞行中短暂休息', disease: '幼鸟坠落' },
  { id: 'tree_frog', name: '树蛙', scientificName: 'Hyla', category: 'amphibian', tagline: '湿润森林里的小小歌手', summary: '树蛙皮肤湿润，对污染敏感，依赖湿地。', habitat: ['湿润森林', '池塘边', '溪流附近'], habits: ['夜间鸣叫', '皮肤帮助呼吸', '趾垫攀爬'], safeFood: ['小昆虫', '洁净水体', '湿润植物'], unsafeFood: ['含氯水', '农药昆虫', '干燥环境'], rest: '白天躲藏', disease: '皮肤感染' },
  { id: 'salamander_fire', name: '火蝾螈', scientificName: 'Salamandra salamandra', category: 'amphibian', tagline: '黑黄斑纹的森林居民', summary: '火蝾螈喜欢潮湿森林，鲜艳颜色提醒天敌保持距离。', habitat: ['潮湿森林', '落叶层', '溪流边'], habits: ['夜行', '皮肤湿润', '躲在落叶下'], safeFood: ['小昆虫', '蚯蚓', '湿润环境'], unsafeFood: ['干燥高温', '污染水源', '徒手抓握'], rest: '白天躲藏', disease: '真菌感染' },
  { id: 'toad_chinese', name: '中华大蟾蜍', scientificName: 'Bufo gargarizans', category: 'amphibian', tagline: '夜晚捕虫的湿地邻居', summary: '蟾蜍常在夜间捕食昆虫，是农田生态的一部分。', habitat: ['农田', '池塘边', '湿草地'], habits: ['夜行', '跳跃较慢', '捕食害虫'], safeFood: ['昆虫', '清洁水源', '湿草地'], unsafeFood: ['农药', '车辆道路', '干燥环境'], rest: '白天隐蔽', disease: '皮肤问题' },
  { id: 'tortoise_russian', name: '陆龟', scientificName: 'Testudo horsfieldii', category: 'reptile', tagline: '慢慢探索的小甲壳朋友', summary: '陆龟需要稳定温度、晒背和高纤维植物。', habitat: ['草地', '干燥灌丛', '温暖饲养区'], habits: ['晒背', '慢速行走', '吃植物'], safeFood: ['牧草', '蒲公英叶', '清水'], unsafeFood: ['高糖水果过量', '冰冷环境', '加工食品'], rest: '夜间休息', disease: '代谢性骨病' },
  { id: 'gecko_leopard', name: '豹纹守宫', scientificName: 'Eublepharis macularius', category: 'reptile', tagline: '有斑点的夜行小蜥蜴', summary: '豹纹守宫夜间活动，需要合适温度和躲藏处。', habitat: ['干燥岩地', '躲藏洞', '温控环境'], habits: ['夜行', '尾巴储存能量', '蜕皮'], safeFood: ['蟋蟀', '面包虫', '钙粉'], unsafeFood: ['过冷环境', '大块食物', '脏底材'], rest: '白天躲藏', disease: '蜕皮困难' },
  { id: 'chameleon_veiled', name: '变色龙', scientificName: 'Chamaeleo calyptratus', category: 'reptile', tagline: '会变色的树上观察者', summary: '变色龙用颜色表达状态，需要树枝、湿度和空间。', habitat: ['树冠', '灌木', '温暖环境'], habits: ['变色', '长舌捕虫', '眼睛独立转动'], safeFood: ['昆虫', '洁净水滴', '树枝环境'], unsafeFood: ['频繁抓握', '低湿度', '不合适温度'], rest: '夜间停栖', disease: '脱水' },
  { id: 'clownfish', name: '小丑鱼', scientificName: 'Amphiprioninae', category: 'aquatic', tagline: '海葵旁的橙白小鱼', summary: '小丑鱼与海葵关系密切，依赖稳定海水环境。', habitat: ['珊瑚礁', '海葵', '温暖海水'], habits: ['与海葵共生', '群体等级', '游动范围小'], safeFood: ['浮游生物', '小型甲壳类', '专业鱼粮'], unsafeFood: ['污染海水', '过量投喂', '触碰海葵'], rest: '夜间减缓活动', disease: '白点病' },
  { id: 'turtle_green_sea', name: '绿海龟', scientificName: 'Chelonia mydas', category: 'aquatic', conservationStatus: '濒危', tagline: '穿越大海的温和旅行者', summary: '绿海龟在海中生活，会上岸产卵，需要保护海滩。', habitat: ['海洋', '海草床', '沙滩'], habits: ['长距离迁徙', '吃海草', '上岸产卵'], safeFood: ['海草', '藻类', '洁净海水'], unsafeFood: ['塑料袋', '渔网', '灯光干扰'], rest: '水下或礁石边休息', disease: '误食塑料' },
  { id: 'dolphin_bottlenose', name: '宽吻海豚', scientificName: 'Tursiops truncatus', category: 'aquatic', tagline: '聪明的海洋哺乳动物', summary: '海豚群居、会发声交流，需要广阔海域。', habitat: ['近海', '海湾', '温暖海域'], habits: ['回声定位', '群体合作', '跳跃换气'], safeFood: ['鱼类', '乌贼', '洁净海水'], unsafeFood: ['塑料垃圾', '噪声污染', '追逐骚扰'], rest: '半脑睡眠', disease: '皮肤感染' },
  { id: 'chicken_hen', name: '母鸡', scientificName: 'Gallus gallus domesticus', category: 'farm_animal', tagline: '会咯咯叫的农场伙伴', summary: '鸡会刨土找食，需要干净鸡舍和活动空间。', habitat: ['鸡舍', '农场院落', '草地'], habits: ['刨土', '群体等级', '白天活动'], safeFood: ['谷物', '青菜', '昆虫'], unsafeFood: ['发霉饲料', '巧克力', '高盐剩菜'], rest: '夜间栖架休息', disease: '呼吸道感染' },
  { id: 'goat_dwarf', name: '侏儒山羊', scientificName: 'Capra aegagrus hircus', category: 'farm_animal', tagline: '爱攀爬的农场朋友', summary: '山羊好奇活泼，喜欢攀爬和啃食植物。', habitat: ['牧场', '农场', '岩石坡地'], habits: ['攀爬', '反刍', '群居'], safeFood: ['干草', '灌木叶', '清水'], unsafeFood: ['有毒植物', '发霉草料', '塑料'], rest: '夜间休息', disease: '蹄病' },
  { id: 'alpaca', name: '羊驼', scientificName: 'Vicugna pacos', category: 'farm_animal', tagline: '毛茸茸的安静牧场居民', summary: '羊驼性格较温和，群居，毛发可用于纺织。', habitat: ['高原牧场', '草地', '农场'], habits: ['群居', '吃草', '用姿态交流'], safeFood: ['牧草', '干草', '清水'], unsafeFood: ['高糖零食', '有毒植物', '脏水'], rest: '夜间卧下休息', disease: '寄生虫感染' },
];

const mammalLifecycleStages = ['出生幼崽', '依赖保温', '初次吮乳', '感官开启', '睁眼适应', '听觉增强', '短距离爬行', '尝试站立', '探索巢边', '乳牙萌出', '学习进食', '跟随照护者', '幼年玩耍', '动作协调', '快速长身体', '少年探索', '社交学习', '独立性增强', '亚成体换毛', '体型接近成年', '青年成年', '成年稳定', '繁殖成熟', '行为稳定', '经验丰富', '年长早期', '活动放缓', '感官变弱', '老年照护期', '老年个体'];

const birdLifecycleStages = ['蛋形成期', '蛋内胚胎', '临近破壳', '破壳雏鸟', '裸羽雏鸟', '绒羽保温', '张口索食', '羽管出现', '羽毛展开', '站立练习', '整理羽毛', '巢内观察', '拍翅练习', '跳巢边缘', '离巢练习', '短距离飞行', '幼鸟觅食', '独立飞行', '少年换羽', '亚成鸟', '年轻成鸟', '成鸟稳定', '求偶学习', '繁殖成熟', '迁飞或巡游', '年长成鸟', '羽色变淡', '活动减少', '老年成鸟', '老年照护期'];

const insectLifecycleStages = ['卵产下', '卵内发育', '卵色变化', '即将孵化', '初龄幼虫', '首次取食', '第一次蜕皮', '二龄幼虫', '快速取食', '第二次蜕皮', '三龄幼虫', '体型膨大', '末龄幼虫', '停止取食', '寻找化蛹点', '前蛹静止', '蛹壳形成', '蛹内重组', '蛹色加深', '临近羽化', '刚羽化成虫', '翅或甲壳展开', '外骨骼硬化', '年轻成虫', '主动觅食', '寻找同伴', '成熟成虫', '繁殖高峰', '年长成虫', '生命末期'];
const arthropodLifecycleStages = ['育幼袋幼体', '幼体成形', '附着母体', '准备离袋', '离开育幼袋', '初次探索', '寻找潮湿处', '啃食腐叶', '第一次蜕皮', '浅色新甲壳', '甲壳变硬', '躲在石下', '夜间觅食', '第二次蜕皮', '体节更明显', '触角探索', '学会卷球', '少年个体', '连续长大', '活动范围扩大', '亚成体', '成熟前蜕皮', '成熟个体', '稳定觅食', '分解落叶', '寻找同伴', '年长早期', '活动放缓', '年长个体', '生命末期'];

const amphibianLifecycleStages = ['卵团形成', '卵内胚胎', '胚胎摆动', '即将孵化', '初孵幼体', '外鳃明显', '水中游动', '尾部增长', '取食藻屑', '后肢芽出现', '后肢伸长', '前肢形成', '肺部发育', '尾巴缩短', '变态高峰', '离水幼体', '皮肤适陆', '幼体觅食', '少年跳跃', '湿地探索', '亚成体', '成年体型', '鸣叫或求偶', '繁殖成熟', '活动稳定', '年长早期', '行动变慢', '皮肤更敏感', '年长个体', '老年个体'];

const turtleLifecycleStages = ['卵产下', '卵内胚胎', '胚胎成形', '临近破壳', '破壳幼体', '爬向水边', '初入水体', '幼龟觅食', '背甲变硬', '躲避天敌', '幼年成长', '活动范围扩大', '少年海龟', '甲壳加厚', '游泳增强', '亚成体早期', '亚成体成长', '接近成年', '年轻成年', '觅食稳定', '迁徙学习', '成熟成年', '繁殖准备', '产卵洄游', '成年稳定', '年长早期', '甲壳磨损', '活动放缓', '年长个体', '老年个体'];
const fishLifecycleStages = ['卵产下', '卵内胚胎', '眼点出现', '临近孵化', '仔鱼孵化', '卵黄囊期', '开始游动', '初次摄食', '稚鱼阶段', '鳍条发育', '体色出现', '躲藏增强', '幼鱼早期', '幼鱼成长', '群游学习', '少年鱼', '体型拉长', '亚成鱼', '接近成年', '年轻成鱼', '觅食稳定', '领域形成', '成熟成鱼', '繁殖准备', '成年高峰', '年长成鱼', '游动放缓', '颜色变淡', '老年成鱼', '生命末期'];
const dolphinLifecycleStages = ['新生幼豚', '首次换气', '贴近母豚', '学会吃奶', '依赖照护', '浅水跟随', '听声辨位', '短距离游动', '幼年探索', '学习呼吸节奏', '跟随群体', '游戏学习', '少年期', '捕食练习', '回声定位增强', '社交学习', '亚成体', '独立巡游', '年轻成年', '合作捕食', '成年稳定', '社群分工', '繁殖成熟', '经验丰富', '长距离活动', '年长早期', '游速放缓', '社群依赖增强', '老年海豚', '老年照护期'];

function lifecycleStagesFor(seed: AnimalSeed) {
  if (seed.category === 'insect') {
    return insectLifecycleStages;
  }
  if (seed.category === 'arthropod') {
    return arthropodLifecycleStages;
  }
  if (seed.category === 'amphibian') {
    return amphibianLifecycleStages;
  }
  if (seed.category === 'flying_animal') {
    return birdLifecycleStages;
  }
  if (seed.id === 'turtle_green_sea') {
    return turtleLifecycleStages;
  }
  if (seed.id === 'clownfish') {
    return fishLifecycleStages;
  }
  if (seed.id === 'dolphin_bottlenose') {
    return dolphinLifecycleStages;
  }
  return mammalLifecycleStages;
}

function makeAgeImages(seed: AnimalSeed): AgeImage[] {
  const lifecycleStages = lifecycleStagesFor(seed);
  return lifecycleStages.map((stageName, index) => {
    const stageNumber = index + 1;
    const assets = animalAsset(seed.id, stageNumber);
    return {
      age: stageNumber,
      url: assets.url,
      thumbnailUrl: assets.thumbnailUrl,
      fallbackUrl: assets.fallbackUrl,
      title: `${seed.name} · ${stageName}`,
      description: `生命阶段 ${stageNumber}：${stageName}。展示${seed.name}从早期生命阶段到成熟、年长阶段的真实可爱风格观察图。`,
    };
  });
}

function stages(seed: AnimalSeed) {
  return lifecycleStagesFor(seed).map((stageName, index) => ({
    id: `day_${index + 1}` as GrowthStageId,
    name: stageName,
    realDurationDays: 1,
    description: buildStageDescription(seed, stageName, index),
    observableFeatures: buildStageFeatures(seed, index),
    careFocus: buildCareFocus(seed, index),
  }));
}

function buildAnimal(seed: AnimalSeed): AnimalType {
  const ageImages = makeAgeImages(seed);
  return {
    id: seed.id,
    name: seed.name,
    scientificName: seed.scientificName,
    category: seed.category,
    conservationStatus: seed.conservationStatus,
    tagline: seed.tagline,
    childFriendlySummary: seed.summary,
    habitat: seed.habitat,
    habits: seed.habits,
    safeFood: seed.safeFood.map((name) => ({ name, note: '适合在科普场景中了解，现实投喂需成年人或专业人员指导。' })),
    unsafeFood: seed.unsafeFood.map((name) => ({ name, note: '可能带来健康或生态风险，应避免。' })),
    restPattern: { pattern: seed.rest.includes('夜') || seed.rest.includes('白天') ? 'night_active' : 'mixed', dailyRestHours: seed.rest, childFriendlyNote: `${seed.name}休息时应保持安静，不要强行互动。` },
    diseases: [{ name: seed.disease, symptoms: '精神变差、食欲下降或行为异常。', advice: '请成年人联系兽医、饲养员或野生动物救助机构。' }],
    growthStages: stages(seed),
    media: {
      coverImage: ageImages[0].url,
      coverThumbnail: ageImages[0].thumbnailUrl,
      ageImages,
      ageImageNote: shortLifeCategories.has(seed.category) ? '该物种生命周期较短，图片按真实发育阶段映射，不表示按年份成长。' : undefined,
      contentRating: 'kid_safe',
      items: [
        { kind: 'image', url: ageImages[0].url, title: `${seed.name}真实观察图`, credit: 'petpet宠宠星球本地生成资产', kidSafeNote: '真实可爱风格，避免惊吓、捕猎和受伤画面' },
        { kind: 'image', url: `/assets/scenes/${seed.category}.png`, title: `${seed.name}栖息地`, credit: 'petpet宠宠星球本地生成资产', kidSafeNote: '温和自然场景' },
      ],
    },
    interactionRules: { careMode: categoryCareMode[seed.category], canFeedDirectly: categoryCareMode[seed.category] === 'hands_on', safetyNote: categorySafety[seed.category], playIdeas: ['观察行为', '整理栖息地', '完成知识问答'] },
    dressUpRules: { allowedSlots: categoryDress[seed.category] as never, safetyNote: categoryDress[seed.category].includes('collar') ? '装扮不能勒住或遮挡动物。' : '以相框、背景、栖息地物件等非接触式装扮为主。' },
  };
}

export const animals: AnimalType[] = seeds.map(buildAnimal);

export function getAnimalById(id: string) {
  return animals.find((animal) => animal.id === id);
}
