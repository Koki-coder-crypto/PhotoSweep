import Foundation

struct PhotoGroup: Identifiable { var id: String; var ids: [String]; var recommended: String; var kind: String }
actor AnalysisService {
    func groups(_ photos: [MediaItem]) -> [PhotoGroup] {
        let photos = photos.filter { $0.kind == .photo }
        var prints: [String: [String: Any]] = [:]
        for start in stride(from: 0, to: photos.count, by: 24) {
            if Task.isCancelled { return [] }
            for value in PhotoSweepAnalysis.fingerprints(Array(photos[start..<min(start + 24, photos.count)]).map(\.id)) {
                if let id = value["id"] as? String { prints[id] = value }
            }
        }
        let byID = Dictionary(uniqueKeysWithValues: photos.map { ($0.id, $0) })
        func quality(_ id: String) -> Double {
            guard let photo = byID[id] else { return 0 }
            return (photo.favorite ? 1e15 : 0) + Double(photo.width * photo.height) * 10 + (prints[id]?["quality"] as? Double ?? 0)
        }
        var hashes: [String: [String]] = [:], digests: [String: [String]] = [:]
        for (id, value) in prints where value["exactEligible"] as? Bool == true { if let hash = value["hash"] as? String { hashes[hash, default: []].append(id) } }
        let potential = hashes.values.filter { $0.count > 1 }.flatMap { $0 }
        for start in stride(from: 0, to: potential.count, by: 8) {
            if Task.isCancelled { return [] }
            for value in PhotoSweepAnalysis.digests(Array(potential[start..<min(start + 8, potential.count)])) {
                if let id = value["id"], let digest = value["digest"] { digests[digest, default: []].append(id) }
            }
        }
        var groups: [PhotoGroup] = [], grouped = Set<String>()
        func add(_ ids: [String], kind: String) {
            let sorted = ids.sorted { quality($0) == quality($1) ? $0 < $1 : quality($0) > quality($1) }
            groups.append(PhotoGroup(id: kind + sorted[0], ids: sorted, recommended: sorted[0], kind: kind)); grouped.formUnion(ids)
        }
        for ids in digests.values where ids.count > 1 { add(ids, kind: "duplicate") }
        var similar: [[String]] = [], buckets: [String: [Int]] = [:]
        for photo in photos.sorted(by: { $0.createdAt > $1.createdAt }) {
            guard !grouped.contains(photo.id), !photo.screenshot, let hash = prints[photo.id]?["hash"] as? String, hash.count == 16, let number = UInt64(hash, radix: 16) else { continue }
            let keys = (0..<4).map { "\($0):\((number >> ($0 * 16)) & 0xffff)" }
            let candidates = Set(keys.flatMap { buckets[$0] ?? [] })
            let match = candidates.sorted().first { index in
                guard let first = byID[similar[index][0]], let firstHash = prints[first.id]?["hash"] as? String, let firstNumber = UInt64(firstHash, radix: 16), first.height > 0, photo.height > 0 else { return false }
                let ratio = Double(first.width) / Double(first.height) / (Double(photo.width) / Double(photo.height))
                return abs(first.createdAt - photo.createdAt) <= 86_400_000 && (0.9...1.1).contains(ratio) && (number ^ firstNumber).nonzeroBitCount <= 7
            }
            if let match { similar[match].append(photo.id) } else {
                let index = similar.count; similar.append([photo.id]); for key in keys { buckets[key, default: []].append(index) }
            }
        }
        for ids in similar where ids.count > 1 { add(ids, kind: "similar") }
        return groups
    }
}
