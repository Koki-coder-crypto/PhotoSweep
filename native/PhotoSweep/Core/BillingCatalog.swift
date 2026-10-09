import Foundation

// An immutable description of what the user saw, never a locally converted price.
struct BillingOffer: Equatable {
    let productID: String
    let storefrontID: String?
    let currencyCode: String
    let price: Decimal
    let displayPrice: String
    let subscriptionPeriod: String?
    let introductoryOffer: IntroductoryOffer?

    struct IntroductoryOffer: Equatable {
        let price: Decimal
        let displayPrice: String
        let paymentMode: String
        let period: String
        let periodCount: Int
    }
}

// Catalog refreshes do not own or modify purchase entitlements or pending approvals.
// A generation invalidates both stale successes and stale failures, including A -> B -> A storefront changes.
struct BillingCatalog<Item> {
    struct Entry {
        let item: Item
        let offer: BillingOffer
        let trialEligible: Bool
    }
    private(set) var entries: [Entry] = []
    private(set) var isRefreshing = false
    private var generation: UInt64 = 0

    mutating func beginRefresh() -> UInt64 {
        generation &+= 1
        entries = []
        isRefreshing = true
        return generation
    }
    @discardableResult mutating func complete(_ entries: [Entry], request: UInt64) -> Bool {
        guard request == generation else { return false }
        self.entries = entries
        isRefreshing = false
        return true
    }
    @discardableResult mutating func fail(request: UInt64) -> Bool { complete([], request: request) }
    func item(matching displayedOffer: BillingOffer, storefrontID: String?) -> Item? {
        guard !isRefreshing, displayedOffer.storefrontID == storefrontID else { return nil }
        return entries.first { $0.offer == displayedOffer }?.item
    }
}

// StoreKit requests can outlive view cancellation. Bound the UI wait without letting a late
// response publish anything. This is deliberately unstructured: a task group would wait for
// an uncooperative StoreKit child even after its timeout. All completion arbitration is main-actor isolated.
@MainActor final class BillingRequest<Value> {
    enum Failure: Error { case timedOut }
    private var continuation: CheckedContinuation<Value, Error>?
    private var operationTask: Task<Void, Never>?
    private var timeoutTask: Task<Void, Never>?

    func run(timeoutNanoseconds: UInt64 = 15_000_000_000,
             operation: @escaping @MainActor () async throws -> Value) async throws -> Value {
        try Task.checkCancellation()
        return try await withTaskCancellationHandler(operation: {
            try await withCheckedThrowingContinuation { continuation in
                self.continuation = continuation
                operationTask = Task { @MainActor in
                    do { self.finish(.success(try await operation())) }
                    catch { self.finish(.failure(error)) }
                }
                timeoutTask = Task { @MainActor in
                    do { try await Task.sleep(nanoseconds: timeoutNanoseconds) }
                    catch { return }
                    self.finish(.failure(Failure.timedOut))
                }
            }
        }, onCancel: { Task { @MainActor in self.finish(.failure(CancellationError())) } })
    }
    private func finish(_ result: Result<Value, Error>) {
        guard let continuation else { return }
        self.continuation = nil
        operationTask?.cancel(); timeoutTask?.cancel()
        operationTask = nil; timeoutTask = nil
        continuation.resume(with: result)
    }
}
