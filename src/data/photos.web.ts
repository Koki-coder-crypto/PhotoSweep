import type { PhotoRepository } from "../domain/types";
export function createPhotoRepository(): PhotoRepository {
  // Web is a development surface; it can never read or delete device photos.
  if (__DEV__) {
    const { demoPhotos } =
      require("../dev/adapters") as typeof import("../dev/adapters");
    return demoPhotos();
  }
  return {
    permission: async () => "restricted",
    selectMore: async () => {},
    page: async () => ({ items: [] }),
    resolve: async () => {
      throw new Error("iPhoneでご利用ください。");
    },
    inspect: async (ids) => ({ present: [], missing: [], inaccessible: ids }),
    deleteRequested: async () => "unknown",
    subscribe: () => () => {},
  };
}
