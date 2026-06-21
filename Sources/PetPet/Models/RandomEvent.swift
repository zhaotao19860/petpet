import Foundation

struct RandomEvent: Identifiable {
    let id = UUID()
    let title: String
    let description: String
    let hungerDelta: Double
    let thirstDelta: Double
    let happinessDelta: Double
    let healthDelta: Double

    static let pool: [RandomEvent] = [
        RandomEvent(title: "发现新玩具！",    description: "宠物找到了一个有趣的东西，玩得很开心！", hungerDelta: 0, thirstDelta: -0.05, happinessDelta: 0.15, healthDelta: 0),
        RandomEvent(title: "天气真好！",      description: "阳光明媚，宠物心情特别好！",             hungerDelta: -0.05, thirstDelta: -0.1, happinessDelta: 0.2, healthDelta: 0.05),
        RandomEvent(title: "肚子有点饿...",   description: "宠物好像更饿了，快去喂食吧！",           hungerDelta: -0.15, thirstDelta: 0, happinessDelta: -0.05, healthDelta: 0),
        RandomEvent(title: "感觉有点累...",   description: "宠物打了个大大的哈欠，需要休息一下。",   hungerDelta: 0, thirstDelta: 0, happinessDelta: -0.1, healthDelta: 0.05),
        RandomEvent(title: "发现了好吃的！",  description: "宠物自己找到了一点零食，好满足！",       hungerDelta: 0.1, thirstDelta: 0, happinessDelta: 0.1, healthDelta: 0),
    ]

    static func random() -> RandomEvent? {
        guard Double.random(in: 0...1) < 0.15 else { return nil }
        return pool.randomElement()
    }
}
