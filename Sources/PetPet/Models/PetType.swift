import Foundation

struct Disease: Identifiable {
    let id = UUID()
    let name: String
    let symptoms: String
    let advice: String  // 家长建议
}

enum PetCategory: String {
    case domestic = "家庭宠物"
    case small    = "小型宠物"
    case insect   = "昆虫"
    case large    = "大型动物"
}

struct PetType: Identifiable {
    let id: String          // 用作图片资源名，如 "cat_orange"
    let name: String
    let emoji: String       // 真实图片缺失时的占位符
    let category: PetCategory
    let tagline: String     // 一句话介绍
    let habits: [String]
    let safeFood: [String]
    let dangerFood: [String]
    let diseases: [Disease]
    let growthDescriptions: [GrowthStage: String]
    let themeColor: String  // 选宠物卡片背景色名（Asset Color）
}

// MARK: - 静态数据

extension PetType {
    static let all: [PetType] = [
        orangeCat, shibaInu, hamster, rabbit, beetle, butterfly, woodlouse, horse, lion
    ]

    static let orangeCat = PetType(
        id: "cat_orange",
        name: "橘猫",
        emoji: "🐱",
        category: .domestic,
        tagline: "温顺粘人，爱晒太阳",
        habits: [
            "每天睡眠长达 12-16 小时",
            "用舌头梳理毛发保持清洁",
            "通过「呼噜声」表达满足感",
            "领地意识强，会用气味标记范围",
        ],
        safeFood: ["猫粮", "鸡胸肉（熟）", "三文鱼（少量）", "南瓜（少量）"],
        dangerFood: ["洋葱", "葡萄", "巧克力", "牛奶（乳糖不耐）", "生鱼（寄生虫风险）"],
        diseases: [
            Disease(name: "猫鼻支", symptoms: "流鼻涕、打喷嚏、眼分泌物增多", advice: "保持室内温暖，及时就医接种疫苗"),
            Disease(name: "泌尿结石", symptoms: "频繁上厕所、血尿、叫声痛苦", advice: "增加饮水量，立即就医"),
        ],
        growthDescriptions: [
            .baby:  "睁眼、耳朵竖起，完全依赖妈妈",
            .young: "开始探索世界，喜欢追逐玩具",
            .adult: "性格稳定，成为家庭的温暖伴侣",
        ],
        themeColor: "ThemeOrange"
    )

    static let shibaInu = PetType(
        id: "dog_shiba",
        name: "柴犬",
        emoji: "🐕",
        category: .domestic,
        tagline: "忠诚独立，表情包鼻祖",
        habits: [
            "独立性强，不会过度依赖主人",
            "清洁爱好者，极少有体味",
            "表情丰富，喜怒形于色",
            "有狩猎本能，爱追逐移动物体",
        ],
        safeFood: ["狗粮", "鸡肉（熟）", "胡萝卜", "蓝莓（少量）"],
        dangerFood: ["葡萄", "洋葱", "木糖醇（无糖食品）", "澳洲坚果", "巧克力"],
        diseases: [
            Disease(name: "过敏性皮炎", symptoms: "皮肤发红、瘙痒、掉毛", advice: "排查过敏原，就医进行皮肤测试"),
            Disease(name: "髌骨脱位", symptoms: "走路一瘸一拐，偶尔抬腿", advice: "避免剧烈跳跃，严重需手术"),
        ],
        growthDescriptions: [
            .baby:  "毛茸茸的小团子，眼睛还睁不开",
            .young: "精力旺盛，需要每天充足运动",
            .adult: "忠诚守家，独立而高冷",
        ],
        themeColor: "ThemeAmber"
    )

