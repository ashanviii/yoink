"use client";

import { useState } from "react";
import { markCorsBlocked, streamUrls } from "@/lib/client/fetch-media";
import type { StreamRef } from "@/lib/media-types";
import { PlayIcon } from "./icons";

/**
 * Lets people watch the video before downloading. Nothing is fetched until they press play:
 * the small preview stream is tried straight from the CDN first, then through our proxy.
 * It fills its parent, which must be `relative`.
 */
export function PreviewPlayer({ preview }: { preview: StreamRef | null }) {
  const [playing, setPlaying] = useState(false);
  // Index into the candidate URLs; moves on to the next source when one fails to load.
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  // HLS needs a player library on most browsers, so only plain files get a play button.
  if (!preview || preview.hls) return null;

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setAttempt(0);
          setPlaying(true);
        }}
        aria-label={failed ? "Preview unavailable, try again" : "Play preview"}
        className="group absolute inset-0 grid place-items-center bg-black/10 transition hover:bg-black/25 focus-visible:outline-2"
      >
        <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-card transition group-hover:scale-110 group-active:scale-95">
          <PlayIcon size={26} />
        </span>
        {failed && (
          <span className="absolute inset-x-2 top-2 rounded-lg bg-black/75 px-2 py-1 text-center text-xs font-semibold text-white">
            Couldn&apos;t play this preview. Tap to retry.
          </span>
        )}
      </button>
    );
  }

  const candidates = streamUrls(preview);
  const source = candidates[attempt];

  return (
    <video
      // A new source means a new element, so the browser reloads rather than reusing the failed one.
      key={source.url}
      src={source.url}
      controls
      autoPlay
      playsInline
      preload="metadata"
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      onError={() => {
        if (source.direct) markCorsBlocked(source.url);
        if (attempt < candidates.length - 1) setAttempt(attempt + 1);
        else {
          setFailed(true);
          setPlaying(false);
        }
      }}
      className="absolute inset-0 size-full bg-black object-contain"
    />
  );
}
