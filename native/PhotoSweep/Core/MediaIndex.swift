import Foundation

// Built only when library metadata changes, never during a gesture or body pass.
struct MediaIndex {
    var byID: [String: MediaItem] = [:]
    var byMonth: [String: [MediaItem]] = [:]
    var months: [String] = []
    init(_ items: [MediaItem] = [], timezone: TimeZone = .current) {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timezone
        formatter.dateFormat = "yyyy-MM"
        for item in items where byID[item.id] == nil {
            byID[item.id] = item
            let month = formatter.string(from: Date(timeIntervalSince1970: item.createdAt / 1000))
            byMonth[month, default: []].append(item)
        }
        months = byMonth.keys.sorted(by: >)
    }
}
