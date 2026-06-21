import SwiftUI

// MARK: - Achievement List

struct AchievementView: View {
    @EnvironmentObject var store: PetStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(store.achievements) { a in
                        AchievementCard(achievement: a)
                    }
                }
                .padding(20)
            }
            .navigationTitle("成就")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } }
            }
        }
    }
}

private struct AchievementCard: View {
    let achievement: Achievement

    var body: some View {
        VStack(spacing: 10) {
            Text(achievement.emoji)
                .font(.system(size: 40))
                .grayscale(achievement.isUnlocked ? 0 : 1)
                .opacity(achievement.isUnlocked ? 1 : 0.4)

            Text(achievement.title)
                .font(.system(.subheadline, design: .rounded, weight: .semibold))
                .multilineTextAlignment(.center)

            Text(achievement.description)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(achievement.isUnlocked ? Color.accentColor.opacity(0.1) : Color.secondary.opacity(0.07))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay {
            if achievement.isUnlocked {
                RoundedRectangle(cornerRadius: 18)
                    .strokeBorder(Color.accentColor.opacity(0.35), lineWidth: 1.5)
            }
        }
    }
}

// MARK: - Celebration Overlay

struct CelebrationOverlay: View {
    let achievement: Achievement
    let onDismiss: () -> Void

    @State private var particles: [ConfettiParticle] = ConfettiParticle.generate(count: 40)
    @State private var show = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.35).ignoresSafeArea()
                .onTapGesture { onDismiss() }

            // Confetti
            TimelineView(.animation) { timeline in
                Canvas { ctx, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    for p in particles {
                        let x = p.x * size.width
                        let y = (p.startY + p.speed * CGFloat(t - p.birth)) .truncatingRemainder(dividingBy: size.height + 40)
                        let rect = CGRect(x: x - 5, y: y - 5, width: 10, height: 10)
                        ctx.fill(Path(ellipseIn: rect), with: .color(p.color))
                    }
                }
            }
            .ignoresSafeArea()
            .allowsHitTesting(false)

            // Card
            VStack(spacing: 16) {
                Text(achievement.emoji).font(.system(size: 72))
                Text("解锁成就！").font(.system(.title2, design: .rounded, weight: .bold))
                Text(achievement.title).font(.system(.title3, design: .rounded, weight: .semibold))
                Text(achievement.description).foregroundStyle(.secondary).font(.subheadline)
                Button("太棒了！") { onDismiss() }
                    .font(.system(.headline, design: .rounded))
                    .frame(width: 180).padding(.vertical, 14)
                    .background(Color.accentColor).foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(32)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .shadow(color: .black.opacity(0.15), radius: 20, x: 0, y: 8)
            .padding(.horizontal, 32)
            .scaleEffect(show ? 1 : 0.5)
            .opacity(show ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) { show = true }
        }
    }
}

struct ConfettiParticle {
    let x: CGFloat
    let startY: CGFloat
    let speed: CGFloat
    let color: Color
    let birth: TimeInterval

    static func generate(count: Int) -> [ConfettiParticle] {
        let colors: [Color] = [.red, .orange, .yellow, .green, .blue, .purple, .pink]
        let now = Date.timeIntervalSinceReferenceDate
        return (0..<count).map { _ in
            ConfettiParticle(
                x:      CGFloat.random(in: 0...1),
                startY: CGFloat.random(in: -200...0),
                speed:  CGFloat.random(in: 100...220),
                color:  colors.randomElement()!,
                birth:  now
            )
        }
    }
}
