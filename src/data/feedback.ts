import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import type { Settings } from "../domain/types";
let player: ReturnType<typeof createAudioPlayer> | undefined;
export async function decisionFeedback(settings: Settings) {
  if (settings.haptics)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  if (settings.sound) {
    try {
      await setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
      });
      player ||= createAudioPlayer(require("../../assets/tick.wav"));
      await player.seekTo(0);
      player.volume = 0.2;
      player.play();
    } catch {
      /* Feedback must never roll back a durable decision. */
    }
  }
}
