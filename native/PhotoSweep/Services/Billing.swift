import StoreKit
import UIKit

protocol BillingAdapter {
    func load() async
    func refresh() async
    func purchase(_ product: Product) async
    func restore() async
}
@MainActor final class Billing: ObservableObject, BillingAdapter {
    static let prefix = "com.kokicoder.photosweep.pro."
    static let saleIDs = [prefix + "monthly", prefix + "lifetime"]
    static let supportedIDs = Set(saleIDs + [prefix + "weekly", prefix + "annual"])
    @Published var products: [Product] = []
    @Published var hasPro = false
    @Published var pending = false
    @Published var busy = false
    @Published var message: String?
    @Published var trialEligible: [String: Bool] = [:]
    @Published var expiry: Date?
    @Published var autoRenew = false
    @Published var trial = false
    @Published var entitlementName = "plan.free"
    var allowsPro: Bool { hasPro && (entitlementName == "plan.lifetime" || (expiry.map { $0 > Date() } ?? false)) }
    private let pendingFile = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("PhotoSweepPurchasePending.json")
    private var updates: Task<Void, Never>?
    init() {
        pending = FileManager.default.fileExists(atPath: pendingFile.path)
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self, case .verified(let transaction) = result, Self.supportedIDs.contains(transaction.productID) else { continue }
                await self.refresh(); await transaction.finish(); self.pending = false; try? FileManager.default.removeItem(at: self.pendingFile)
            }
        }
    }
    deinit { updates?.cancel() }
    func load() async {
        do {
            products = try await Product.products(for: Self.saleIDs).sorted { Self.saleIDs.firstIndex(of: $0.id)! < Self.saleIDs.firstIndex(of: $1.id)! }
            for product in products { trialEligible[product.id] = await product.subscription?.isEligibleForIntroOffer ?? false }
            message = products.isEmpty ? L("billing.unavailable") : nil
        } catch { products = []; message = L("billing.unavailable") }
        await refresh()
    }
    func refresh() async {
        var entitled = false, end: Date?, renewing = false, isTrial = false, label = "plan.free"
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result, Self.supportedIDs.contains(transaction.productID), transaction.revocationDate == nil, !transaction.isUpgraded else { continue }
            if transaction.productID == Self.prefix + "lifetime" { entitled = true; label = "plan.lifetime"; break }
            if let expires = transaction.expirationDate, expires > Date() {
                entitled = true; end = expires; label = "plan.active"
                isTrial = transaction.offerType == .introductory
            }
        }
        // Status also covers grace periods, including legacy subscription products.
        if label != "plan.lifetime", let subscriptions = try? await Product.products(for: Array(Self.supportedIDs).filter { !$0.hasSuffix("lifetime") }) {
            for product in subscriptions {
                guard let statuses = try? await product.subscription?.status else { continue }
                for status in statuses {
                    guard case .verified(let transaction) = status.transaction, case .verified(let renewal) = status.renewalInfo,
                          transaction.revocationDate == nil, !transaction.isUpgraded, Self.supportedIDs.contains(transaction.productID) else { continue }
                    if status.state == .inGracePeriod, let grace = renewal.gracePeriodExpirationDate, grace > Date() {
                        entitled = true; end = grace; label = "plan.grace"
                    }
                    if (status.state == .subscribed || status.state == .inGracePeriod) && entitled { renewing = renewal.willAutoRenew }
                }
            }
        }
        hasPro = entitled; expiry = end; autoRenew = renewing; trial = isTrial; entitlementName = label
    }
    func purchase(_ product: Product) async {
        guard !busy, !pending, AppStore.canMakePayments else { return }
        busy = true; defer { busy = false }
        do {
            switch try await product.purchase() {
            case .success(let result):
                guard case .verified(let transaction) = result, Self.supportedIDs.contains(transaction.productID) else { message = L("billing.unverified"); return }
                await refresh(); await transaction.finish()
                message = hasPro ? L("billing.success") : L("billing.unverified")
            case .pending:
                pending = true; message = L("billing.pending")
                try? FileManager.default.createDirectory(at: pendingFile.deletingLastPathComponent(), withIntermediateDirectories: true)
                try? JSONEncoder().encode(["productID": product.id]).write(to: pendingFile, options: .atomic)
            case .userCancelled: message = nil
            @unknown default: message = L("billing.unverified")
            }
        } catch { message = L("billing.failed") }
    }
    func restore() async {
        guard !busy else { return }; busy = true; defer { busy = false }
        do { try await AppStore.sync(); await refresh(); message = hasPro ? L("billing.restored") : L("billing.noPurchase") }
        catch { message = L("billing.failed") }
    }
    func manage() async {
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first else { return }
        try? await AppStore.showManageSubscriptions(in: scene)
    }
    func disclosure(_ product: Product) -> String {
        guard let subscription = product.subscription else { return String(format: L("billing.once"), product.displayPrice) }
        let period = subscription.subscriptionPeriod
        let unit: String
        switch period.unit { case .day: unit = L("period.day"); case .week: unit = L("period.week"); case .month: unit = L("period.month"); case .year: unit = L("period.year"); @unknown default: unit = "" }
        let price = String(format: L("billing.renewal"), product.displayPrice, period.value, unit)
        if trialEligible[product.id] == true, let intro = subscription.introductoryOffer, intro.paymentMode == .freeTrial {
            let trialUnit: String
            switch intro.period.unit { case .day: trialUnit = L("period.day"); case .week: trialUnit = L("period.week"); case .month: trialUnit = L("period.month"); case .year: trialUnit = L("period.year"); @unknown default: trialUnit = "" }
            return String(format: L("billing.trial"), intro.period.value * intro.periodCount, trialUnit) + " " + price
        }
        return price
    }
}
