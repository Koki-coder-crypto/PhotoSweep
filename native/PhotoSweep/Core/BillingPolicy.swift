import Foundation

struct BillingEvidence {
    let productID: String
    var verified = true
    var revoked = false
    var upgraded = false
    var expiration: Date?
    var graceExpiration: Date?
    var autoRenew = false
    var introductory = false
}

struct BillingEntitlement: Equatable {
    var productID: String?
    var expiration: Date?
    var autoRenew = false
    var introductory = false
    var label = "plan.free"
    var active: Bool { productID != nil }
}

enum BillingPolicy {
    static let prefix = "com.kokicoder.photosweep.pro."
    static let saleIDs = [prefix + "monthly", prefix + "lifetime"]
    static let supportedIDs = Set(saleIDs + [prefix + "weekly", prefix + "annual"])

    // Only verified StoreKit facts may confer access. Selection is independent of enumeration order.
    static func entitlement(_ records: [BillingEvidence], now: Date) -> BillingEntitlement {
        let valid = records.filter { $0.verified && !$0.revoked && !$0.upgraded && supportedIDs.contains($0.productID) }
        if let lifetime = valid.first(where: { $0.productID == prefix + "lifetime" }) {
            return BillingEntitlement(productID: lifetime.productID, label: "plan.lifetime")
        }
        let candidates = valid.compactMap { record -> BillingEntitlement? in
            let grace = record.graceExpiration.flatMap { $0 > now ? $0 : nil }
            guard let end = grace ?? record.expiration, end > now else { return nil }
            return BillingEntitlement(productID: record.productID, expiration: end,
                autoRenew: record.autoRenew, introductory: record.introductory,
                label: grace == nil ? "plan.active" : "plan.grace")
        }
        return candidates.sorted {
            if $0.expiration != $1.expiration { return $0.expiration! > $1.expiration! }
            return $0.productID! < $1.productID!
        }.first ?? BillingEntitlement()
    }
}

struct PendingPurchase: Codable {
    let productID: String
    // Optional for migration of the original productID-only record. Never infer a denial from age.
    var startedAt: Date?
}
