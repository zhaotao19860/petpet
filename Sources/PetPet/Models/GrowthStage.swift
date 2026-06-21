import Foundation

enum GrowthStage: String, Codable, CaseIterable {
    case baby  = "幼崽"
    case young = "少年"
    case adult = "成年"

    /// 真实天数阈值（不含加速）
    var realDaysThreshold: Double {
        switch self {
        case .baby:  return 0
        case .young: return 7
        case .adult: return 30
        }
    }

    var description: String {
        switch self {
        case .baby:  return "刚出生，需要最细心的照料"
        case .young: return "活泼好动，充满好奇心"
        case .adult: return "成熟稳重，习性完全确立"
        }
    }

    /// 根据出生时间 + 加速倍率计算当前阶段
    static func current(birthday: Date, speedMultiplier: Double) -> GrowthStage {
        let realSeconds = Date().timeIntervalSince(birthday)
        let acceleratedDays = realSeconds / 86400 * speedMultiplier
        if acceleratedDays >= GrowthStage.adult.realDaysThreshold { return .adult }
        if acceleratedDays >= GrowthStage.young.realDaysThreshold { return .young }
        return .baby
    }
}
