import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

export type LatestRelease = {
  currentVersion: string;
  latestVersion: string;
  tagName: string;
  name?: string;
  htmlUrl: string;
  installerUrl?: string;
  hasUpdate: boolean;
};

type LatestReleasePayload = Omit<LatestRelease, "hasUpdate">;

export async function checkForUpdates(): Promise<LatestRelease> {
  const payload = await invoke<LatestReleasePayload>("fetch_latest_release");

  return {
    ...payload,
    hasUpdate: compareVersions(payload.latestVersion, payload.currentVersion) > 0,
  };
}

export async function openReleaseDownload(release: LatestRelease) {
  const url = release.installerUrl ?? release.htmlUrl;

  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function compareVersions(a: string, b: string) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

function parseVersion(version: string) {
  return version
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}
