import SwiftUI

struct PetSelectionView: View {
    @EnvironmentObject var store: PetStore
    @State private var selectedType: PetType?
    @State private var petName: String = ""
    @State private var showNaming = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Text("选择你的宠物")
                    .font(.system(.largeTitle, design: .rounded, weight: .bold))
                    .padding(.top, 40)
                Text("从真实世界的动物中，选一个成为你的伙伴")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(PetType.all) { type in
                            PetCard(type: type, isSelected: selectedType?.id == type.id)
                                .onTapGesture {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        selectedType = type
                                    }
                                }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 32)
                }

                if let type = selectedType {
                    VStack(spacing: 12) {
                        Text(type.tagline)
                            .font(.system(.body, design: .rounded))
                            .foregroundStyle(.secondary)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))

                        Button {
                            showNaming = true
                        } label: {
                            Label("选择\(type.name)", systemImage: "heart.fill")
                                .font(.system(.headline, design: .rounded))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.accentColor)
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        .padding(.horizontal, 24)
                    }
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }

                Spacer()
            }
        }
        .sheet(isPresented: $showNaming) {
            NamingSheet(petType: selectedType) { name in
                guard let type = selectedType else { return }
                let pet = Pet(typeID: type.id, name: name)
                store.adoptPet(pet)
            }
        }
    }
}

// MARK: - Pet Card

private struct PetCard: View {
    let type: PetType
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        LinearGradient(
                            colors: cardColors(type.themeColor),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 160, height: 180)

                Text(type.emoji)
                    .font(.system(size: 80))
            }

            Text(type.name)
                .font(.system(.headline, design: .rounded, weight: .bold))

            Text(type.category.rawValue)
                .font(.caption)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color.secondary.opacity(0.15))
                .clipShape(Capsule())
        }
        .scaleEffect(isSelected ? 1.06 : 1.0)
        .shadow(color: isSelected ? .accentColor.opacity(0.35) : .black.opacity(0.08),
                radius: isSelected ? 16 : 6, x: 0, y: 4)
    }

    private func cardColors(_ name: String) -> [Color] {
        switch name {
        case "ThemeOrange":   return [Color(red: 1.0, green: 0.78, blue: 0.55), Color(red: 1.0, green: 0.6, blue: 0.3)]
        case "ThemeAmber":    return [Color(red: 1.0, green: 0.88, blue: 0.5),  Color(red: 1.0, green: 0.7, blue: 0.2)]
        case "ThemePink":     return [Color(red: 1.0, green: 0.8, blue: 0.85),  Color(red: 1.0, green: 0.6, blue: 0.75)]
        case "ThemeMint":     return [Color(red: 0.7, green: 0.95, blue: 0.85), Color(red: 0.4, green: 0.85, blue: 0.7)]
        case "ThemeBrown":    return [Color(red: 0.75, green: 0.6, blue: 0.45), Color(red: 0.55, green: 0.4, blue: 0.28)]
        case "ThemeLavender": return [Color(red: 0.82, green: 0.75, blue: 1.0), Color(red: 0.65, green: 0.55, blue: 0.95)]
        case "ThemeSky":      return [Color(red: 0.65, green: 0.88, blue: 1.0), Color(red: 0.4, green: 0.72, blue: 0.95)]
        case "ThemeGold":     return [Color(red: 1.0, green: 0.85, blue: 0.4),  Color(red: 0.9, green: 0.65, blue: 0.1)]
        default:              return [Color.gray.opacity(0.3), Color.gray.opacity(0.5)]
        }
    }
}

// MARK: - Naming Sheet

struct NamingSheet: View {
    let petType: PetType?
    let onConfirm: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if let type = petType {
                    Text(type.emoji).font(.system(size: 80))
                    Text("给你的\(type.name)起个名字吧")
                        .font(.system(.title2, design: .rounded, weight: .semibold))
                }

                TextField("输入名字", text: $name)
                    .font(.system(.title3, design: .rounded))
                    .multilineTextAlignment(.center)
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 32)

                Button {
                    let finalName = name.trimmingCharacters(in: .whitespaces).isEmpty
                        ? (petType?.name ?? "我的宠物")
                        : name
                    onConfirm(finalName)
                    dismiss()
                } label: {
                    Text("确认，出发！")
                        .font(.system(.headline, design: .rounded))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .padding(.horizontal, 24)

                Spacer()
            }
            .padding(.top, 32)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
            }
        }
    }
}
