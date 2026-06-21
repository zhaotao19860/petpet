import SwiftUI

// MARK: - FeedView

struct FeedView: View {
    @EnvironmentObject var store: PetStore
    @Environment(\.dismiss) private var dismiss
    @State private var fedFood: String?

    var petType: PetType? {
        guard let id = store.pet?.typeID else { return nil }
        return PetType.all.first { $0.id == id }
    }

    var body: some View {
        NavigationStack {
            List {
                if let type = petType {
                    Section("可以吃 ✅") {
                        ForEach(type.safeFood, id: \.self) { food in
                            Button {
                                store.feed(food: food)
                                fedFood = food
                                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { dismiss() }
                            } label: {
                                HStack {
                                    Text(food)
                                    Spacer()
                                    if fedFood == food {
                                        Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                                    }
                                }
                            }
                            .foregroundStyle(.primary)
                        }
                    }
                    Section("危险食物 ⚠️") {
                        ForEach(type.dangerFood, id: \.self) { food in
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)
                                Text(food).foregroundStyle(.red)
                            }
                        }
                    }
                }
            }
            .navigationTitle("喂食")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } }
            }
        }
    }
}

// MARK: - PlayView

struct PlayView: View {
    @EnvironmentObject var store: PetStore
    @Environment(\.dismiss) private var dismiss

    @State private var toys: [Toy] = []
    @State private var score = 0
    @State private var timeLeft = 10
    @State private var timer: Timer?

    var body: some View {
        ZStack {
            Color(red: 0.95, green: 0.97, blue: 1.0).ignoresSafeArea()

            ForEach(toys) { toy in
                Text(toy.icon)
                    .font(.system(size: 44))
                    .position(toy.position)
                    .onTapGesture {
                        toys.removeAll { $0.id == toy.id }
                        score += 1
                        store.play()
                        spawnToy()
                    }
            }

            VStack {
                HStack {
                    Text("分数: \(score)").font(.system(.headline, design: .rounded))
                    Spacer()
                    Text("剩余: \(timeLeft)s").font(.system(.headline, design: .rounded)).foregroundStyle(.secondary)
                }
                .padding(20)
                Spacer()
                if timeLeft == 0 {
                    VStack(spacing: 16) {
                        Text("太棒了！").font(.system(.title, design: .rounded, weight: .bold))
                        Text("点了 \(score) 次，\(store.pet?.name ?? "宠物") 超开心！")
                            .foregroundStyle(.secondary)
                        Button("完成") { dismiss() }
                            .font(.system(.headline, design: .rounded))
                            .frame(width: 160).padding(.vertical, 14)
                            .background(Color.accentColor).foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.bottom, 60)
                }
            }
        }
        .onAppear { startGame() }
        .onDisappear { timer?.invalidate() }
    }

    private func startGame() {
        for _ in 0..<3 { spawnToy() }
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if timeLeft > 0 { timeLeft -= 1 } else { timer?.invalidate(); toys = [] }
        }
    }

    private func spawnToy() {
        let icons = ["🎾", "🪀", "🪁", "🐭", "🎈"]
        let toy = Toy(
            icon: icons.randomElement()!,
            position: CGPoint(
                x: CGFloat.random(in: 60...320),
                y: CGFloat.random(in: 120...600)
            )
        )
        toys.append(toy)
    }
}

private struct Toy: Identifiable {
    let id = UUID()
    let icon: String
    let position: CGPoint
}

// MARK: - GroomView

struct GroomView: View {
    @EnvironmentObject var store: PetStore
    @Environment(\.dismiss) private var dismiss

    @State private var strokes: [[CGPoint]] = []
    @State private var current: [CGPoint] = []
    @State private var strokeCount = 0
    @State private var done = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.95, green: 0.98, blue: 0.97).ignoresSafeArea()

                if !done {
                    VStack(spacing: 16) {
                        Text(store.pet.flatMap { p in PetType.all.first { $0.id == p.typeID } }?.emoji ?? "🐾")
                            .font(.system(size: 100))
                        Text("用手指给它梳梳毛吧！")
                            .font(.system(.headline, design: .rounded))
                            .foregroundStyle(.secondary)
                        Text("已梳 \(strokeCount) / 5 次")
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundStyle(.accentColor)

                        Canvas { ctx, size in
                            for stroke in strokes {
                                var path = Path()
                                guard stroke.count > 1 else { continue }
                                path.move(to: stroke[0])
                                for pt in stroke.dropFirst() { path.addLine(to: pt) }
                                ctx.stroke(path, with: .color(.accentColor.opacity(0.5)), lineWidth: 6)
                            }
                        }
                        .frame(width: 280, height: 200)
                        .background(Color.white.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .gesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { v in current.append(v.location) }
                                .onEnded { _ in
                                    strokes.append(current)
                                    current = []
                                    strokeCount += 1
                                    if strokeCount >= 5 {
                                        store.groom()
                                        withAnimation { done = true }
                                    }
                                }
                        )
                    }
                } else {
                    VStack(spacing: 20) {
                        Text("✨").font(.system(size: 60))
                        Text("梳理完成！").font(.system(.title, design: .rounded, weight: .bold))
                        Text("\(store.pet?.name ?? "宠物") 看起来漂亮多了！")
                            .foregroundStyle(.secondary)
                        Button("太好了！") { dismiss() }
                            .font(.system(.headline, design: .rounded))
                            .frame(width: 160).padding(.vertical, 14)
                            .background(Color.accentColor).foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
            }
            .navigationTitle("清洁")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } }
            }
        }
    }
}

// MARK: - HealthView

struct HealthView: View {
    @EnvironmentObject var store: PetStore
    @Environment(\.dismiss) private var dismiss

    var petType: PetType? {
        guard let id = store.pet?.typeID else { return nil }
        return PetType.all.first { $0.id == id }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let pet = store.pet, pet.isSick {
                        // Sick banner
                        HStack(spacing: 12) {
                            Image(systemName: "cross.circle.fill").foregroundStyle(.red).font(.title2)
                            VStack(alignment: .leading) {
                                Text("\(pet.name) 生病了！").font(.system(.headline, design: .rounded))
                                Text("健康值降到了 \(Int(pet.health * 100))%").foregroundStyle(.secondary).font(.subheadline)
                            }
                            Spacer()
                        }
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 16))

                        Button {
                            store.heal()
                            dismiss()
                        } label: {
                            Label("给 \(pet.name) 治疗", systemImage: "pills.fill")
                                .font(.system(.headline, design: .rounded))
                                .frame(maxWidth: .infinity).padding(.vertical, 16)
                                .background(Color.red).foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                    } else {
                        Label("宠物状态良好", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                            .font(.system(.headline, design: .rounded))
                    }

                    // Disease encyclopedia
                    if let type = petType {
                        Text("常见疾病百科").font(.system(.title3, design: .rounded, weight: .semibold))
                        ForEach(type.diseases) { d in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(d.name).font(.system(.headline, design: .rounded))
                                Label(d.symptoms,  systemImage: "staroflife").font(.subheadline).foregroundStyle(.secondary)
                                Label(d.advice,    systemImage: "lightbulb").font(.subheadline).foregroundStyle(.orange)
                            }
                            .padding()
                            .background(Color.secondary.opacity(0.07))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    }
                }
                .padding(20)
            }
            .navigationTitle("健康")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } }
            }
        }
    }
}
