// Native deep links are untrusted input. Validate before Expo Router decodes them.
export function safeNativePath(path: string): string {
  if (path.length > 2048) return "/";
  try {
    decodeURIComponent(path);
    const url = new URL(path, "photosweep://app");
    if (url.protocol !== "photosweep:") return "/";
    const route =
      url.hostname && url.hostname !== "app"
        ? `/${url.hostname}${url.pathname}`
        : url.pathname || "/";
    const allowed = new Set([
      "/",
      "/help",
      "/privacy",
      "/terms",
      "/plan",
      "/notifications",
    ]);
    return allowed.has(route) ? route : "/";
  } catch {
    return "/";
  }
}
