import SwiftUI

struct LearnView: View {
    @EnvironmentObject var store: PetStore
    @Environment(\.dismiss) private var dismiss
    @State private var tab = 0

    var petType: PetType? {
        guard let id = store.pet?.typeID else { return nil }
        return PetType.all.first { $0.id == id }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab picker
                Picker("", selection: $tab) {
                    Text("习性").tag(0)
                    Text("饮食").tag(1)
                    Text("成长").tag(2)
                    Text("健康").tag(3)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)

                if let type = petType {
                    ScrollView {
                        VStack(spacing: 14) {
                            switch tab {
                            case 0: HabitsTab(type: type)
                            case 1: FoodTab(type: type)
                            case 2: GrowthTab(type: type, pet: store.pet)
                            default: HealthTab(type: type)
                            }
                        }
                        .padding(20)
                    }
                }
            }
            .navigationTitle("了解 \(petType?.name ?? "宠物")")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } }
            }
        }
    }
}

// MARK: - Habits

private struct HabitsTab: View {
    let type: PetType
    var body: some View {
        ForEach(Array(type.habits.enumerated()), id: \.offset) { _, habit in
            InfoCard(icon: "🦴", text: habit, accentColor: .orange)
        }
    }
}

// MARK: - Food

private struct FoodTab: View {
    let type: PetType
    var body: some View {
        Text("可以吃 ✅")
            .font(.system(.subheadline, design: .rounded, weight: .semibold))
            .foregroundStyle(.green)
            .frame(maxWidth: .infinity, alignment: .leading)
        ForEach(type.safeFood, id: \.self) { food in
            InfoCard(icon: "✅", text: food, accentColor: .green)
        }
        Text("危险食物 ⚠️")
            .font(.system(.subheadline, design: .rounded, weight: .semibold))
            .foregroundStyle(.red)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 8)
        ForEach(type.dangerFood, id: \.self) { food in
            InfoCard(icon: "⚠️", text: food, accentColor: .red)
        }
    }
}

// MARK: - Growth

private struct GrowthTab: View {
    let type: PetType
    let pet: Pet?

    var body: some View {
        ForEach(GrowthStage.allCases, id: \.self) { stage in
            let isCurrent = pet?.growthStage == stage
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(stage.rawValue)
                        .font(.system(.headline, design: .rounded, weight: .bold))
                    if isCurrent {
                        Text("当前").font(.caption).padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Color.accentColor).foregroundStyle(.white).clipShape(Capsule())
                    }
                    Spacer()
                }
                Text(stage.description).font(.caption).foregroundStyle(.secondary)
                if let desc = type.growthDescriptions[stage] {
                    Text(desc).font(.subheadline)
                }
            }
            .padding()
            .background(isCurrent ? Color.accentColor.opacity(0.1) : Color.secondary.opacity(0.07))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay {
                if isCurrent {
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color.accentColor.opacity(0.4), lineWidth: 1.5)
                }
            }
        }
    }
}

// MARK: - Health education

private struct HealthTab: View {
    let type: PetType
    var body: some View {
        ForEach(type.diseases) { d in
            VStack(alignment: .leading, spacing: 8) {
                Text(d.name).font(.system(.headline, design: .rounded))
                Label(d.symptoms, systemImage: "staroflife").font(.subheadline).foregroundStyle(.secondary)
                Label(d.advice,   systemImage: "lightbulb.fill").font(.subheadline).foregroundStyle(.orange)
            }
            .padding()
            .background(Color.red.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }
}

// MARK: - Shared

struct InfoCard: View {
    let icon: String
    let text: String
    let accentColor: Color

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text(icon).font(.body)
            Text(text).font(.system(.subheadline, design: .rounded))
            Spacer()
        }
        .padding()
        .background(accentColor.opacity(0.07))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
