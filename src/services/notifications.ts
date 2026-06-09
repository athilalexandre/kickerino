import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { KickChannel } from "../types/channel";

export async function notifyLive(channel: KickChannel) {
  const title = `${channel.username ?? channel.slug} entrou ao vivo`;
  const body = channel.title
    ? `${channel.title}${channel.viewers ? ` - ${channel.viewers} viewers` : ""}`
    : "Clique em abrir live para assistir na Kick.";

  try {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    if (permissionGranted) {
      sendNotification({ title, body });
      return;
    }
  } catch {
    if ("Notification" in window && Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(title, { body });
      }
    }
  }
}
