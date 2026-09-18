import type { ReviewState } from "./types.ts";
export const ONBOARDING_VERSION = 2;
export type IntroStep =
  | "welcome"
  | "compare"
  | "swipe"
  | "permission"
  | "discover"
  | "pro";
export interface OnboardingState {
  version: number;
  step: IntroStep;
  completed: boolean;
  mode: "first" | "upgrade" | "replay";
  selected: number[];
  compared: boolean;
  kept: boolean;
  candidate: boolean;
  homeHintSeen: boolean;
}
export function onboardingState(s: ReviewState): OnboardingState {
  if (s.onboarding?.version === ONBOARDING_VERSION) return s.onboarding;
  return {
    version: ONBOARDING_VERSION,
    step: "welcome",
    completed: false,
    mode: s.onboarded ? "upgrade" : "first",
    selected: [],
    compared: false,
    kept: false,
    candidate: false,
    homeHintSeen: false,
  };
}
export function needsOnboarding(s: ReviewState) {
  return !onboardingState(s).completed;
}
export function updateOnboarding(
  s: ReviewState,
  patch: Partial<Omit<OnboardingState, "version" | "mode">>,
): ReviewState {
  return { ...s, onboarding: { ...onboardingState(s), ...patch } };
}
export function finishOnboarding(s: ReviewState): ReviewState {
  return {
    ...updateOnboarding(s, { completed: true }),
    onboarded: true,
    guided: true,
  };
}
export function replayOnboarding(s: ReviewState): ReviewState {
  return {
    ...s,
    onboarding: {
      ...onboardingState({ ...s, onboarding: undefined }),
      mode: "replay",
      homeHintSeen: true,
    },
  };
}
export function migrateOnboarding(s: ReviewState): ReviewState {
  return { ...s, onboarding: onboardingState(s) };
}
