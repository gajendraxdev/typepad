import { useCallback, useEffect, useState } from "react";
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  type UpdateInfo,
} from "../lib/updater";
import { IconClose } from "./icons";

const DISMISS_KEY = "typepad.dismissedUpdate";

type Phase = "idle" | "checking" | "available" | "downloading" | "error";

/**
 * Quiet startup check + optional install banner.
 * Dismissed versions stay hidden until a newer one ships.
 */
export function UpdateBanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const runCheck = useCallback(async (manual = false) => {
    setPhase("checking");
    setError(null);
    try {
      const next = await checkForUpdate();
      if (!next) {
        setInfo(null);
        setPhase("idle");
        return null;
      }
      const dismissed =
        typeof localStorage !== "undefined"
          ? localStorage.getItem(DISMISS_KEY)
          : null;
      if (!manual && dismissed === next.version) {
        setPhase("idle");
        return null;
      }
      setInfo(next);
      setPhase("available");
      return next;
    } catch (e) {
      // Dev / offline: fail quietly unless the user asked.
      if (manual) {
        setError(String(e));
        setPhase("error");
      } else {
        setPhase("idle");
      }
      return null;
    }
  }, []);

  useEffect(() => {
    // Delay so first paint and note load are not blocked.
    const t = window.setTimeout(() => {
      void runCheck(false);
    }, 4000);
    return () => window.clearTimeout(t);
  }, [runCheck]);

  const dismiss = () => {
    if (info && typeof localStorage !== "undefined") {
      localStorage.setItem(DISMISS_KEY, info.version);
    }
    setPhase("idle");
    setInfo(null);
  };

  const install = async () => {
    setPhase("downloading");
    setError(null);
    try {
      await downloadAndInstallUpdate(({ downloaded, total }) => {
        if (total && total > 0) {
          const pct = Math.min(100, Math.round((downloaded / total) * 100));
          setProgress(`${pct}%`);
        } else {
          setProgress(`${Math.round(downloaded / 1024)} KB`);
        }
      });
    } catch (e) {
      setError(String(e));
      setPhase("error");
    }
  };

  // Expose a manual re-check via custom event (Settings can dispatch it).
  useEffect(() => {
    const onManual = () => {
      void runCheck(true);
    };
    window.addEventListener("typepad:check-updates", onManual);
    return () => window.removeEventListener("typepad:check-updates", onManual);
  }, [runCheck]);

  if (phase === "idle" || phase === "checking") return null;
  if (!info && phase !== "error") return null;

  return (
    <div className="update-banner anim-fade-in" role="status">
      <div className="update-banner-body">
        {phase === "available" && info ? (
          <>
            <p className="update-banner-title">
              Typepad {info.version} is available
            </p>
            <p className="update-banner-meta">
              You have {info.currentVersion}
              {info.body ? ` · ${info.body.split("\n")[0]}` : ""}
            </p>
          </>
        ) : null}
        {phase === "downloading" ? (
          <p className="update-banner-title">
            Downloading update{progress ? ` (${progress})` : "…"}
          </p>
        ) : null}
        {phase === "error" ? (
          <p className="update-banner-title update-banner-error">
            Update failed: {error}
          </p>
        ) : null}
      </div>
      <div className="update-banner-actions">
        {phase === "available" ? (
          <>
            <button
              type="button"
              className="ui-btn ui-btn-soft !py-1 !text-[11px]"
              onClick={() => void install()}
            >
              Install & restart
            </button>
            <button
              type="button"
              className="ui-icon-btn"
              onClick={dismiss}
              title="Dismiss"
              aria-label="Dismiss update"
            >
              <IconClose size={13} />
            </button>
          </>
        ) : null}
        {phase === "error" ? (
          <button
            type="button"
            className="ui-btn ui-btn-ghost !py-1 !text-[11px]"
            onClick={dismiss}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Trigger a manual update check (e.g. from Settings). */
export function requestUpdateCheck() {
  window.dispatchEvent(new Event("typepad:check-updates"));
}
