import type { StarBuddyAnimalContext } from './ai/types.js';

const sharedSafety = '现实中接触动物要先征得成年人同意，遇到野生动物要保持安全距离。';

const facts = [
  { id: 'cat_orange', name: '橘猫', category: 'domestic_pet', summary: '橘猫是常见家庭宠物，喜欢安静、安全和规律照护。', habitat: ['家庭室内', '安全阳台', '温暖休息角'], habits: ['每天睡眠 12-16 小时', '用舌头梳理毛发', '通过呼噜声表达放松'], safeFood: ['猫粮', '熟鸡胸肉', '清水'], unsafeFood: ['巧克力', '洋葱', '葡萄'], rest: '12-16 小时', safetyNote: '现实中摸猫前要先问大人和主人，也要尊重猫咪休息。' },
  { id: 'dog_shiba', name: '柴犬', category: 'domestic_pet', summary: '柴犬性格独立，喜欢散步和清晰的生活规则。', habitat: ['家庭', '公园步道', '安全院落'], habits: ['爱清洁', '需要散步', '通过尾巴和耳朵表达情绪'], safeFood: ['狗粮', '熟鸡肉', '胡萝卜'], unsafeFood: ['巧克力', '葡萄', '洋葱'], rest: '12-14 小时', safetyNote: '现实中接近狗狗要先问主人和大人，不要突然拥抱陌生狗。' },
  { id: 'rabbit_holland', name: '荷兰兔', category: 'domestic_pet', summary: '兔子需要干草、安静环境和温柔接触。', habitat: ['室内兔舍', '安静角落', '草垫区域'], habits: ['牙齿持续生长', '黄昏活跃', '受惊会跺脚'], safeFood: ['提摩西草', '兔粮', '少量生菜'], unsafeFood: ['巧克力', '面包', '大量坚果'], rest: '8-12 小时', safetyNote: '兔子身体脆弱，现实抱兔子要有成年人帮助。' },
  { id: 'hamster_golden', name: '金丝熊仓鼠', category: 'small_mammal', summary: '仓鼠体型小，喜欢夜间活动和安全的躲藏空间。', habitat: ['仓鼠笼', '木屑底材', '跑轮'], habits: ['夜行', '腮囊储存食物', '喜欢打洞'], safeFood: ['仓鼠粮', '少量葵花籽', '西兰花'], unsafeFood: ['糖果', '洋葱', '柑橘'], rest: '白天多休息', safetyNote: '仓鼠身体很小，现实互动要轻柔，并让成年人帮忙。' },
  { id: 'guinea_pig', name: '豚鼠', category: 'small_mammal', summary: '豚鼠需要维生素 C、干草和同伴陪伴。', habitat: ['宽敞围栏', '干草区', '安静室内'], habits: ['群居', '用叫声交流', '持续啃咬磨牙'], safeFood: ['干草', '豚鼠粮', '甜椒'], unsafeFood: ['巧克力', '洋葱', '冰山生菜过量'], rest: '短睡多次', safetyNote: '豚鼠胆子小，现实抱起和喂食要先问大人。' },
  { id: 'hedgehog_african', name: '非洲迷你刺猬', category: 'small_mammal', summary: '刺猬夜间活动，需要温暖环境和安静观察。', habitat: ['恒温饲养箱', '躲藏屋', '跑轮'], habits: ['夜行', '受惊会蜷缩', '嗅觉灵敏'], safeFood: ['刺猬粮', '昆虫', '少量熟肉'], unsafeFood: ['牛奶', '葡萄', '高盐食物'], rest: '白天多休息', safetyNote: '刺猬受惊会蜷缩，现实接触需要成年人陪同。' },
  { id: 'butterfly_swallowtail', name: '凤蝶', category: 'insect', summary: '凤蝶经历卵、幼虫、蛹、成虫的完全变态。', habitat: ['花园', '林缘', '寄主植物'], habits: ['吸食花蜜', '幼虫吃叶', '白天活动'], safeFood: ['花蜜', '寄主植物叶片', '糖水辅助'], unsafeFood: ['杀虫剂', '污染水源', '破损叶片'], rest: '夜间停栖', safetyNote: '蝴蝶翅膀脆弱，适合远远观察，不要用手抓。' },
  { id: 'beetle_hercules', name: '独角仙', category: 'insect', summary: '独角仙幼虫生活在腐殖土中，成虫喜欢树液和水果。', habitat: ['腐殖土', '朽木', '树林'], habits: ['夜行', '完全变态', '雄虫有角'], safeFood: ['昆虫果冻', '香蕉', '苹果'], unsafeFood: ['农药水果', '含盐食物', '干燥环境'], rest: '白天躲藏', safetyNote: '观察甲虫时不要挤压身体，也不要破坏栖息地。' },
  { id: 'bee_honey', name: '蜜蜂', category: 'insect', summary: '蜜蜂帮助植物传粉，群体分工明确。', habitat: ['蜂巢', '花田', '果园'], habits: ['采蜜', '跳舞传递信息', '群体合作'], safeFood: ['花蜜', '花粉', '清水'], unsafeFood: ['杀虫剂', '污染花源', '烟雾惊扰'], rest: '夜间减少活动', safetyNote: '现实中不要拍打或靠近蜂巢，观察蜜蜂要保持距离。' },
  { id: 'woodlouse_pillbug', name: '西瓜虫', category: 'arthropod', summary: '西瓜虫是会卷成小球的陆生甲壳动物，喜欢潮湿阴暗的落叶层。', habitat: ['潮湿落叶层', '石头下方', '腐木旁边'], habits: ['受惊会卷成小球', '夜间出来觅食', '通过蜕皮长大'], safeFood: ['腐叶', '软木碎屑', '潮湿苔藓'], unsafeFood: ['干燥高温', '杀虫剂', '盐和清洁剂'], rest: '白天躲在潮湿阴影里', safetyNote: '西瓜虫适合安静观察，不要挤压身体，也不要把它带离潮湿的家。' },
  { id: 'horse_thoroughbred', name: '纯血马', category: 'large_animal', summary: '马是大型草食动物，群居、敏感，需要足够空间。', habitat: ['草场', '马厩', '牧场'], habits: ['需要走动', '站立浅睡', '耳朵表达情绪'], safeFood: ['干草', '燕麦', '胡萝卜'], unsafeFood: ['巧克力', '发霉草料', '大量高糖饲料'], rest: '3-5 小时深浅睡组合', safetyNote: '现实接近马要有专业人员或成年人陪同，不能站在马后方。' },
  { id: 'elephant_asian', name: '亚洲象', category: 'large_animal', summary: '亚洲象记忆力强，群居，需要广阔森林和水源。', habitat: ['热带森林', '草地', '河边'], habits: ['群居', '用鼻子取食', '喜欢洗澡'], safeFood: ['草', '树叶', '水果'], unsafeFood: ['塑料垃圾', '投喂零食', '污染水源'], rest: '约 4 小时', safetyNote: '亚洲象是大型动物，现实中只能在安全区域远距离观察。' },
  { id: 'giraffe_reticulated', name: '长颈鹿', category: 'large_animal', summary: '长颈鹿用长脖子取食高处树叶，生活在非洲草原。', habitat: ['稀树草原', '开放林地', '灌木地'], habits: ['吃高处叶片', '站立休息', '视野开阔'], safeFood: ['金合欢叶', '嫩枝', '清水'], unsafeFood: ['人类零食', '塑料', '污染植物'], rest: '短时多次休息', safetyNote: '长颈鹿很高大，现实中要遵守场馆规则远距离观察。' },
  { id: 'lion_african', name: '非洲狮', category: 'wildlife', summary: '狮子是野生动物，只适合远距离观察和保护学习。', habitat: ['稀树草原', '开放林地', '保护区'], habits: ['群居', '长时间休息', '吼声很远'], safeFood: ['自然猎物', '专业饲养肉类', '清水'], unsafeFood: ['人类零食', '投喂行为', '加工食品'], rest: '16-20 小时', safetyNote: '狮子不适合接触或投喂，现实中必须隔着安全距离观察。' },
  { id: 'panda_giant', name: '大熊猫', category: 'wildlife', summary: '大熊猫主要吃竹子，需要山地森林栖息地。', habitat: ['山地竹林', '森林', '保护区'], habits: ['吃竹子', '独居', '善于攀爬'], safeFood: ['竹子', '竹笋', '清水'], unsafeFood: ['人类零食', '污染竹林', '惊扰接触'], rest: '10 小时以上', safetyNote: '大熊猫需要专业保护，现实中只能按场馆规则安静观察。' },
  { id: 'fox_arctic', name: '北极狐', category: 'wildlife', summary: '北极狐适应寒冷环境，冬夏毛色会变化。', habitat: ['苔原', '雪地', '海岸'], habits: ['换毛', '挖洞', '嗅觉灵敏'], safeFood: ['自然小动物', '浆果', '清水'], unsafeFood: ['投喂零食', '塑料垃圾', '污染猎物'], rest: '洞穴中休息', safetyNote: '北极狐是野生动物，要远距离观察，不要追赶或投喂。' },
  { id: 'owl_barn', name: '仓鸮', category: 'flying_animal', summary: '仓鸮依靠灵敏听觉在夜晚寻找食物。', habitat: ['农田边缘', '谷仓', '林地'], habits: ['夜行', '静音飞行', '高处停栖'], safeFood: ['自然小型啮齿动物', '清洁水源', '安全巢箱'], unsafeFood: ['含鼠药猎物', '人类食物', '强光惊扰'], rest: '白天多休息', safetyNote: '不要打扰鸟巢和白天休息的仓鸮，受伤鸟类要请专业救助。' },
  { id: 'parrot_macaw', name: '金刚鹦鹉', category: 'flying_animal', summary: '金刚鹦鹉聪明、社会性强，需要森林和同伴。', habitat: ['热带雨林', '树冠层', '河边森林'], habits: ['群居', '会模仿声音', '强力喙啃坚果'], safeFood: ['坚果', '水果', '种子'], unsafeFood: ['巧克力', '牛油果', '高盐食物'], rest: '夜间栖息', safetyNote: '现实接触鹦鹉要先问主人和大人，不要拉羽毛或吓它。' },
  { id: 'swift_common', name: '雨燕', category: 'flying_animal', summary: '雨燕擅长长时间飞行，捕食空中小昆虫。', habitat: ['城市屋檐', '悬崖', '空旷天空'], habits: ['高速飞行', '空中取食', '迁徙'], safeFood: ['飞行昆虫', '自然水汽', '安全巢位'], unsafeFood: ['封堵巢穴', '农药昆虫', '玻璃撞击'], rest: '飞行中短暂休息', safetyNote: '不要封堵雨燕巢位，发现幼鸟坠落要请成年人联系救助。' },
  { id: 'tree_frog', name: '树蛙', category: 'amphibian', summary: '树蛙皮肤湿润，对污染敏感，依赖湿地。', habitat: ['湿润森林', '池塘边', '溪流附近'], habits: ['夜间鸣叫', '皮肤帮助呼吸', '趾垫攀爬'], safeFood: ['小昆虫', '洁净水体', '湿润植物'], unsafeFood: ['含氯水', '农药昆虫', '干燥环境'], rest: '白天躲藏', safetyNote: '两栖动物皮肤敏感，现实中不要徒手抓握。' },
  { id: 'salamander_fire', name: '火蝾螈', category: 'amphibian', summary: '火蝾螈喜欢潮湿森林，鲜艳颜色提醒天敌保持距离。', habitat: ['潮湿森林', '落叶层', '溪流边'], habits: ['夜行', '皮肤湿润', '躲在落叶下'], safeFood: ['小昆虫', '蚯蚓', '湿润环境'], unsafeFood: ['干燥高温', '污染水源', '徒手抓握'], rest: '白天躲藏', safetyNote: '火蝾螈适合远远观察，不要徒手抓握或带离湿润环境。' },
  { id: 'toad_chinese', name: '中华大蟾蜍', category: 'amphibian', summary: '蟾蜍常在夜间捕食昆虫，是农田生态的一部分。', habitat: ['农田', '池塘边', '湿草地'], habits: ['夜行', '跳跃较慢', '捕食害虫'], safeFood: ['昆虫', '清洁水源', '湿草地'], unsafeFood: ['农药', '车辆道路', '干燥环境'], rest: '白天隐蔽', safetyNote: '蟾蜍适合观察，不要徒手抓握，观察后要洗手。' },
  { id: 'tortoise_russian', name: '陆龟', category: 'reptile', summary: '陆龟需要稳定温度、晒背和高纤维植物。', habitat: ['草地', '干燥灌丛', '温暖饲养区'], habits: ['晒背', '慢速行走', '吃植物'], safeFood: ['牧草', '蒲公英叶', '清水'], unsafeFood: ['高糖水果过量', '冰冷环境', '加工食品'], rest: '夜间休息', safetyNote: '陆龟需要合适温度和空间，现实照护要请成年人指导。' },
  { id: 'gecko_leopard', name: '豹纹守宫', category: 'reptile', summary: '豹纹守宫夜间活动，需要合适温度和躲藏处。', habitat: ['干燥岩地', '躲藏洞', '温控环境'], habits: ['夜行', '尾巴储存能量', '蜕皮'], safeFood: ['蟋蟀', '面包虫', '钙粉'], unsafeFood: ['过冷环境', '大块食物', '脏底材'], rest: '白天躲藏', safetyNote: '守宫身体小，现实接触要轻柔并由成年人陪同。' },
  { id: 'chameleon_veiled', name: '变色龙', category: 'reptile', summary: '变色龙用颜色表达状态，需要树枝、湿度和空间。', habitat: ['树冠', '灌木', '温暖环境'], habits: ['变色', '长舌捕虫', '眼睛独立转动'], safeFood: ['昆虫', '洁净水滴', '树枝环境'], unsafeFood: ['频繁抓握', '低湿度', '不合适温度'], rest: '夜间停栖', safetyNote: '变色龙不适合频繁抓握，现实照护需要专业环境。' },
  { id: 'clownfish', name: '小丑鱼', category: 'aquatic', summary: '小丑鱼与海葵关系密切，依赖稳定海水环境。', habitat: ['珊瑚礁', '海葵', '温暖海水'], habits: ['与海葵共生', '群体等级', '游动范围小'], safeFood: ['浮游生物', '小型甲壳类', '专业鱼粮'], unsafeFood: ['污染海水', '过量投喂', '触碰海葵'], rest: '夜间减缓活动', safetyNote: '水生动物需要稳定水质，不要随意触碰或过量投喂。' },
  { id: 'turtle_green_sea', name: '绿海龟', category: 'aquatic', summary: '绿海龟在海中生活，会上岸产卵，需要保护海滩。', habitat: ['海洋', '海草床', '沙滩'], habits: ['长距离迁徙', '吃海草', '上岸产卵'], safeFood: ['海草', '藻类', '洁净海水'], unsafeFood: ['塑料袋', '渔网', '灯光干扰'], rest: '水下或礁石边休息', safetyNote: '海龟是受保护动物，现实中不要触摸、追逐或干扰产卵。' },
  { id: 'dolphin_bottlenose', name: '宽吻海豚', category: 'aquatic', summary: '海豚群居、会发声交流，需要广阔海域。', habitat: ['近海', '海湾', '温暖海域'], habits: ['回声定位', '群体合作', '跳跃换气'], safeFood: ['鱼类', '乌贼', '洁净海水'], unsafeFood: ['塑料垃圾', '噪声污染', '追逐骚扰'], rest: '半脑睡眠', safetyNote: '现实中不要追逐、投喂或骚扰海豚，要保护海洋环境。' },
  { id: 'chicken_hen', name: '母鸡', category: 'farm_animal', summary: '鸡会刨土找食，需要干净鸡舍和活动空间。', habitat: ['鸡舍', '农场院落', '草地'], habits: ['刨土', '群体等级', '白天活动'], safeFood: ['谷物', '青菜', '昆虫'], unsafeFood: ['发霉饲料', '巧克力', '高盐剩菜'], rest: '夜间栖架休息', safetyNote: '农场动物也需要温柔对待，喂食前要问成年人。' },
  { id: 'goat_dwarf', name: '侏儒山羊', category: 'farm_animal', summary: '山羊好奇活泼，喜欢攀爬和啃食植物。', habitat: ['牧场', '农场', '岩石坡地'], habits: ['攀爬', '反刍', '群居'], safeFood: ['干草', '灌木叶', '清水'], unsafeFood: ['有毒植物', '发霉草料', '塑料'], rest: '夜间休息', safetyNote: '现实接近山羊要有成年人陪同，不要乱喂植物。' },
  { id: 'alpaca', name: '羊驼', category: 'farm_animal', summary: '羊驼性格较温和，群居，毛发可用于纺织。', habitat: ['高原牧场', '草地', '农场'], habits: ['群居', '吃草', '用姿态交流'], safeFood: ['牧草', '干草', '清水'], unsafeFood: ['高糖零食', '有毒植物', '脏水'], rest: '夜间卧下休息', safetyNote: '现实接触羊驼要听工作人员和成年人安排，不要突然靠近。' },
];

