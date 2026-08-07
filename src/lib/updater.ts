import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateInfo = {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
};

export type DownloadProgress = {
  downloaded: number;
  total: number | null;
};

/** Returns update metadata when a newer signed release is available. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const update = await check();
  if (!update) return null;
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    body: update.body,
    date: update.date,
  };
}

/**
 * Download and install a pending update, then relaunch.
 * Call only after checkForUpdate reported a new version.
 */
export async function downloadAndInstallUpdate(
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  const update = await check();
  if (!update) {
    throw new Error("No update available");
  }
  await installUpdate(update, onProgress);
}

async function installUpdate(
  update: Update,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  let downloaded = 0;
  let total: number | null = null;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? null;
        downloaded = 0;
        onProgress?.({ downloaded, total });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress?.({ downloaded, total });
        break;
      case "Finished":
        onProgress?.({ downloaded, total });
        break;
    }
  });

  await relaunch();
}
