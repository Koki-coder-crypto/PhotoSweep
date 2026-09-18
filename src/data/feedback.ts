import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import type { Settings } from "../domain/types";
import { Platform } from "react-native";
let lastFeedback = 0;
export async function interactionFeedback(
  settings: Settings,
  event: "selection" | "confirm" | "success",
) {
  const now = Date.now();
  if (!settings.haptics || Platform.OS === "web" || now - lastFeedback < 100)
    return;
  lastFeedback = now;
  try {
    if (event === "selection") await Haptics.selectionAsync();
    else if (event === "success")
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* An unavailable haptic engine must not block navigation. */
  }
}
let player: ReturnType<typeof createAudioPlayer> | undefined;
export async function decisionFeedback(settings: Settings) {
  void interactionFeedback(settings, "confirm");
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
