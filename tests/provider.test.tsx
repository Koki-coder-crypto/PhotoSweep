import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { AppProvider, useApp, type AppModel } from "../src/state/AppContext";
import { createPersistence } from "../src/data/persistence";
import { createPhotoRepository } from "../src/data/photos";
import { createBillingAdapter } from "../src/data/billing";
import { initialState } from "../src/domain/review";
import { clock } from "../src/domain/policy";
import { decisionFeedback } from "../src/data/feedback";
import type {
  BillingAdapter,
  Photo,
  PhotoRepository,
  ReviewState,
} from "../src/domain/types";
jest.mock("../src/data/persistence", () => ({ createPersistence: jest.fn() }));
jest.mock("../src/data/photos", () => ({ createPhotoRepository: jest.fn() }));
jest.mock("../src/data/billing", () => ({ createBillingAdapter: jest.fn() }));
jest.mock("../src/data/feedback", () => ({
  decisionFeedback: jest.fn(async () => {}),
}));
let app: AppModel;
let stored: ReviewState | null;
let saveFails: boolean;
let photos: Photo[];
let repository: PhotoRepository;
let billing: BillingAdapter;
function Capture() {
  app = useApp();
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  stored = null;
  saveFails = false;
  photos = Array.from({ length: 140 }, (_, i) => ({
    id: `p${i}`,
    uri: `file:///p${i}.jpg`,
    width: 100,
    height: 100,
    createdAt: Date.now(),
    screenshot: i % 4 === 0,
  }));
  repository = {
    permission: jest.fn(async () => "full"),
    selectMore: jest.fn(async () => {}),
    page: jest.fn(async (_scope, after, limit = 250) => {
      const offset = Number(after || 0);
      return {
        items: photos.slice(offset, offset + limit),
        next:
          offset + limit < photos.length ? String(offset + limit) : undefined,
      };
    }),
    resolve: jest.fn(async (id) => photos.find((p) => p.id === id)!),
    inspect: jest.fn(async (ids) => ({
      present: ids.filter((id) => photos.some((p) => p.id === id)),
      missing: ids.filter((id) => !photos.some((p) => p.id === id)),
      inaccessible: [],
    })),
    deleteRequested: jest.fn(async (ids) => {
      photos = photos.filter((p) => !ids.includes(p.id));
      return "confirmed";
    }),
    subscribe: () => () => {},
  };
  billing = {
    entitlement: jest.fn(
      async () => ({ kind: "free", verified: true }) as const,
    ),
    loadProducts: jest.fn(async () => []),
    purchase: jest.fn(async () => "pending"),
    restore: jest.fn(async () => ({ kind: "free", verified: true }) as const),
    manage: jest.fn(),
    subscribe: () => () => {},
    dispose: jest.fn(),
  };
  jest.mocked(createPhotoRepository).mockReturnValue(repository);
  jest.mocked(createBillingAdapter).mockReturnValue(billing);
  jest.mocked(createPersistence).mockImplementation(
    async () =>
      ({
        load: async () => stored,
        save: async (_previous: ReviewState, next: ReviewState) => {
          if (saveFails) throw new Error("disk full");
          stored = JSON.parse(JSON.stringify(next));
        },
      }) as any,
  );
});
async function boot() {
  const view = render(
    <AppProvider>
      <Capture />
    </AppProvider>,
  );
  await waitFor(() => {
    expect(app.ready).toBe(true);
    expect(app.loading).toBe(false);
    expect(app.permission).toBe("full");
  });
  return view;
}

