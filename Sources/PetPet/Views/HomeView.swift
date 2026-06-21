import SwiftUI

struct HomeView: View {
    @EnvironmentObject var store: PetStore
    @Environment(\.scenePhase) private var scenePhase

    @State private var petScale: CGFloat = 1.0
    @State private var petOffset: CGSize = .zero
    @State private var showFeed    = false
    @State private var showPlay    = false
    @State private var showGroom   = false
    @State private var showHealth  = false
    @State private var showLearn   = false
    @State private var showAchieve = false
    @State private var tapParticles: [TapParticle] = []

    var body: some View {
        guard let pet = store.pet,
              let petType = PetType.all.first(where: { $0.id == pet.typeID })
        else { return AnyView(EmptyView()) }

        return AnyView(
            NavigationStack {
                ScrollView {
                    VStack(spacing: 20) {
                        // Stage badge
                        HStack {
                            Text(pet.growthStage.rawValue)
                                .font(.system(.caption, design: .rounded, weight: .semibold))
                                .padding(.horizontal, 12).padding(.vertical, 5)
                                .background(Color.accentColor.opacity(0.15))
                                .foregroundStyle(Color.accentColor)
                                .clipShape(Capsule())
                            Spacer()
                        }
                        .padding(.horizontal, 20)

                        // Pet avatar area
                        ZStack {
                            RoundedRectangle(cornerRadius: 28)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.accentColor.opacity(0.12), Color.accentColor.opacity(0.04)],
                                        startPoint: .topLeading, endPoint: .bottomTrailing
                                    )
                                )
                                .frame(height: 280)

                            // Particles
                            ForEach(tapParticles) { p in
                                Text("✨")
                                    .font(.title3)
                                    .offset(p.offset)
                                    .opacity(p.opacity)
                            }

                            VStack(spacing: 12) {
                                Text(petType.emoji)
                                    .font(.system(size: 110))
                                    .scaleEffect(petScale)
                                    .offset(petOffset)
                                    .grayscale(pet.health < 0.3 ? 0.8 : 0)
                                    .onTapGesture { handleTap() }

                                // Mood bubble
                                Text(moodText(pet))
                                    .font(.system(.subheadline, design: .rounded))
                                    .padding(.horizontal, 16).padding(.vertical, 8)
                                    .background(.white.opacity(0.85))
                                    .clipShape(Capsule())
                                    .shadow(color: .black.opacity(0.06), radius: 4, x: 0, y: 2)
                            }
                        }
                        .padding(.horizontal, 20)

                        // Status bars
                        VStack(spacing: 10) {
                            HStack(spacing: 16) {
                                StatusBarView(icon: "🍖", label: "\(Int(pet.hunger * 100))%",   value: pet.hunger)
                                StatusBarView(icon: "💧", label: "\(Int(pet.thirst * 100))%",   value: pet.thirst)
                            }
                            HStack(spacing: 16) {
                                StatusBarView(icon: "⭐", label: "\(Int(pet.happiness * 100))%", value: pet.happiness)
                                StatusBarView(icon: "❤️", label: "\(Int(pet.health * 100))%",   value: pet.health)
                            }
                        }
                        .padding(.horizontal, 20)

                        // Action buttons
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ActionButton(icon: "🍖", title: "喂食",  color: .orange) { showFeed   = true }
                            ActionButton(icon: "💧", title: "喝水",  color: .blue)   { store.drink() }
                            ActionButton(icon: "🎾", title: "玩耍",  color: .green)  { showPlay   = true }
                            ActionButton(icon: "🛁", title: "清洁",  color: .teal)   { showGroom  = true }
                            ActionButton(icon: "💊", title: "看医生", color: .red,
                                         isDisabled: !pet.isSick)                   { showHealth = true }
                            ActionButton(icon: "📚", title: "百科",  color: .purple) { showLearn  = true }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 24)
                    }
                }
                .navigationTitle(pet.name)
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { showAchieve = true } label: {
                            ZStack(alignment: .topTrailing) {
                                Image(systemName: "trophy.fill")
                                if store.achievements.contains(where: { !$0.isUnlocked }) {
                                    Circle().fill(.red).frame(width: 8, height: 8).offset(x: 4, y: -4)
                                }
                            }
                        }
                    }
                }
            }
            .sheet(isPresented: $showFeed)    { FeedView() }
            .sheet(isPresented: $showPlay)    { PlayView() }
            .sheet(isPresented: $showGroom)   { GroomView() }
            .sheet(isPresented: $showHealth)  { HealthView() }
            .sheet(isPresented: $showLearn)   { LearnView() }
            .sheet(isPresented: $showAchieve) { AchievementView() }
            .sheet(item: $store.pendingEvent) { event in
                EventSheet(event: event)
            }
            .overlay {
                if let a = store.celebrateUnlock {
                    CelebrationOverlay(achievement: a) {
                        store.celebrateUnlock = nil
                    }
                }
            }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .background { store.appDidEnterBackground() }
                if newPhase == .active     { store.appWillEnterForeground(); store.checkGrowthAchievements() }
            }
        )
    }

    // MARK: - Helpers

    private func handleTap() {
        store.play()
        // bounce animation
        withAnimation(.spring(response: 0.2, dampingFraction: 0.4)) { petScale = 1.25 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) { petScale = 1.0 }
        }
        // add particle
        let p = TapParticle(
            offset: CGSize(width: CGFloat.random(in: -60...60), height: CGFloat.random(in: -80...(-20))),
            opacity: 1.0
        )
        tapParticles.append(p)
        withAnimation(.easeOut(duration: 0.8)) {
            if let idx = tapParticles.indices.last {
                tapParticles[idx].opacity = 0
                tapParticles[idx].offset.height -= 40
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
            tapParticles.removeFirst()
        }
    }

    private func moodText(_ pet: Pet) -> String {
        if pet.isSick           { return "😰 我好像生病了..." }
        if pet.hunger < 0.2     { return "😿 我好饿呀，快喂我！" }
        if pet.thirst < 0.2     { return "😮‍💨 渴了，需要喝水～" }
        if pet.happiness < 0.2  { return "😔 有点无聊，陪我玩？" }
        if pet.happiness > 0.85 { return "😄 今天超级开心！" }
        return "😊 状态不错～"
    }
}

struct TapParticle: Identifiable {
    let id = UUID()
    var offset: CGSize
    var opacity: Double
}

// MARK: - Event Sheet

struct EventSheet: View {
    @EnvironmentObject var store: PetStore
    let event: RandomEvent

    var body: some View {
        VStack(spacing: 24) {
            Text("🎲").font(.system(size: 60))
            Text(event.title)
                .font(.system(.title2, design: .rounded, weight: .bold))
            Text(event.description)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("好的！") { store.applyEvent(event) }
                .font(.system(.headline, design: .rounded))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.accentColor)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, 32)
        }
        .padding(.top, 40)
        .presentationDetents([.medium])
    }
}
