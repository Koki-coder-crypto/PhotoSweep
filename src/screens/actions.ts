import { router, type Href } from "expo-router";
import type { AppModel } from "../state/AppContext";
export function go(path: string) {
  router.push(path as Href);
}
export async function run(app: AppModel, task: () => Promise<unknown>) {
  try {
    await task();
    return true;
  } catch (e) {
    app.notify(e instanceof Error ? e.message : "もう一度お試しください。");
    return false;
  }
}
export function monthKey(time: number) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${y}年${Number(m)}月`;
}
export function dateLabel(time: number) {
  return new Date(time).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
