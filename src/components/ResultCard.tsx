"use client";

import { useEffect, useId, useState } from "react";
import { preloadFFmpeg } from "@/lib/client/ffmpeg";
import { nativeMayHandle } from "@/lib/client/native";
import { formatDuration } from "@/lib/format";
import type { CropParams, MediaItem, OptionKind, TrimParams } from "@/lib/media-types";
import { CropEditor } from "./CropEditor";
import { FrameExtractor } from "./FrameExtractor";
import { FilmIcon, ImageIcon, MusicIcon } from "./icons";
import { FormatRows, OptionRow, type VideoEdits } from "./OptionRow";
import { PreviewPlayer } from "./PreviewPlayer";
import { TrimEditor } from "./TrimEditor";
import { VideoTweaks, type Tweaks } from "./VideoTweaks";

type Tab = OptionKind | "frames";

const TAB_LABEL: Record<Tab, string> = { video: "Video", audio: "Audio", frames: "Frames" };
const TAB_ICON: Record<Tab, typeof FilmIcon> = { video: FilmIcon, audio: MusicIcon, frames: ImageIcon };

interface Props {
  item: MediaItem;
  uploader: string | null;
  index: number;
  total: number;
}

export function ResultCard({ item, uploader, index, total }: Props) {
  const [tab, setTab] = useState<Tab>("video");
  const [trimParams, setTrimParams] = useState<TrimParams | undefined>();
  const [cropParams, setCropParams] = useState<CropParams | undefined>();
  const [tweaks, setTweaks] = useState<Tweaks>({});
  const tabsId = useId();
  const kinds = (["video", "audio"] as const).filter((kind) => item.options.some((o) => o.kind === kind));
  const bestVideo = item.options.find((o) => o.kind === "video" && o.best) ?? item.options.find((o) => o.kind === "video");
  const canExtract = !!bestVideo && (item.durationSec ?? 0) > 0;
  // GIF/WebM are encoded in the browser, so they start from 720p at most (or the only quality there is).
  const videoOptions = item.options.filter((o) => o.kind === "video");
  const convertSource = videoOptions.find((o) => Number.parseInt(o.label, 10) <= 720) ?? videoOptions.at(-1);
  const edits: VideoEdits = { trim: trimParams, crop: cropParams, ...tweaks };
  const tabs: Tab[] = canExtract ? [...kinds, "frames"] : kinds;
  const active = tabs.includes(tab) ? tab : tabs[0];
  const duration = formatDuration(item.durationSec);
  const portrait = item.width && item.height ? item.height > item.width : false;

  // Fetch ffmpeg before the tap that needs it, when the browser's own codecs can't do the job:
  // the best quality has to be merged or remuxed, or an edit is switched on.
  const bestStreams = bestVideo?.recipe.streams ?? [];
  const needsProcessor =
    (bestStreams.length > 1 || bestStreams.some((s) => s.hls || s.ext !== "mp4") || !!(trimParams || cropParams || Object.keys(tweaks).length)) &&
    !nativeMayHandle(edits);
  useEffect(() => {
    if (!needsProcessor) return;
    const timer = setTimeout(preloadFFmpeg, 600);
    return () => clearTimeout(timer);
  }, [needsProcessor]);

  return (
    <article
      className="animate-rise overflow-hidden rounded-[2rem] border border-border bg-surface shadow-card"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="grid gap-5 p-3 sm:grid-cols-[minmax(0,230px)_1fr] sm:p-5">
        <div
          className={`relative overflow-hidden rounded-3xl bg-surface-2 ${portrait ? "mx-auto aspect-[9/16] max-h-80 w-auto sm:max-h-none sm:w-full" : "aspect-video"}`}
        >
          {item.thumbnail ? (
            // Thumbnails come from our same-origin proxy and vary per platform; next/image adds nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-muted">
              <FilmIcon size={32} />
            </div>
          )}
          {duration && (
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
              {duration}
            </span>
          )}
          {total > 1 && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
              {index + 1}/{total}
            </span>
          )}
          {/* Last, so a playing video covers the badges instead of fighting its controls. */}
          {kinds.includes("video") && <PreviewPlayer stream={item.playback} />}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="px-1 pt-1">
            <h2 className="line-clamp-2 font-display text-xl font-extrabold leading-snug">{item.title}</h2>
            {uploader && <p className="mt-1 truncate text-sm text-muted">by {uploader}</p>}
          </div>

          {tabs.length > 1 && (
            <div role="tablist" aria-label="Format" className="inline-flex w-fit rounded-full bg-surface-2 p-1">
              {tabs.map((kind) => {
                const Icon = TAB_ICON[kind];
                return (
                  <button
                    key={kind}
                    role="tab"
                    type="button"
                    id={`${tabsId}-${kind}`}
                    aria-selected={active === kind}
                    aria-controls={`${tabsId}-panel-${kind}`}
                    onClick={() => setTab(kind)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition sm:px-5 ${
                      active === kind ? "bg-text text-bg" : "text-muted hover:text-text"
                    }`}
                  >
                    <Icon size={15} />
                    {TAB_LABEL[kind]}
                  </button>
                );
              })}
            </div>
          )}

          {/* Trim editor for video only */}
          {kinds.includes("video") && (item.durationSec ?? 0) > 1 && (
            <div hidden={active !== "video"} className="space-y-2">
              <TrimEditor durationSec={item.durationSec!} preview={item.preview} onTrimChange={setTrimParams} />
              <CropEditor
                durationSec={item.durationSec!}
                preview={item.preview}
                width={item.width}
                height={item.height}
                onCropChange={setCropParams}
              />
              <VideoTweaks
                clipSec={trimParams ? trimParams.end - trimParams.start : item.durationSec!}
                thumbnail={item.thumbnail}
                onChange={setTweaks}
              />
            </div>
          )}

          {/* Both panels stay mounted so a running download keeps its progress when switching tabs. */}
          {kinds.map((kind) => (
            <ul
              key={kind}
              id={`${tabsId}-panel-${kind}`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-${kind}`}
              hidden={kind !== active}
              className="flex flex-col gap-2"
            >
              {item.options
                .filter((o) => o.kind === kind)
                .map((option) => (
                  <OptionRow
                    key={`${option.kind}-${option.label}`}
                    option={option}
                    edits={kind === "video" ? edits : undefined}
                  />
                ))}
              {kind === "video" && convertSource && (item.durationSec ?? 0) > 0 && (
                <FormatRows
                  option={convertSource}
                  edits={edits}
                  clipSec={trimParams ? trimParams.end - trimParams.start : item.durationSec!}
                />
              )}
            </ul>
          ))}

          {canExtract && (
            <div id={`${tabsId}-panel-frames`} role="tabpanel" aria-labelledby={`${tabsId}-frames`} hidden={active !== "frames"}>
              <FrameExtractor
                durationSec={item.durationSec!}
                preview={item.preview}
                source={bestVideo}
                width={item.width}
                height={item.height}
                active={active === "frames"}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
