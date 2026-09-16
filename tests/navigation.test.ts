import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNativePath } from "../src/domain/navigation.ts";
test("native links cannot bypass onboarding into destructive or development routes", () => {
  for (const path of [
    "photosweep://catalog",
    "photosweep://result",
    "photosweep://zoom?id=p0",
    "https://example.com/help",
    "photosweep://help/%",
    "photosweep://help?" + "%A".repeat(10000),
  ])
    assert.equal(safeNativePath(path), "/");
  assert.equal(safeNativePath("photosweep://help"), "/help");
  assert.equal(safeNativePath("/privacy"), "/privacy");
  assert.equal(safeNativePath("photosweep:///terms?ignored=true"), "/terms");
});
