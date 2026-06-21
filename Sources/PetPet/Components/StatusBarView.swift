import SwiftUI

struct StatusBarView: View {
    let icon: String
    let label: String
    let value: Double   // 0.0–1.0

    private var barColor: Color {
        if value > 0.6 { return .green }
        if value > 0.3 { return .yellow }
        return .red
    }

    var body: some View {
        HStack(spacing: 8) {
            Text(icon).font(.callout)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.secondary.opacity(0.15))
                    Capsule()
                        .fill(barColor)
                        .frame(width: geo.size.width * CGFloat(value))
                        .animation(.easeInOut(duration: 0.4), value: value)
                }
            }
            .frame(height: 10)
            Text(label)
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
                .frame(width: 30, alignment: .trailing)
        }
    }
}

struct ActionButton: View {
    let icon: String
    let title: String
    let color: Color
    var isDisabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Text(icon).font(.title2)
                Text(title)
                    .font(.system(.caption, design: .rounded, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isDisabled ? Color.secondary.opacity(0.1) : color.opacity(0.15))
            .foregroundStyle(isDisabled ? Color.secondary : color)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .disabled(isDisabled)
    }
}
