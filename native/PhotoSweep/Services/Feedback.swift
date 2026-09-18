import AVFoundation
import UIKit

@MainActor final class FeedbackService {
    private var player: AVAudioPlayer?
    func play(_ settings: Settings, success: Bool) {
        if settings.haptics {
            if success { UINotificationFeedbackGenerator().notificationOccurred(.success) }
            else { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
        }
        guard settings.sound, let url = Bundle.main.url(forResource: "confirmation", withExtension: "wav") else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            player = try AVAudioPlayer(contentsOf: url); player?.volume = 0.18; player?.play()
        } catch { /* Optional sound must never fail a saved decision. */ }
    }
}
