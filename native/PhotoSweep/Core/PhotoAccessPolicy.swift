import Photos

// One presentation policy for onboarding, the home screen and app settings.
// A previously determined authorization is never presented as a new request.
enum PhotoAccessAction: Equatable {
    case request, selectPhotos, settings, unavailable
}
struct PhotoAccessPolicy {
    let status: PHAuthorizationStatus
    var action: PhotoAccessAction {
        switch status {
        case .notDetermined: return .request
        case .limited: return .selectPhotos
        case .denied, .authorized: return .settings
        case .restricted: return .unavailable
        @unknown default: return .unavailable
        }
    }
    var messageKey: String {
        switch status {
        case .notDetermined: return "permission.notDetermined"
        case .limited: return "permission.limited"
        case .authorized: return "permission.full"
        case .denied: return "permission.deniedDetail"
        case .restricted: return "permission.restricted"
        @unknown default: return "permission.denied"
        }
    }
    var accessible: Bool { status == .authorized || status == .limited }
    var allowsSettings: Bool { status == .denied || accessible }
}
