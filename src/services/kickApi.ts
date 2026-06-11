import { invoke } from "@tauri-apps/api/core";
import type { KickChannel } from "../types/channel";

type KickChannelPayload = {
  slug: string;
  username?: string;
  avatarUrl?: string;
  isLive: boolean;
  title?: string;
  category?: string;
  viewers?: number;
  chatroomId?: number;
};

export function normalizeSlug(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?kick\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .replace(/\/+$/, "")
    .toLowerCase();
}

export async function resolveKickChannel(slug: string): Promise<KickChannel> {
  const normalizedSlug = normalizeSlug(slug);

  try {
    const payload = await invoke<KickChannelPayload>("fetch_kick_channel", {
      slug: normalizedSlug,
    });

    return mapPayload(payload);
  } catch (error) {
    return {
      slug: normalizedSlug,
      status: "error",
      lastCheckedAt: Date.now(),
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkLiveStatus(slug: string): Promise<KickChannel> {
  return resolveKickChannel(slug);
}

export async function checkManyLiveStatuses(slugs: string[]): Promise<KickChannel[]> {
  return Promise.all(slugs.map((slug) => checkLiveStatus(slug)));
}

function mapPayload(payload: KickChannelPayload): KickChannel {
  const status = payload.isLive ? "live" : "offline";
  return {
    slug: payload.slug,
    username: payload.username,
    avatarUrl: payload.avatarUrl,
    status,
    title: payload.title,
    category: payload.category,
    viewers: payload.viewers,
    chatroomId: payload.chatroomId,
    lastCheckedAt: Date.now(),
    lastWentLiveAt: status === "live" ? Date.now() : undefined,
  };
}
