import SwiftUI

struct CompressionResultCard: View {
    let metrics: CompressionMetrics?
    let saved: Bool

    var body: some View {
        Panel {
            if let metrics {
                Label(L(metrics.isSmaller ? "compression.result.success" : "compression.not-smaller"),
                      systemImage: metrics.isSmaller ? "checkmark.circle.fill" : "equal.circle")
                    .font(.headline).foregroundStyle(metrics.isSmaller ? coral : .secondary)
                if metrics.isSmaller {
                    Text(CompressionMetrics.sizeText(metrics.savedBytes))
                        .font(.system(.largeTitle, design: .rounded).bold())
                        .foregroundStyle(coral).accessibilityIdentifier("compression.savedBytes")
                    Text(String(format: L("compression.result.reduction"), metrics.reductionText))
                        .font(.title3.bold())
                }
                sizeRow("compression.result.before", bytes: metrics.inputBytes,
                        fraction: Double(metrics.inputBytes) / Double(max(metrics.inputBytes, metrics.outputBytes)), color: .secondary)
                sizeRow("compression.result.after", bytes: metrics.outputBytes,
                        fraction: Double(metrics.outputBytes) / Double(max(metrics.inputBytes, metrics.outputBytes)), color: coral)
                DisclosureGroup(L("compression.result.exact")) {
                    Text(String(format: L("compression.result.exactValues"),
                                metrics.inputBytes.formatted(), metrics.outputBytes.formatted(), metrics.savedBytes.formatted()))
                        .font(.footnote).frame(maxWidth: .infinity, alignment: .leading)
                }.font(.footnote)
                Text(L(saved ? "compression.bothNote" : "compression.result.unsaved"))
                    .font(.footnote).foregroundStyle(.secondary)
            } else {
                Label(L("compression.result.unavailable"), systemImage: "questionmark.circle")
                    .font(.headline)
                Text(L("compression.result.unavailableDetail")).font(.footnote).foregroundStyle(.secondary)
            }
        }.accessibilityIdentifier("compression.result")
    }

    private func sizeRow(_ title: String, bytes: Int64, fraction: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            ViewThatFits(in: .horizontal) {
                HStack { Text(L(title)); Spacer(); Text(CompressionMetrics.sizeText(bytes)).bold() }
                VStack(alignment: .leading) { Text(L(title)); Text(CompressionMetrics.sizeText(bytes)).bold() }
            }
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(color.opacity(0.12))
                    Capsule().fill(color).frame(width: geometry.size.width * fraction)
                }
            }.frame(height: 12).accessibilityHidden(true)
        }
    }
}
