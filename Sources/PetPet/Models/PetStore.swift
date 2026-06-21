import SwiftUI
import Combine

class PetStore: ObservableObject {
    @Published var pet: Pet?
    @Published var achievements: [Achievement] = Achievement.all
    @Published var pendingEvent: RandomEvent?
    @Published var playCount: Int = 0
    @Published var celebrateUnlock: Achievement?

    private var timer: Timer?
    private var backgroundDate: Date?

    // MARK: - Persistence keys
    private let petKey         = "petpet.pet"
    private let achievementKey = "petpet.achievements"
    private let playCountKey   = "petpet.playCount"

    init() {
        loadPet()
        loadAchievements()
        playCount = UserDefaults.standard.integer(forKey: playCountKey)
        startDecayTimer()
    }

    // MARK: - Timer

    func startDecayTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    private func tick() {
        guard pet != nil else { return }
        withAnimation(.easeInOut(duration: 0.3)) {
            applyDecay(minutes: 1)
        }
        if let event = RandomEvent.random() {
            pendingEvent = event
        }
        savePet()
    }

    private func applyDecay(minutes: Double) {
        guard var p = pet else { return }
        p.hunger    = max(0, p.hunger    - 0.02 * minutes)
        p.thirst    = max(0, p.thirst    - 0.03 * minutes)
        p.happiness = max(0, p.happiness - 0.01 * minutes)
        if p.hunger < 0.2 || p.thirst < 0.2 {
            p.health = max(0, p.health - 0.01 * minutes)
        }
        p.isSick = p.health < 0.3
        pet = p
    }

    // MARK: - Background / Foreground

    func appDidEnterBackground() {
        backgroundDate = Date()
    }

    func appWillEnterForeground() {
        guard let bg = backgroundDate else { return }
        let elapsed = Date().timeIntervalSince(bg) / 60  // minutes
        withAnimation {
            applyDecay(minutes: elapsed)
        }
        backgroundDate = nil
        savePet()
    }

    // MARK: - Care Actions

    func feed(food: String) {
        guard var p = pet else { return }
        p.hunger = min(1.0, p.hunger + 0.35)
        p.happiness = min(1.0, p.happiness + 0.05)
        pet = p
        unlock("first_feed")
        savePet()
    }

    func drink() {
        guard var p = pet else { return }
        p.thirst = min(1.0, p.thirst + 0.4)
        pet = p
        savePet()
    }

    func play() {
        guard var p = pet else { return }
        p.happiness = min(1.0, p.happiness + 0.2)
        p.hunger    = max(0, p.hunger - 0.05)
        pet = p
        playCount += 1
        UserDefaults.standard.set(playCount, forKey: playCountKey)
        if playCount >= 10 { unlock("play_10") }
        savePet()
    }

    func groom() {
        guard var p = pet else { return }
        p.happiness = min(1.0, p.happiness + 0.1)
        p.health    = min(1.0, p.health + 0.05)
        pet = p
        savePet()
    }

    func heal() {
        guard var p = pet, p.isSick else { return }
        p.health    = min(1.0, p.health + 0.4)
        p.isSick    = p.health < 0.3
        pet = p
        unlock("heal_once")
        savePet()
    }

    func applyEvent(_ event: RandomEvent) {
        guard var p = pet else { return }
        p.hunger    = min(1.0, max(0, p.hunger    + event.hungerDelta))
        p.thirst    = min(1.0, max(0, p.thirst    + event.thirstDelta))
        p.happiness = min(1.0, max(0, p.happiness + event.happinessDelta))
        p.health    = min(1.0, max(0, p.health    + event.healthDelta))
        p.isSick    = p.health < 0.3
        pet = p
        pendingEvent = nil
        savePet()
    }

    // MARK: - Achievement

    func checkGrowthAchievements() {
        guard let p = pet else { return }
        switch p.growthStage {
        case .young: unlock("grow_young")
        case .adult: unlock("grow_adult")
        case .baby:  break
        }
    }

    func unlock(_ id: String) {
        guard let idx = achievements.firstIndex(where: { $0.id == id }),
              !achievements[idx].isUnlocked else { return }
        achievements[idx].isUnlocked = true
        celebrateUnlock = achievements[idx]
        saveAchievements()
    }

    // MARK: - Persistence

    func adoptPet(_ p: Pet) {
        pet = p
        savePet()
        startDecayTimer()
    }

    private func savePet() {
        guard let p = pet,
              let data = try? JSONEncoder().encode(p) else { return }
        UserDefaults.standard.set(data, forKey: petKey)
    }

    private func loadPet() {
        guard let data = UserDefaults.standard.data(forKey: petKey),
              let p = try? JSONDecoder().decode(Pet.self, from: data) else { return }
        pet = p
    }

    private func saveAchievements() {
        guard let data = try? JSONEncoder().encode(achievements) else { return }
        UserDefaults.standard.set(data, forKey: achievementKey)
    }

    private func loadAchievements() {
        guard let data = UserDefaults.standard.data(forKey: achievementKey),
              let list = try? JSONDecoder().decode([Achievement].self, from: data) else { return }
        achievements = list
    }
}
