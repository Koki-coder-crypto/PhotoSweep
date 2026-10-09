import StoreKit
import UIKit
import OSLog

protocol BillingAdapter {
    func load() async
    func refresh() async
    func purchase(_ product: Product, displayedOffer: BillingOffer) async
    func restore() async
}
@MainActor final class Billing: ObservableObject, BillingAdapter {
    static let prefix = BillingPolicy.prefix
    static let saleIDs = BillingPolicy.saleIDs
    static let supportedIDs = BillingPolicy.supportedIDs
    @Published private(set) var products: [Product] = []
    @Published private(set) var loadingProducts = false
    @Published var hasPro = false
    @Published var pending = false
    @Published var pendingChecked = false
    @Published var busy = false
    @Published var message: String?
    @Published var trialEligible: [String: Bool] = [:]
    @Published var expiry: Date?
    @Published var autoRenew = false
    @Published var trial = false
    @Published var entitlementName = "plan.free"
    var allowsPro: Bool { hasPro && (entitlementName == "plan.lifetime" || (expiry.map { $0 > Date() } ?? false)) }
    func offersSevenDayTrial(_ product: Product) -> Bool {
        guard trialEligible[product.id] == true, let offer = product.subscription?.introductoryOffer,
              offer.paymentMode == .freeTrial else { return false }
        switch offer.period.unit {
        case .day: return offer.period.value * offer.periodCount == 7
        case .week: return offer.period.value * offer.periodCount == 1
        default: return false
        }
    }
    var sevenDayTrialProduct: Product? { products.first(where: offersSevenDayTrial) }
    private let pendingFile = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("PhotoSweepPurchasePending.json")
    private var refreshTask: Task<Void, Never>?
    private var pendingRecord: PendingPurchase?
    private var updates: Task<Void, Never>?
    private var storefrontUpdates: Task<Void, Never>?
    private var storefrontReload: Task<Void, Never>?
    private var catalog = BillingCatalog<Product>()
    private let productLoader: @MainActor () async throws -> [BillingCatalog<Product>.Entry]
    private static let logger = Logger(subsystem: "com.kokicoder.photosweep", category: "BillingCatalog")
    init(observeUpdates: Bool = true,
         productLoader: @escaping @MainActor () async throws -> [BillingCatalog<Product>.Entry] = StoreKitBillingSource.catalog) {
        self.productLoader = productLoader
        if let data = try? Data(contentsOf: pendingFile) { pendingRecord = try? JSONDecoder().decode(PendingPurchase.self, from: data) }
        pending = FileManager.default.fileExists(atPath: pendingFile.path)
        guard observeUpdates else { return }
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self, case .verified(let transaction) = result, Self.supportedIDs.contains(transaction.productID) else { continue }
                await self.refresh(force: true); await transaction.finish()
                if self.pendingRecord?.productID == transaction.productID { self.clearPending() }
            }
        }
        storefrontUpdates = Task { [weak self] in
            for await _ in Storefront.updates {
                guard let self else { return }
                self.storefrontReload?.cancel()
                _ = self.catalog.beginRefresh()
                self.publishCatalog()
                self.storefrontReload = Task { [weak self] in _ = await self?.reloadProducts() }
            }
        }
    }
    deinit { updates?.cancel(); storefrontUpdates?.cancel(); storefrontReload?.cancel() }
    func load() async {
        _ = await reloadProducts()
        await refresh()
    }
    // Always refresh the complete offer atomically; never mix eligibility from one request
    // with products from another. No AppStore.sync or account prompts for price refreshes.
    func refreshTrialEligibility() async { _ = await reloadProducts() }
    func offer(for product: Product) -> BillingOffer? {
        catalog.entries.first { $0.offer.productID == product.id }?.offer
    }
    @discardableResult func reloadProducts() async -> Bool {
        let request = catalog.beginRefresh()
        publishCatalog()
        do {
            let entries = try await BillingRequest<[BillingCatalog<Product>.Entry]>().run(operation: productLoader)
            try Task.checkCancellation()
            guard catalog.complete(entries, request: request) else { return false }
            publishCatalog()
            message = entries.isEmpty ? L("billing.unavailable") : nil
            for entry in entries {
                // Only public catalog identifiers; no account, receipt, transaction or error payloads.
                Self.logger.debug("storefront=\(entry.offer.storefrontID ?? "unknown", privacy: .public) currency=\(entry.offer.currencyCode, privacy: .public) product=\(entry.offer.productID, privacy: .public)")
            }
            return !entries.isEmpty
        } catch {
            guard catalog.fail(request: request) else { return false }
            publishCatalog()
            message = L("billing.unavailable")
            return false
        }
    }
    private func publishCatalog() {
        products = catalog.entries.map(\.item)
        trialEligible = Dictionary(uniqueKeysWithValues: catalog.entries.map { ($0.offer.productID, $0.trialEligible) })
        loadingProducts = catalog.isRefreshing
    }
    func refresh() async { await refresh(force: false) }
    private func refresh(force: Bool) async {
        if force, let running = refreshTask { await running.value }
        if let running = refreshTask { await running.value; return }
        let task = Task { @MainActor in
            let state = await StoreKitBillingSource.entitlement()
            self.hasPro = state.active; self.expiry = state.expiration; self.autoRenew = state.autoRenew
            self.trial = state.introductory; self.entitlementName = state.label
            if state.active { self.clearPending() }
            self.refreshTask = nil
        }
        refreshTask = task
        await task.value
    }
    private func clearPending() {
        pending = false; pendingChecked = false; pendingRecord = nil
        try? FileManager.default.removeItem(at: pendingFile)
    }
    func recheckPending() async {
        guard !busy else { return }; busy = true; defer { busy = false }
        do {
            try await AppStore.sync(); await refresh(force: true)
            pendingChecked = pending
            message = pending ? L("billing.pendingUnknown") : (hasPro ? L("billing.restored") : L("billing.noPurchase"))
        } catch { message = L("billing.failed") }
    }
    // Explicit user action only. This does not cancel an outstanding request at Apple.
    func allowPurchaseRetry() {
        guard pendingChecked, !busy else { return }
        clearPending(); message = L("billing.pendingRetryNotice")
    }
    func purchase(_ product: Product, displayedOffer: BillingOffer) async {
        guard !busy, !pending else { return }
        guard AppStore.canMakePayments else { message = L("billing.restricted"); return }
        busy = true; defer { busy = false }
        do { try await BillingRequest<Void>().run { await self.refresh() } }
        catch { message = L("billing.unavailable"); return }
        guard !allowsPro else { message = L("billing.active"); return }
        guard Self.saleIDs.contains(product.id), product.id == displayedOffer.productID else { return }
        // Refresh the displayed catalog before each attempted purchase, then use that newly
        // fetched Product. Any changed price, storefront, period or eligible offer requires a new tap.
        guard await reloadProducts() else { return }
        guard !Task.isCancelled else { return }
        guard let current = try? await BillingRequest<Storefront?>().run(operation: { await Storefront.current }) else {
            message = L("billing.unavailable"); return
        }
        guard catalog.entries.first?.offer.storefrontID == current.id else {
            // The storefront moved after the fetch. Remove old prices immediately, then
            // show the new catalog if available; this tap still must not purchase anything.
            if await reloadProducts() { message = L("billing.offerChanged") }
            return
        }
        guard let freshProduct = catalog.item(matching: displayedOffer, storefrontID: current.id) else {
            message = L("billing.offerChanged"); return
        }
        guard !allowsPro else { message = L("billing.active"); return }
        guard !Task.isCancelled else { return }
        do {
            switch try await freshProduct.purchase() {
            case .success(let result):
                guard case .verified(let transaction) = result, Self.supportedIDs.contains(transaction.productID) else { message = L("billing.unverified"); return }
                await refresh(force: true); await transaction.finish()
                message = hasPro ? L("billing.success") : L("billing.unverified")
            case .pending:
                pending = true; pendingChecked = false; pendingRecord = PendingPurchase(productID: product.id, startedAt: Date()); message = L("billing.pending")
                try? FileManager.default.createDirectory(at: pendingFile.deletingLastPathComponent(), withIntermediateDirectories: true)
                try? JSONEncoder().encode(pendingRecord).write(to: pendingFile, options: .atomic)
            case .userCancelled: message = nil
            @unknown default: message = L("billing.unverified")
            }
        } catch { message = L("billing.failed") }
    }
    func restore() async {
        guard !busy else { return }; busy = true; defer { busy = false }
        do { try await AppStore.sync(); await refresh(force: true); message = hasPro ? L("billing.restored") : L("billing.noPurchase") }
        catch { message = L("billing.failed") }
    }
    func manage() async {
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first else { return }
        do { try await AppStore.showManageSubscriptions(in: scene); await refresh() }
        catch { message = L("billing.failed") }
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

// StoreKit is the source of truth; the policy itself is independently testable.
@MainActor enum StoreKitBillingSource {
    enum CatalogError: Error { case storefrontChanged, unavailable }
    static func catalog() async throws -> [BillingCatalog<Product>.Entry] {
        guard let storefront = await Storefront.current else { throw CatalogError.unavailable }
        let products = try await Product.products(for: Billing.saleIDs)
        var entries: [BillingCatalog<Product>.Entry] = []
        for id in Billing.saleIDs {
            guard let product = products.first(where: { $0.id == id }) else { continue }
            let eligible = await product.subscription?.isEligibleForIntroOffer ?? false
            let intro = eligible ? product.subscription?.introductoryOffer : nil
            let offer = BillingOffer(productID: product.id, storefrontID: storefront.id,
                currencyCode: product.priceFormatStyle.currencyCode, price: product.price, displayPrice: product.displayPrice,
                subscriptionPeriod: product.subscription.map { period($0.subscriptionPeriod) },
                introductoryOffer: intro.map {
                    BillingOffer.IntroductoryOffer(price: $0.price, displayPrice: $0.displayPrice,
                        paymentMode: String(describing: $0.paymentMode), period: period($0.period), periodCount: $0.periodCount)
                })
            entries.append(.init(item: product, offer: offer, trialEligible: eligible))
        }
        guard await Storefront.current?.id == storefront.id else { throw CatalogError.storefrontChanged }
        try Task.checkCancellation()
        return entries
    }
    private static func period(_ period: Product.SubscriptionPeriod) -> String {
        "\(period.value):\(String(describing: period.unit))"
    }
    static func entitlement() async -> BillingEntitlement {
        var records: [UInt64: BillingEvidence] = [:]
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            records[transaction.id] = evidence(transaction)
        }
        if let products = try? await Product.products(for: Array(BillingPolicy.supportedIDs).filter { !$0.hasSuffix("lifetime") }) {
            for product in products {
                guard let statuses = try? await product.subscription?.status else { continue }
                for status in statuses {
                    guard case .verified(let transaction) = status.transaction,
                          case .verified(let renewal) = status.renewalInfo else { continue }
                    var record = evidence(transaction)
                    record.autoRenew = renewal.willAutoRenew
                    if status.state == .inGracePeriod { record.graceExpiration = renewal.gracePeriodExpirationDate }
                    if status.state == .revoked { record.revoked = true }
                    records[transaction.id] = record
                }
            }
        }
        return BillingPolicy.entitlement(Array(records.values), now: Date())
    }
    private static func evidence(_ transaction: Transaction) -> BillingEvidence {
        BillingEvidence(productID: transaction.productID, revoked: transaction.revocationDate != nil,
            upgraded: transaction.isUpgraded, expiration: transaction.expirationDate,
            introductory: transaction.offerType == .introductory)
    }
}
