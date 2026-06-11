import { useEffect, useMemo, useState } from "react";
import { normalizeSlug } from "../services/kickApi";
import { loadChannels, saveChannels } from "../services/storage";
import type { KickChannel } from "../types/channel";

export function useChannels() {
  const [channels, setChannels] = useState<KickChannel[]>(() => loadChannels());

  useEffect(() => {
    saveChannels(channels);
  }, [channels]);

  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      return a.slug.localeCompare(b.slug);
    });
  }, [channels]);

  function addChannel(value: string): string | null {
    const slug = normalizeSlug(value);
    if (!slug || channels.some((channel) => channel.slug === slug)) {
      return null;
    }

    setChannels((current) => [
      ...current,
      {
        slug,
        status: "unknown",
      },
    ]);
    return slug;
  }

  function removeChannel(slug: string) {
    setChannels((current) => current.filter((channel) => channel.slug !== slug));
  }

  return {
    channels,
    sortedChannels,
    setChannels,
    addChannel,
    removeChannel,
  };
}
