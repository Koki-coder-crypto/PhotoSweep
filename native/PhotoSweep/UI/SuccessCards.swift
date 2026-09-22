import SwiftUI

struct DeletionResultCard: View {
    let outcome: Outcome
    @ScaledMetric(relativeTo: .largeTitle) private var amountSize: CGFloat = 46
    var body: some View {
        Panel {
            Label(L("result.data"), systemImage: "sparkles").font(.headline)
            if outcome.knownBytes > 0 || outcome.unknownCount == 0 {
                if outcome.estimated { Text(L("size.estimated")).font(.caption.bold()) }
                Text(bytesText(outcome.knownBytes)).font(.system(size: amountSize, weight: .bold, design: .rounded))
                    .foregroundStyle(coral).minimumScaleFactor(0.65).accessibilityIdentifier("result.deletedBytes")
            } else { Text(L("result.sizeUnavailable")).font(.title2.bold()) }
            Text(String(format: L("result.breakdown"), outcome.photoCount, outcome.videoCount)).font(.headline)
            if outcome.unknownCount > 0 { Text(String(format: L("result.unknown"), outcome.unknownCount)).font(.footnote) }
            Text(L("result.deletedDataNote")).font(.footnote).foregroundStyle(.secondary)
        }
        if let increase = SuccessExperience.storageIncrease(outcome) {
            Panel {
                Label(L("result.freeChange"), systemImage: "internaldrive").font(.headline)
                Text(increase > 0 ? "+" + bytesText(increase) : L("result.freeUnchanged"))
                    .font(.title2.bold()).foregroundStyle(increase > 0 ? Color.accentColor : .secondary)
                Text(L("result.measureNote")).font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}

struct SuccessOfferCard: View {
    @EnvironmentObject private var billing: Billing
    var open: () -> Void
    var dismiss: () -> Void
    var body: some View {
        Panel {
            HStack {
                Label("PhotoSweep Pro", systemImage: "sparkles").font(.headline)
                Spacer()
                Button(action: dismiss) { Image(systemName: "xmark").frame(width: 44, height: 44) }.accessibilityLabel(L("close"))
            }
            Text(L(billing.sevenDayTrialProduct == nil ? "pro.successHeadline" : "pro.sevenDayHeadline"))
                .font(.largeTitle.bold())
            Text(L("pro.successDetail"))
            if let product = billing.sevenDayTrialProduct { Text(billing.disclosure(product)).font(.footnote) }
            ActionButton(title: billing.sevenDayTrialProduct == nil ? "pro.see" : "pro.sevenDayExplore", action: open)
            Text(L("pro.noAutomaticPurchase")).font(.caption).foregroundStyle(.secondary)
        }.accessibilityIdentifier("pro.successOffer")
    }
}
