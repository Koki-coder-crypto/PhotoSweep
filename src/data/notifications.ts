import * as Notifications from "expo-notifications";
import type { Entitlement, Settings } from "../domain/types";
import { trialReminderAt } from "../domain/policy";
export async function notificationPermission(request = false) {
  const p = request
    ? await Notifications.requestPermissionsAsync()
    : await Notifications.getPermissionsAsync();
  return (
    p.granted ||
    p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
export async function syncNotifications(
  settings: Settings,
  entitlement: Entitlement,
) {
  const allowed = await notificationPermission();
  const current = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of current)
    if (n.identifier.startsWith("photosweep-"))
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
  if (!allowed) return;
  const trialAt = trialReminderAt(
    entitlement,
    settings.trialReminder,
    allowed,
    Date.now(),
  );
  if (trialAt)
    await Notifications.scheduleNotificationAsync({
      identifier: "photosweep-trial",
      content: {
        title: "PhotoSweepのプランを確認",
        body: "無料体験の終了が近づいています。App Storeで契約内容を確認できます。",
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(trialAt),
      },
    });
  if (settings.weekly)
    await Notifications.scheduleNotificationAsync({
      identifier: "photosweep-weekly",
      content: {
        title: "写真を、少しだけ見返そう。",
        body: "あなたのペースで。PhotoSweepで続きから整理できます。",
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour: 19,
        minute: 0,
      },
    });
}