    static let hamster = PetType(
        id: "hamster_golden",
        name: "仓鼠",
        emoji: "🐹",
        category: .small,
        tagline: "夜行囤粮专家，脸颊自带储物袋",
        habits: [
            "夜行性动物，黄昏后最活跃",
            "腮帮子能储存相当于体重 20% 的食物",
            "每天需要在滚轮上奔跑数公里",
            "领地独占，同笼饲养容易打架",
        ],
        safeFood: ["仓鼠专用粮", "葵花籽（少量）", "西兰花", "苹果（去核）"],
        dangerFood: ["洋葱", "柑橘类水果", "糖果", "腌制食品", "杏仁"],
        diseases: [
            Disease(name: "湿尾病", symptoms: "尾部潮湿、腹泻、精神萎靡", advice: "立即隔离，就医治疗，死亡率较高需紧急处理"),
            Disease(name: "颊囊脱垂", symptoms: "口腔旁有粉色组织突出", advice: "不可自行处理，立即就医"),
        ],
        growthDescriptions: [
            .baby:  "粉色、无毛、完全无视力",
            .young: "开始长毛，学习独立进食",
            .adult: "完全自立，开始囤粮行为",
        ],
        themeColor: "ThemePink"
    )

    static let rabbit = PetType(
        id: "rabbit_holland",
        name: "荷兰兔",
        emoji: "🐰",
        category: .small,
        tagline: "垂耳软萌，安静敏感的小绅士",
        habits: [
            "通过用后腿跺地表示警觉或不满",
            "牙齿持续生长，需要不断磨牙",
            "极度敏感，突然的声音会造成应激",
            "黎明和黄昏最活跃（晨昏性动物）",
        ],
        safeFood: ["提摩西草（无限量）", "兔粮", "生菜", "香菜", "苹果（去核）"],
        dangerFood: ["十字花科蔬菜（大量）", "冰淇淋", "面包", "坚果", "土豆"],
        diseases: [
            Disease(name: "毛球症", symptoms: "食欲下降、粪便变小或停止", advice: "定期梳毛，提供充足干草，严重需就医"),
            Disease(name: "斜颈病", symptoms: "头部倾斜、失去平衡", advice: "立即就医，可能是内耳炎或脑炎"),
        ],
        growthDescriptions: [
            .baby:  "闭眼无毛，完全依赖母乳",
            .young: "耳朵开始下垂，活泼探索",
            .adult: "温和安静，喜欢被轻柔抚摸",
        ],
        themeColor: "ThemeMint"
    )

    static let beetle = PetType(
        id: "beetle_hercules",
        name: "独角仙",
        emoji: "🪲",
        category: .insect,
        tagline: "昆虫界的举重冠军",
        habits: [
            "夜行性，白天藏在腐叶下休息",
            "雄虫用头角争夺食物和配偶",
            "力气惊人，能举起自身体重 850 倍的物体",
            "完全变态发育：卵→幼虫→蛹→成虫",
        ],
        safeFood: ["昆虫果冻（专用）", "香蕉", "苹果", "菠萝（少量）"],
        dangerFood: ["农药蔬果", "腌制食品", "含防腐剂食物"],
        diseases: [
            Disease(name: "脱水", symptoms: "行动迟缓、身体干瘪", advice: "补充昆虫果冻，保持适当湿度"),
            Disease(name: "线虫感染", symptoms: "腹部有白色丝状物", advice: "隔离，更换底材，就医"),
        ],
        growthDescriptions: [
            .baby:  "白色幼虫，生活在腐殖土中，疯狂进食",
            .young: "化蛹期，在蛹室中完成变态发育",
            .adult: "破蛹而出，展现完整的角和甲壳",
        ],
        themeColor: "ThemeBrown"
    )

    static let butterfly = PetType(
        id: "butterfly_swallowtail",
        name: "凤蝶",
        emoji: "🦋",
        category: .insect,
        tagline: "经历四次蜕变的飞行诗人",
        habits: [
            "完全变态发育：卵→毛毛虫→蛹→蝴蝶",
            "通过脚上的感受器来「品尝」食物",
            "翅膀上的鳞粉具有防水功能",
            "寿命仅 2~4 周，每天都在传粉",
        ],
        safeFood: ["花蜜（成虫）", "橘子叶（幼虫寄主植物）", "糖水（成虫辅助）"],
        dangerFood: ["杀虫剂", "污染水源"],
        diseases: [
            Disease(name: "核型多角体病毒", symptoms: "幼虫变黑、行动迟缓", advice: "立即隔离病虫，清洁饲养环境"),
        ],
        growthDescriptions: [
            .baby:  "毛毛虫阶段，不停地吃橘子叶",
            .young: "结茧化蛹，在蛹中重组身体结构",
            .adult: "破蛹而出，翅膀舒展后开始飞翔",
        ],
        themeColor: "ThemeLavender"
    )

