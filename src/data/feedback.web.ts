import type { Settings } from "../domain/types";
export async function decisionFeedback(_settings: Settings) {}
export async function interactionFeedback(
  _settings: Settings,
  _event: "selection" | "confirm" | "success",
) {}
