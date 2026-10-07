"use client";

import { useState } from "react";
import type { Flip, JobParams, Rotation } from "@/lib/media-types";
import { Choices } from "./Choices";
import { EditPanel } from "./EditPanel";
import { clock } from "./filmstrip";
import { Slider } from "./Slider";

export type Tweaks = Pick<JobParams, "speed" | "volume" | "flip" | "rotate">;

type FlipDir = Exclude<Flip, "none">;
type Turn = Exclude<Rotation, 0>;

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
const FLIP_OPTIONS: { value: FlipDir; label: string }[] = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];
const ROTATE_OPTIONS: { value: Turn; label: string }[] = [
  { value: 90, label: "90° right" },
  { value: 180, label: "180°" },
  { value: 270, label: "90° left" },
];

const volumeText = (v: number) => (v === 0 ? "Muted" : `${Math.round(v * 100)}%`);

interface Props {
  /** Length of the clip being saved, for the "plays for" readout. */
  clipSec: number;
  /** Shown flipped and turned to preview those edits. */
  thumbnail: string | null;
  onChange: (tweaks: Tweaks) => void;
}

/** Speed, volume, flip and rotate: each off until its box is ticked. */
export function VideoTweaks({ clipSec, thumbnail, onChange }: Props) {
  const [on, setOn] = useState({ speed: false, volume: false, flip: false, rotate: false });
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [flip, setFlip] = useState<FlipDir>("horizontal");
  const [rotate, setRotate] = useState<Turn>(90);

  // Values that leave the video unchanged are dropped so they don't force a re-encode.
  const emit = (next: { on: typeof on; speed: number; volume: number; flip: FlipDir; rotate: Turn }) =>
    onChange({
      speed: next.on.speed && next.speed !== 1 ? next.speed : undefined,
      volume: next.on.volume && next.volume !== 1 ? next.volume : undefined,
      flip: next.on.flip ? next.flip : undefined,
      rotate: next.on.rotate ? next.rotate : undefined,
    });
  const current = { on, speed, volume, flip, rotate };

  const toggle = (key: keyof typeof on) => {
    const next = { ...on, [key]: !on[key] };
    setOn(next);
    emit({ ...current, on: next });
  };

  const preview = thumbnail && (
    <div className="grid size-16 place-items-center" aria-hidden>
      {/* The proxied thumbnail, flipped then turned like the output will be. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnail}
        alt=""
        className="max-h-14 max-w-14 rounded transition-transform duration-300"
        style={{
          transform: `rotate(${on.rotate ? rotate : 0}deg) scale(${on.flip && flip === "horizontal" ? -1 : 1}, ${on.flip && flip === "vertical" ? -1 : 1})`,
        }}
      />
    </div>
  );

  return (
    <>
      <EditPanel
        label="Change speed"
        enabled={on.speed}
        onToggle={() => toggle("speed")}
        summary={speed === 1 ? "1×" : `${speed}× · plays for ${clock(clipSec / speed)}`}
      >
        <Slider
          label="Speed"
          value={speed}
          min={0.5}
          max={3}
          step={0.05}
          valueText={`${speed}×`}
          marks={SPEED_MARKS}
          onChange={(value) => {
            setSpeed(value);
            emit({ ...current, speed: value });
          }}
        />
      </EditPanel>

      <EditPanel label="Change volume" enabled={on.volume} onToggle={() => toggle("volume")} summary={volumeText(volume)}>
        <Slider
          label="Volume"
          value={volume}
          min={0}
          max={2}
          step={0.05}
          valueText={volumeText(volume)}
          marks={VOLUME_MARKS}
          onChange={(value) => {
            setVolume(value);
            emit({ ...current, volume: value });
          }}
        />
      </EditPanel>

      <EditPanel label="Flip" enabled={on.flip} onToggle={() => toggle("flip")}>
        <div className="flex items-center justify-between gap-3">
          <Choices
            label="Flip direction"
            options={FLIP_OPTIONS}
            value={flip}
            onChange={(value) => {
              setFlip(value);
              emit({ ...current, flip: value });
            }}
          />
          {/* One preview is enough: it moves to the Rotate panel when that's on too. */}
          {!on.rotate && preview}
        </div>
      </EditPanel>

      <EditPanel label="Rotate" enabled={on.rotate} onToggle={() => toggle("rotate")}>
        <div className="flex items-center justify-between gap-3">
          <Choices
            label="Rotation"
            options={ROTATE_OPTIONS}
            value={rotate}
            onChange={(value) => {
              setRotate(value);
              emit({ ...current, rotate: value });
            }}
          />
          {preview}
        </div>
      </EditPanel>
    </>
  );
}