test("bulk selection rolls back on storage failure and never consumes allowance", async () => {
  await boot();
  saveFails = true;
  await act(async () => {
    await expect(app.stageCandidates(["p0", "p1"])).rejects.toThrow(
      "disk full",
    );
  });
  expect(app.state.used).toEqual([]);
  expect(app.state.decisions).toEqual({});
  expect(repository.deleteRequested).not.toHaveBeenCalled();
});
test("confirmed deletions disappear immediately even while the library refresh is slow", async () => {
  await boot();
  await act(async () => {
    await app.stageCandidates(["p0", "p1"]);
  });
  jest.mocked(repository.page).mockImplementation(() => new Promise(() => {}));
  await act(async () => {
    await app.deletePhotos(["p0", "p1"]);
  });
  expect(app.state.deletion?.status).toBe("done");
  expect(app.photos.some((p) => p.id === "p0" || p.id === "p1")).toBe(false);
  expect(app.photos.length).toBe(138);
});
test("full provider persists a decision and resumes the same cursor after remount", async () => {
  const view = await boot();
  await act(async () => {
    await app.start();
  });
  await act(async () => {
    await app.choose("p0", "candidate");
  });
  expect(app.state.used).toEqual(["p0"]);
  expect(app.state.session?.cursor).toBe(1);
  view.unmount();
  await boot();
  expect(app.state.session?.cursor).toBe(1);
  expect(app.state.decisions.p0?.choice).toBe("candidate");
});
test("failed durable write never advances the card or emits feedback", async () => {
  await boot();
  await act(async () => {
    await app.start();
  });
  saveFails = true;
  await act(async () => {
    await expect(app.choose("p0", "keep")).rejects.toThrow("disk full");
  });
  expect(app.state.session?.cursor).toBe(0);
  expect(app.state.used).toEqual([]);
  expect(decisionFeedback).not.toHaveBeenCalled();
});
test("two start taps cannot overwrite each other with independently fetched sessions", async () => {
  await boot();
  let resolve!: (v: any) => void;
  jest.mocked(repository.page).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  let first!: Promise<void>;
  await act(async () => {
    first = app.start();
    await expect(app.start()).rejects.toThrow("準備");
  });
  await act(async () => {
    resolve({ items: photos });
    await first;
  });
  expect(app.state.session?.ids.length).toBe(20);
  expect(app.busy).toBe(false);
});
test("OS cancellation keeps candidates and usage; no success count", async () => {
  await boot();
  await act(async () => {
    await app.start();
  });
  await act(async () => {
    await app.choose("p0", "candidate");
  });
  jest.mocked(repository.deleteRequested).mockResolvedValue("cancelled");
  await act(async () => {
    await app.deletePhotos(["p0"]);
  });
  expect(app.state.deletion?.status).toBe("cancelled");
  expect(app.state.decisions.p0?.choice).toBe("candidate");
  expect(app.state.deletedCount).toBe(0);
  expect(app.state.used).toEqual(["p0"]);
});
test("revoked permission and unknown deletion retain the entire candidate set", async () => {
  await boot();
  await act(async () => {
    await app.start();
  });
  await act(async () => {
    await app.choose("p0", "candidate");
  });
  jest.mocked(repository.deleteRequested).mockImplementation(async () => {
    jest.mocked(repository.permission).mockResolvedValue("denied");
    jest.mocked(repository.inspect).mockImplementation(async (ids) => ({
      present: [],
      missing: [],
      inaccessible: ids,
    }));
    return "unknown";
  });
  await act(async () => {
    await app.deletePhotos(["p0"]);
  });
  expect(app.state.deletion?.status).toBe("unknown");
  expect(app.state.decisions.p0?.choice).toBe("candidate");
  expect(app.state.deletedCount).toBe(0);
});
test("restarting a pending job reconciles presence but never replays native deletion", async () => {
  stored = initialState(clock());
  stored.decisions.p0 = {
    choice: "candidate",
    at: Date.now(),
    sessionId: "old",
  };
  stored.deletion = {
    id: "job",
    at: Date.now(),
    ids: ["p0"],
    deleted: [],
    remaining: ["p0"],
    status: "pending",
  };
  await boot();
  await waitFor(() => expect(app.state.deletion?.status).toBe("partial"));
  expect(repository.deleteRequested).not.toHaveBeenCalled();
  expect(app.state.decisions.p0?.choice).toBe("candidate");
});
test("confirmed deletion clears only requested assets and retains the free ledger", async () => {
  await boot();
  await act(async () => {
    await app.start();
  });
  await act(async () => {
    await app.choose("p0", "candidate");
  });
  await act(async () => {
    await app.choose("p1", "candidate");
  });
  await act(async () => {
    await app.deletePhotos(["p0"]);
  });
  expect(app.state.deletedCount).toBe(1);
  expect(app.state.decisions.p0).toBeUndefined();
  expect(app.state.decisions.p1?.choice).toBe("candidate");
  expect(app.state.used).toEqual(["p0", "p1"]);
});
test("purchase pending is never interpreted as Pro and cannot be purchased twice", async () => {
  await boot();
  await act(async () => {
    await app.purchase("monthly");
  });
  expect(app.purchaseState).toBe("pending");
  expect(app.entitlement.kind).toBe("free");
  await act(async () => {
    await app.purchase("monthly");
  });
  expect(billing.purchase).toHaveBeenCalledTimes(1);
});

test("v2 boot migration preserves existing decisions and stage survives provider reconstruction", async () => {
  stored = initialState(clock());
  stored.onboarded = true;
  stored.used = ["p0"];
  stored.decisions = {
    p0: { choice: "candidate", at: Date.now(), sessionId: "old" },
  };
  const original = JSON.parse(JSON.stringify(stored));
  let view = await boot();
  expect(app.state.onboarding?.mode).toBe("upgrade");
  expect(stored?.onboarding?.version).toBe(2);
  expect(app.state.used).toEqual(original.used);
  expect(app.state.decisions).toEqual(original.decisions);
  await act(async () => {
    await app.mutate((s) => ({
      ...s,
      onboarding: { ...s.onboarding!, step: "swipe", kept: true },
    }));
  });
  view.unmount();
  view = await boot();
  expect(app.state.onboarding?.step).toBe("swipe");
  expect(app.state.onboarding?.kept).toBe(true);
  expect(app.state.used).toEqual(original.used);
  view.unmount();
});
test("failed practice metadata save does not publish a new stage or alter free allowance", async () => {
  await boot();
  const before = app.state;
  saveFails = true;
  await act(async () => {
    await expect(
      app.mutate((s) => ({
        ...s,
        onboarding: { ...s.onboarding!, step: "compare", selected: [1] },
      })),
    ).rejects.toThrow("disk full");
  });
  expect(app.state).toEqual(before);
  expect(app.state.used).toEqual([]);
  expect(repository.deleteRequested).not.toHaveBeenCalled();
});
