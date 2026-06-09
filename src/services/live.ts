import { openUrl } from "@tauri-apps/plugin-opener";

export function kickChannelUrl(slug: string) {
  return `https://kick.com/${slug}`;
}

export async function openKickChannel(slug: string) {
  const url = kickChannelUrl(slug);

  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
