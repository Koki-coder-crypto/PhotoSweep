import * as StoreReview from 'expo-store-review';

export interface ReviewPromptAdapter {
  available(): Promise<boolean>;
  request(): Promise<void>;
}

export const reviewPrompt: ReviewPromptAdapter = {
  available: () => StoreReview.isAvailableAsync(),
  request: () => StoreReview.requestReview(),
};
