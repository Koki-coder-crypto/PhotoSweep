import type { Entitlement, Settings } from "../domain/types";
export async function notificationPermission(_request = false) {
  return false;
}
export async function syncNotifications(
  _settings: Settings,
  _entitlement: Entitlement,
) {}
