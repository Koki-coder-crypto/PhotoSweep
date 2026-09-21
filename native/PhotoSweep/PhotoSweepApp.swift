import SwiftUI

@main struct PhotoSweepApp: App {
    @StateObject private var model = AppModel()
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(model).environmentObject(model.billing)
                .tint(Color(red: 0.08, green: 0.43, blue: 0.96))
                .task { await model.launch() }
                .onChange(of: phase) { value in
                    if value == .active, model.ready { model.becameActive(); Task { await model.billing.refresh(); await model.syncNotifications() } }
                    if value == .background { model.compression.cancel(); model.library.clearPrefetch() }
                }
        }
    }
}
