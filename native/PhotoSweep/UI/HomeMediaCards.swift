import SwiftUI
import Photos
import AVFoundation

struct HomeMediaSummary {
    var ids: [String] = []
    var count = 0
    var videoID: String?
    static func build(photos: [MediaItem], groups: [PhotoGroup], sizes: [String: AssetSize]) -> [Category: HomeMediaSummary] {
        var seen = Set<String>()
        let photos = photos.filter { seen.insert($0.id).inserted }
        let byID = Dictionary(uniqueKeysWithValues: photos.map { ($0.id, $0) })
        var result: [Category: HomeMediaSummary] = [:]
        for category in [Category.videos, .recordings, .compression, .screenshots, .all] {
            var items = photos.filter { item in
                switch category {
                case .videos, .compression: return item.kind == .video
                case .recordings: return item.kind == .video && item.recording
                case .screenshots: return item.kind == .photo && item.screenshot
                case .all: return item.kind == .photo
                default: return false
                }
            }
            if [.videos, .recordings, .compression].contains(category) {
                items.sort {
                    let a = sizes[$0.id]?.bytes ?? -1, b = sizes[$1.id]?.bytes ?? -1
                    return a == b ? $0.createdAt > $1.createdAt : a > b
                }
            }
            result[category] = HomeMediaSummary(ids: Array(items.prefix(3)).map(\.id), count: items.count,
                                               videoID: items.first.flatMap { $0.kind == .video ? $0.id : nil })
        }
        for category in [Category.similar, .duplicate] {
            let matches = groups.filter { $0.kind == category.rawValue }
            let validGroups = matches.map { group in
                var seen = Set<String>()
                return group.ids.filter { byID[$0]?.kind == .photo && seen.insert($0).inserted }
            }.filter { $0.count >= 2 }
            result[category] = HomeMediaSummary(ids: Array((validGroups.first ?? []).prefix(3)), count: Set(validGroups.flatMap { $0 }).count)
        }
        return result
    }
}

struct HomeMediaCard: View {
    var category: Category
    var summary: HomeMediaSummary
    var pending: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Label(L(category.title), systemImage: category.symbol).font(.headline)
                Spacer(minLength: 8)
                if category == .compression { Text("Pro").font(.caption.bold()).foregroundStyle(Color.accentColor) }
                Image(systemName: "chevron.right").font(.caption.bold()).foregroundStyle(.secondary)
            }
            if summary.ids.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: category.symbol).font(.title).foregroundStyle(Color.accentColor.opacity(0.65))
                    Text(L(pending ? "analysis.running" : "home.previewEmpty")).font(.subheadline).foregroundStyle(.secondary)
                }.frame(maxWidth: .infinity).frame(height: 120).background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
            } else {
                HStack(spacing: 6) {
                    ForEach(Array(summary.ids.enumerated()), id: \.element) { index, id in
                        ZStack(alignment: .bottomLeading) {
                            MediaThumbnail(id: id)
                            if summary.videoID != nil {
                                Image(systemName: "speaker.slash.fill").font(.caption2.bold()).padding(7)
                                    .foregroundStyle(.white).background(.black.opacity(0.55), in: Circle()).padding(8)
                            }
                        }.frame(maxWidth: .infinity).frame(height: category == .videos ? 172 : 136)
                            .clipShape(RoundedRectangle(cornerRadius: 16)).accessibilityHidden(true)
                    }
                }
            }
            HStack {
                Text(pending ? L("analysis.running") : String(format: L("count.items"), summary.count))
                    .font(.subheadline.weight(.semibold)).monospacedDigit()
                Spacer()
                Text(L("home.choose")).font(.subheadline).foregroundStyle(Color.accentColor)
            }
        }.padding(16).background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 22))
            .accessibilityElement(children: .combine)

    }
}
