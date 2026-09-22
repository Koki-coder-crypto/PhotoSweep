import Foundation
import CoreFoundation

/// File lengths measured by the encoder. Live jobs contain Int; restored JSON contains NSNumber.
struct CompressionMetrics {
    let inputBytes: Int64
    let outputBytes: Int64

    init?(job: [String: Any]) {
        guard let input = Self.byteCount(job["inputBytes"]),
              let output = Self.byteCount(job["outputBytes"]) else { return nil }
        inputBytes = input
        outputBytes = output
    }

    private static func byteCount(_ value: Any?) -> Int64? {
        guard let number = value as? NSNumber,
              CFGetTypeID(number) != CFBooleanGetTypeID() else { return nil }
        let count = number.doubleValue
        guard count.isFinite, count > 0, count < Double(Int64.max),
              count.rounded(.towardZero) == count else { return nil }
        return number.int64Value
    }

    var savedBytes: Int64 { max(0, inputBytes - outputBytes) }
    var isSmaller: Bool { outputBytes < inputBytes }
    var outputFraction: Double { Double(outputBytes) / Double(inputBytes) }

    var reductionText: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.maximumFractionDigits = 1
        formatter.roundingMode = .down
        // A nonempty file must never round up to a claim of 100% reduction.
        let fraction = min(0.999, Double(savedBytes) / Double(inputBytes))
        if fraction > 0 && fraction < 0.001 {
            return "<" + (formatter.string(from: 0.001) ?? "0.1%")
        }
        return formatter.string(from: NSNumber(value: fraction)) ?? "—"
    }

    static func sizeText(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .decimal
        formatter.allowedUnits = [.useBytes, .useKB, .useMB, .useGB, .useTB]
        return formatter.string(fromByteCount: bytes)
    }
}
