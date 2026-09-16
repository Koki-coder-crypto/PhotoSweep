import type { ReviewPersistence, ReviewState } from "../domain/types";
// Development preview only. Native builds resolve persistence.ts and SQLite.
export async function createPersistence(): Promise<ReviewPersistence> {
  return {
    load: async () => {
      const value = localStorage.getItem("photosweep-preview-v1");
      return value ? JSON.parse(value) : null;
    },
    save: async (_previous: ReviewState, next: ReviewState) => {
      localStorage.setItem("photosweep-preview-v1", JSON.stringify(next));
    },
  };
}
