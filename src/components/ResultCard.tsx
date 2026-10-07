"use client";

import { useId, useState } from "react";
import { formatDuration } from "@/lib/format";
import type { CropParams, Flip, MediaItem, OptionKind, Rotation, TrimParams } from "@/lib/media-types";
import { ChoicePanel } from "./ChoicePanel";
import { CropEditor } from "./CropEditor";
import { clock } from "./filmstrip";
import { FrameExtractor } from "./FrameExtractor";
import { FilmIcon, ImageIcon, MusicIcon } from "./icons";
import { OptionRow } from "./OptionRow";
import { PreviewPlayer } from "./PreviewPlayer";
import { Slider } from "./Slider";
import { TrimEditor } from "./TrimEditor";

type Tab = OptionKind | "frames";

const SPEED_MARKS = [
  { value: 0.5, label: "0.5×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
];
const VOLUME_MARKS = [
  { value: 0, label: "Mute" },
  { value: 1, label: "100%" },
  { value: 2, label: "200%" },
];
const ROTATE_OPTIONS: { value: Rotation; label: string }[] = [
  { value: 0, label: "None" },
  { value: 90, label: "90° right" },
  { value: 180, label: "180°" },
  { value: 270, label: "90° left" },
];
const FLIP_OPTIONS: { value: Flip; label: string }[] = [
  { value: "none", label: "None" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

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
  const [speed, setSpeed] = useState<number>(1);
  const [rotate, setRotate] = useState<Rotation>(0);
  const [flip, setFlip] = useState<Flip>("none");
  const [volume, setVolume] = useState<number>(1);
  const tabsId = useId();
  const kinds = (["video", "audio"] as const).filter((kind) => item.options.some((o) => o.kind === kind));
  const bestVideo = item.options.find((o) => o.kind === "video" && o.best) ?? item.options.find((o) => o.kind === "video");
  const canExtract = !!bestVideo && (item.durationSec ?? 0) > 0;
  const tabs: Tab[] = canExtract ? [...kinds, "frames"] : kinds;
  const active = tabs.includes(tab) ? tab : tabs[0];
  const duration = formatDuration(item.durationSec);
  const portrait = item.width && item.height ? item.height > item.width : false;

  return (
    <article
      className="animate-rise overflow-hidden rounded-xl border border-border bg-surface"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="grid gap-4 p-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:p-4">
        <div
          className={`relative overflow-hidden rounded-lg bg-surface-2 ${portrait ? "mx-auto aspect-[9/16] max-h-80 w-auto sm:max-h-none sm:w-full" : "aspect-video"}`}
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
            <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">
              {duration}
            </span>
          )}
          {total > 1 && (
            <span className="absolute left-2 top-2 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">
              {index + 1}/{total}
            </span>
          )}
          {/* Last, so a playing video covers the badges instead of fighting its controls. */}
          {kinds.includes("video") && <PreviewPlayer preview={item.preview} />}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="px-1 pt-1">
            <h2 className="line-clamp-2 text-lg font-semibold leading-snug">{item.title}</h2>
            {uploader && <p className="mt-1 truncate text-sm text-muted">by {uploader}</p>}
          </div>

          {tabs.length > 1 && (
            <div role="tablist" aria-label="Format" className="inline-flex w-fit rounded-lg bg-surface-2 p-1">
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
                    className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition sm:px-4 ${
                      active === kind ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
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
              <Slider
                title="Speed"
                value={speed}
                min={0.5}
                max={3}
                step={0.05}
                defaultValue={1}
                format={(s) => `${s}×`}
                note={speed !== 1 && `plays for ${clock((trimParams ? trimParams.end - trimParams.start : item.durationSec!) / speed)}`}
                marks={SPEED_MARKS}
                onChange={setSpeed}
              />
              <Slider
                title="Volume"
                value={volume}
                min={0}
                max={2}
                step={0.05}
                defaultValue={1}
                format={(v) => (v === 0 ? "Muted" : `${Math.round(v * 100)}%`)}
                marks={VOLUME_MARKS}
                onChange={setVolume}
              />
              <ChoicePanel title="Flip" options={FLIP_OPTIONS} value={flip} onChange={setFlip} />
              <ChoicePanel title="Rotate" options={ROTATE_OPTIONS} value={rotate} onChange={setRotate}>
                {item.thumbnail && (
                  <div className="grid size-16 shrink-0 place-items-center" aria-hidden>
                    {/* Same proxied thumbnail as above, flipped then turned to preview both. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="max-h-14 max-w-14 rounded transition-transform duration-300"
                      style={{
                        transform: `rotate(${rotate}deg) scale(${flip === "horizontal" ? -1 : 1}, ${flip === "vertical" ? -1 : 1})`,
                      }}
                    />
                  </div>
                )}
              </ChoicePanel>
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
                    edits={
                      kind === "video"
                        ? {
                            trim: trimParams,
                            crop: cropParams,
                            speed: speed === 1 ? undefined : speed,
                            rotate: rotate || undefined,
                            flip: flip === "none" ? undefined : flip,
                            volume: volume === 1 ? undefined : volume,
                          }
                        : undefined
                    }
                  />
                ))}
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
