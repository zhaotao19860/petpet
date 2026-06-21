import Foundation

struct Pet: Codable, Identifiable {
    let id: UUID
    var typeID: String
    var name: String
    var birthday: Date
    var hunger: Double       // 0.0–1.0
    var thirst: Double
    var happiness: Double
    var health: Double
    var isSick: Bool
    var speedMultiplier: Double  // 1 = 实时，10 = 10倍速

    var growthStage: GrowthStage {
        GrowthStage.current(birthday: birthday, speedMultiplier: speedMultiplier)
    }

    init(typeID: String, name: String, speedMultiplier: Double = 10) {
        self.id = UUID()
        self.typeID = typeID
        self.name = name
        self.birthday = Date()
        self.hunger = 0.8
        self.thirst = 0.8
        self.happiness = 0.9
        self.health = 1.0
        self.isSick = false
        self.speedMultiplier = speedMultiplier
    }
}