    static let woodlouse = PetType(
        id: "woodlouse_pillbug",
        name: "西瓜虫",
        emoji: "🪲",
        category: .insect,
        tagline: "会卷成小球的落叶清洁员",
        habits: [
            "西瓜虫不是昆虫，而是生活在陆地上的甲壳动物",
            "喜欢潮湿阴暗的落叶层、石头下和腐木旁",
            "受惊时会把身体卷成小球保护自己",
            "通过蜕皮长大，会把腐叶分解回土壤",
        ],
        safeFood: ["腐叶", "软木碎屑", "潮湿苔藓"],
        dangerFood: ["杀虫剂", "盐和清洁剂", "干燥高温环境"],
        diseases: [
            Disease(name: "脱水", symptoms: "身体变干、行动变慢、躲藏不动", advice: "保持潮湿落叶环境，避免阳光直晒，不要用手挤压"),
        ],
        growthDescriptions: [
            .baby:  "从妈妈腹部育幼袋中离开，身体很小，需要潮湿环境",
            .young: "开始在落叶下觅食，并通过蜕皮慢慢长大",
            .adult: "甲壳更硬，受惊会卷成小球，夜间出来活动",
        ],
        themeColor: "ThemeBrown"
    )

    static let horse = PetType(
        id: "horse_thoroughbred",
        name: "纯血马",
        emoji: "🐴",
        category: .large,
        tagline: "草原上速度与力量的象征",
        habits: [
            "每天需要 2-4 小时的运动或放牧",
            "站立睡觉（浅睡），深度睡眠时才躺下",
            "群居动物，独处会产生焦虑",
            "通过耳朵方向和尾巴姿态传递情绪",
        ],
        safeFood: ["干草（主食）", "燕麦", "胡萝卜", "苹果（少量）"],
        dangerFood: ["巧克力", "番茄", "甘蓝（大量）", "草坪草（农药污染）"],
        diseases: [
            Disease(name: "疝气（腹痛）", symptoms: "不停回头看腹部、打滚、出汗", advice: "立即联系兽医，禁止饮水，保持其走动"),
            Disease(name: "蹄叶炎", symptoms: "蹄部发热、走路跛行", advice: "减少高糖饲料，立即就医"),
        ],
        growthDescriptions: [
            .baby:  "出生后数小时内即可站立行走",
            .young: "开始训练，学习接受骑手",
            .adult: "体能达到巅峰，速度最高达 70km/h",
        ],
        themeColor: "ThemeSky"
    )

    static let lion = PetType(
        id: "lion_african",
        name: "非洲狮",
        emoji: "🦁",
        category: .large,
        tagline: "草原之王，群居的大猫",
        habits: [
            "每天睡眠长达 16-20 小时",
            "雌狮负责捕猎，雄狮守卫领地",
            "通过吼叫声（可传 8 公里）宣示领地",
            "5岁前是幼崽，完全依赖狮群",
        ],
        safeFood: ["牛肉（生）", "羚羊肉", "水（大量）"],
        dangerFood: ["加工肉类", "调味食品", "骨头（碎骨易划伤消化道）"],
        diseases: [
            Disease(name: "猫瘟（泛白细胞减少症）", symptoms: "呕吐、腹泻、精神萎靡", advice: "及时接种疫苗，出现症状立即联系专业兽医"),
            Disease(name: "牙龈炎", symptoms: "口臭、流口水、进食困难", advice: "定期进行口腔检查"),
        ],
        growthDescriptions: [
            .baby:  "出生时眼睛闭合，布满斑点（保护色）",
            .young: "开始跟随成年狮子学习狩猎技巧",
            .adult: "雄狮长出完整的棕黑色鬃毛",
        ],
        themeColor: "ThemeGold"
    )
}