export const starBuddyAnimals: Record<string, StarBuddyAnimalContext> = Object.fromEntries(
  facts.map((fact) => [fact.id, fact]),
) as Record<string, StarBuddyAnimalContext>;

starBuddyAnimals.rabbit_holland_lop = { ...starBuddyAnimals.rabbit_holland, id: 'rabbit_holland_lop' };

const fallbackByCategory: Record<string, Omit<StarBuddyAnimalContext, 'id' | 'name'>> = {
  domestic_pet: {
    category: 'domestic_pet',
    summary: '这是需要温柔照顾的家庭动物伙伴。',
    habitat: ['安全室内', '安静休息处'],
    habits: ['喜欢规律照护', '需要干净水源'],
    safeFood: ['合适主粮', '清水'],
    unsafeFood: ['巧克力', '人类零食'],
    rest: '需要充足休息',
    safetyNote: sharedSafety,
  },
  wildlife: {
    category: 'wildlife',
    summary: '这是适合远距离观察和保护学习的野生动物。',
    habitat: ['自然栖息地', '保护区'],
    habits: ['依赖自然环境', '需要安全距离'],
    safeFood: ['自然食物', '洁净水源'],
    unsafeFood: ['人类零食', '塑料垃圾'],
    rest: '按自然节律休息',
    safetyNote: '野生动物不适合触摸或投喂，要远距离观察。',
  },
  default: {
    category: 'animal',
    summary: '这是宠宠星球里的真实动物伙伴。',
    habitat: ['合适栖息地', '安全空间'],
    habits: ['需要观察', '需要尊重'],
    safeFood: ['合适食物', '清水'],
    unsafeFood: ['人类零食', '污染食物'],
    rest: '需要安静休息',
    safetyNote: sharedSafety,
  },
};

const categoryById = new Map(facts.map((fact) => [fact.id, fact.category]));
categoryById.set('rabbit_holland_lop', 'domestic_pet');

export function getStarBuddyAnimal(animalId: string): StarBuddyAnimalContext {
  const exact = starBuddyAnimals[animalId];
  if (exact) return exact;
  const category = categoryById.get(animalId) ?? 'default';
  const fallback = fallbackByCategory[category] ?? fallbackByCategory.default;
  return {
    id: animalId,
    name: '动物伙伴',
    ...fallback,
  };
}
