import Foundation

struct Achievement: Identifiable, Codable {
    let id: String
    let title: String
    let description: String
    let emoji: String
    var isUnlocked: Bool

    static let all: [Achievement] = [
        Achievement(id: "first_feed",    title: "初次喂食",   description: "第一次给宠物喂食",         emoji: "🍖", isUnlocked: false),
        Achievement(id: "grow_young",    title: "茁壮成长",   description: "宠物进入少年阶段",         emoji: "🌱", isUnlocked: false),
        Achievement(id: "grow_adult",    title: "成年啦！",   description: "宠物成长为成年",           emoji: "🎉", isUnlocked: false),
        Achievement(id: "full_health",   title: "健康满分",   description: "健康度保持满值超过7天",     emoji: "❤️", isUnlocked: false),
        Achievement(id: "play_10",       title: "玩耍达人",   description: "累计玩耍10次",             emoji: "⭐", isUnlocked: false),
        Achievement(id: "heal_once",     title: "小小医生",   description: "第一次给生病的宠物治疗",   emoji: "💊", isUnlocked: false),
        Achievement(id: "learn_all",     title: "博学少年",   description: "查看了所有知识卡片",       emoji: "📚", isUnlocked: false),
    ]
}
